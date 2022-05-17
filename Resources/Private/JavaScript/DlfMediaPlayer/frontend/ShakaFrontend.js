// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';
import 'shaka-player/ui/controls.less';

import Gestures from '../../lib/Gestures';
import { e, setElementClass } from '../../lib/util';
import {
  FlatSeekBar,
  PresentationTimeTracker,
  VideoTrackSelection
} from '../controls';

/**
 * Listens to the following custom events:
 * - {@link dlf.media.SeekBarEvent}
 * - {@link dlf.media.ManualSeekEvent}
 *
 * Emits the following custom events:
 * - {@link dlf.media.MediaPropertiesEvent}
 *
 * @implements {dlf.media.PlayerFrontend}
 */
export default class ShakaFrontend {
  /**
   *
   * @param {Translator & Identifier} env
   * @param {shaka.Player} player
   * @param {HTMLMediaElement} media
   */
  constructor(env, player, media) {
    /** @private */
    this.constants = {
      minBottomControlsReadyState: 2, // Enough data for current position
    };

    /** @private */
    this.env = env;

    /** @private */
    this.player = player;

    /** @private */
    this.media = media;

    /** @private @type {dlf.media.MediaProperties} */
    this.mediaProperties = {
      poster: null,
      chapters: null,
      fps: null,
      variantGroups: null,
    };

    /** @private */
    this.lastReadyState = 0;

    /** @private @type {dlf.media.PlayerProperties} */
    this.playerProperties = {
      mode: 'audio',
      locale: '',
      state: 'poster',
      error: null,
    };

    /** @private @type {string[]} */
    this.controlPanelButtons = [];

    /** @private @type {string[]} */
    this.overflowMenuButtons = [];

    /** @private @type {HTMLElement | null} */
    this.shakaBottomControls = null;

    /** @private @type {FlatSeekBar | null} */
    this.seekBar_ = null;

    /** @private */
    this.$container = e('div', {
      className: "dlf-media-player dlf-shaka"
    }, [
      this.$videoBox = e('div', { className: "dlf-media-shaka-box" }, [
        this.$video = media,
        this.$poster = e('img', {
          className: "dlf-media-poster dlf-visible",
          $error: () => {
            this.hidePoster();
          },
        }),
      ]),
      this.$errorBox = e('div', {
        className: "dlf-media-shaka-box dlf-media-error"
      }),
    ]);

    /** @private */
    this.ui = new shaka.ui.Overlay(this.player, this.$videoBox, this.media);

    /** @private */
    this.controls = /** @type {shaka.ui.Controls} */(this.ui.getControls());

    /** @private @type {ReturnType<setTimeout> | null} */
    this.configureTimeout = null;

    /** @private */
    this.isConfigured = false;

    /** @private */
    this.gestures_ = new Gestures({
      allowGesture: this.allowGesture.bind(this),
    });

    /** @private */
    this.handlers = {
      onControlsErrorEvent: this.onControlsErrorEvent.bind(this),
      onPlay: this.onPlay.bind(this),
      onTimeUpdate: this.onTimeUpdate.bind(this),
      afterManualSeek: this.afterManualSeek.bind(this),
    };

    this.registerEventHandlers();
    this.scheduleConfigure();
  }

  /**
   * @private
   */
  registerEventHandlers() {
    this.controls.addEventListener('error', this.handlers.onControlsErrorEvent);
    // TODO: Figure out a good flow of events
    this.controls.addEventListener('dlf-media-seek-bar', (e) => {
      const detail = /** @type {dlf.media.SeekBarEvent} */(e).detail;
      this.seekBar_ = detail.seekBar;
      this.autosetSeekMode();
    });
    this.controls.addEventListener('dlf-media-manual-seek', this.handlers.afterManualSeek);
    this.controls.addEventListener('timeandseekrangeupdated', this.handlers.onTimeUpdate);

    this.media.addEventListener('play', this.handlers.onPlay);

    this.gestures_.register(this.$videoBox);
  }

