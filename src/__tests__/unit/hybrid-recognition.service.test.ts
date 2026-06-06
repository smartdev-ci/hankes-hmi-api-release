import { jest } from '@jest/globals';
import hybridRecognitionService from '../../services/hybrid-recognition.service';
import { AudioCaptureService, FingerprintRepository, MusicRecognitionService, TrackService } from '../../database/services';
import { DiffusionService } from '../../database/services/diffusion.service';
import acrcloudService from '../../services/acrcloud.service';
import fingerprintService from '../../services/fingerprint.service';
import recognitionCacheService from '../../services/recognition-cache.service';

jest.mock('../../database/services', () => ({
  AudioCaptureService: {
    markAsProcessed: jest.fn(),
    markAsFailed: jest.fn(),
    checkDuplicate: jest.fn(),
  },
  FingerprintRepository: {
    findRecognitionByHash: jest.fn(),
    create: jest.fn(),
    toCachedRecognition: jest.fn(),
  },
  MusicRecognitionService: {
    create: jest.fn(),
    createFromExisting: jest.fn(),
  },
  TrackService: {
    findById: jest.fn(),
    upsertFromRecognition: jest.fn(),
  },
}));

jest.mock('../../database/services/diffusion.service', () => ({
  DiffusionService: {
    create: jest.fn(),
  },
}));

jest.mock('../../services/acrcloud.service', () => ({
  __esModule: true,
  default: {
    identify: jest.fn(),
  },
}));

jest.mock('../../services/fingerprint.service', () => ({
  __esModule: true,
  default: {
    generate: jest.fn(),
  },
}));

jest.mock('../../services/recognition-cache.service', () => ({
  __esModule: true,
  default: {
    setByFingerprintHash: jest.fn(),
  },
}));

describe('HybridRecognitionService', () => {
  const input = {
    captureId: 'capture-1',
    etablissementId: 'etab-1',
    userId: 'user-1',
    audioBuffer: Buffer.from('test'),
    filename: 'track.wav',
    capturedAt: new Date('2026-06-06T12:00:00Z'),
    duree: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enregistre une diffusion quand une musique est identifiee via ACRCloud', async () => {
    const fingerprint = {
      fingerprint: 'fingerprint',
      fingerprintHash: 'hash',
      algorithm: 'sha256',
    };

    const metadata = {
      title: 'Titre Test',
      artist: 'Artiste Test',
      confidence: 0.95,
      isrc: 'US-ABC-12-34567',
      label: 'Label Test',
      genres: ['pop'],
      releaseDate: '2024-01-01',
    };

    const recognition = {
      id: 'recog-1',
      titre: metadata.title,
      artiste: metadata.artist,
      isrc: metadata.isrc,
      label: metadata.label,
      genre: metadata.genres.join(', '),
      annee: 2024,
      confidence: metadata.confidence,
      source: 'acrcloud',
      metadata: { ...metadata, fingerprintAlgorithm: fingerprint.algorithm },
    };

    (fingerprintService.generate as jest.Mock).mockResolvedValue(fingerprint);
    (FingerprintRepository.findRecognitionByHash as jest.Mock).mockResolvedValue(null);
    (AudioCaptureService.checkDuplicate as jest.Mock).mockResolvedValue({ isDuplicate: false });
    (acrcloudService.identify as jest.Mock).mockResolvedValue(metadata);
    (TrackService.upsertFromRecognition as jest.Mock).mockResolvedValue({ id: 'track-1' });
    (MusicRecognitionService.create as jest.Mock).mockResolvedValue(recognition);
    (DiffusionService.create as jest.Mock).mockResolvedValue({ id: 'diff-1' });
    (AudioCaptureService.markAsProcessed as jest.Mock).mockResolvedValue({ id: input.captureId, statut: 'identified' });
    (recognitionCacheService.setByFingerprintHash as jest.Mock).mockResolvedValue(undefined);

    const result = await hybridRecognitionService.processCapture(input);

    expect(result.status).toBe('identified');
    expect(result.diffusion).toEqual({ id: 'diff-1' });
    expect(DiffusionService.create).toHaveBeenCalledWith(expect.objectContaining({
      etablissementId: input.etablissementId,
      musicId: recognition.id,
      titre: recognition.titre,
      artiste: recognition.artiste,
      playedAt: input.capturedAt,
      duree: input.duree,
      source: 'capture',
      userId: input.userId,
      captureId: input.captureId,
    }));
    expect(AudioCaptureService.markAsProcessed).toHaveBeenCalledWith(input.captureId);
  });

  it('enregistre une diffusion quand une musique est identifiee localement', async () => {
    const fingerprint = {
      fingerprint: 'fingerprint',
      fingerprintHash: 'hash',
      algorithm: 'sha256',
    };

    const localRecognition = {
      trackId: 'track-2',
      titre: 'Titre Local',
      artiste: 'Artiste Local',
      album: 'Album Local',
      isrc: 'US-LOCAL-01-00001',
      label: 'Label Local',
      genre: 'rock',
      annee: 2023,
      confidence: 0.98,
      source: 'local_database',
      metadata: { local: true },
    };

    const recognition = {
      id: 'recog-2',
      captureId: input.captureId,
      trackId: localRecognition.trackId,
      titre: localRecognition.titre,
      artiste: localRecognition.artiste,
      album: localRecognition.album,
      isrc: localRecognition.isrc,
      label: localRecognition.label,
      genre: localRecognition.genre,
      annee: localRecognition.annee,
      confidence: localRecognition.confidence,
      source: localRecognition.source,
      metadata: localRecognition.metadata,
    };

    (fingerprintService.generate as jest.Mock).mockResolvedValue(fingerprint);
    (FingerprintRepository.findRecognitionByHash as jest.Mock).mockResolvedValue({
      source: 'database',
      recognition: localRecognition,
    });
    (AudioCaptureService.checkDuplicate as jest.Mock).mockResolvedValue({ isDuplicate: false });
    (TrackService.findById as jest.Mock).mockResolvedValue({ id: localRecognition.trackId });
    (MusicRecognitionService.createFromExisting as jest.Mock).mockResolvedValue(recognition);
    (DiffusionService.create as jest.Mock).mockResolvedValue({ id: 'diff-2' });
    (AudioCaptureService.markAsProcessed as jest.Mock).mockResolvedValue({ id: input.captureId, statut: 'identified' });
    (recognitionCacheService.setByFingerprintHash as jest.Mock).mockResolvedValue(undefined);

    const result = await hybridRecognitionService.processCapture(input);

    expect(result.status).toBe('identified');
    expect(result.diffusion).toEqual({ id: 'diff-2' });
    expect(DiffusionService.create).toHaveBeenCalledWith(expect.objectContaining({
      etablissementId: input.etablissementId,
      musicId: recognition.id,
      titre: recognition.titre,
      artiste: recognition.artiste,
      playedAt: input.capturedAt,
      duree: input.duree,
      source: 'capture',
      userId: input.userId,
      captureId: input.captureId,
    }));
    expect(AudioCaptureService.markAsProcessed).toHaveBeenCalledWith(input.captureId);
  });
});
