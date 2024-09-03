// @ts-check

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import JPEG from 'lib/image/jpeg';

describe('JPEG', () => {
  test('can add and get metadata: read(write(x)) == x', () => {
    const metadata = {
      title: "Test Image",
      comment: "aaaaaaaaaaz",
    };

    const data1 = fs.readFileSync(path.join(__dirname, 'simple.jpg'), 'binary');
    const file1 = JPEG.fromBinaryString(data1);
    expect(file1.getMetadata()).not.toEqual(metadata);

    file1.addMetadata(metadata);
    const data2 = file1.toBinaryString();
    const file2 = JPEG.fromBinaryString(data2);
    expect(file2.getMetadata()).toEqual(metadata);
  });
});
