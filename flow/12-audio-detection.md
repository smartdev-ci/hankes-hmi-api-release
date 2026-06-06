# SongFinder React Native — Flow d'implémentation

> Guide technique concret pour implémenter le pipeline de détection musicale dans React Native, intégrant les corrections et améliorations identifiées.

---

## Table des matières

1. [Architecture des modules](#1-architecture-des-modules)
2. [Couche 1 — Capture audio](#2-couche-1--capture-audio)
3. [Couche 2 — SpectralAnalyzer](#3-couche-2--spectralanalyzer)
4. [Couche 2 — LocalFingerprinter](#4-couche-2--localfingerprinter)
5. [Couche 2 — MeydaFeatureStore (chroma only)](#5-couche-2--meydafeaturestore-chroma-only)
6. [Couche 2 — Fusion hybride](#6-couche-2--fusion-hybride)
7. [Couche 3 — Machine d'états](#7-couche-3--machine-détats)
8. [Couche 3 — Auto-unlock](#8-couche-3--auto-unlock)
9. [Couche 4 — API client](#9-couche-4--api-client)
10. [Couche 5 — Historique et synchronisation](#10-couche-5--historique-et-synchronisation)
11. [State management React](#11-state-management-react)
12. [Constantes](#12-constantes)
13. [Dépendances recommandées](#13-dépendances-recommandées)

---

## 1. Architecture des modules

```
src/
├── audio/
│   ├── AudioCaptureService.ts       ← gestion micro + chunks
│   ├── SpectralAnalyzer.ts          ← FFT + features + changement
│   ├── LocalFingerprinter.ts        ← Chromaprint-like, Hamming distance
│   ├── ChromaFeatureStore.ts        ← fenêtre glissante chroma (remplace Meyda)
│   └── HybridChangeDetector.ts      ← fusion SpectralAnalyzer + ChromaStore
│
├── api/
│   └── MonitoringApiClient.ts       ← identify, syncBatch, auth
│
├── store/
│   ├── monitoringStore.ts           ← machine d'états (Zustand ou Context)
│   └── sessionStore.ts              ← historique soirée, persistance
│
├── hooks/
│   ├── useMonitoring.ts             ← hook principal orchestrateur
│   ├── useAudioCapture.ts           ← accès micro
│   └── useSessionHistory.ts         ← lecture/écriture historique
│
└── utils/
    ├── dsp.ts                       ← FFT, mel filterbank, DCT, cosine
    └── storage.ts                   ← AsyncStorage wrappers
```

---

## 2. Couche 1 — Capture audio

### Dépendance

```
expo-av  (Audio.Recording)
```

### Initialisation du contexte audio

```typescript
// AudioCaptureService.ts

class AudioCaptureService {
  private recording: Audio.Recording | null = null;
  private headerChunk: Uint8Array | null = null;
  private audioChunks: Uint8Array[] = [];
  private onBlobReady: (blob: Blob, isFirst: boolean) => void;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;

  async start(onBlobReady: (blob: Blob, isFirst: boolean) => void) {
    this.onBlobReady = onBlobReady;
    this.headerChunk = null;
    this.audioChunks = [];

    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync({
      android: {
        extension: '.webm',
        outputFormat: Audio.AndroidOutputFormat.WEBM,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      web: {},
    });

    // Émettre un chunk toutes les 5s
    this.chunkTimer = setInterval(() => this.flushChunk(), 5000);
    await this.recording.startAsync();
  }

  private async flushChunk() {
    if (!this.recording) return;

    // Lire les données accumulées depuis le dernier flush
    const uri = this.recording.getURI();
    if (!uri) return;

    const chunk = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToUint8Array(chunk);

    if (this.headerChunk === null) {
      // Premier chunk = header du conteneur
      this.headerChunk = bytes;
    }

    this.audioChunks.push(bytes);

    // Blob prêt à partir du 3e chunk
    if (this.audioChunks.length >= 3) {
      this.buildAndEmitBlob();
    }
  }

  private buildAndEmitBlob() {
    const isFirst = this.audioChunks.length === 3;
    let parts: Uint8Array[];

    if (isFirst) {
      // Première émission : tous les chunks
      parts = [...this.audioChunks];
    } else {
      // Émissions suivantes : header + 2 derniers chunks (son frais)
      const recentChunks = this.audioChunks.slice(-2);
      parts = this.headerChunk
        ? [this.headerChunk, ...recentChunks]
        : recentChunks;
    }

    // Garder seulement les 2 derniers non-header pour la prochaine fois
    this.audioChunks = this.audioChunks
      .filter(c => c !== this.headerChunk)
      .slice(-2);

    const blob = new Blob(parts, { type: 'audio/webm' });
    this.onBlobReady(blob, isFirst);
  }

  async stop() {
    if (this.chunkTimer) clearInterval(this.chunkTimer);
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
    this.headerChunk = null;
    this.audioChunks = [];
  }
}
```

### Accès aux données FFT en React Native

L'`AnalyserNode` Web Audio n'existe pas nativement. Deux approches selon le cas :

**Option A — WebView (fidélité maximale, recommandée en production)**

```
┌─────────────────────────────────────────┐
│  React Native App                        │
│                                          │
│  ┌──────────────────┐                   │
│  │  Hidden WebView   │  postMessage()   │
│  │                   │ ─────────────►   │
│  │  AudioContext     │                   │
│  │  AnalyserNode     │  ◄─────────────  │
│  │  Meyda (optionnel)│  onMessage()     │
│  └──────────────────┘                   │
└─────────────────────────────────────────┘
```

La WebView capture le micro via `getUserMedia`, calcule les features, et les envoie toutes les 500ms via `postMessage` comme un objet JSON :

```json
{
  "spectrum": [0.12, 0.34, ...],
  "energy": 0.28,
  "chroma": [0.04, 0.11, ...],
  "mfcc": [-12.3, 4.5, ...]
}
```

**Option B — Réimplémentation TypeScript pure (sans WebView)**

Utiliser `react-native-audio-analyser` pour obtenir les données PCM brutes, puis alimenter `SpectralAnalyzer.ts` directement. Plus simple à intégrer, légèrement moins précis que Meyda mais suffisant.

```typescript
// Avec react-native-audio-analyser
import AudioAnalyser from 'react-native-audio-analyser';

AudioAnalyser.start({
  sampleRate: 44100,
  bufferSize: 256,
  onAudioData: (fftData: number[]) => {
    const features = spectralAnalyzer.analyzeRaw(fftData);
    spectralAnalyzer.addSample(features);
  }
});
```

---

## 3. Couche 2 — SpectralAnalyzer

Le moteur de détection de changement. Entièrement portable en TypeScript pur, aucune dépendance native.

### Paramètres corrigés

```typescript
// SpectralAnalyzer.ts

class SpectralAnalyzer {
  readonly bands               = 32;
  readonly similarityThreshold = 0.96;
  readonly consecutiveRequired = 2;    // ← CORRIGÉ : était 1, trop sensible
  readonly maxHistorySize      = 12;
  readonly referenceWindowSize = 6;
  readonly recentWindowSize    = 2;
  readonly silenceThreshold    = 0.025;
  readonly silenceFramesRequired = 4;
  readonly changeThreshold     = 45;
  readonly suspicionThreshold  = 28;
  readonly mfccCount           = 13;
  readonly melBands            = 26;
}
```

### Pipeline d'analyse par frame (appelé toutes les 500ms)

```
fftData: Uint8Array (256 bins)
    │
    ├─► spectrum[32]        (binning linéaire, normalisé 0–1)
    ├─► energy              (moyenne totale des bins)
    ├─► computeChroma()     → chroma[12]   (mapping MIDI pitch class)
    └─► computeMFCC()
          ├─► melFilterBank(26 bandes)
          ├─► log10()
          ├─► DCT()
          └─► mfcc[13]

→ addSample({ spectrum, energy, flux, chroma, mfcc })
  └─► spectrumHistory.push()   (max 12 frames, shift si dépassement)
  └─► flux = spectralFlux(lastSpectrum, currentSpectrum)
  └─► silenceFrames++ si energy < 0.025
```

### checkForChange() — logique interne

```
referenceAvg = moyenne des 6 dernières frames  (referenceWindowSize)
currentAvg   = moyenne des 2 dernières frames  (recentWindowSize)

cosineScore  = clamp((0.96 − cosine(ref, cur)) / 0.18,  0, 1)
deltaScore   = clamp(spectrumDelta / 0.08,               0, 1)
spectrumScore = max(cosineScore, deltaScore)

fluxScore    = clamp((flux − 0.012) / 0.07,              0, 1)
volumeScore  = clamp(energyDelta / 0.35,                 0, 1)
silenceScore = silenceFrames >= 4 ? 1
             : clamp((0.05 − energy) / 0.025,            0, 1)

changeScore  = round(
  spectrumScore × 30 +
  fluxScore     × 30 +
  volumeScore   × 20 +
  silenceScore  × 20
)

strongSignals = count(signals >= 0.55)

shouldIncrement =
  changeScore >= 45
  OR (changeScore >= 28 AND strongSignals >= 2)

consecutiveLowSimilarity += shouldIncrement ? 1 : -1  (min 0)

→ changed = consecutiveLowSimilarity >= 2   // ← CORRIGÉ : seuil relevé
```

### Gestion de la référence

```
setReference(spectrum)
  └─► referenceSpectrum = Float32Array.from(spectrum)
  └─► referenceEnergy   = getAverageEnergy(6 dernières frames)
  └─► consecutiveLowSimilarity = 0
  └─► silenceFrames = 0

clearReference()
  └─► referenceSpectrum = null
  └─► referenceEnergy   = null
  └─► consecutiveLowSimilarity = 0

reset()        ← appelé à stopMonitoring()
  └─► vider spectrumHistory, referenceSpectrum, lastSpectrum
```

---

## 4. Couche 2 — LocalFingerprinter

Remplace la comparaison cosine sur moyennes glissantes pour la question "est-ce toujours le même morceau ?". Basé sur des vecteurs binaires et distance de Hamming — robuste aux variations de dynamique.

### Principe

```
chroma[12]  (valeurs continues 0–1)
    │
    └─► extractBits()
          Pour chaque bande i :
          bit[i] = chroma[i] > chroma[(i+1) % 12] ? 1 : 0
          → fingerprint binaire 12 bits (contours, pas valeurs absolues)
    │
    └─► hammingDistance(reference, current)
          = count(bits différents) / longueur
          → 0.0 = identique, 1.0 = totalement différent
    │
    └─► isSameTrack = hammingDistance <= 0.25
```

### Implémentation

```typescript
// LocalFingerprinter.ts

class LocalFingerprinter {
  private referenceFingerprint: number[] | null = null;
  private readonly HAMMING_THRESHOLD = 0.25;
  private readonly WINDOW_SIZE       = 6;
  private chromaWindow: Float32Array[] = [];

  addChromaFrame(chroma: Float32Array) {
    this.chromaWindow.push(chroma);
    if (this.chromaWindow.length > this.WINDOW_SIZE) {
      this.chromaWindow.shift();
    }
  }

  captureReference() {
    const avgChroma = this.getAverageChroma();
    if (!avgChroma) return;
    this.referenceFingerprint = this.extractBits(avgChroma);
  }

  clearReference() {
    this.referenceFingerprint = null;
    this.chromaWindow = [];
  }

  isSameTrack(): boolean | null {
    if (!this.referenceFingerprint || this.chromaWindow.length < 3) return null;
    const currentChroma = this.getAverageChroma();
    if (!currentChroma) return null;

    const currentBits = this.extractBits(currentChroma);
    const distance    = this.hammingDistance(this.referenceFingerprint, currentBits);
    return distance <= this.HAMMING_THRESHOLD;
  }

  private extractBits(chroma: Float32Array): number[] {
    const bits: number[] = [];
    for (let i = 0; i < chroma.length; i++) {
      bits.push(chroma[i] > chroma[(i + 1) % chroma.length] ? 1 : 0);
    }
    return bits;
  }

  private hammingDistance(a: number[], b: number[]): number {
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += a[i] !== b[i] ? 1 : 0;
    return diff / a.length;
  }

  private getAverageChroma(): Float32Array | null {
    if (this.chromaWindow.length === 0) return null;
    const avg = new Float32Array(12);
    for (const frame of this.chromaWindow) {
      for (let i = 0; i < 12; i++) avg[i] += frame[i];
    }
    for (let i = 0; i < 12; i++) avg[i] /= this.chromaWindow.length;
    return avg;
  }

  reset() {
    this.referenceFingerprint = null;
    this.chromaWindow = [];
  }
}
```

---

## 5. Couche 2 — ChromaFeatureStore (remplace MeydaFeatureStore)

Meyda n'est pas portable en React Native. On le remplace par un store minimaliste qui ne conserve que **chroma** — la seule feature que SpectralAnalyzer ne couvre pas de manière indépendante (ses MFCC et ceux de Meyda étaient redondants).

### Ce qui change par rapport à la version Web

| Web (Meyda) | React Native (ChromaFeatureStore) |
|---|---|
| MFCC Meyda × 0.45 | ❌ supprimé (SpectralAnalyzer le couvre) |
| Chroma Meyda × 0.30 | ✅ conservé → chroma × 0.70 |
| Centroid × 0.15 | ✅ conservé → centroid × 0.30 |
| RMS × 0.10 | ❌ supprimé (energy de SpectralAnalyzer suffit) |
| Veto Meyda | ❌ supprimé (trop instable) |

### Implémentation

```typescript
// ChromaFeatureStore.ts

interface ChromaFrame {
  chroma: Float32Array;
  spectralCentroid: number;
  capturedAt: number;
}

class ChromaFeatureStore {
  private readonly WINDOW_SIZE = 8;
  private frames: ChromaFrame[] = [];
  referenceFeatures: { chroma: Float32Array; centroid: number } | null = null;

  addFrame(chroma: Float32Array, spectralCentroid: number) {
    this.frames.push({ chroma, spectralCentroid, capturedAt: Date.now() });
    if (this.frames.length > this.WINDOW_SIZE) this.frames.shift();
  }

  // ← CORRIGÉ : délai de 1s avant de capturer la référence
  captureReferenceDelayed(delayMs = 1000): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.captureReference();
        resolve();
      }, delayMs);
    });
  }

  captureReference() {
    const snapshot = this.getSnapshot();
    if (!snapshot) return;
    this.referenceFeatures = {
      chroma:   snapshot.chroma,
      centroid: snapshot.centroid,
    };
  }

  clearReference() {
    this.referenceFeatures = null;
  }

  reset() {
    this.frames = [];
    this.referenceFeatures = null;
  }

  // Similarité vs référence : chroma (70%) + centroid (30%)
  computeSimilarity(): number | null {
    if (!this.referenceFeatures || this.frames.length < 4) return null;
    const current = this.getSnapshot();
    if (!current) return null;

    let score = 0, totalW = 0;

    // Chroma cosine
    const chromaSim = this.cosineSimilarity(
      this.referenceFeatures.chroma,
      current.chroma
    );
    score  += chromaSim * 0.70;
    totalW += 0.70;

    // Centroid normalisé
    const refC  = this.referenceFeatures.centroid;
    const curC  = current.centroid;
    const diff  = Math.abs(curC - refC) / Math.max(refC, 1);
    const simC  = Math.max(0, 1 - diff * 3);
    score  += simC * 0.30;
    totalW += 0.30;

    return totalW > 0 ? score / totalW : null;
  }

  private getSnapshot(): { chroma: Float32Array; centroid: number } | null {
    if (this.frames.length === 0) return null;
    const avg = new Float32Array(12);
    let centroidSum = 0;
    for (const f of this.frames) {
      for (let i = 0; i < 12; i++) avg[i] += f.chroma[i];
      centroidSum += f.spectralCentroid;
    }
    for (let i = 0; i < 12; i++) avg[i] /= this.frames.length;
    return { chroma: avg, centroid: centroidSum / this.frames.length };
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
```

---

## 6. Couche 2 — Fusion hybride

### `computeHybridChange()` — appelé toutes les 500ms

```
ENTRÉE : changeResult (SpectralAnalyzer), chromaStore (ChromaFeatureStore)

Guard silence :
  Si changeResult.silenceDetected
  └─► return { hybridChanged: true, hybridScore: 0 }
      (silence = changement certain, pas besoin de calculer)

Si chromaStore.frames < 4 OU pas de référence chroma :
  └─► hybridChanged = changeResult.changed
  └─► hybridScore   = 1 − changeScore/100
  └─► (SpectralAnalyzer seul, Chroma pas encore prêt)

Sinon :
  chromaSim           = chromaStore.computeSimilarity()
  chromaChangeFraction = 1 − chromaSim

  blendedScore = changeScore          × 0.75   ← SpectralAnalyzer dominant
               + chromaChangeFraction × 100 × 0.25   ← Chroma léger

  hybridScore = clamp(1 − blendedScore/100, 0, 1)

  hybridChanged = true  si :
    └─► blendedScore >= 45
    └─► OU blendedScore >= 28 ET strongSignals >= 2
    └─► OU chromaChangeFraction >= 0.40 ET changeScore >= 28
        (divergence harmonique forte + signal spectral confirmant)

SORTIE : { hybridChanged, hybridScore, blendedScore, chromaSim }
```

> **Pourquoi 75/25 et non 60/40 ?** ChromaFeatureStore ne couvre qu'une dimension (harmonie) là où SpectralAnalyzer couvre spectre, flux, énergie et silence. Le ratio reflète cette asymétrie.

### `computeHybridFingerprintSim()` — appelé dans auto-unlock

```
ENTRÉE : spectralCombined (float 0–1), chromaStore

Si chromaStore non prêt :
  └─► isSameMusic = spectralCombined >= 0.95
  └─► return

chromaSim = chromaStore.computeSimilarity()
blended   = spectralCombined × 0.75 + chromaSim × 0.25

// ← CORRIGÉ : pas de veto unilatéral Chroma
isSameMusic = blended >= 0.95

SORTIE : { isSameMusic, combinedSim: blended, chromaSim }
```

---

## 7. Couche 3 — Machine d'états

### Les 4 états

```typescript
type MonitorState = 'idle' | 'searching' | 'transition' | 'locked';
```

### Transitions complètes

```
IDLE
  │
  ▼  startMonitoring()
SEARCHING ◄──────────────────────────────────────────────────────────┐
  │                                                                    │
  ├─► silenceDetected = true                                          │
  │     └─► rester en SEARCHING, vider buffers, clearReference()     │
  │                                                                    │
  ├─► premier blob reçu (isFirst = true)                             │
  │     └─► TRANSITION ──► performApiCheck('initial')                │
  │                                                                    │
  └─► hybridChanged = true ET blob disponible                        │
        └─► TRANSITION ──► performApiCheck('search_change')          │
                                                                       │
TRANSITION                                                             │
  │                                                                    │
  ├─► API → identified (confidence >= 0.60)                          │
  │     └─► LOCKED ──► transitionToLocked(track)                    │
  │                                                                    │
  ├─► API → duplicate                                                 │
  │     └─► LOCKED ──► timer 5s                                     │
  │                                                                    │
  ├─► API → no match / rejected / low_confidence                     │
  │     └─► resetToSearching()  ──────────────────────────────────► ─┘
  │                                                                    │
  └─► API → error réseau                                             │
        └─► resetToSearching()  ──────────────────────────────────► ─┘

LOCKED
  │
  ├─► hybridChanged = true (boucle 500ms)                            │
  │     └─► annuler timer 5s                                         │
  │     └─► TRANSITION ──► performApiCheck('local_change')           │
  │                                                                    │
  ├─► timer 5s ──► performAutoUnlockCheck()                          │
  │     ├─► isSameMusic = true                                       │
  │     │     └─► rester LOCKED, reprogrammer timer 5s              │
  │     │     └─► fingerprintRefreshCounter++                       │
  │     │         Si counter >= 3 → rafraîchir empreintes           │
  │     │                                                             │
  │     └─► isSameMusic = false                                      │
  │           └─► TRANSITION ──► performApiCheck('recheck_change')  │
  │                                                                    │
  └─► stopMonitoring()                                               │
        └─► IDLE                                                      │
```

### `resetToSearching(reason)` — point de reset centralisé

```typescript
const resetToSearching = (reason: string) => {
  console.log('[resetToSearching]', reason);

  // 1. Clore le titre ouvert dans l'historique
  closeOpenHistoryTrack();

  // 2. Vider l'état courant
  currentTrack           = null;
  currentTrackStartedAt  = null;
  currentTrackElapsed    = 0;
  cachedFingerprint      = null;
  fingerprintRefreshCounter = 0;

  // 3. Réinitialiser les analyseurs
  spectralAnalyzer.clearReference();
  chromaStore.clearReference();
  localFingerprinter.clearReference();

  // 4. Vider les buffers audio
  firstBlobReceived    = false;          // ← forcer une nouvelle identification
  lastAudioBlob        = null;
  pendingApiTrigger    = 'initial';      // ← déclencher immédiatement le prochain blob

  // 5. Changer d'état
  monitorState = 'searching';
};
```

### `transitionToLocked(track)` — verrouillage sur un titre identifié

```typescript
const transitionToLocked = (track: Track) => {
  monitorState          = 'locked';
  currentTrack          = track;
  currentTrackStartedAt = Date.now();
  fingerprintRefreshCounter = 0;

  // Référence SpectralAnalyzer (immédiate)
  const refSpectrum = spectralAnalyzer.getAverageSpectrum();
  spectralAnalyzer.setReference(refSpectrum);

  // Référence LocalFingerprinter (immédiate)
  localFingerprinter.captureReference();

  // Référence ChromaStore ← CORRIGÉ : délai 1s pour laisser le store se stabiliser
  chromaStore.captureReferenceDelayed(1000);

  // Empreinte complète pour auto-unlock
  cachedFingerprint = {
    titre:    track.titre,
    artiste:  track.artiste,
    isrc:     track.isrc,
    spectrum: Float32Array.from(refSpectrum),
    mfcc:     Float32Array.from(spectralAnalyzer.getAverageMFCC()),
    chroma:   Float32Array.from(spectralAnalyzer.getAverageChroma()),
    energy:   spectralAnalyzer.getAverageEnergy(),
    capturedAt: Date.now(),
  };

  // Timer auto-unlock
  scheduleAutoUnlockCheck(5000);
};
```

---

## 8. Couche 3 — Auto-unlock

Déclenché toutes les **5 secondes** quand l'état est `LOCKED`.

### Calcul du score spectral (SpectralAnalyzer)

```
spectralCombined =
  cosineSimilarity(cachedFingerprint.spectrum, currentSpectrum) × 0.50
  + cosineSimilarity(cachedFingerprint.mfcc,   currentMFCC)    × 0.30
  + cosineSimilarity(cachedFingerprint.chroma, currentChroma)  × 0.15
  + (1 − energyDelta)                                          × 0.05

energyDelta = |currentEnergy − refEnergy| / max(refEnergy, 0.05)
```

### Décision finale

```
Guard anti-double-appel :
  Si isApiCallInProgress
  └─► setTimeout(performAutoUnlockCheck, 3000)
  └─► return

hybridResult = computeHybridFingerprintSim(spectralCombined)

// Vérification Hamming en parallèle
hammingOk = localFingerprinter.isSameTrack()

isSameMusic =
  hybridResult.isSameMusic               // score >= 0.95
  AND energyDelta <= 0.20                // pas de saut d'énergie brutal
  AND (hammingOk === null OR hammingOk)  // Hamming confirme OU pas encore prêt

Si isSameMusic :
  └─► monitorState = 'locked'
  └─► fingerprintRefreshCounter++
  └─► Si counter >= 3 :
        cachedFingerprint ← snapshot courant
        spectralAnalyzer.setReference(currentSpectrum)
        chromaStore.captureReference()           // pas de délai ici (déjà stabilisé)
        localFingerprinter.captureReference()
        fingerprintRefreshCounter = 0
  └─► scheduleAutoUnlockCheck(5000)

Sinon :
  └─► monitorState = 'transition'
  └─► performApiCheck('recheck_change')
```

### Cooldown API — AJOUT

```typescript
const API_COOLDOWN_MS = 3000;
let lastApiCallTime = 0;

const performApiCheck = (triggerMethod: TriggerMethod) => {
  if (isApiCallInProgress) return;

  // ← AJOUT : cooldown entre deux appels successifs
  if (Date.now() - lastApiCallTime < API_COOLDOWN_MS) {
    console.log('[API cooldown] trigger ignoré:', triggerMethod);
    return;
  }

  lastApiCallTime = Date.now();
  isApiCallInProgress = true;
  // ... suite ...
};
```

---

## 9. Couche 4 — API client

### Endpoint d'identification

```
POST /v1/audio/capturer
Content-Type: multipart/form-data

audio          : Blob (audio/webm ou audio/m4a)
etablissementId: string (UUID)
duree          : "15"
capturedAt     : ISO 8601
```

### Réponses et comportements

```
{ success: true, statut: 'identified', resultat: { titre, artiste, isrc, confidence, ... } }
  └─► confidence >= 0.60  →  transitionToLocked(track)
  └─► confidence <  0.60  →  resetToSearching('low_confidence_frontend')

{ success: true, duplicate: true }
  └─► Si recheck/local_change  →  rester LOCKED, reprogrammer timer
  └─► Sinon                    →  setReference() + rester LOCKED

{ success: true, rejected: true, reason: 'low_confidence' }
  └─► Si recheck/local_change  →  resetToSearching('low_confidence_backend')
  └─► Sinon                    →  searching + clearReference()

{ success: true, statut: 'not_found' }  OU  { success: false }
  └─► Si recheck/local_change  →  resetToSearching('no_match')
  └─► Sinon                    →  searching + clearReference()

Erreur réseau / timeout
  └─► Si recheck/local_change  →  resetToSearching('network_error')
  └─► Sinon                    →  searching + clearReference()
```

### Refresh token

```
401 reçu
  └─► POST /v1/auth/refresh  { refreshToken }
      ├─► 200  →  stocker nouveaux tokens, retenter la requête originale
      └─► 4xx  →  handleLogout(), clearTokens()
```

---

## 10. Couche 5 — Historique et synchronisation

### Structure d'un enregistrement

```typescript
interface TrackRecord {
  id:              string;   // UUID
  titre:           string;
  artiste:         string;
  album?:          string;
  genre?:          string;
  label?:          string;
  isrc?:           string;
  confidence:      number;
  detectedAt:      string;   // ISO 8601
  endedAt?:        string;   // ISO 8601, null si en cours
  durationSeconds?: number;
  detectionMethod: 'initial' | 'search_change' | 'local_change' | 'recheck_change';
  synced:          boolean;
}
```

### Déduplication

```
Avant d'ajouter un enregistrement :

isDuplicate = true  si :
  └─► newTrack.isrc === lastTrack.isrc  (si ISRC disponibles)
  └─► OU newTrack.titre === lastTrack.titre ET newTrack.artiste === lastTrack.artiste

Si isDuplicate :
  └─► mettre à jour endedAt du dernier enregistrement
  └─► ne pas créer de nouvel enregistrement

Sinon :
  └─► clore lastTrack (endedAt = now)
  └─► push nouveau TrackRecord
```

### Synchronisation batch

```
POST /v1/audio/sync
Content-Type: application/json

{
  "captures": [
    {
      "trackId": "uuid",
      "titre": "...",
      "etablissementId": "uuid",
      "detectedAt": "ISO",
      "endedAt": "ISO",
      ...
    }
  ]
}
```

```
Déclenché :
  └─► Quand connexion revient (online event)
  └─► À stopMonitoring() si pendingSyncCount > 0
  └─► Après chaque identification confirmée (délai 1s)

Sur succès → marquer tous les enregistrements envoyés comme synced = true
Sur échec  → conserver en local, retenter à la prochaine opportunité
```

---

## 11. State management React

### Structure du store principal (Zustand recommandé)

```typescript
interface MonitoringStore {
  // État machine
  monitorState:         MonitorState;
  isMonitoring:         boolean;

  // Session
  sessionStartTime:     number | null;
  sessionDuration:      number;
  apiCallCount:         number;

  // Titre courant
  currentTrack:         Track | null;
  currentTrackElapsed:  number;

  // Métriques locales (affichage)
  spectralStability:    number;    // 0–1
  hybridScore:          number;    // 0–1
  chromaSim:            number;    // 0–1
  blendedScore:         number;    // 0–100

  // Sync
  eveningHistory:       TrackRecord[];
  pendingSyncCount:     number;
  isOnline:             boolean;

  // Actions
  startMonitoring:  () => Promise<void>;
  stopMonitoring:   () => void;
  exportHistory:    () => void;
}
```

### Hook orchestrateur — `useMonitoring.ts`

```typescript
// useMonitoring.ts

export const useMonitoring = () => {
  const store = useMonitoringStore();

  // Instances des services (refs stables)
  const captureService     = useRef(new AudioCaptureService());
  const spectralAnalyzer   = useRef(new SpectralAnalyzer());
  const chromaStore        = useRef(new ChromaFeatureStore());
  const localFingerprinter = useRef(new LocalFingerprinter());
  const hybridDetector     = useRef(new HybridChangeDetector());

  // Timer refs
  const analysisTimer      = useRef<ReturnType<typeof setInterval>>();
  const lockTimer          = useRef<ReturnType<typeof setTimeout>>();

  // Démarrage
  const startMonitoring = async () => {
    await captureService.current.start(handleBlobReady);
    analysisTimer.current = setInterval(runLocalAnalysis, 500);
    store.setIsMonitoring(true);
    store.setMonitorState('searching');
  };

  // Boucle d'analyse locale (500ms)
  const runLocalAnalysis = () => {
    const fftData = captureService.current.getLatestFFT();
    if (!fftData) return;

    const sample = spectralAnalyzer.current.analyze(fftData);
    spectralAnalyzer.current.addSample(sample);

    // Alimenter ChromaStore depuis les features SpectralAnalyzer
    chromaStore.current.addFrame(sample.chroma, sample.spectralCentroid);
    localFingerprinter.current.addChromaFrame(sample.chroma);

    const changeResult = spectralAnalyzer.current.checkForChange();
    const hybrid = hybridDetector.current.computeHybridChange(
      changeResult,
      chromaStore.current
    );

    // Mettre à jour les métriques UI
    store.setHybridScore(hybrid.hybridScore);
    store.setChromaSim(hybrid.chromaSim ?? 0);

    handleStateTransition(changeResult, hybrid);
  };

  // ...
  return { ...store, startMonitoring, stopMonitoring };
};
```

### Cycle de vie de l'app — AppState

```typescript
// Dans useMonitoring.ts

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      // iOS : le micro doit être libéré en arrière-plan
      if (store.isMonitoring) stopMonitoring();
    }
  });
  return () => subscription.remove();
}, [store.isMonitoring]);
```

---

## 12. Constantes

```typescript
// constants/audio.ts

export const AUDIO = {
  // Boucle d'analyse
  ANALYSIS_INTERVAL_MS:       500,

  // SpectralAnalyzer
  FFT_SIZE:                   256,
  SMOOTHING:                  0.8,
  BANDS:                      32,
  SIMILARITY_THRESHOLD:       0.96,
  CONSECUTIVE_REQUIRED:       2,      // ← CORRIGÉ (était 1)
  MAX_HISTORY_SIZE:           12,
  REFERENCE_WINDOW_SIZE:      6,
  RECENT_WINDOW_SIZE:         2,
  SILENCE_THRESHOLD:          0.025,
  SILENCE_FRAMES_REQUIRED:    4,
  CHANGE_THRESHOLD:           45,
  SUSPICION_THRESHOLD:        28,
  MFCC_COUNT:                 13,
  MEL_BANDS:                  26,

  // ChromaFeatureStore
  CHROMA_WINDOW_SIZE:         8,
  CHROMA_MIN_FRAMES:          4,
  CHROMA_REFERENCE_DELAY_MS:  1000,   // ← AJOUT

  // LocalFingerprinter
  HAMMING_THRESHOLD:          0.25,
  FINGERPRINT_WINDOW_SIZE:    6,

  // Fusion hybride
  SPECTRAL_WEIGHT:            0.75,   // ← CORRIGÉ (était 0.60)
  CHROMA_WEIGHT:              0.25,   // ← CORRIGÉ (était 0.40)
  CHROMA_CHANGE_THRESHOLD:    0.40,   // divergence harmonique significative

  // Auto-unlock
  FINGERPRINT_THRESHOLD:      0.95,
  ENERGY_THRESHOLD:           0.20,
  FINGERPRINT_REFRESH_CYCLES: 3,
  AUTO_UNLOCK_INTERVAL_MS:    5000,
  AUTO_UNLOCK_RETRY_MS:       3000,   // si API en cours

  // API
  MIN_CONFIDENCE:             0.60,
  API_COOLDOWN_MS:            3000,   // ← AJOUT

  // MediaRecorder
  CHUNK_INTERVAL_MS:          5000,
  MIN_CHUNKS_FOR_BLOB:        3,
} as const;
```

---

## 13. Dépendances recommandées

### Audio

| Package | Usage |
|---|---|
| `expo-av` | Enregistrement audio, gestion permissions |
| `expo-file-system` | Lecture des fichiers audio enregistrés |
| `react-native-audio-analyser` | Données FFT brutes (Option B sans WebView) |

### State management

| Package | Usage |
|---|---|
| `zustand` | Store global léger, pas de boilerplate Context |
| `@react-native-async-storage/async-storage` | Persistance session locale |

### Réseau

| Package | Usage |
|---|---|
| `@react-native-community/netinfo` | Détection online/offline pour sync batch |

### Utilitaires DSP

Aucune dépendance externe — les fonctions suivantes sont à implémenter en TypeScript pur dans `utils/dsp.ts` :

```
melFilterBank(binMagnitudes, sampleRate, melBands)
dct(vector)
computeMFCCFromFFT(binMagnitudes, sampleRate)
computeChromaFromFFT(binMagnitudes, sampleRate)
cosineSimilarity(a, b)
hammingDistance(a, b)
```

Toutes ces fonctions sont portables depuis le code JavaScript existant sans modification — elles opèrent uniquement sur des tableaux numériques.

### À éviter

| Package | Raison |
|---|---|
| `meyda` | Dépend de Web Audio API, non disponible nativement |
| `tone.js` | Idem |
| WebRTC direct | Complexité inutile, `expo-av` suffit |