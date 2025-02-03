/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import UrlGenerator from 'SlubMediaPlayer/lib/UrlGenerator';

describe('UrlGenerator', () => {
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
      getKeyboardVariant: () => 'ibm',
      isInFullScreen: () => false,
      toggleFullScreen: () => { },
    };
  }

  test('basic', () => {
    const env = mkEnv(new URL("http://localhost/video"));
    const gen = new UrlGenerator(env);

    expect(gen.generateTimecodeUrl(null).toString()).toBe("http://localhost/video");
    expect(gen.generateTimecodeUrl(1).toString()).toBe("http://localhost/video?timecode=1");
  });

  test('overrides timecode', () => {
    const env = mkEnv(new URL("http://localhost/video?timecode=2"));
    const gen = new UrlGenerator(env);

    expect(gen.generateTimecodeUrl(null).toString()).toBe("http://localhost/video");
    expect(gen.generateTimecodeUrl(1).toString()).toBe("http://localhost/video?timecode=1");
  });

  test('can generate URL for time range', () => {
    const env = mkEnv(new URL("http://localhost/video"));
    const gen = new UrlGenerator(env);

    expect(gen.generateTimerangeUrl({ startTime: 0, endTime: 0 }).toString()).toBe("http://localhost/video");
    expect(gen.generateTimerangeUrl({ startTime: 10, endTime: 5 }).toString()).not.toBe("http://localhost/video?timecode=10%2C5");
    expect(gen.generateTimerangeUrl({ startTime: 0, endTime: null }).toString()).toBe("http://localhost/video");
    expect(gen.generateTimerangeUrl({ startTime: 0, endTime: 10 }).toString()).toBe("http://localhost/video?timecode=0%2C10");
    expect(gen.generateTimerangeUrl({ startTime: 10, endTime: 10 }).toString()).toBe("http://localhost/video?timecode=10");
    expect(gen.generateTimerangeUrl({ startTime: 10, endTime: 20 }).toString()).toBe("http://localhost/video?timecode=10%2C20");
  });
});
