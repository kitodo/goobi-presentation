// @ts-check

import QRCode from 'qrcode';

import { e, filterNonNull, setElementClass } from '../../lib/util';
import { buildTimeString } from '../../DlfMediaPlayer';
import SimpleModal from '../lib/SimpleModal';
import { createShareButton } from '../lib/ShareButton';
import { makeExtendedMetadata } from '../lib/metadata';
import UrlGenerator from '../lib/UrlGenerator';

/**
 * The order is used for GUI rendering.
 */
const START_AT_MODES = /** @type {const} */(['current-time', 'marker', 'begin']);

/**
 * @typedef {{
 *  shareButtons: import('../lib/ShareButton').ShareButtonInfo[];
 * }} Config
 *
 * @typedef {typeof START_AT_MODES[number]} StartAtMode
 *
 * @typedef {{
 *  currentTime: number;
 *  markerRange: dlf.media.TimeRange | null;
 * }} TimingInfo
 *
 * @typedef {{
 *  metadata: MetadataArray;
 *  timing: TimingInfo;
 *  fps: number;
 *  startAtMode: StartAtMode;
 *  showQrCode: boolean;
 * }} State
 */

/**
 * @extends {SimpleModal<State>}
 */
export default class BookmarkModal extends SimpleModal {
  /**
   *
   * @param {HTMLElement} element
   * @param {Translator & Identifier & Browser} env
   * @param {Partial<Config>} config
   */
  constructor(element, env, config) {
    super(element, {
      metadata: {},
      timing: {
        currentTime: 0,
        markerRange: null,
      },
      fps: 0,
      startAtMode: 'current-time',
      showQrCode: false,
    });

    /** @private @type {string | null} */
    this.lastRenderedUrl = null;

    /** @private */
    this.handlers = {
      handleClickShareButton: this.handleClickShareButton.bind(this),
      handleChangeStartAt: this.handleChangeStartAt.bind(this),
    };

    /** @private */
    this.env = env;

    /** @private */
    this.gen = new UrlGenerator(this.env);

    this.$main.classList.add('bookmark-modal');
    this.$title.innerText = this.env.t('modal.bookmark.title');

    const startAtGroupId = this.env.mkid();

    const shareButtons = (config.shareButtons ?? []).map((info) => {
      return createShareButton(this.env, info, {
        onClick: this.handlers.handleClickShareButton,
      });
    });
    this.shareButtons = filterNonNull(shareButtons);

    this.$startAtVariants = /** @type {const} */({
      'begin': this.makeStartAtVariant(startAtGroupId, 'begin'),
      'current-time': this.makeStartAtVariant(startAtGroupId, 'current-time'),
      'marker': this.makeStartAtVariant(startAtGroupId, 'marker'),
    });

    this.$body.append(
      e("div", {}, [
        this.shareButtons.length > 0 && (
          e("div", { className: "share-buttons" },
            this.shareButtons.map(btn => btn.element)
          )
        ),
        e("div", { className: "url-line" }, [
          this.$urlInput = e("input", {
            type: "url",
            readOnly: true,
            value: location.href,
          }),
          this.$copyLinkBtn = e("a", {
            href: "javascript:void(0)",
            target: '_blank',
            className: "copy-to-clipboard",
            title: this.env.t('modal.bookmark.copy-link'),
            $click: this.handleCopyToClipboard.bind(this),
          }, [
            e("i", { className: "material-icons-round" }, ["content_copy"]),
          ]),
        ]),
        this.$startAt = e("div", { className: "start-at" }, (
          START_AT_MODES.map(mode => this.$startAtVariants[mode].$container)
        )),
        this.$qrCanvasContainer = e("div", { className: "url-qrcode" }, [
          e("hr"),
          this.$qrCanvas = e("canvas"),
        ]),
      ])
    );
  }

  /**
   *
   * @private
   * @param {string} radioGroup
   * @param {StartAtMode} mode
   */
  makeStartAtVariant(radioGroup, mode) {
    const id = this.env.mkid();

    const $radio = e('input', {
      type: "radio",
      name: radioGroup,
      value: mode,
      id,
      $change: this.handlers.handleChangeStartAt,
    });

    const $label = e('label', { htmlFor: id }, [
      this.translateStartAtLabel(mode, {
        currentTime: 0,
        markerRange: null,
      }, null),
    ]);

    const $container = e('div', { className: `start-at-${mode}` }, [
      $radio,
      $label,
    ]);

    return { id, $radio, $label, $container };
  }

