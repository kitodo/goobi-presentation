// @ts-check

import { describe, expect, test } from '@jest/globals';
import typoConstants from 'lib/typoConstants';

describe('TypoConstants', () => {
  const constants = typoConstants({
    someString: "1",
    anotherString: 2,
    someNumber: null,
    anotherNumber: 5,
  }, {
    someString: 'a',
    anotherString: 'b',
    someNumber: 2,
    anotherNumber: 0,
    thirdNumber: 10,
  });

  test('basic', () => {
    expect(constants).toEqual({
      someString: "1",
      anotherString: "2",
      someNumber: 2,
      anotherNumber: 5,
      thirdNumber: 10,
    });
  });
});
