// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

import VideoFrame from './3rd-party/VideoFrame';

import { action } from './lib/action';
import Environment from '../lib/Environment';
import { clamp, e } from '../lib/util';
import ShakaFrontend from './frontend/ShakaFrontend';
import Chapters from './Chapters';
import VariantGroups from './VariantGroups';
import { isPlayerMode } from './lib/util';

/**
 * Emits the following custom events:
 * - {@link dlf.media.ChapterChangeEvent}
 */
export default class DlfMediaPlayer extends HTMLElement {
  /** @private */
  static hasInstalledPolyfills = false;

  constructor() {
    super();

    if (!DlfMediaPlayer.hasInstalledPolyfills) {
      shaka.polyfill.installAll();
      DlfMediaPlayer.hasInstalledPolyfills = true;
    }

    /** @protected @type {dlf.media.PlayerConfig | null} */
    this.config = null;

    /** @protected */
    this.env = new Environment();

    /**
     * @protected
     * @type {ReturnType<this['constantDefaults']>}
     */
    // @ts-expect-error
    this.constants = this.constantDefaults();

    /** @private Avoid naming conflicts with child classes */
    this.dlf = {
      handlers: {
        onDomContentLoaded: this.onDomContentLoaded.bind(this),
        onPlayerErrorEvent: this.onPlayerErrorEvent.bind(this),
        onTrackChange: this.onTrackChange.bind(this),
        onTick: this.onTick.bind(this),
        onPlay: this.onPlay.bind(this),
      },
    };

    /** @protected @readonly @type {HTMLVideoElement} */
    this.video = e('video', {
      id: this.env.mkid(),
      className: "dlf-media",
    });

    /**
     * The object that has caused current pause state, if any.
     *
     * See {@link pauseOn} and {@link resumeOn}.
     *
     * @private
     * @type {any}
     */
    this.videoPausedOn = null;

    /** @private @type {dlf.media.Source | null} */
    this.currentSource = null;

    /** @protected @type {dlf.media.TimeRange | null} */
    this.timeRange = null;

    /** @private @type {shaka.Player} */
    this.player = new shaka.Player(this.video);

    /** @private @type {dlf.media.Fps | null} */
    this.fps = null;

    /** @private @type {VariantGroups | null} */
    this.variantGroups = null;

    /** @private @type {Chapters} */
    this.chapters_ = new Chapters([]);

    /** @private @type {dlf.media.Chapter | null} */
    this.currentChapter = null;

    /** @private @type {dlf.media.PlayerFrontend} */
    this.frontend = new ShakaFrontend(this.env, this.player, this.video);

    /** @protected @type {HTMLElement | null} */
    this.playerView = null;

    /** @private @type {dlf.media.PlayerMode | 'auto'} */
    this.mode = 'auto';

    this.__dlfRegisterEvents();

    /**
     * The actions of the player. This is typed in a way that includes additions
     * made by overriding {@link getActions}.
     *
     * @protected
     * @type {Readonly<ReturnType<this['getActions']>>}
     */
    // @ts-expect-error
    this.actions = this.getActions();
  }

  /**
   * @protected
   */
  connectedCallback() {
    const config = this.getConfig();
    this.env.setLang(config.lang);

    this.timeRange = this.getTimeRange();

    const playerViewId = this.getAttribute('player-view');
    if (playerViewId !== null) {
      this.playerView = document.getElementById(playerViewId);
    }

    this.configureFrontend(config);

    // In `connectedCallback`, the DOM children may not yet be available.
    // Wait for DOM being parsed before loading sources.
    setTimeout(() => {
      this.loadSources();
      this.loadChapters();
    });

    this.appendChild(this.frontend.domElement);
    this.frontend.domElement.className += ` ${this.className}`;
  }

  /**
   * @protected
   * @param {dlf.media.PlayerConfig} config
   */
  configureFrontend(config) {
    const controlElements = Array.from(this.querySelectorAll('dlf-media-controls *'))
      .filter(/** @type {(el: Element) => el is HTMLElement} */(
        el => el instanceof HTMLElement
      ));

    const mode = this.getAttribute('mode');
    let initialMode = undefined;
    if (mode === 'auto') {
      const fallbackMode = this.getAttribute('mode-fallback');
      if (isPlayerMode(fallbackMode)) {
        initialMode = fallbackMode;
      }
      this.mode = mode;
    } else if (isPlayerMode(mode)) {
      this.mode = initialMode = mode;
    }

    this.frontend.updatePlayerProperties({
      locale: config.lang.twoLetterIsoCode,
      mode: initialMode,
      controlElements,
      actions: this.actions,
      playerView: this.playerView,
    });

    const posterUrl = this.getAttribute('poster');
    if (posterUrl !== null) {
      this.frontend.updateMediaProperties({
        poster: posterUrl,
      });
    }
  }

