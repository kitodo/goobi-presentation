// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

import { e, setElementClass } from 'lib/util';

/**
 * @typedef Config
 * @property {HTMLElement} element
 * @property {dlf.media.PlayerAction} onClickAction
 */

/**
 * Generic Shaka control panel button with icon, text and click handler.
 */
export default class ControlPanelButton extends shaka.ui.Element {
  /**
   * Registers a factory with specified configuration. The returned key may
   * be added to `controlPanelElements` in shaka-player config.
   *
   * @param {Translator & Identifier} env
   * @param {Partial<Config>} config
   * @returns {string} Key of the registered element factory
   */
  static register(env, config = {}) {
    const key = env.mkid();

    shaka.ui.Controls.registerElement(key, {
      create: (rootElement, controls) => {
        // "new this": Allow registering instance of derived classes
        return new this(rootElement, controls, env, config);
      },
    });

    return key;
  }

  /**
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   * @param {Translator} env
   * @param {Partial<Config>} config
   */
  constructor(parent, controls, env, config = {}) {
    super(parent, controls);

    /** @protected */
    this.env = env;

    const element = config.element ?? e('button');

    parent.appendChild(element);

    /** @protected Avoid naming conflicts with parent class */
    this.dlf = { config, element };

    const { onClickAction } = config;
    if (this.eventManager && onClickAction) {
      this.eventManager.listen(element, 'click', () => {
        if (onClickAction.isAvailable()) {
          onClickAction.execute();
        }
      });

      this.eventManager.listen(this.player, 'loaded', () => {
        this.updateControlPanelButton();
      });
    }

    this.updateControlPanelButton();
  }

  /**
   * @protected
   */
  updateControlPanelButton() {
    for (const attrName of this.dlf.element.getAttributeNames()) {
      if (attrName.startsWith('data-t-')) {
        const tAttrName = attrName.substring(7);
        const attrValue = this.dlf.element.getAttribute(attrName);
        if (attrValue) {
          this.dlf.element.setAttribute(tAttrName, this.env.t(attrValue));
        }
      }
    }

    let tooltip = this.dlf.element.title ?? "";
    this.dlf.element.ariaLabel = tooltip;
    this.dlf.element.title = '';
    setElementClass(this.dlf.element, 'shaka-tooltip', tooltip !== "");

    const { onClickAction } = this.dlf.config;
    if (onClickAction) {
      setElementClass(this.dlf.element, 'shaka-hidden', !onClickAction.isAvailable());
    }
  }
}
