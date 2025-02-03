// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

import { clamp, e } from 'lib/util';
import buildTimeString from 'DlfMediaPlayer/lib/buildTimeString';

/**
 * @typedef {'current-time' | 'remaining-time' | 'current-frame'} TimeModeKey
 */

/**
 * @readonly
 * @enum {number}
 */
const TimeMode = {
  CurrentTime: 0,
  RemainingTime: 1,
  CurrentFrame: 2,
  COUNT: 3,
};

/**
 * @typedef {{
 *  isReady: boolean;
 *  activeMode: number;
 *  duration: number;
 *  totalSeconds: number;
 *  mediaProperties: Pick<dlf.media.MediaProperties, 'chapters' | 'fps'>;
 * }} State
 */

/**
 * Control panel element to show current playback time.
 *
 * Originally based upon Shaka's PresentationTimeTracker.
 *
 * Listens to the following custom events:
 * - {@link dlf.media.MediaPropertiesEvent}
 */
export default class PresentationTimeTracker extends shaka.ui.Element {
  /**
   * Registers a factory with specified configuration. The returned key may
   * be added to `controlPanelElements` in shaka-player config.
   *
   * @param {Translator & Identifier} env
   */
  static register(env) {
    const key = env.mkid();

    shaka.ui.Controls.registerElement(key, {
      create(rootElement, controls) {
        return new PresentationTimeTracker(rootElement, controls, env);
      },
    });

    return key;
  }

  /**
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   * @param {Translator} env
   */
  constructor(parent, controls, env) {
    super(parent, controls);

    const currentTime = e('button', {
      className: 'shaka-current-time shaka-tooltip',
      ariaLabel: env.t('control.time.tooltip'),
    });
    parent.appendChild(currentTime);

    /** @private Avoid naming conflicts with parent class */
    this.dlf = { env, currentTime };

    /**
     * @private
     * @type {State}
     */
    this.state = {
      isReady: false,
      activeMode: TimeMode.CurrentTime,
      totalSeconds: 0,
      duration: 0,
      mediaProperties: {
        chapters: null,
        fps: null,
      },
    };

    if (this.eventManager) {
      this.eventManager.listen(currentTime, 'click', () => {
        this.render({
          activeMode: (this.state.activeMode + 1) % TimeMode.COUNT,
        });
      });

      const updateTime = this.updateTime.bind(this);
      this.eventManager.listen(this.controls, 'timeandseekrangeupdated', updateTime);

      this.eventManager.listen(this.controls, 'dlf-media-properties', (e) => {
        const detail = /** @type {dlf.media.MediaPropertiesEvent} */(e).detail;
        this.render({
          mediaProperties: detail.fullProps,
        });
      });
    }
  }

  updateTime() {
    if (this.controls === null || this.video === null || this.video.readyState < 1) {
      this.render({
        isReady: false,
      });
    } else {
      let duration = this.video.duration;
      if (!(duration >= 0)) { // NaN -> 0
        duration = 0;
      }

      this.render({
        isReady: true,
        duration,
        totalSeconds: clamp(this.controls.getDisplayTime(), [0, duration]),
      });
    }
  }

  /**
   *
   * @param {Partial<State>} state
   */
  render(state) {
    const newState = Object.assign({}, this.state, state);

    const newKeys = /** @type {(keyof State)[]} */(Object.keys(state));
    const shouldUpdate = newKeys.some(key => state[key] !== this.state[key]);

    if (shouldUpdate) {
      const tKey = /** @type {TimeModeKey} */({
        [TimeMode.CurrentTime]: 'current-time',
        [TimeMode.RemainingTime]: 'remaining-time',
        [TimeMode.CurrentFrame]: 'current-frame',
      }[newState.activeMode] ?? 'current-time');

      this.dlf.currentTime.textContent = this.getTimecodeText(tKey, newState);
    }

    this.state = newState;
  }

  /**
   *
   * @param {TimeModeKey} tKey
   * @param {Pick<State, 'isReady' | 'totalSeconds' | 'duration' | 'mediaProperties'>} state
   * @returns {string}
   */
  getTimecodeText(tKey, { isReady, totalSeconds, duration, mediaProperties }) {
    // Don't show incomplete info when duration is not yet available
    if (!isReady || duration === 0) {
      return this.dlf.env.t('player.loading');
    } else {
      const showHour = duration >= 3600;
      const { chapters, fps } = mediaProperties;
      const fpsRate = fps?.rate ?? null;

      const textValues = {
        get chapterTitle() {
          return chapters?.timeToChapter(totalSeconds)?.title ?? "_";
        },
        get currentTime() {
          return buildTimeString(totalSeconds, showHour, fpsRate);
        },
        get totalTime() {
          return buildTimeString(duration, showHour, fpsRate);
        },
        get remainingTime() {
          return buildTimeString(duration - totalSeconds, showHour, fpsRate);
        },
        get currentFrame() {
          return fps?.vifa.get() ?? -1;
        },
      };

      return this.dlf.env.t(`control.time.${tKey}.text`, textValues);
    }
  }
}
