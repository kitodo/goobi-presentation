// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

/**
 * @typedef Config
 * @property {string} material_icon Key of menu icon
 * @property {string} name Text to display in menu
 * @property {() => void} onClick
 */

/**
 * Generic Shaka overflow menu item with icon, text and click handler.
 */
export default class OverflowMenuButton extends shaka.ui.SettingsMenu {
  /**
   * Registers a factory with specified configuration. The returned key may
   * be added to `overflowMenuButtons` in shaka-player config.
   *
   * @param {Identifier} env
   * @param {Partial<Config>} config
   */
  static register(env, config = {}) {
    const key = env.mkid();

    shaka.ui.OverflowMenu.registerElement(key, {
      create(rootElement, controls) {
        return new OverflowMenuButton(rootElement, controls, config);
      },
    });

    return key;
  }

  /**
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   * @param {Partial<Config>} config
   */
  constructor(parent, controls, config = {}) {
    super(parent, controls, config.material_icon ?? "");

    /** @protected Avoid naming conflicts with parent class */
    this.dlf = { config };

    if (this.eventManager) {
      // In particular, unbind button click handler pre-attached in base class
      this.eventManager.removeAll();
      this.eventManager.listen(this.button, 'click', this.onButtonClick.bind(this));
    }

    this.updateStrings();
  }

  updateStrings() {
    this.nameSpan.textContent = this.dlf.config.name ?? "";
  }

  onButtonClick() {
    this.controls?.hideSettingsMenus();
    this.dlf.config.onClick?.();
  }
}
