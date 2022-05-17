/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import generateTimecodeUrl from './generateTimecodeUrl';

describe('generateTimecodeUrl', () => {
  /**
   * @param {number | null} timecode
   * @param {Browser} env
   */
  const url = (timecode, env) => generateTimecodeUrl(timecode, env).toString();

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
});
