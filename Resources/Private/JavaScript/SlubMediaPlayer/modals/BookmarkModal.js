// @ts-check

import QRCode from 'qrcode';

import { e, filterNonNull, setElementClass } from 'lib/util';
import { buildTimeString } from 'DlfMediaPlayer/index';
import SimpleModal from 'SlubMediaPlayer/lib/SimpleModal';
import { createShareButton } from 'SlubMediaPlayer/lib/ShareButton';
import { makeExtendedMetadata } from 'SlubMediaPlayer/lib/metadata';
import UrlGenerator from 'SlubMediaPlayer/lib/UrlGenerator';

/**
 * The order is used for GUI rendering.
 */
const START_AT_MODES = /** @type {const} */(['current-time', 'marker', 'begin']);

/**
 * @typedef {{
 *  shareButtons: import('SlubMediaPlayer/lib/ShareButton').ShareButtonInfo[];
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
 *  showMastodonShare: boolean;
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
      showMastodonShare: false,
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
        this.$urlLine = e("div", { className: "url-line dlf-visible" }, [
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
        // Create the Mastodon share dialog structure
        this.$mastodonShareDialog = e("div", { id: "mastodon-share", className: "mastodon-share-container" }, [
          this.$headline = e('div', { className: "headline-container" }, [
            this.$title = e("h4", {}, [this.env.t('share.mastodon.title')]),
            this.$close = e('span', {
              className: "modal-close material-icons-round",
              $click: () => {
                this.setState({ showMastodonShare: false });
              },
            }, ["close"]),
          ]),
          e("form", { method: "post", className: "mastodon-form", $submit: this.submitInstance.bind(this) }, [
            // typecheck won't accept autocomplete: "url", even it is accepted as a valid HTMLInputElement, see: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-url
            // @ts-ignore(TS2322)
            this.$mastodonInstanceInput = e("input", { type: "text", name: "mastodon-instance", id: "instance", className: "mastodon-share-input", placeholder: this.env.t('share.mastodon.placeholder'), autocomplete: "url", required: true, autocapitalize: "none", spellcheck: false }),
            e("button", { type: "submit", id: "mastodon-share-button", className: "mastodon-share-button" }, [this.env.t('share.mastodon.label')])
          ])
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
    if (element.href === "dlf:mastodon_share") {
      e.preventDefault();

      this.setState({
        showMastodonShare: true,
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
    switch (this.getStartAtMode(state)) {
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
      this.setState({
        showQrCode: false,
        showMastodonShare: false
      });
    }
  }

  /**
   * @override
   * @param {import('SlubMediaPlayer/lib/SimpleModal').BaseState & State} state
   */
  render(state) {
    super.render(state);

    const { show, metadata, timing, fps, showQrCode, showMastodonShare } = state;
    const startAtMode = this.getStartAtMode(state);

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
        btn.setFullUrl(urlMetadata);
      }

      this.$urlInput.value = url;
      this.$copyLinkBtn.href = url;
      this.lastRenderedUrl = url;
    }

    if (urlChanged || showQrCode !== this.state.showQrCode) {
      this.renderQrCode(showQrCode ? url : null);
    }

    if (showMastodonShare !== this.state.showMastodonShare) {
      this.renderMastodonShare(showMastodonShare);
    }

    // TODO: Just disable when timecode is 0?
    this.$startAtVariants[startAtMode].$radio.checked = true;
    let numModeOptions = 0;
    for (const mode of START_AT_MODES) {
      this.$startAtVariants[mode].$label.innerText =
        this.translateStartAtLabel(mode, timing, fps);

      const modeAllowed = this.isStartAtModeAllowed(mode, state);
      setElementClass(this.$startAtVariants[mode].$container, 'shown', modeAllowed);
      if (modeAllowed) {
        numModeOptions++;
      }
    }
    // Don't show "begin" as single radio button
    setElementClass(this.$startAtVariants['begin'].$container, 'shown', numModeOptions > 1);

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
   * @private
   * @param {Pick<State, 'startAtMode' | 'timing'>} state
   * @returns {StartAtMode}
   */
  getStartAtMode(state) {
    return this.isStartAtModeAllowed(state.startAtMode, state)
      ? state.startAtMode
      : 'begin';
  }

  /**
   * @private
   * @param {StartAtMode} mode
   * @param {Pick<State, 'timing'>} state
   * @returns {boolean}
   */
  isStartAtModeAllowed(mode, state) {
    switch (mode) {
      case 'begin': return true;
      case 'current-time': return state.timing.currentTime !== 0;
      case 'marker': return state.timing.markerRange !== null;
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

  /**
     * Renders the Mastodon share dialog based on the value of showMastodonShare.
     *
     * @param {boolean} showMastodonShare
     * @returns {void}
     */
   renderMastodonShare(showMastodonShare) {
     this.$urlLine.classList.toggle("dlf-visible", !showMastodonShare);
     this.$urlLine.classList.toggle("dlf-fade-in", !showMastodonShare);
     this.$urlLine.classList.toggle("dlf-fade-out", showMastodonShare);

     this.$mastodonShareDialog.classList.toggle("dlf-visible", showMastodonShare);
     this.$mastodonShareDialog.classList.toggle("dlf-fade-in", showMastodonShare);
     this.$mastodonShareDialog.classList.toggle("dlf-fade-out", !showMastodonShare);
   }

  /**
   * Opens a share URL in a new window.
   *
   * @param {string | URL} instanceUrl - The URL of the Mastodon instance.
   * @param {string | null} linkUrl - The given URL to be shared.
   * @param {string} pageTitle - The title of the page.
   * @returns {void}
   */
  openShareUrl(instanceUrl, linkUrl, pageTitle) {
    if (!this.isValidUrl(instanceUrl)) {
      alert(this.env.t('error.mastodon.invalid_server'));
      return;
    }
    if (linkUrl !== null) {
      try {
        const shareUrl = new URL("/share", instanceUrl);
        const params = new URLSearchParams();
        params.set("text", pageTitle + "\n\n");
        params.set("url", linkUrl);
        shareUrl.search = params.toString();
        window.open(shareUrl.toString(), "_blank");
      } catch (e) {
        alert(this.env.t('error.mastodon.open_link'));
        console.error(e);
        return;
      }
    } else {
      alert(this.env.t('error.mastodon.invalid_link'));
      return;
    }
  }

  /**
   * Submits the Mastodon instance URL and opens the share URL.
   *
   * @param {Event} event
   * @returns {void}
   */
  submitInstance(event) {
    event.preventDefault();

    let instanceInputValue = this.$mastodonInstanceInput.value.trim();
    if (!instanceInputValue) {
      alert(this.env.t('error.mastodon.enter_url'));
      return;
    }

    // Basic sanitization to remove potential malicious content
    instanceInputValue = instanceInputValue.replace(/[^a-zA-Z0-9-:.\/]/g, '');

    // Ensure the URL starts with https:// after replacing http:// with https://
    let instanceUrl = instanceInputValue.replace(/^http:\/\//i, "https://");
    if (!instanceUrl.startsWith("https://")) {
      instanceUrl = `https://${instanceUrl}`;
    }

    const pageTitle = document.title.trim();
    this.openShareUrl(instanceUrl, this.lastRenderedUrl, pageTitle);
  }

  /**
   * Checks if the given URL string is a valid URL.
   *
   * @param {string | URL} urlString - The URL string to be checked.
   * @returns {boolean} - Returns true if the URL is valid, false otherwise.
   */
  isValidUrl(urlString) {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  }
}