  /**
   * @protected
   * @returns {dlf.media.PlayerConfig}
   */
  getConfig() {
    let config = this.config;

    if (config === null) {
      const configVar = this.getAttribute('config');

      if (configVar) {
        config = /** @type {any} */(window[/** @type {any} */(configVar)]);
      } else {
        config = {
          lang: {
            locale: 'en_US.UTF8',
            twoLetterIsoCode: 'en',
            phrases: {},
          },
        };
      }

      this.config = config;
    }

    // @ts-expect-error TODO: Why doesn't TypeScript recognize this?
    return config;
  }

  /**
   * Get default constant/configuration values for the player. This may be
   * extended in a child class.
   */
  constantDefaults() {
    return {
      prevChapterTolerance: 5,
      volumeStep: 0.05,
      seekStep: 5,
      trickPlayFactor: 4,
      forceLandscapeOnFullscreen: true,
    };
  }

  /**
   * Get actions of the player that can be used in keybindings.
   *
   * To add actions in a child class, override this method and return an object
   * that extends the result of this method:
   *
   * ```js
   * getActions() {
   *   return {
   *     ...super.getActions(),
   *     // your actions here
   *   };
   * }
   * ```
   */
  getActions() {
    return {
      'fullscreen.toggle': action({
        isAvailable: () => {
          return document.fullscreenEnabled;
        },
        execute: () => {
          this.frontend.seekBar?.endSeek();
          this.toggleFullScreen();
        },
      }),
      'playback.toggle': action(() => {
        if (this.video.paused) {
          this.video.play();
        } else {
          this.video.pause();
        }
      }),
      'playback.volume.mute.toggle': action(() => {
        this.video.muted = !this.video.muted;
      }),
      'playback.volume.inc': action(() => {
        this.volume = this.volume + this.constants.volumeStep;
      }),
      'playback.volume.dec': action(() => {
        this.volume = this.volume - this.constants.volumeStep;
      }),
      'playback.captions.toggle': action({
        isAvailable: () => {
          return this.player.getTextTracks().length > 0;
        },
        execute: () => {
          this.showCaptions = !this.showCaptions;
        },
      }),
      'navigate.rewind': action(() => {
        this.skipSeconds(-this.constants.seekStep);
      }),
      'navigate.seek': action(() => {
        this.skipSeconds(+this.constants.seekStep);
      }),
      'navigate.continuous-rewind': action(() => {
        this.ensureTrickPlay(-this.constants.trickPlayFactor);
      }),
      'navigate.continuous-seek': action(() => {
        this.ensureTrickPlay(this.constants.trickPlayFactor);
      }),
      'navigate.chapter.prev': action(() => {
        this.prevChapter();
      }),
      'navigate.chapter.next': action(() => {
        this.nextChapter();
      }),
      'navigate.frame.prev': action({
        isAvailable: () => {
          return this.fps !== null;
        },
        execute: () => {
          this.fps?.vifa.seekBackward(1);
          this.frontend.afterManualSeek();
        },
      }),
      'navigate.frame.next': action(({
        isAvailable: () => {
          return this.fps !== null;
        },
        execute: () => {
          this.fps?.vifa.seekForward(1);
          this.frontend.afterManualSeek();
        },
      })),
      'navigate.position.percental': action((kb, keyIndex) => {
        if (kb === undefined || keyIndex === undefined) {
          return;
        }

        if (0 <= keyIndex && keyIndex < kb.keys.length) {
          // Implies kb.keys.length > 0

          const relative = keyIndex / kb.keys.length;
          const absolute = relative * this.video.duration;

          this.seekTo(absolute);
        }
      }),
      'navigate.thumbnails.snap': action({
        isAvailable: () => {
          return (
            this.variantGroups !== null
            && this.variantGroups.findThumbnailTracks().length > 0
          );
        },
        execute: (_kb, _keyIndex, mode) => {
          this.frontend.seekBar?.setThumbnailSnap(mode === 'down');
        },
      }),
    };
  }

