// @ts-check

import { e, fillPlaceholders } from 'lib/util';

/**
 * @typedef ShareButtonMaterialIcon
 * @property {'material'} type
 * @property {string} icon Key of the material icon.
 *
 * @typedef ShareButtonImage
 * @property {'image'} type
 * @property {string} src URL of the image to be shown.
 *
 * @typedef ShareButtonBaseInfo
 * @property {string} hrefTemplate URL for sharing, may contain placeholders (e.g. "{url}").
 * @property {string} titleTranslationKey Language label key to be used as tooltip.
 *
 * @typedef {(ShareButtonMaterialIcon | ShareButtonImage) & ShareButtonBaseInfo} ShareButtonInfo
 *
 * @typedef ShareButton
 * @property {string} hrefTemplate
 * @property {(values: Record<string, string | undefined>) => void} setFullUrl Build full sharing
 * URL and set it on element href, built from hrefTemplate by replacing given values.
 * @property {HTMLAnchorElement} element
 */

/**
 *
 * @param {Translator} env
 * @param {ShareButtonInfo} info
 * @param {object} config
 * @param {(e: MouseEvent) => void} config.onClick
 * @return {ShareButton}
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
    setFullUrl: (values) => {
      element.href = fillPlaceholders(info.hrefTemplate, values);
    },
    element,
  };
}

export default {};
