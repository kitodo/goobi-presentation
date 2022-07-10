// @ts-check

import { Keybinding$splitKeyRanges } from '../../lib/Keyboard';
import { e, domJoin } from '../../lib/util';

/**
 * Returns a translated string describing key {@link key}.
 *
 * @param {Translator} env
 * @param {KeyboardEvent['key']} key
 * @param {boolean} mod
 * @returns {string}
 */
export function getKeyText(env, key, mod) {
  const app = mod ? '.mod' : '';
  return env.t(`key.${key}${app}`, {},
    () => env.t(`key.${key}`, {},
      () => env.t(`key.generic${app}`, { key: key.toUpperCase() },
        () => env.t(`key.generic`, { key: key.toUpperCase() })
      )
    )
  );
}

/**
 * Returns a translated DOM element describing keybinding {@link kb}.
 *
 * @param {Translator & Browser} env
 * @param {Keybinding<any, any>} kb
 * @returns {HTMLElement}
 */
export function getKeybindingText(env, kb) {
  const keyRanges = Keybinding$splitKeyRanges(kb.keys);
  const rangeTexts = [];
  const mods = [];
  if (kb.mod !== undefined) {
    mods.push(kb.mod);
  }
  if (kb.mod !== 'Shift' && kb.keys.every(c => /^[A-Z]$/.test(c))) {
    mods.push('Shift');
  }
  const hasMod = mods.length > 0 || keyRanges.length > 1;
  const untoText = env.t(`key.unto${hasMod ? '.mod' : ''}`);

  for (const range of keyRanges) {
    const beginText = e("kbd", {}, [getKeyText(env, range.begin, hasMod)]);

    if (range.begin === range.end) {
      rangeTexts.push(beginText);
    } else {
      const endText = e("kbd", {}, [getKeyText(env, range.end, hasMod)]);

      rangeTexts.push(
        e("span", { className: "kb-range" }, [beginText, untoText, endText])
      );
    }
  }

  let text = [];

  if (mods.length > 0) {
    const keyboard = env.getKeyboardVariant();
    for (const mod of mods) {
      const modifierText = e("kbd", {}, [env.t(`key.mod.${keyboard}.${mod}`)]);
      text.push(modifierText, " + ");
    }
    text.push(...domJoin(rangeTexts, "/"));
  } else {
    text = domJoin(rangeTexts, " / ");
  }

  if (kb.repeat) {
    const rptParts = env.t('key.repeat', { key: '###' }).split('###');
    text = domJoin(rptParts, text);
  }

  return e("span", {}, text);
}
