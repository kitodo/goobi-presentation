// @ts-check

import { describe, expect, test } from '@jest/globals';
import BandEq from 'SlubMediaPlayer/components/equalizer/filtersets/BandEq';

describe('BandEq', () => {
  // const context = new OfflineAudioContext({
  //   length: 48000,
  //   sampleRate: 48000,
  // });

  // test('can generate filters', () => {
  //   const band10 = new BandEq(context);
  //   band10.autofill(1);
  //   expect(band10.filters.length).toBe(10);

  //   const band29 = new BandEq(context);
  //   band29.autofill(1 / 3);
  //   expect(band29.filters.length).toBe(29);
  // });

  test('can calculate Q', () => {
    expect(BandEq.octavesToQ(1)).toBeCloseTo(1.41);
    expect(BandEq.octavesToQ(1 / 3)).toBeCloseTo(4.31, 1);

    for (let o = 0.5; o < 3; o += 0.1) {
      expect(BandEq.qToOctaves(BandEq.octavesToQ(o))).toBeCloseTo(o);
    }
  });
});
