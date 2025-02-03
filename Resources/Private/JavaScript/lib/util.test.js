// @ts-check

import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { Blob } from 'buffer';
import { arrayToCsv, dataUrlMime, clamp, sanitizeBasename, withObjectUrl, zeroPad, fillPlaceholders } from 'lib/util';

describe('arrayToCsv', () => {
  test('basic', () => {
    expect(arrayToCsv([
      [`Hello, World`, `"Hello, World"`],
      [`foo`],
    ])).toBe(`"Hello, World";"""Hello, World"""\n"foo"`);
  });
});

describe('clamp', () => {
  test('basic', () => {
    expect(clamp(1, [2, 3])).toBe(2);
    expect(clamp(2.5, [2, 3])).toBe(2.5);
    expect(clamp(4, [2, 3])).toBe(3);
  });
});

describe('fillPlaceholders', () => {
  test('basic', () => {
    expect(fillPlaceholders("{a} {b}", { a: "A", b: "B" })).toBe("A B");
  });
});

describe('zeroPad', () => {
  test('basic', () => {
    expect(zeroPad(0, 0)).toBe('0');
    expect(zeroPad(0, 1)).toBe('0');
    expect(zeroPad(0, 2)).toBe('00');

    expect(zeroPad(123, 2)).toBe('123');
    expect(zeroPad(123, 3)).toBe('123');
    expect(zeroPad(123, 4)).toBe('0123');
  });
});

describe('dataUrlMime', () => {
  test('basic', () => {
    expect(dataUrlMime('data:image/png;abc')).toBe("image/png");
    expect(dataUrlMime('data:;')).toBe("");
    expect(dataUrlMime('data;')).toBe(undefined);
    expect(dataUrlMime('something')).toBe(undefined);
  });
});

describe('withObjectUrl', () => {
  const spyRevoke = jest.spyOn(URL, 'revokeObjectURL');

  beforeEach(() => {
    spyRevoke.mockReset();
  });

  test('returns result of callback', () => {
    // @ts-expect-error: DOM Blob vs Node Blob (TODO)
    expect(withObjectUrl(new Blob(), () => 1)).toBe(1);
    expect(spyRevoke).toHaveBeenCalledTimes(1);
  });

  test('returns async result', async () => {
    // @ts-expect-error: DOM Blob vs Node Blob (TODO)
    expect(await withObjectUrl(new Blob(), async () => 1)).toBe(1);
    expect(spyRevoke).toHaveBeenCalledTimes(1);
  });

  test('revokes despite throw', () => {
    let blobObjectUrl;

    expect(() => {
      // @ts-expect-error: DOM Blob vs Node Blob (TODO)
      withObjectUrl(new Blob(), (objectUrl) => {
        blobObjectUrl = objectUrl;
        throw new Error("e1");
      });
    }).toThrow("e1");

    expect(spyRevoke).toHaveBeenCalledTimes(1);
    expect(spyRevoke).toHaveBeenCalledWith(blobObjectUrl);
  });

  test('revokes despite async throw', async () => {
    let blobObjectUrl;

    await expect(async () => {
      // @ts-expect-error: DOM Blob vs Node Blob (TODO)
      await withObjectUrl(new Blob(), async (objectUrl) => {
        blobObjectUrl = objectUrl;
        throw new Error("e2");
      });
    }).rejects.toThrow("e2");

    expect(spyRevoke).toHaveBeenCalledTimes(1);
    expect(spyRevoke).toHaveBeenCalledWith(blobObjectUrl);
  });
});

describe('sanitizeBasename', () => {
  test('basic', () => {
    expect(sanitizeBasename("")).not.toBe("");
    expect(sanitizeBasename("Just for Fun")).toBe("Just_for_Fun");
    expect(sanitizeBasename("..")).toBe("_");
    expect(sanitizeBasename("1:2:3")).toBe("1_2_3");
  });
});
