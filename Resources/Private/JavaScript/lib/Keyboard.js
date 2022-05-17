// @ts-check

/**
 * Keyboard modifier flags for use in a bitset.
 *
 * See typings of `Keybinding`.
 */
export const Modifier = {
  None: 0,
  CtrlMeta: 1,
  Shift: 2,
  Alt: 4,
};

/**
 * Extract bitset of active modifier keys from a keyboard event.
 *
 * @param {KeyboardEvent} e
 */
export function modifiersFromEvent(e) {
  let mod = Modifier.None;

  if ((e.ctrlKey && e.key !== 'Control') || (e.metaKey && e.key !== 'Meta')) {
    mod |= Modifier.CtrlMeta;
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
 * @template {string} ScopeT
 * @template {string} ActionT
 * @param {Keybinding<ScopeT, ActionT>[]} keybindings
 * @param {KeyboardEvent} e
 * @param {ScopeT} currentScope
 * @returns {{ keybinding: Keybinding<ScopeT, ActionT>, keyIndex: number } | undefined}
 */
export function Keybindings$find(keybindings, e, currentScope) {
  const mod = modifiersFromEvent(e);

  // Ignore casing, e.g. for `S` vs. `Shift + S`.
  const key = e.key.toLowerCase();

  for (const kb of keybindings) {
    const keyIndex = kb.keys.findIndex(k => k.toLowerCase() === key);
    if (keyIndex === -1) {
      continue;
    }

    const isSuitable = (
      (kb.repeat == null || kb.repeat === e.repeat)
      && (kb.scope == null || kb.scope === currentScope)
      && Modifier[kb.mod ?? 'None'] === mod
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
