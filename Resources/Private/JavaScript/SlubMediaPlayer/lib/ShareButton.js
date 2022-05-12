// @ts-check

import { e, fillPlaceholders } from '../../lib/util';

/**
 * @typedef {{
 *  url: string;
 * }} Values
 *
 * @typedef {(
 *  | { type: "material"; icon: string; }
 *  | { type: "image"; src: string; }
 * ) & {
 *  hrefTemplate: string;
 *  titleTranslationKey: string;
 * }} ShareButtonInfo
 *
 * @typedef {{
 *  hrefTemplate: string;
 *  fillPlaceholders: (values: Values) => void;
 *  element: HTMLAnchorElement;
 * }} ShareButton
 */

/**
 *
 * @param {Translator} env
 * @param {import('../lib/ShareButton').ShareButtonInfo} info
 * @param {object} config
 * @param {(e: MouseEvent) => void} config.onClick
 * @return {import('../lib/ShareButton').ShareButton}
 */
export function createShareButton(env, info, config) {
  /** @type {HTMLElement} */
  let iconElement;

  switch (info.type) {
    case "material":
      iconElement = e("i", {
        className: "dlf-share-button material-icons-round",
      }, [info.icon]);
      break;

    case "image":
      iconElement = e("img", {
        className: "dlf-share-button",
        src: info.src,
      });
      break;
  }

  const element = e("a", {
    title: env.t(info.titleTranslationKey ?? "", {}, () => ""),
    target: "_blank",
    rel: "noopener noreferrer",
    $click: config.onClick,
  }, [iconElement]);

  return {
    hrefTemplate: info.hrefTemplate,
    fillPlaceholders: (values) => {
      element.href = fillPlaceholders(info.hrefTemplate, values);
    },
    element,
  };
}

export default {};
