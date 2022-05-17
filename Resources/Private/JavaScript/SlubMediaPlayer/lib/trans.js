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
 * @param {Translator} env
 * @param {Keybinding<any, any>} kb
 * @returns {HTMLElement}
 */
export function getKeybindingText(env, kb) {
  const keyRanges = Keybinding$splitKeyRanges(kb.keys);
  const rangeTexts = [];
  const mod = kb.mod !== undefined || keyRanges.length > 1;
  const untoText = env.t(`key.unto${mod ? '.mod' : ''}`);

  for (const range of keyRanges) {
    const beginText = e("kbd", {}, [getKeyText(env, range.begin, mod)]);

    if (range.begin === range.end) {
      rangeTexts.push(beginText);
    } else {
      const endText = e("kbd", {}, [getKeyText(env, range.end, mod)]);

      rangeTexts.push(
        e("span", { className: "kb-range" }, [beginText, untoText, endText])
      );
    }
  }

  let text;

  if (kb.mod) {
    const modifierText = e("kbd", {}, [env.t(`key.mod.${kb.mod}`)]);
    text = [modifierText, " + ", ...domJoin(rangeTexts, "/")];
  } else {
    text = domJoin(rangeTexts, " / ");
  }

  if (kb.repeat) {
    const rptParts = env.t('key.repeat', { key: '###' }).split('###');
    text = domJoin(rptParts, text);
  }

  return e("span", {}, text);
}