  /**
   * Determines time range from user settings. Returns `null` if no such setting
   * is made, which a child class may take as a hint to use another value.
   *
   * @protected
   * @returns {dlf.media.TimeRange | null}
   */
  getTimeRange() {
    return this.parseTimeRange(
      this.getAttribute('start'),
      this.getAttribute('end')
    );
  }

  /**
   *
   * @protected
   * @param {string | null | undefined} start
   * @param {string | null | undefined} end
   * @returns {dlf.media.TimeRange | null}
   */
  parseTimeRange(start, end) {
    // Also ignore empty start value to simplify HTML template
    if (!start) {
      return null;
    }

    const startTime = parseFloat(start);
    // Also excludes NaN
    if (!(startTime >= 0)) {
      return null;
    }

    let endTime = end ? parseFloat(end) : null;
    if (endTime !== null && !(endTime >= startTime)) {
      endTime = null;
    }

    return {
      startTime,
      endTime,
    }
  }

  /**
   * @private
   */
  __dlfRegisterEvents() {
    window.addEventListener('DOMContentLoaded', this.dlf.handlers.onDomContentLoaded);

    this.player.addEventListener('error', this.dlf.handlers.onPlayerErrorEvent);
    this.player.addEventListener('adaptation', this.dlf.handlers.onTrackChange);
    this.player.addEventListener('variantchanged', this.dlf.handlers.onTrackChange);

    this.video.addEventListener('play', this.dlf.handlers.onPlay);

    /** @private */
    this.tickInterval = setInterval(this.dlf.handlers.onTick, 50);

    this.registerGestures();
  }

  /**
   * @private
   */
  registerGestures() {
    const g = this.frontend.gestures;
    if (g === null) {
      return;
    }

    g.on('gesture', (e) => {
      switch (e.type) {
        case 'tapup':
          if (e.event.pointerType === 'mouse') {
            if (e.tapCount <= 2) {
              this.actions['playback.toggle'].execute();
            }

            if (e.tapCount === 2) {
              this.actions['fullscreen.toggle'].execute();
            }
          } else if (e.tapCount >= 2) {
            if (e.position.x < 1 / 3) {
              this.actions['navigate.rewind'].execute();
            } else if (e.position.x > 2 / 3) {
              this.actions['navigate.seek'].execute();
            } else if (e.tapCount === 2 && !this.env.isInFullScreen()) {
              this.actions['fullscreen.toggle'].execute();
            }
          }
          break;

        case 'hold':
          if (e.tapCount === 1) {
            // TODO: Somehow extract an action "navigate.relative-seek"? How to pass clientX?
            this.frontend.seekBar?.thumbnailPreview?.beginChange(e.event.clientX);
          } else if (e.tapCount >= 2) {
            if (e.position.x < 1 / 3) {
              this.actions['navigate.continuous-rewind'].execute();
            } else if (e.position.x > 2 / 3) {
              this.actions['navigate.continuous-seek'].execute();
            }
          }
          break;

        case 'swipe':
          // "Natural" swiping
          if (e.direction === 'east') {
            this.actions['navigate.rewind'].execute();
          } else if (e.direction === 'west') {
            this.actions['navigate.seek'].execute();
          }
          break;
      }
    });

    g.on('release', () => {
      this.frontend.seekBar?.endSeek();
      this.cancelTrickPlay();
    });
  }

  /**
   * @returns {dlf.media.PlayerFrontend}
   */
  get ui() {
    return this.frontend;
  }

  /**
   * Determines whether or not the player supports playback of videos in the
   * given mime type.
   *
   * @private
   * @param {string} mimeType
   * @returns {boolean}
   */
  supportsMimeType(mimeType) {
    switch (mimeType) {
      case 'application/dash+xml':
      case 'application/x-mpegurl':
      case 'application/vnd.apple.mpegurl':
        return (
          this.env.supportsMediaSource()
          || this.env.supportsVideoMime(mimeType)
        );

      default:
        return this.env.supportsVideoMime(mimeType);
    }
  }

