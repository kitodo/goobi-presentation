// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';
import { e } from '../../lib/util';
import ControlPanelButton from './ControlPanelButton';

/**
 * @typedef Config
 * @property {dlf.media.PlayerAction} onClickAction
 */

/**
 * Adopted from Shaka's fullscreen_button.
 *
 * A separate control is used to allow overriding the fullscreen action.
 */
export default class FullScreenButton extends ControlPanelButton {
  /**
   * @param {!HTMLElement} parent
   * @param {!shaka.ui.Controls} controls
   * @param {Translator} env
   * @param {Partial<Config>} config
   */
  constructor(parent, controls, env, config = {}) {
    const element = e('button', {
      className: "material-icons-round shaka-fullscreen-button shaka-tooltip",
    }, ['fullscreen']);
    element.setAttribute('data-t-title', 'control.bookmark.tooltip');

    super(parent, controls, env, {
      ...config,
      element,
    });

    if (this.eventManager) {
      this.eventManager.listen(document, 'fullscreenchange',
        this.updateFullScreenButton.bind(this));
    }

    this.updateFullScreenButton();
  }

  /**
   * @override
   */
  updateControlPanelButton() {
    // We do all updates ourselves
  }

  /**
   * @protected
   */
  updateFullScreenButton() {
    if (document.fullscreenEnabled) {
      // Update Material Icon
      this.dlf.element.textContent = document.fullscreenElement
        ? 'fullscreen_exit'
        : 'fullscreen';

      this.dlf.element.ariaLabel = document.fullscreenElement
        ? this.env.t('control.fullscreen_exit.tooltip')
        : this.env.t('control.fullscreen.tooltip');
    } else {
      // Don't show the button if fullscreen is not supported
      this.dlf.element.classList.add('shaka-hidden');
    }
  }
};
