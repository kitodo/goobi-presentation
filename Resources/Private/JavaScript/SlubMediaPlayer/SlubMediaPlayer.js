// @ts-check

import { setElementClass } from '../lib/util';
import { Keybindings$find } from '../lib/Keyboard';
import typoConstants from '../lib/typoConstants';
import { action, DlfMediaPlayer } from '../DlfMediaPlayer';
import ShakaFrontend from '../DlfMediaPlayer/frontend/ShakaFrontend';

import Modals from './lib/Modals';
import { BookmarkModal, HelpModal, ScreenshotModal } from './modals';

import keybindings from './keybindings.json';

/**
 * @typedef {'player' | 'modal' | 'input'} KeyboardScope Currently active
 * target/scope for mapping keybindings.
 *
 * @typedef {HTMLElement & { dlfTimecode: number }} ChapterLink
 *
 * @typedef {{
 *  help: HelpModal;
 *  bookmark: BookmarkModal;
 *  screenshot: ScreenshotModal;
 * }} AppModals
 */

/**
 * @extends {DlfMediaPlayer}
 */
export default class SlubMediaPlayer extends DlfMediaPlayer {
  constructor() {
    super();

    /** @type {MetadataArray} */
    this.metadata = {};

    /** @private @type {Keybinding<KeyboardScope, keyof SlubMediaPlayer['actions']>[]} */
    this.keybindings = /** @type {any} */(keybindings);

    /** @private */
    this.handlers = {
      onKeyDown: this.onKeyDown.bind(this),
      onKeyUp: this.onKeyUp.bind(this),
      onClickChapterLink: this.onClickChapterLink.bind(this),
      onChapterChanged: this.onChapterChanged.bind(this),
      onCloseModal: this.onCloseModal.bind(this),
    };

    /** @private @type {ChapterLink[]} */
    this.chapterLinks = [];

    /** @private @type {HTMLSelectElement | null} */
    this.pageSelect = null;

    /** @private */
    this.modals = null;
  }

  // TODO: Rethink
  getKeybindings() {
    return this.keybindings;
  }

  /**
   * @override
   */
  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('chapterchange', this.handlers.onChapterChanged);

    /** @type {Partial<AppConfig>} */
    const config = this.getConfig();

    // @ts-expect-error TODO
    const constants = typoConstants(config.constants ?? {}, this.constants);

    if (this.playerView !== null) {
      this.modals = Modals({
        help: new HelpModal(this.playerView, this.env, {
          constants: {
            ...constants,
            // TODO: Refactor
            forceLandscapeOnFullscreen: Number(this.constants.forceLandscapeOnFullscreen),
          },
          keybindings: this.keybindings,
          actionIsAvailable: (actionKey) => {
            // @ts-expect-error
            const action = this.actions[actionKey];
            return action !== undefined && action.isAvailable();
          },
        }),
        bookmark: new BookmarkModal(this.playerView, this.env, {
          shareButtons: config.shareButtons ?? [],
        }),
        screenshot: new ScreenshotModal(this.playerView, this.env, {
          keybindings: this.keybindings,
          screnshotCaptions: config.screenshotCaptions ?? [],
          constants: config.constants ?? {},
        }),
      });

      this.modals.on('closed', this.handlers.onCloseModal);
    }

