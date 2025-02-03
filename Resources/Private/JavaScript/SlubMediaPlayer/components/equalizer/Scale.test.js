// @ts-check

import { describe, expect, test } from '@jest/globals';
import Scale, { Linear, Logarithmic } from 'SlubMediaPlayer/components/equalizer/Scale';

describe('Scale', () => {
  test('can convert up to 10000 Hz', () => {
    const lf = new Scale(1, 10000, 0, 1, Logarithmic);

    expect(lf.convert(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(lf.invert(0)).toBeCloseTo(1);

    expect(lf.convert(10)).toBeCloseTo(0.25);
    expect(lf.invert(0.25)).toBeCloseTo(10);

    expect(lf.convert(100)).toBeCloseTo(0.5);
    expect(lf.invert(0.5)).toBeCloseTo(100);

    expect(lf.convert(1000)).toBeCloseTo(0.75);
    expect(lf.invert(0.75)).toBeCloseTo(1000);

    expect(lf.convert(10000)).toBeCloseTo(1);
    expect(lf.invert(1)).toBeCloseTo(10000);
  });

  test('can convert up to 10000 Hz, visible from 10 Hz', () => {
    for (const scale of [1, 2, 3]) {
      const lf = new Scale(10, 10000, 0, scale, Logarithmic);

      expect(lf.convert(1)).toBeCloseTo(-1 / 3 * scale);
      expect(lf.invert(-1 / 3 * scale)).toBeCloseTo(1);

      expect(lf.convert(10)).toBeCloseTo(0 / 3 * scale);
      expect(lf.invert(0 / 3 * scale)).toBeCloseTo(10);

      expect(lf.convert(100)).toBeCloseTo(1 / 3 * scale);
      expect(lf.invert(1 / 3 * scale)).toBeCloseTo(100);

      expect(lf.convert(1000)).toBeCloseTo(2 / 3 * scale);
      expect(lf.invert(2 / 3 * scale)).toBeCloseTo(1000);

      expect(lf.convert(10000)).toBeCloseTo(3 / 3 * scale);
      expect(lf.invert(3 / 3 * scale)).toBeCloseTo(10000);

      expect(lf.convert(100000)).toBeCloseTo(4 / 3 * scale);
      expect(lf.invert(4 / 3 * scale)).toBeCloseTo(100000);
    }
  });

  test('can use linear scale', () => {
    const lf = new Scale(-24, 24, 1000, 0, Linear);

    expect(lf.convert(-24)).toBe(1000);
    expect(lf.invert(1000)).toBe(-24);

    expect(lf.convert(0)).toBe(500);
    expect(lf.invert(500)).toBe(0);

    expect(lf.convert(24)).toBe(0);
    expect(lf.invert(0)).toBe(24);
  });
});
