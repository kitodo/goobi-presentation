// @ts-check

import {
  binaryStringToArrayBuffer,
  blobToBinaryString,
  canvasToBlob,
  download,
  e,
  domJoin,
  sanitizeBasename,
} from 'lib/util';
import imageFormats from 'lib/image/imageFormats';
import typoConstants from 'lib/typoConstants';
import { fillMetadata, makeExtendedMetadata } from 'SlubMediaPlayer/lib/metadata';
import { drawScreenshot } from 'SlubMediaPlayer/Screenshot';
import { getKeybindingText } from 'SlubMediaPlayer/lib/trans';
import SimpleModal from 'SlubMediaPlayer/lib/SimpleModal';
import UrlGenerator from 'SlubMediaPlayer/lib/UrlGenerator';

/**
 * @typedef {{
 *  metadata: MetadataArray | null;
 *  showMetadata: boolean;
 *  fps: number | null;
 *  timecode: number | null;
 *  supportedImageFormats: ImageFormatDesc[];
 *  selectedImageFormat: ImageFormatDesc | null;
 * }} State
 *
 * @typedef {{
 *  keybindings: Keybinding<any, any>[];
 *  screnshotCaptions: import('SlubMediaPlayer/Screenshot').ScreenshotCaption[];
 *  constants: import('lib/typoConstants').TypoConstants<ScreenshotModalConstants>;
 * }} Config
 */

/**
 * @extends {SimpleModal<State>}
 */
export default class ScreenshotModal extends SimpleModal {
  /**
   *
   * @param {HTMLElement} parent
   * @param {Translator & Identifier & Browser} env
   * @param {Config} config
   */
  constructor(parent, env, config) {
    const supportedImageFormats = imageFormats.filter(
      format => env.supportsCanvasExport(format.mimeType)
    );

    super(parent, {
      metadata: null,
      showMetadata: true,
      fps: null,
      timecode: null,
      supportedImageFormats,
      selectedImageFormat: supportedImageFormats[0] ?? null,
    });

    /** @private */
    this.env = env;
    /** @private */
    this.gen = new UrlGenerator(env);
    /** @private @type {HTMLVideoElement | null} */
    this.videoDomElement = null;
    /** @private */
    this.config = config;
    /** @private */
    this.constants = typoConstants(config.constants, {
      screenshotFilenameTemplate: 'Screenshot',
      screenshotCommentTemplate: '',
    });

    const snapKeybinding = this.config.keybindings.find(
      kb => kb.action === 'modal.screenshot.snap'
    );

    this.$main.classList.add('screenshot-modal');
    this.$title.innerText = env.t('modal.screenshot.title');

    const idShowMetadata = env.mkid();
    const radioGroup = env.mkid();

    this.$body.append(
      e("div", { className: "screenshot-config" }, [
        e("h4", {}, [env.t('modal.screenshot.configuration')]),
        e("section", { className: "metadata-config" }, [
          e("h1", {}, [env.t('modal.screenshot.metadata')]),
          e("div", { className: "metadata-overlay" }, [
            e("input", {
              type: "checkbox",
              id: idShowMetadata,
              checked: this.state.showMetadata,
              $change: this.handleChangeShowMetadata.bind(this),
            }),
            e("label", { htmlFor: idShowMetadata }, [
              env.t('modal.screenshot.metadata-overlay'),
            ]),
          ]),
        ]),
        e("section", {}, [
          e("h1", {}, [env.t('modal.screenshot.file-format')]),
          e("div", {}, (
            this.state.supportedImageFormats.map(format => {
              const radioId = env.mkid();

              return e("span", { className: "file-format-option" }, [
                e("input", {
                  id: radioId,
                  name: radioGroup,
                  type: 'radio',
                  checked: format.mimeType === this.state.selectedImageFormat?.mimeType,
                  $change: () => {
                    this.setState({
                      selectedImageFormat: format,
                    });
                  },
                }),
                e("label", { htmlFor: radioId }, [` ${format.label}`]),
              ]);
            })
          )),
        ]),
        e("a", {
          href: "#",
          className: "download-link",
          $click: this.handleDownloadImage.bind(this),
        }, [
          e("i", {
            className: "material-icons-round inline-icon",
          }, ["download"]),
          env.t('modal.screenshot.download-image'),
        ]),
        snapKeybinding && (
          e("aside", { className: "snap-tip" }, [
            e("i", {
              className: "material-icons-round inline-icon",
            }, ["info_outline"]),
            e("span", {}, (
              domJoin(
                env.t('modal.screenshot.snap-tip', { keybinding: "{kb}" }).split('{kb}'),
                getKeybindingText(env, snapKeybinding)
              )
            )),
          ])
        ),
      ]),

      this.$canvas = e("canvas")
    );
  }

  /**
   * Sets video DOM element for upcoming screenshots.
   *
   * @param {HTMLVideoElement} video
   * @returns {this}
   */
  setVideo(video) {
    this.videoDomElement = video;
    return this;
  }

