// @ts-check

/**
 * Keyboard modifier flags for use in a bitset.
 *
 * See typings of `Keybinding`.
 */
export const Modifier = {
  None: 0,
  Ctrl: 1,
  Shift: 2,
  Alt: 4,
  Meta: 8,
};

/**
 * Extract bitset of active modifier keys from a keyboard event.
 *
 * @param {KeyboardEvent} e
 */
export function modifiersFromEvent(e) {
  let mod = Modifier.None;

  if (e.ctrlKey && e.key !== 'Control') {
    mod |= Modifier.Ctrl;
  }

  if (e.metaKey && e.key !== 'Meta') {
    mod |= Modifier.Meta;
  }

  if (e.shiftKey && e.key !== 'Shift') {
    mod |= Modifier.Shift;
  }

  if (e.altKey && e.key !== 'Alt') {
    mod |= Modifier.Alt;
  }

  return mod;
}

/**
 *
 * @param {Browser} env
 * @param {KeyboardEvent['key']} key Key from keyboard event
 * @param {number} mod
 */
export function normalizeModifiers(env, key, mod) {
  let res = mod;

  if (key.length === 1) {
    // In this case, we assume `key` represents a regular printable character
    // (as opposed to modifiers, function keys etc.)
    //
    // Then, second assumption, Shift and Option have already made a difference,
    // so we don't need to check for them separately.
    // (That may not be fully true, but close enough.)

    res &= ~Modifier.Shift;

    if (env.getKeyboardVariant() === 'mac') {
      res &= ~Modifier.Alt;
    }
  }

  return res;
}

/**
 *
 * @template {string} ScopeT
 * @template {string} ActionT
 * @param {Browser} env
 * @param {Keybinding<ScopeT, ActionT>[]} keybindings
 * @param {KeyboardEvent} e
 * @param {ScopeT} currentScope
 * @returns {{ keybinding: Keybinding<ScopeT, ActionT>, keyIndex: number } | undefined}
 */
export function Keybindings$find(env, keybindings, e, currentScope) {
  const mod = modifiersFromEvent(e);
  const keyboard = env.getKeyboardVariant();

  for (const kb of keybindings) {
    const keyIndex = kb.keys.findIndex(k => k === e.key);
    if (keyIndex === -1) {
      continue;
    }

    const isSuitable = (
      (kb.repeat == null || kb.repeat === e.repeat)
      && (kb.scope == null || kb.scope === currentScope)
      && normalizeModifiers(env, e.key, Modifier[kb.mod ?? 'None']) === normalizeModifiers(env, e.key, mod)
      && (kb.keyboard == null || kb.keyboard === keyboard)
    );

    if (isSuitable) {
      return {
        keybinding: kb,
        keyIndex,
      };
    }
  }
}

/**
 * @typedef {{ begin: KeyboardEvent['key']; end: KeyboardEvent['key'] }} KeyRange
 */

/**
 *
 * @param {KeyboardEvent['key'][]} keys
 * @returns {KeyRange[]}
 */
export function Keybinding$splitKeyRanges(keys) {
  const result = [];

  /** @type {KeyRange | null} */
  let nextRange = null;
  for (const key of keys) {
    if (nextRange === null) {
      nextRange = { begin: key, end: key };
    } else if (key.charCodeAt(0) === nextRange.end.charCodeAt(0) + 1) {
      nextRange.end = key;
    } else {
      result.push(nextRange);
      nextRange = { begin: key, end: key };
    }
  }

  if (nextRange !== null) {
    result.push(nextRange);
  }

  return result;
}