  loadSources() {
    /** @type {dlf.media.Source[]} */
    const sources = [];

    this.querySelectorAll('source').forEach((el) => {
      const url = el.getAttribute("src");
      const mimeType = el.getAttribute("type");

      if (!url || !mimeType) {
        console.warn('Ignoring <source> that does not specify URL or MIME type');
        return;
      }

      /** @type {dlf.media.Source['frameRate']} */
      let frameRate = null;
      const attrFps = el.getAttribute("data-fps");
      if (attrFps !== null) {
        const fps = parseFloat(attrFps);
        if (fps > 0) {
          // Also excludes empty "data-fps" or NaN
          frameRate = fps;
        }
      }

      sources.push({ url, mimeType, frameRate });
    });

    this.loadOneOf(sources);
  }

  /**
   *
   * @param {dlf.media.Source[]} sources
   */
  async loadOneOf(sources) {
    if (sources.length === 0) {
      this.frontend.updatePlayerProperties({
        error: 'error.no-media-source',
      });
      return false;
    }

    let sawUnsupportedMime = false;

    // Try loading video until one of the sources works.
    for (const source of sources) {
      if (!this.supportsMimeType(source.mimeType)) {
        sawUnsupportedMime = true;
        continue;
      }

      try {
        await this.loadManifest(source);
        this.frontend.updatePlayerProperties({
          error: null,
          mode: this.mode === 'auto'
            ? (this.player.isAudioOnly() ? 'audio' : 'video')
            : undefined,
        });
        this.loaded();
        return true;
      } catch (e) {
        console.error(e);
      }
    }

    this.frontend.updatePlayerProperties({
      error: sawUnsupportedMime
        ? 'error.playback-not-supported'
        : 'error.load-failed',
    });
    return false;
  }

  /**
   *
   * @private
   * @param {dlf.media.Source} videoSource
   */
  async loadManifest(videoSource) {
    const startTime = this.timeRange?.startTime ?? null;
    await this.player.load(videoSource.url, startTime, videoSource.mimeType);
    this.currentSource = videoSource;

    this.variantGroups = new VariantGroups(this.player);

    this.variantGroups.selectGroupWithPrimary()
      || this.variantGroups.selectGroupByRole("main")
      || this.variantGroups.selectGroupByIndex(0);

    this.frontend.updateMediaProperties({
      variantGroups: this.variantGroups,
    });

    this.updateFrameRate();
  }

  /**
   * @protected
   */
  onDomContentLoaded() {
    // Override in child
  }

  onTick() {
    const curChapter = this.chapters_.timeToChapter(this.video.currentTime) ?? null;
    if (curChapter !== this.currentChapter) {
      const prevChapter = this.currentChapter;
      this.currentChapter = curChapter;
      /** @type {dlf.media.ChapterChangeEvent} */
      const event = new CustomEvent('chapterchange', {
        detail: {
          curChapter,
          prevChapter,
        },
      });
      this.dispatchEvent(event);
    }
  }

  onTrackChange() {
    this.updateFrameRate();
  }

  updateFrameRate() {
    const fps = (
      this.variantGroups?.findActiveTrack()?.frameRate
      ?? this.currentSource?.frameRate
      ?? null
    );

    if (fps === null) {
      this.fps = null;
    } else if (this.fps === null || fps !== this.fps.rate) {
      this.fps = {
        rate: fps,
        vifa: new VideoFrame({
          id: this.video.id,
          frameRate: fps,
        }),
      };
    }

    this.frontend.updateMediaProperties({
      fps: this.fps,
    });
  }

  onPlay() {
    this.videoPausedOn = null;
  }

  /**
   * Override in child class.
   */
  async toggleFullScreen() {
    // We use this instead of Shaka's toggleFullScreen so that we don't need to
    // append the app elements (modals) to the player container.
    this.env.toggleFullScreen(this.playerView ?? this.ui.domElement,
      this.constants.forceLandscapeOnFullscreen);
  }

  /**
   * @private
   */
  loadChapters() {
    /** @type {dlf.media.Chapter[]} */
    const chapters = [];

    this.querySelectorAll('dlf-chapter').forEach((el) => {
      const title = el.getAttribute('title');
      const timecode = Number(el.getAttribute('timecode'));

      if (!title || !(timecode >= 0)) {
        console.warn('Ignoring invalid <dlf-chapter>');
        return;
      }

      chapters.push({ title, timecode });
    });

    this.setChapters(new Chapters(chapters));
  }

  get chapters() {
    return this.chapters_;
  }

  /**
   *
   * @param {Chapters} chapters
   */
  setChapters(chapters) {
    this.chapters_ = chapters;
    this.frontend.updateMediaProperties({ chapters });
  }

