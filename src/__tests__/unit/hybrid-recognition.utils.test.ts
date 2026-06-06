import { config } from '../../config';
import { fingerprintService } from '../../services/fingerprint.service';
import { buildTrackKey, normalizeForMatch } from '../../utils/normalization';

describe('Hybrid recognition utilities', () => {
  describe('normalizeForMatch', () => {
    it('normalise les accents, la casse, la ponctuation et les espaces', () => {
      expect(normalizeForMatch('  Dadju feat. Tayc  ')).toBe('dadju feat tayc');
      expect(normalizeForMatch('Été, Brûlant !')).toBe('ete brulant');
    });
  });

  describe('buildTrackKey', () => {
    it('priorise l ISRC quand il est fourni', () => {
      expect(buildTrackKey({
        isrc: ' US-RC1-76-07839 ',
        titre: 'Calm Down',
        artiste: 'Rema',
      })).toBe('isrc:usrc17607839');
    });

    it('utilise titre et artiste normalises sans ISRC', () => {
      expect(buildTrackKey({
        titre: 'Calm Down',
        artiste: 'Rema',
      })).toBe('track:calm down|rema');
    });
  });

  describe('FingerprintService', () => {
    it('retombe sur une empreinte hash stable quand Chromaprint est indisponible', async () => {
      const previousFpcalcPath = config.fingerprint.fpcalcPath;
      const previousFallback = config.fingerprint.allowHashFallback;
      config.fingerprint.fpcalcPath = 'fpcalc-not-installed-for-test';
      config.fingerprint.allowHashFallback = true;

      try {
        const first = await fingerprintService.generate(Buffer.from('audio-sample'), 'sample.wav');
        const second = await fingerprintService.generate(Buffer.from('audio-sample'), 'sample.wav');

        expect(first.algorithm).toBe('sha256_fallback');
        expect(first.fingerprintHash).toBe(second.fingerprintHash);
      } finally {
        config.fingerprint.fpcalcPath = previousFpcalcPath;
        config.fingerprint.allowHashFallback = previousFallback;
      }
    });
  });
});
