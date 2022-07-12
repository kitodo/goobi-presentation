// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';
import { e } from '../../lib/util';

export default class PlaybackRateSelection extends shaka.ui.PlaybackRateSelection {
  /**
   *
   * @param {Translator & Identifier} env
   */
  static register(env) {
    const key = env.mkid();

    shaka.ui.OverflowMenu.registerElement(key, {
      create(rootElement, controls) {
        return new PlaybackRateSelection(rootElement, controls, env);
      },
    });

    return key;
  }

  /**
   * @param {!HTMLElement} parent
   * @param {!shaka.ui.Controls} controls
   * @param {Translator & Identifier} env
   */
  constructor(parent, controls, env) {
    super(parent, controls);

    this.$container = e('div', {
      className: 'shaka-range-container dlf-playrate-slider',
    }, [
      this.$input = e('input', {
        className: 'shaka-range-element',
        type: 'range',
        valueAsNumber: Math.log2(this.player?.getPlaybackRate() || 1),
        min: '-1',
        max: '1',
        step: '0.01',
        $input: () => {
          const rate = 2 ** this.$input.valueAsNumber;
          const media = this.player?.getMediaElement();
          if (media) {
            media.playbackRate = rate;
            media.defaultPlaybackRate = rate;
          }
        },
      }),
    ]);

    if (this.player !== null) {
      this.menu.insertBefore(this.$container, this.backButton.nextSibling);
    }

    if (this.eventManager !== null) {
      this.eventManager.listen(this.player, 'ratechange', () => {
        if (this.player !== null) {
          const rate = this.player.getPlaybackRate();

          this.$input.valueAsNumber = Math.log2(rate);

          const rateStr = `${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}x`;
          this.currentSelection.textContent = rateStr;
          this.button.setAttribute('shaka-status', rateStr);
        }
      });
    }
  }
}
