// @ts-check

import { describe, expect, test } from '@jest/globals';
import buildTimeString from 'DlfMediaPlayer/lib/buildTimeString';

describe('buildTimeString', () => {
  test('basic', () => {
    expect(buildTimeString(45, false)).toBe("0:45.00");
    expect(buildTimeString(45.129, false)).toBe("0:45.12"); // floor, don't round
    expect(buildTimeString(45, true)).toBe("0:00:45.00");
    expect(buildTimeString(45.129, true)).toBe("0:00:45.12");
    expect(buildTimeString(60, false)).toBe("1:00.00");
    expect(buildTimeString(60, true)).toBe("0:01:00.00");
    expect(buildTimeString(3599, false)).toBe("59:59.00");
    expect(buildTimeString(3599, true)).toBe("0:59:59.00");
    expect(buildTimeString(3600, false)).toBe("60:00.00");
    expect(buildTimeString(3600, true)).toBe("1:00:00.00");
    expect(buildTimeString(3600 * 123, true)).toBe("123:00:00.00");
  });

  test('with fps', () => {
    expect(buildTimeString(0.00, false, 5)).toBe("0:00:00f");
    expect(buildTimeString(0.25, false, 5)).toBe("0:00:01f");
    expect(buildTimeString(0.50, false, 5)).toBe("0:00:02f");
    expect(buildTimeString(0.75, false, 5)).toBe("0:00:03f");
    expect(buildTimeString(1.00, false, 5)).toBe("0:01:00f");
    expect(buildTimeString(1.25, false, 5)).toBe("0:01:01f");
  });

  test('no fps marker when showing hour', () => {
    expect(buildTimeString(1.25, true, 5)).toBe("0:00:01:01");
  });
});
