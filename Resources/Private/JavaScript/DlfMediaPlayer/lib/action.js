// @ts-check

/**
 * @param {Partial<dlf.media.PlayerAction> | dlf.media.PlayerAction['execute']} obj
 * @return {dlf.media.PlayerAction}
 */
export function action(obj) {
  if (typeof obj === 'function') {
    return {
      isAvailable: () => true,
      execute: obj,
    };
  } else {
    return {
      isAvailable: obj.isAvailable ?? (() => true),
      execute: obj.execute ?? (() => false),
    };
  }
}
