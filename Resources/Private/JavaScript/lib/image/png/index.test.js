// @ts-check

import { describe, expect, it, test } from '@jest/globals';
import fs from 'fs';

import PNG, { stoi, itos } from 'lib/image/png';

describe('test', function () {
  it('stoi', function () {
    expect(stoi(String.fromCharCode(0, 0xFF, 0xFF))).toBe(0xFFFF);
    expect(stoi(String.fromCharCode(0, 0, 0, 10))).toBe(10);
    expect(stoi("ABCD")).toBe(0x41424344);
  });

  it('itos', function () {
    expect(itos(10, 4)).toBe(String.fromCharCode(0, 0, 0, 10));
    expect(itos(0x41424344, 4)).toBe("ABCD");
  });

  const data = fs.readFileSync(__dirname + '/simple.png', 'binary');

  it('splitChunk', function () {
    const png = PNG.fromBinaryString(data);
    const dataReencoded = png?.toBinaryString();

    expect(data).toBe(dataReencoded);
  });

  // This image has corrupt data at the end,
  // but we should be able to read it anyway
  const scorrupt = fs.readFileSync(__dirname + '/garbage_data_after_iend.png', 'binary');

  it('splitChunkWithGarbageData', function () {
    expect(() => {
      PNG.fromBinaryString(scorrupt);
    }).not.toThrow();
  });
});

describe('PNG.createChunk', () => {
  test('sanitizes iTXt keyword with null byte', () => {
    const chunk = PNG.createChunk({
      type: 'iTXt',
      keyword: "A\0B",
      text: "Data",
    });

    expect(chunk.data).toBe("AB\0\0\0\0\0Data");
  });
});
