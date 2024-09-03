/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import Environment from 'lib/Environment';

describe('mkid', () => {
  test('basic', () => {
    const env = new Environment();

    const id_1 = env.mkid();
    const id_2 = env.mkid();

    expect(id_1).not.toBe(id_2);
  });
});

describe('supportsCanvasExport', () => {
  test('basic', () => {
    const env = new Environment();
    expect(env.supportsCanvasExport('image/png')).toBe(true);
    expect(env.supportsCanvasExport('video/mp4')).toBe(false);
    expect(env.supportsCanvasExport('not-a-mimetype')).toBe(false);
  });
});

describe('setLang / t', () => {
  const env = new Environment();
  env.setLang({
    locale: 'en_US',
    twoLetterIsoCode: 'en',
    phrases: {
      'apple': "{count, plural, =0 {no apple} one {one apple} other {# apples}}",
      'test': "Test",
    },
  });

  test('basic', () => {
    expect(env.t('apple', { count: 0 })).toBe("no apple");
    expect(env.t('apple', { count: 1 })).toBe("one apple");
    expect(env.t('apple', { count: 3 })).toBe("3 apples");
  });

  test('uses fallback for translation', () => {
    expect(env.t('test', {}, () => 'fallback')).toBe("Test");
    expect(env.t('not.existent', {}, () => 'fallback')).toBe("fallback");
  });
});
