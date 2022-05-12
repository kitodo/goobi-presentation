// @ts-check

import QRCode from 'qrcode';

import { e, filterNonNull } from '../../lib/util';
import { buildTimeString } from '../../DlfMediaPlayer';
import generateTimecodeUrl from '../lib/generateTimecodeUrl';
import SimpleModal from '../lib/SimpleModal';
import { createShareButton } from '../lib/ShareButton';
import { makeExtendedMetadata } from '../lib/metadata';

/**
 * @typedef {{
 *  shareButtons: import('../lib/ShareButton').ShareButtonInfo[];
 * }} Config
 *
 * @typedef {{
 *  metadata: MetadataArray;
 *  timecode: number | null;
 *  fps: number;
 *  startAtTimecode: boolean;
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
      timecode: null,
      fps: 0,
      startAtTimecode: true,
      showQrCode: false,
    });

    /** @private @type {string | null} */
    this.lastRenderedUrl = null;

    /** @private */
    this.handlers = {
      handleClickShareButton: this.handleClickShareButton.bind(this),
    };

    /** @private */
    this.env = env;

    this.$main.classList.add('bookmark-modal');
    this.$title.innerText = this.env.t('modal.bookmark.title');

    const startAtCheckId = this.env.mkid();

    const shareButtons = (config.shareButtons ?? []).map((info) => {
      return createShareButton(this.env, info, {
        onClick: this.handlers.handleClickShareButton,
      });
    });
    this.shareButtons = filterNonNull(shareButtons);

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
          e("a", {
            href: "javascript:void(0)",
            className: "copy-to-clipboard",
            title: this.env.t('modal.bookmark.copy-link'),
            $click: this.handleCopyToClipboard.bind(this),
          }, [
            e("i", { className: "material-icons-round" }, ["content_copy"]),
          ]),
        ]),
        this.$startAt = e("div", { className: "start-at" }, [
          this.$startAtCheck = e("input", {
            type: "checkbox",
            id: startAtCheckId,
            $change: this.handleChangeStartAtTimecode.bind(this),
          }),
          this.$startAtLabel = e("label", { htmlFor: startAtCheckId }),
        ]),
        this.$qrCanvasContainer = e("div", { className: "url-qrcode" }, [
          e("hr"),
          this.$qrCanvas = e("canvas"),
        ]),
      ])
    );
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

  async handleCopyToClipboard() {
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
  handleChangeStartAtTimecode(e) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }

    this.setState({
      startAtTimecode: e.target.checked,
    });
  }

  /**
   *
   * @param {MetadataArray} metadata
   * @returns {this}
   */
  setMetadata(metadata) {
    this.setState({ metadata });
    return this;
  }

  /**
   *
   * @param {number} timecode
   * @returns {this}
   */
  setTimecode(timecode) {
    this.setState({ timecode });
    return this;
  }

  /**
   *
   * @param {number} fps
   * @returns {this}
   */
  setFps(fps) {
    this.setState({ fps });
    return this;
  }

  /**
   * @private
   * @param {State} state
   */
  generateUrl(state) {
    const timecode = state.startAtTimecode ? state.timecode : null;
    return generateTimecodeUrl(timecode, this.env).toString();
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

    const { show, metadata, timecode, fps, startAtTimecode, showQrCode } = state;

    const extendedMetadata = makeExtendedMetadata(this.env, metadata, timecode, fps);

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
      this.lastRenderedUrl = url;
    }

    if (urlChanged || showQrCode !== this.state.showQrCode) {
      this.renderQrCode(showQrCode ? url : null);
    }

    // TODO: Just disable when timecode is 0?
    if (timecode === null || timecode === 0) {
      this.$startAt.classList.remove('shown');
    } else {
      this.$startAtCheck.checked = startAtTimecode;
      this.$startAtLabel.innerText =
        this.env.t('modal.bookmark.start-at-current-time', {
          timecode: buildTimeString(timecode, true, fps),
        });

      this.$startAt.classList.add('shown');
    }

    if (show && show !== this.state.show) {
      this.$urlInput.select();
    }
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