    // In `connectedCallback`, the DOM children may not yet be available.
    setTimeout(() => {
      this.loadMetadata();
    });
  }

  /**
   * @private
   */
  loadMetadata() {
    this.querySelectorAll('dlf-meta').forEach((el) => {
      const key = el.getAttribute('key');
      const value = el.getAttribute('value');

      if (!key || !value) {
        console.warn('Ignoring invalid <dlf-meta>');
        return;
      }

      let values = this.metadata[key];
      if (values === undefined) {
        values = this.metadata[key] = [];
      }
      values.push(value);
    });
  }

  /**
   * @override
   */
  getActions() {
    return {
      ...super.getActions(),
      'cancel': action(() => {
        if (this.modals?.hasOpen()) {
          this.modals.closeNext();
        } else {
          return this.ui.handleEscape();
        }
      }),
      'modal.help.open': action(() => {
        this.openModal(this.modals?.help);
      }),
      'modal.help.toggle': action(() => {
        if (this.modals !== null) {
          this.ui.seekBar?.endSeek();
          this.modals.toggleExclusive(this.modals.help);
        }
      }),
      'modal.bookmark.open': action(() => {
        this.showBookmarkUrl();
      }),
      'modal.screenshot.open': action({
        isAvailable: () => {
          return !this.isAudioOnly();
        },
        execute: () => {
          this.showScreenshot();
        },
      }),
      'modal.screenshot.snap': action({
        isAvailable: () => {
          return !this.isAudioOnly();
        },
        execute: () => {
          this.snapScreenshot();
        },
      }),
      'theater.toggle': action(() => {
        this.ui.seekBar?.endSeek();

        // @see DigitalcollectionsScripts.js
        // TODO: Make sure the theater mode isn't activated on startup; then stop persisting
        /** @type {DlfTheaterMode} */
        const ev = new CustomEvent('dlf-theater-mode', {
          detail: {
            action: 'toggle',
            persist: true,
          },
        });
        window.dispatchEvent(ev);
      }),
    };
  }

  /**
   * @override
   */
  getTimeRange() {
    const baseValue = super.getTimeRange();
    if (baseValue !== null) {
      return baseValue;
    }

    // TODO: Also from hash?
    const searchTimecode = this.env.getLocation().searchParams.get('timecode');
    if (searchTimecode) {
      const [start, end] = searchTimecode.split(',', 2);
      return this.parseTimeRange(start, end);
    }

    return null;
  }

  /**
   * Extracts timecode to jump to when clicking on {@link link}, or `null` if
   * none could be determined.
   *
   * @private
   * @param {HTMLAnchorElement} link
   * @returns {number | null}
   */
  getLinkTimecode(link) {
    // Attempt: Parse data-timecode attribute
    const timecodeAttr = link.getAttribute("data-timecode");
    if (timecodeAttr !== null) {
      const timecode = Number(timecodeAttr);
      if (Number.isFinite(timecode)) {
        return timecode;
      }
    }

    // Attempt: Parse timecode hash in URL ("#timecode=120")
    const timecodeMatch = link.hash.match(/timecode=(\d+(\.\d?)?)/);
    if (timecodeMatch !== null) {
      const timecode = Number(timecodeMatch[1]);
      if (Number.isFinite(timecode)) {
        return timecode;
      }
    }

    return null;
  }

  /**
   * @override
   */
  onDomContentLoaded() {
    super.onDomContentLoaded();

    document.querySelectorAll("a[data-timecode], .tx-dlf-tableofcontents a, .tx-dlf-toc a").forEach(el => {
      const link = /** @type {HTMLAnchorElement} */(el);
      const timecode = this.getLinkTimecode(link);
      if (timecode !== null) {
        const dlfEl = /** @type {ChapterLink} */(el);
        dlfEl.dlfTimecode = timecode;
        dlfEl.addEventListener('click', this.handlers.onClickChapterLink);
        this.chapterLinks.push(dlfEl);
      }
    });

    const pageSelect = document.querySelector('li.pages form select');
    if (pageSelect instanceof HTMLSelectElement) {
      this.pageSelect = pageSelect;
      this.pageSelect.onchange = (e) => {
        const pageNo = Number(pageSelect.value);

        const chapter = (
          this.chapters.find(ch => ch.pageNo === pageNo)
          ?? this.chapters.at(pageNo - 1)
        );

        if (chapter !== undefined) {
          this.seekTo(chapter);
        }
      };
    }
  }

  /**
   * @override
   */
  loaded() {
    // TODO: Resize appropriately
    this.modals?.resize();
  }

  /**
   * @override
   * @param {dlf.media.PlayerConfig} config
   */
  configureFrontend(config) {
    super.configureFrontend(config);

    document.addEventListener('keydown', this.handlers.onKeyDown, { capture: true });
    document.addEventListener('keyup', this.handlers.onKeyUp, { capture: true });
  }

  /**
   * @private
   * @returns {KeyboardScope}
   */
  getKeyboardScope() {
    if (this.modals?.hasOpen()) {
      return 'modal';
    }

    for (const input of Array.from(document.querySelectorAll('input:focus'))) {
      // Check that the input element is visible (would receive the event)
      if (input instanceof HTMLElement && input.offsetParent !== null) {
        return 'input';
      }
    }

    return 'player';
  }

  /**
   * @private
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    if (!this.hasVideo) {
      return;
    }

    this.handleKey(e, 'down');
  }

  /**
   * @private
   * @param {KeyboardEvent} e
   */
  onKeyUp(e) {
    // Stopping propagation is a hack against the keyup handler in
    // `slub_digitalcollections`, which adds/removes a `fullscreen` CSS
    // class when releasing `f`/`Esc`.
    // TODO: Find better solutions for this.
    if (!this.hasVideo) {
      return;
    }

    e.stopImmediatePropagation();

    this.handleKey(e, 'up');
    this.cancelTrickPlay();
  }

  /**
   * @private
   * @param {KeyboardEvent} e
   * @param {KeyEventMode} mode
   */
  handleKey(e, mode) {
    const curKbScope = this.getKeyboardScope();
    const result = Keybindings$find(this.keybindings, e, curKbScope);

    if (result) {
      const { keybinding, keyIndex } = result;

      e.preventDefault();

      const shouldHandle = (
        (mode === 'down' && (keybinding.keydown ?? true))
        || (mode === 'up' && (keybinding.keyup ?? false))
      );

      const action = this.actions[keybinding.action];

      if (shouldHandle && action !== undefined && action.isAvailable()) {
        const actionResult = action.execute(keybinding, keyIndex, mode);
        const hasExecuted = actionResult !== false;
        // Hack against Shaka reacting to Escape key to close overflow menu;
        // we do this ourselves. (TODO: Find a better solution)
        // (However, try not to block other event handlers.)
        if (hasExecuted && e.key === 'Escape') {
          e.stopImmediatePropagation();
        }
      }
    }
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onClickChapterLink(e) {
    e.preventDefault();

    // Use `currentTarget` to get the <a> element to which the handler has
    // been attached.
    const target = /** @type {ChapterLink} */(e.currentTarget);

    this.media.play();
    this.seekTo(target.dlfTimecode);
  }

  /**
   *
   * @param {dlf.media.ChapterChangeEvent} event
   */
  onChapterChanged(event) {
    const chapter = event.detail.curChapter;
    if (this.pageSelect != null && chapter !== null) {
      if (chapter.pageNo !== null) {
        this.pageSelect.value = chapter.pageNo.toString();
      } else {
        const chapterIdx = this.chapters.indexOf(chapter);
        if (chapterIdx !== undefined) {
          this.pageSelect.value = (chapterIdx + 1).toString();
        }
      }
    }

    for (const link of this.chapterLinks) {
      if (link.parentElement === null) {
        continue;
      }

      setElementClass(link.parentElement, 'current', link.dlfTimecode === chapter?.timecode);
    }
  }

  /**
   * @private
   * @param {ValueOf<AppModals>} modal
   */
  onCloseModal(modal) {
    this.resumeOn(modal);
  }

  /**
   *
   * @param {dlf.media.TimeRange | null} markerRange
   */
  showBookmarkUrl(markerRange = null) {
    // Don't show modal if we can't expect the current time to be properly
    // initialized
    if (!this.hasCurrentData) {
      return;
    }

    const modal = this.modals?.bookmark;
    if (modal === undefined) {
      return;
    }

    modal.setState({
      metadata: this.metadata,
      timing: {
        currentTime: this.displayTime,
        markerRange: (
          markerRange
          ?? this.getMarkers().activeSegment?.toTimeRange()
          ?? null
        ),
      },
      fps: this.getFps() ?? 0,
    });

    if (markerRange !== null) {
      modal.setState({
        startAtMode: 'marker',
      });
    }

    this.openModal(modal, /* pause= */ true);
  }

  /**
   * @returns {ScreenshotModal | undefined}
   */
  prepareScreenshot() {
    // Don't do screenshot if there isn't yet an image to be displayed
    if (!this.hasCurrentData) {
      return;
    }

    return (
      this.modals?.screenshot
        .setVideo(this.video)
        .setMetadata(this.metadata)
        .setFps(this.getFps())
        .setTimecode(this.displayTime)
    );
  }

  showScreenshot() {
    const modal = this.prepareScreenshot();
    this.openModal(modal, /* pause= */ true);
  }

  snapScreenshot() {
    const modal = this.prepareScreenshot();
    modal?.snap();
  }

  /**
   * @private
   * @param {ValueOf<AppModals>=} modal
   * @param {boolean} pause
   */
  openModal(modal, pause = false) {
    if (modal == null) {
      return;
    }

    if (pause) {
      this.pauseOn(modal);
    }

    this.ui.seekBar?.endSeek();
    modal.open();
  }
}

customElements.define('slub-media', SlubMediaPlayer);