  /**
   *
   * @param {MouseEvent} e
   */
  handleClickShareButton(e) {
    const element =/** @type {HTMLAnchorElement} */(e.currentTarget);

    if (element.href === "dlf:qr_code") {
      e.preventDefault();

      this.setState({
        showQrCode: true,
      });
    }
  }

  /**
   *
   * @param {MouseEvent} e
   */
  async handleCopyToClipboard(e) {
    e.preventDefault();

    const url = this.generateUrl(this.state);

    // Besides being necessary for `execCommand`, the focus is also meant to
    // provide visual feedback to the user.
    // TODO: Improve user feedback, also when an exception occurs
    this.$urlInput.focus();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      document.execCommand('copy');
    }
  }

  /**
   *
   * @param {Event} e
   */
  handleChangeStartAt(e) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }

    this.setState({
      startAtMode: /** @type {StartAtMode} */(e.target.value),
    });
  }

  /**
   * @private
   * @param {State} state
   */
  generateUrl(state) {
    const timerange = this.getActiveTimeRange(state);
    return this.gen.generateTimerangeUrl(timerange).toString();
  }

  /**
   * @private
   * @param {State} state
   * @returns {dlf.media.TimeRange | null}
   */
  getActiveTimeRange(state) {
    switch (state.startAtMode) {
      case 'begin': return null;
      case 'current-time': return {
        startTime: state.timing.currentTime,
        endTime: null,
      };
      case 'marker': return state.timing.markerRange;
    }
  }

  /**
   * @override
   * @param {boolean} value
   */
  open(value = true) {
    super.open(value);

    if (!value) {
      this.setState({ showQrCode: false });
    }
  }

  /**
   * @override
   * @param {import('../lib/SimpleModal').BaseState & State} state
   */
  render(state) {
    super.render(state);

    const { show, metadata, timing, fps, startAtMode, showQrCode } = state;

    const timerange = this.getActiveTimeRange(state);
    const extendedMetadata = makeExtendedMetadata(this.gen, metadata, timerange, fps);

    const url = extendedMetadata['url']?.[0] ?? '';
    const urlChanged = url !== this.lastRenderedUrl;

    if (urlChanged) {
      /** @type {Record<string, string>} */
      const urlMetadata = {};

      for (const [key, value] of Object.entries(extendedMetadata)) {
        urlMetadata[key] = encodeURIComponent(value[0] ?? '');
      }

      for (const btn of this.shareButtons) {
        btn.fillPlaceholders(urlMetadata);
      }

      this.$urlInput.value = url;
      this.$copyLinkBtn.href = url;
      this.lastRenderedUrl = url;
    }

    if (urlChanged || showQrCode !== this.state.showQrCode) {
      this.renderQrCode(showQrCode ? url : null);
    }

    // TODO: Just disable when timecode is 0?
    this.$startAtVariants[startAtMode].$radio.checked = true;
    for (const mode of START_AT_MODES) {
      this.$startAtVariants[mode].$label.innerText =
        this.translateStartAtLabel(mode, timing, fps);
    }
    setElementClass(this.$startAtVariants['begin'].$container, 'shown', true);
    setElementClass(this.$startAtVariants['current-time'].$container, 'shown', timing.currentTime !== 0);
    setElementClass(this.$startAtVariants['marker'].$container, 'shown', timing.markerRange !== null);

    if (show && show !== this.state.show) {
      this.$urlInput.select();
    }
  }

  /**
   *
   * @param {StartAtMode} mode
   * @param {TimingInfo} timing
   * @param {number | null} fps
   */
  translateStartAtLabel(mode, timing, fps) {
    const values = {
      currentTime: buildTimeString(timing.currentTime, true, fps),
      markerStart: '?',
      markerEnd: '_',
    };

    if (timing.markerRange !== null) {
      values.markerStart = buildTimeString(timing.markerRange.startTime, true, fps);

      if (timing.markerRange.endTime !== null) {
        values.markerEnd = buildTimeString(timing.markerRange.endTime, true, fps);
      }
    }

    return this.env.t(`modal.bookmark.start-at-${mode}`, values);
  }

  /**
   *
   * @param {string | null} text
   */
  async renderQrCode(text) {
    if (text !== null) {
      try {
        await QRCode.toCanvas(this.$qrCanvas, text);
        this.$qrCanvasContainer.classList.add("dlf-visible");
      } catch (e) {
        alert(this.env.t('error.qrcode'));
        console.error(e);
      }
    } else {
      this.$qrCanvasContainer.classList.remove("dlf-visible");
    }
  }
}
