// @ts-check

import { paramKeys as riaaParamKeys } from 'SlubMediaPlayer/components/equalizer/filtersets/RiaaEq';

/**
 * Parse user-supplied preset {@link data} into a {@link dlf.media.eq.FilterPreset}
 * object.
 *
 * @param {any} data
 * @returns {dlf.media.eq.FilterPreset | null}
 */
export function parsePreset(data) {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const { group, label, mode } = data;

  if (!(typeof group === 'string' && typeof label === 'string')) {
    return null;
  }

  /** @type {Pick<dlf.media.eq.FilterPreset, 'key' | 'group' | 'label'>} */
  const result = { group, label };
  if (typeof data.key === 'string') {
    result.key = data.key;
  }

  if (mode === 'band-iso') {
    const octaveStep = Number(data.octaveStep);
    if (octaveStep > 0) {
      return { ...result, mode, octaveStep };
    }
  } else if (mode === 'band') {
    if (Array.isArray(data.bands)) {
      const bands = [];
      for (const band of data.bands) {
        if (typeof band !== 'object' || band === null) {
          continue;
        }

        const frequency = Number(band.frequency);
        const octaves = Number(band.octaves);
        const gain = Number(band.gain);

        if (frequency > 0 && octaves > 0 && Number.isFinite(gain)) {
          bands.push({ frequency, octaves, gain });
        }
      }
      return { ...result, mode, bands };
    }
  } else if (mode === 'riaa') {
    if (typeof data.params === 'object' && data.params !== null) {
      /** @type {Partial<import('SlubMediaPlayer/components/equalizer/filtersets/RiaaEq').RiaaParams>} */
      const params = {};
      let prev = Number.POSITIVE_INFINITY;
      for (const key of riaaParamKeys) {
        const value = Number(data.params[key]);
        if (value < prev) {
          params[key] = value;
          prev = value;
        } else {
          params[key] = null;
        }
      }
      return {
        ...result,
        mode,
        params: /** @type {import('SlubMediaPlayer/components/equalizer/filtersets/RiaaEq').RiaaParams} */(params),
      };
    }
  }

  return null;
}