  loaded() {
    //
  }

  get hasVideo() {
    return this.currentSource !== null;
  }

  /**
   *
   * @returns {dlf.media.Chapter | undefined}
   */
  getCurrentChapter() {
    return this.timeToChapter(this.video.currentTime);
  }

  /**
   *
   * @param {number} timecode
   * @returns {dlf.media.Chapter | undefined}
   */
  timeToChapter(timecode) {
    return this.chapters_.timeToChapter(timecode);
  }

  /**
   * @returns {HTMLVideoElement}
   */
  get media() {
    return this.video;
  }

  /**
   * Whether or not enough data is available for the current playback position
   * (checks `readyState`).
   *
   * @returns {boolean}
   */
  get hasCurrentData() {
    return this.video.readyState >= 2;
  }

  get showCaptions() {
    return this.player.isTextTrackVisible()
  }

  set showCaptions(value) {
    this.player.setTextTrackVisibility(value);
  }

  isAudioOnly() {
    return this.player.isAudioOnly();
  }

  /**
   * Volume in range [0, 1]. Out-of-bounds values are clamped when set.
   *
   * @type {number}
   */
  get volume() {
    return this.video.volume;
  }

  set volume(value) {
    this.video.volume = clamp(value, [0, 1]);
  }

  /**
   * @type {number}
   */
  get displayTime() {
    // Adopted from "getDisplayTime" in "shaka.ui.Controls"
    return this.frontend.seekBar?.getValue() ?? this.video.currentTime;
  }

  /**
   * Pause playback on the given {@link obj}. See {@link resumeOn}.
   *
   * For example, this may be used to pause the video on opening a modal and
   * resume it when the modal is closed.
   *
   * @param {any} obj
   */
  pauseOn(obj) {
    if (this.videoPausedOn === null && !this.video.paused) {
      this.videoPausedOn = obj;
      this.video.pause();
    }
  }

  /**
   * If the video is currently paused because of calling {@link pauseOn} on
   * {@link obj}, resume the video.
   *
   * @param {any} obj
   */
  resumeOn(obj) {
    if (this.videoPausedOn === obj) {
      this.video.play();
    }
  }

  /**
   *
   * @returns {number | null}
   */
  getFps() {
    return this.fps?.rate ?? null;
  }

  /**
   * Seek to the specified {@link position} and mark this as a manual seek.
   *
   * @param {number | dlf.media.Chapter} position Timecode (in seconds) or chapter
   */
  seekTo(position) {
    if (typeof position === 'number') {
      this.video.currentTime = position;
    } else if (typeof position.timecode === 'number') {
      this.video.currentTime = position.timecode;
    }

    this.frontend.afterManualSeek();
  }

  /**
   *
   * @param {number} delta
   */
  skipSeconds(delta) {
    // TODO: Consider end of video
    this.seekTo(this.video.currentTime + delta);
  }

  /**
   * Within configured number of seconds of a chapter, jump to the start of the
   * previous chapter. After that, jump to the start of the current chapter. As
   * a fallback, jump to the start of the video.
   */
  prevChapter() {
    const tolerance = this.constants.prevChapterTolerance;
    const prev = this.chapters_.timeToChapter(this.video.currentTime - tolerance);
    this.seekTo(prev ?? 0);
  }

  /**
   * Jumps to the start of the next chapter. If the last chapter is currently
   * being played, this is a no-op.
   */
  nextChapter() {
    const cur = this.getCurrentChapter();
    if (cur) {
      const next = this.chapters_.advance(cur, +1);

      if (next) {
        this.seekTo(next);
      }
    }
  }

  /**
   * Enables trick mode at the given {@link rate}, unless the player already
   * is at that rate.
   *
   * @param {number} rate
   */
  ensureTrickPlay(rate) {
    if (this.player.getPlaybackRate() !== rate) {
      this.player.trickPlay(rate);
    }
  }

  cancelTrickPlay() {
    // This may throw, in particular, if Shaka's play rate controller is not yet
    // initialized (because the video is not yet loaded).
    try {
      this.player.cancelTrickPlay();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   *
   * @param {Event} event
   */
  onPlayerErrorEvent(event) {
    if (event instanceof CustomEvent) {
      // TODO: Propagate to user
      const error = event.detail;
      console.error('Error from Shaka player', error.code, error);
    }
  }
}

customElements.define('dlf-media', DlfMediaPlayer);
