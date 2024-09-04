// @ts-check

import { describe, expect, test } from '@jest/globals';
import TimecodeIndex from 'lib/TimecodeIndex';

/**
 * @typedef {import('lib/TimecodeIndex').TimecodeIndexObject & {
 *  str: string;
 * }} Obj
 */

/**
 * @returns {TimecodeIndex<Obj>}
 */
function getTestIndex() {
  return new TimecodeIndex([
    { timecode: 2, str: 'b' },
    { timecode: 1, str: 'a' },
  ]);
}

describe('TimecodeIndex', () => {
  test('can get index of element', () => {
    const index = getTestIndex();

    const e0 = /** @type {Obj} */(index.at(0));
    expect(index.indexOf(e0)).toBe(0);

    const e1 = /** @type {Obj} */(index.at(1));
    expect(index.indexOf(e1)).toBe(1);

    expect(index.indexOf({ timecode: 1, str: 'c' })).toBeUndefined();
  });

  describe('timeToElement', () => {
    test('works for empty index', () => {
      const index = new TimecodeIndex([]);
      expect(index.timeToElement(1)).toBeUndefined();
    });

    test('works for index with a single element', () => {
      const element = { timecode: 1 };
      const index = new TimecodeIndex([element]);

      expect(index.timeToElement(0)).toBeUndefined();
      expect(index.timeToElement(1)).toBe(element);
      expect(index.timeToElement(2)).toBe(element);
    });

    test('can find element for time', () => {
      const index = getTestIndex();

      expect(index.timeToElement(0)).toBeUndefined();
      expect(index.timeToElement(1)?.str).toBe('a');
      expect(index.timeToElement(1.5)?.str).toBe('a');
      expect(index.timeToElement(2)?.str).toBe('b');
      expect(index.timeToElement(3)?.str).toBe('b');
    });
  });

  test('can determine next/prev element', () => {
    const index = getTestIndex();

    const e0 = /** @type {Obj} */(index.at(0));
    const e1 = /** @type {Obj} */(index.at(1));

    expect(index.advance(e0, +1)?.str).toBe('b');
    expect(index.advance(e1, +1)).toBeUndefined();

    expect(index.advance(e0, -1)).toBeUndefined();
    expect(index.advance(e1, -1)?.str).toBe('a');
  });

  test('can reverse chapters', () => {
    const index = getTestIndex();
    expect([...index.reversed()].map(ch => ch.timecode)).toEqual([2, 1]);
  });
});
