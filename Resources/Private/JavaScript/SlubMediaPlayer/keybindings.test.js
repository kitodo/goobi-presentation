/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import Environment from '../lib/Environment';
import { getKeybindingText } from './lib/trans';

import keybindings from './keybindings.json';

describe('format translated key description', () => {
  const env = new Environment();
  env.setLang({
    locale: 'en_US',
    twoLetterIsoCode: 'en',
    phrases: {
      'key.ArrowRight': "Arrow Right",
      'key.generic': "Key {key}",
      'key.generic.mod': "{key}",
      'key.mod.Shift': "Shift",
      'key.repeat': "{key} (repeat)",
      'key.unto': " to ",
      'key.unto.mod': "-",
    },
  });

  test('key S for opening screenshot modal', () => {
    const kb = keybindings.find(kb => kb.action === 'modal.screenshot.open');
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe("<kbd>Key S</kbd>");
  });

  test('shift S for taking screenshot', () => {
    const kb = keybindings.find(kb => kb.action === 'modal.screenshot.snap');
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe("<kbd>Shift</kbd> + <kbd>S</kbd>");
  });

  test('numeric keys for jumping to position', () => {
    const kb = keybindings.find(kb => kb.action === 'navigate.position.percental');
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe(`<span class="kb-range"><kbd>Key 0</kbd> to <kbd>Key 9</kbd></span>`);
  });

  test('numeric keys with discontinuous ranges', () => {
    const kbOrig = keybindings.find(kb => kb.action === 'navigate.position.percental');
    const kb = { ...kbOrig, keys: ['0', '1', '3', '4', '5'] };
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe(
      `<span class="kb-range"><kbd>0</kbd>-<kbd>1</kbd></span>`
      + ` / `
      + `<span class="kb-range"><kbd>3</kbd>-<kbd>5</kbd></span>`
    );
  });

  test('numeric keys with discontinuous ranges and modifier', () => {
    const kbOrig = keybindings.find(kb => kb.action === 'navigate.position.percental');
    const kb = { ...kbOrig, mod: 'Shift', keys: ['0', '1', '3', '4', '5'] };
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe(`<kbd>Shift</kbd> + <span class="kb-range"><kbd>0</kbd>-<kbd>1</kbd></span>/<span class="kb-range"><kbd>3</kbd>-<kbd>5</kbd></span>`);
  });

  test('repeat key for fast-forward', () => {
    const kb = keybindings.find(kb => kb.action === 'navigate.continuous-seek');
    const text = getKeybindingText(env, /** @type {any} */(kb));
    expect(text.innerHTML).toBe("<kbd>Arrow Right</kbd> (repeat)");
  });
});