  get domElement() {
    return this.$container;
  }

  get seekBar() {
    return this.seekBar_;
  }

  get gestures() {
    return this.gestures_;
  }

  /**
   *
   * @param {Partial<dlf.media.MediaProperties>} props
   */
  updateMediaProperties(props) {
    Object.assign(this.mediaProperties, props);
    this.notifyMediaProperties(/* full= */this.mediaProperties, props);
  }

  /**
   * @private
   * @param {dlf.media.MediaProperties} fullProps
   * @param {Partial<dlf.media.MediaProperties>} updateProps
   */
  notifyMediaProperties(
    fullProps = this.mediaProperties,
    updateProps = fullProps
  ) {
    if (updateProps.poster !== undefined) {
      this.renderPoster();
    }

    /** @type {dlf.media.MediaPropertiesEvent} */
    const event = new CustomEvent('dlf-media-properties', {
      detail: {
        updateProps,
        fullProps,
      },
    });
    this.controls.dispatchEvent(event);
  }

  /**
   *
   * @param {Partial<dlf.media.PlayerProperties>} props
   */
  updatePlayerProperties(props) {
    const shouldReconfigure = (
      props.mode !== undefined
      && (!this.isConfigured || props.mode !== this.playerProperties.mode)
    );

    Object.assign(this.playerProperties, props);

    if (props.locale !== undefined) {
      this.controls.getLocalization()?.changeLocale([props.locale]);
    }

    if (props.state !== undefined) {
      this.renderPoster();
    }

    if (props.error !== undefined) {
      this.renderError();
    }

    if (shouldReconfigure) {
      this.scheduleConfigure();
    }
  }

  handleEscape() {
    if (this.seekBar?.isThumbnailPreviewOpen()) {
      this.seekBar?.endSeek();
      return true;
    }

    if (this.controls.anySettingsMenusAreOpen()) {
      this.controls.hideSettingsMenus();
      return true;
    }

    return false;
  }

  afterManualSeek() {
    // Hide poster when seeking in pause mode before playback has started
    // We don't want to hide the poster when initial timecode is used
    // TODO: Move this back to DlfMediaPlayer?
    this.hidePoster();
  }

  /**
   *
   * @param {string[]} elementKey
   */
  addControlElement(...elementKey) {
    this.controlPanelButtons.push(...elementKey);
    this.scheduleConfigure();
  }

  /**
   *
   * @param {string[]} elementKey
   */
  addOverflowButton(...elementKey) {
    this.overflowMenuButtons.push(...elementKey);
    this.scheduleConfigure();
  }

  /**
   * Set timeout to (re-)configure the UI.
   *
   * This is used to reconfigure only once for multiple successive changes.
   *
   * @private
   */
  scheduleConfigure() {
    if (this.configureTimeout === null) {
      this.configureTimeout = setTimeout(() => {
        this.configureTimeout = null;
        this.configure();
      });
    }
  }

  /**
   * @private
   */
  configure() {
    // TODO: Somehow avoid overriding the SeekBar globally?
    FlatSeekBar.register();

    this.$container.setAttribute("data-mode", this.playerProperties.mode);

    // TODO: Refactor insertion at custom position (left or right of fullscreen)
    this.ui.configure(this.getShakaConfiguration());
    this.isConfigured = true;

    this.autosetSeekMode();

    // Fade in controls, especially when switching from video to audio (TODO: Refactor)
    this.$videoBox.dispatchEvent(new MouseEvent('mousemove'));

    // DOM is (re-)created in `ui.configure()`, so query container afterwards
    this.shakaBottomControls =
      this.$videoBox.querySelector('.shaka-bottom-controls');

    this.notifyMediaProperties();
  }

  autosetSeekMode() {
    const seekMode = this.playerProperties.mode === 'audio' ? 'narrow' : 'wide';
    this.seekBar_?.thumbnailPreview?.setSeekMode(seekMode);
  }

