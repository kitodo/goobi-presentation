// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';
import { e } from 'lib/util';

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

    this.$playRateTooltip = e('div', {
      className: 'dlf-playrate-tooltip',
    });

    // Set the tooltip's content to the default playback rate
    const playerPlaybackRate = this.player?.getPlaybackRate() || 1;
    this.$playRateTooltip.textContent = this.getRateStr(playerPlaybackRate);

    this.$container = e('div', {
      className: 'shaka-range-container dlf-playrate-slider',
    }, [
      this.$input = e('input', {
        className: 'shaka-range-element',
        type: 'range',
        valueAsNumber: Math.log2(playerPlaybackRate),
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
      this.$playRateTooltip
    ]);

    if (this.player !== null) {
      this.menu.insertBefore(this.$container, this.backButton.nextSibling);
    }

    if (this.eventManager !== null) {
      this.eventManager.listen(this.player, 'ratechange', () => {
        if (this.player !== null) {
          const rate = this.player.getPlaybackRate();

          // Update the input's value to reflect the new rate
          this.$input.valueAsNumber = Math.log2(rate);

          // Update the text content to display the new rate
          const rateStr = this.getRateStr(rate);
          this.currentSelection.textContent = rateStr;
          this.button.setAttribute('shaka-status', rateStr);

          // Update the tooltip with position and value
          this.updateTooltip(rate, this.$input);
        }
      });
    }
  }

  /**
  * @param {number} rate
  */
  getRateStr(rate) {
    return `${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}x`;
  }

  /**
   * @param {number} playbackRate
   * @param {HTMLInputElement} inputRange
   */
  updateTooltip(playbackRate, inputRange) {

    const val = inputRange.valueAsNumber;
    const min = inputRange.min ? parseFloat(inputRange.min) : 0;
    const max = inputRange.max ? parseFloat(inputRange.max) : 100;

    // Convert the rate to a percentage of the range for positioning
    const newVal = Number(((val - min) * 100) / (max - min));

    // Update the tooltip content and position
    this.$playRateTooltip.textContent = this.getRateStr(playbackRate);

    // Sort of magic numbers based on size of the native UI thumb
    // this.$playRateTooltip.style.left = `calc(${newVal}% + (${8 - newVal * 0.15}px))`;

    // to fit into the shaka-settings-menu
    this.$playRateTooltip.style.left = `calc(${newVal}% + (${17 - newVal * 0.35}px))`;
  }
}
