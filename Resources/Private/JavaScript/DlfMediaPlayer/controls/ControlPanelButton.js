// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

import { e, setElementClass } from '../../lib/util';

/**
 * @typedef Config
 * @property {string} className
 * @property {string} material_icon Key of button icon
 * @property {string} title Text of button tooltip
 * @property {dlf.media.PlayerAction} onClickAction
 */

/**
 * Generic control panel button with icon, text and click handler.
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

    const button = e("button", {
      className: `material-icons-round ${config.className ?? ""}`,
    }, [config.material_icon]);

    parent.appendChild(button);

    /** @protected Avoid naming conflicts with parent class */
    this.dlf = { config, button };

    const { onClickAction } = config;
    if (this.eventManager && onClickAction) {
      this.eventManager.listen(button, 'click', () => {
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
    let tooltip = this.dlf.config.title ?? "";
    this.dlf.button.ariaLabel = tooltip;
    setElementClass(this.dlf.button, 'shaka-tooltip', tooltip !== "");

    const { onClickAction } = this.dlf.config;
    if (onClickAction) {
      setElementClass(this.dlf.button, 'shaka-hidden', !onClickAction.isAvailable());
    }
  }
}
