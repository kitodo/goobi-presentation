/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import { generateTimecodeUrl, generateTimerangeUrl } from './generateTimecodeUrl';

describe('generateTimecodeUrl', () => {
  /**
   * @param {number | dlf.media.TimeRange | null} timecode
   * @param {Browser} env
   */
  const url = (timecode, env) => {
    const url = typeof timecode === 'object'
      ? generateTimerangeUrl(timecode, env)
      : generateTimecodeUrl(timecode, env);
    return url.toString()
  };

  /**
   * @param {URL} location
   * @returns {Browser}
   */
  const mkEnv = (location) => {
    return {
      getLocation: () => location,
      supportsMediaSource: () => false,
      supportsCanvasExport: () => false,
      supportsVideoMime: () => false,
      isInFullScreen: () => false,
      toggleFullScreen: () => { },
    };
  }

  test('basic', () => {
    const env = mkEnv(new URL("http://localhost/video"));

    expect(url(null, env)).toBe("http://localhost/video");
    expect(url(1, env)).toBe("http://localhost/video?timecode=1");
  });

  test('overrides timecode', () => {
    /** @type {Browser} */
    const env = mkEnv(new URL("http://localhost/video?timecode=2"));

    expect(url(null, env)).toBe("http://localhost/video");
    expect(url(1, env)).toBe("http://localhost/video?timecode=1");
  });

  test('can generate URL for time range', () => {
    const env = mkEnv(new URL("http://localhost/video"));

    expect(url({ startTime: 0, endTime: 0 }, env)).toBe("http://localhost/video");
    expect(url({ startTime: 10, endTime: 5 }, env)).not.toBe("http://localhost/video?timecode=10%2C5");
    expect(url({ startTime: 0, endTime: null }, env)).toBe("http://localhost/video");
    expect(url({ startTime: 0, endTime: 10 }, env)).toBe("http://localhost/video?timecode=0%2C10");
    expect(url({ startTime: 10, endTime: 10 }, env)).toBe("http://localhost/video?timecode=10");
    expect(url({ startTime: 10, endTime: 20 }, env)).toBe("http://localhost/video?timecode=10%2C20");
  });
});