  /**
   * Triggers UI update using new {@link metadata}.
   *
   * @param {MetadataArray} metadata
   * @returns {this}
   */
  setMetadata(metadata) {
    this.setState({ metadata });
    return this;
  }

  /**
   * Triggers UI update using new {@link fps}.
   *
   * @param {number | null} fps
   * @returns {this}
   */
  setFps(fps) {
    this.setState({ fps });
    return this;
  }

  /**
   * Triggers UI update using new {@link timecode}.
   *
   * @param {number} timecode
   * @returns {this}
   */
  setTimecode(timecode) {
    this.setState({ timecode });
    return this;
  }

  /**
   * @private
   * @param {Event} e
   */
  handleChangeShowMetadata(e) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }

    this.setState({
      showMetadata: e.target.checked,
    });
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  async handleDownloadImage(e) {
    e.preventDefault();

    // We could've set `.download-image[href]` in `render()` or in the radio
    // box change listener, but avoid this for performance reasons.

    await this.downloadCurrentImage(this.state);
  }

  /**
   * @param {Pick<State, 'showMetadata' | 'metadata' | 'timecode' | 'fps'>} state
   */
  renderCurrentScreenshot({ showMetadata, metadata, timecode, fps }) {
    if (this.videoDomElement === null) {
      // TODO: Error handling
      return false;
    }

    const config = {
      /** @type {import('SlubMediaPlayer/Screenshot').ScreenshotCaption[]} */
      captions: [],
      minWidth: 1000,
    };

    if (showMetadata) {
      const extendedMetadata = makeExtendedMetadata(this.gen, metadata ?? {}, timecode, fps);
      config.captions = this.getCaptions(extendedMetadata);
    }

    drawScreenshot(this.$canvas, this.videoDomElement, config);

    return true;
  }

  /**
   *
   * @param {Pick<State, 'metadata'| 'fps' | 'timecode' | 'selectedImageFormat'>} state
   */
  async downloadCurrentImage(state) {
    const { metadata, timecode, fps, selectedImageFormat } = state;
    if (metadata === null || timecode === null || selectedImageFormat === null) {
      console.error("one of [metadata, timecode, selectedImageFormat] is null");
      return false;
    }

    const extendedMetadata = makeExtendedMetadata(this.gen, metadata, timecode, fps);

    const image = await this.makeImageBlob(this.$canvas, selectedImageFormat, extendedMetadata);
    const filename = this.getFilename(extendedMetadata, selectedImageFormat);

    download(image, filename);

    return true;
  }

  /**
   *
   * @param {HTMLCanvasElement} canvas
   * @param {ImageFormatDesc} imageFormat
   * @param {MetadataArray} metadata
   */
  async makeImageBlob(canvas, imageFormat, metadata) {
    const imageBlob = await canvasToBlob(canvas, imageFormat.mimeType);
    const imageDataStr = await blobToBinaryString(imageBlob);
    const image = imageFormat.parseBinaryString(imageDataStr);

    if (image) {
      image.addMetadata({
        title: metadata.title?.[0] ?? "",
        // NOTE: Don't localize (not only relevant to current user)
        comment: fillMetadata(this.constants.screenshotCommentTemplate, metadata),
      });
      const buffer = binaryStringToArrayBuffer(image.toBinaryString());
      return new Blob([buffer], { type: imageBlob.type });
    } else {
      return imageBlob;
    }
  }

  /**
   *
   * @param {MetadataArray} metadata
   * @param {ImageFormatDesc} selectedImageFormat
   * @return {string}
   */
  getFilename(metadata, selectedImageFormat) {
    const template = this.constants.screenshotFilenameTemplate;
    const basename = fillMetadata(template, metadata);
    const extension = selectedImageFormat.extension;

    return `${sanitizeBasename(basename)}.${extension}`;
  }

  /**
   *
   * @param {MetadataArray} metadata
   * @returns {import('SlubMediaPlayer/Screenshot').ScreenshotCaption[]}
   */
  getCaptions(metadata) {
    return this.config.screnshotCaptions.map(caption => ({
      ...caption,
      text: fillMetadata(caption.text, metadata),
    }));
  }

  /**
   * Downloads image without opening the modal.
   */
  async snap() {
    // Parameters may be on the way via setState (TODO: Refactor)
    await this.update();

    const state = this.state;
    const success = (
      this.renderCurrentScreenshot(state)
      && await this.downloadCurrentImage(state)
    );

    if (!success) {
      alert(this.env.t('modal.screenshot.error'));
    }
  }

  /**
   * @override
   * @param {import('SlubMediaPlayer/lib/SimpleModal').BaseState & State} state
   */
  render(state) {
    super.render(state);

    const shouldRender = (
      state.show
      && (!this.state.show || state.showMetadata !== this.state.showMetadata)
    );

    if (shouldRender) {
      this.renderCurrentScreenshot(state);
    }
  }
}
