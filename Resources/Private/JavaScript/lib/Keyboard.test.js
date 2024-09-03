// @ts-check

import { describe, expect, test } from '@jest/globals';
import { modifiersFromEvent, Modifier, Keybinding$splitKeyRanges } from 'lib/Keyboard';

describe('modifiersFromEvent', () => {
  // This is mostly for typing
  const mfe = (/** @type {any} */ e) => modifiersFromEvent(e);

  test('basic', () => {
    expect(mfe({ ctrlKey: true })).toBe(Modifier.Ctrl);
    expect(mfe({ metaKey: true })).toBe(Modifier.Meta);
    expect(mfe({ ctrlKey: true, metaKey: true })).toBe(Modifier.Ctrl | Modifier.Meta);
    expect(mfe({ shiftKey: true })).toBe(Modifier.Shift);
    expect(mfe({ altKey: true })).toBe(Modifier.Alt);
    expect(mfe({ shiftKey: true, altKey: true }))
      .toBe(Modifier.Shift | Modifier.Alt);
  });

  test('does not modify a modifier key with itself', () => {
    expect(mfe({ ctrlKey: true, key: 'Control' })).toBe(0);
    expect(mfe({ ctrlKey: true, key: 'Meta' })).toBe(Modifier.Ctrl);
    expect(mfe({ metaKey: true, key: 'Control' })).toBe(Modifier.Meta);
    expect(mfe({ metaKey: true, key: 'Meta' })).toBe(0);

    expect(mfe({ shiftKey: true, key: 'a' })).toBe(Modifier.Shift);
    expect(mfe({ shiftKey: true, key: 'Shift' })).toBe(0);

    expect(mfe({ altKey: true, key: 'a' })).toBe(Modifier.Alt);
    expect(mfe({ altKey: true, key: 'Alt' })).toBe(0);
  });
});

describe('Keybinding$splitKeyRanges', () => {
  test('no keys', () => {
    const ranges = Keybinding$splitKeyRanges([]);
    expect(ranges).toEqual([]);
  });

  test('basic', () => {
    const ranges = Keybinding$splitKeyRanges(['0', '1', '2', '4', '7', '8']);

    expect(ranges).toEqual([
      { begin: '0', end: '2' },
      { begin: '4', end: '4' },
      { begin: '7', end: '8' },
    ]);
  });
});