  /**
   * @private
   */
  getShakaConfiguration() {
    const playerMode = this.playerProperties.mode;

    const style = getComputedStyle(this.$container);

    /** @type {any} */
    const result = {
      addSeekBar: true,
      enableTooltips: true,
      controlPanelElements: [
        'play_pause',
        PresentationTimeTracker.register(this.env),
        'spacer',
        'volume',
        'mute',
        ...this.controlPanelButtons,
        'overflow_menu',
      ],
      overflowMenuButtons: [
        'language',
        VideoTrackSelection.register(this.env),
        'playback_rate',
        'loop',
        'quality',
        'picture_in_picture',
        'captions',
        ...this.overflowMenuButtons,
      ],
      addBigPlayButton: playerMode === 'video',
      fadeDelay: playerMode === 'audio'
        ? 100_000_000  // Just some large value
        : undefined,  // Use default
      volumeBarColors: {
        base: style.getPropertyValue('--volume-base-color') || 'rgba(255, 255, 255, 0.54)',
        level: style.getPropertyValue('--volume-level-color') || 'rgb(255, 255, 255)',
      },
      enableKeyboardPlaybackControls: false,
      doubleClickForFullscreen: false,
      singleClickForPlayAndPause: false,
    };

    return result;
  }

  /**
   * @private
   */
  hidePoster() {
    this.$poster.classList.remove('dlf-visible');
  }

  /**
   * @private
   */
  renderPoster() {
    const showPoster = (
      this.mediaProperties.poster !== null
      && this.playerProperties.state === 'poster'
    );

    if (showPoster) {
      // @ts-expect-error
      this.$poster.src = this.mediaProperties.poster;
    }

    setElementClass(this.$poster, 'dlf-visible', showPoster);
  }

  /**
   * @private
   */
  renderError() {
    if (this.playerProperties.error === null) {
      setElementClass(this.$errorBox, 'dlf-visible', false);
    } else {
      setElementClass(this.$errorBox, 'dlf-visible', true);
      this.$errorBox.textContent = this.env.t(this.playerProperties.error);
    }
  }

  /**
   * @private
   * @param {PointerEvent} event
   */
  allowGesture(event) {
    // Don't allow gestures over Shaka bottom controls
    const bounding = this.$videoBox.getBoundingClientRect();
    const controlsHeight = this.shakaBottomControls?.getBoundingClientRect().height ?? 0;
    const userAreaBottom = bounding.bottom - controlsHeight - 20;
    if (event.clientY >= userAreaBottom) {
      return false;
    }

    // Check that the pointer interacts with the container, so isn't over the button
    if (event.target !== this.$videoBox.querySelector('.shaka-play-button-container')) {
      return false;
    }

    return true;
  }

  /**
   * @param {Event} event
   */
  onControlsErrorEvent(event) {
    if (event instanceof CustomEvent) {
      // TODO: Propagate to user
      const error = event.detail;
      console.error('Error from Shaka controls', error.code, error);
    }
  }

  /**
   * @private
   */
  onPlay() {
    // Hide poster once playback has started the first time.
    // Reasons for doing this here instead of in `onTimeUpdate`:
    // - Keep poster when using startTime in player
    // - `onTimeUpdate` may be called with a delay
    // - No need to call it on every time update anyways
    this.hidePoster();
  }

  /**
   * @private
   */
  onTimeUpdate() {
    const readyState = this.media.readyState;

    if (readyState !== this.lastReadyState) {
      this.updateBottomControlsVisibility(readyState);
    }
  }

  /**
   * @private
   * @param {number} readyState
   */
  updateBottomControlsVisibility(readyState) {
    // When readyState is strictly between 0 and minBottomControlsReadyState,
    // don't change whether controls are shown. Thus, on first load the controls
    // may remain hidden, and on seeking the controls remain visible.

    if (readyState === 0) {
      this.shakaBottomControls?.classList.remove('dlf-visible');
    } else if (readyState >= this.constants.minBottomControlsReadyState) {
      this.shakaBottomControls?.classList.add('dlf-visible');
    }
  }
}
