// @ts-check

import { blobToDataURL, e, filterNonNull } from '../../../lib/util';
import { DlfMediaPlayer, DlfMediaPlugin } from '../../../DlfMediaPlayer';
import Equalizer from './Equalizer';
import EqualizerView from './EqualizerView';
import { parsePreset } from './preset';
import registerMultiIirProcessor from './MultiIirProcessor.no-babel';

/**
 * Custom element / player plugin that can be used to attach the equalizer to
 * an instance of `<dlf-media>`.
 */
export default class EqualizerPlugin extends DlfMediaPlugin {
  constructor() {
    super();

    /** @private @type {dlf.media.eq.FilterPreset[]} */
    this.presets_ = [];

    /** @private @type {string | null} */
    this.defaultPreset_ = null;

    /** @private @type {EqualizerView | null} */
    this.eqView_ = null;

    /** @private */
    this.handlers = {
      onStorePreset: this.onStorePreset.bind(this),
    };

    /** @private */
    this.context = new AudioContext();

    /** @private */
    this.markAsResumed = (/** @type {any} */ _value) => { };

    /** @private */
    this.resumedPromise = new Promise((resolve) => { this.markAsResumed = resolve; });
  }

  get view() {
    return this.eqView_;
  }

  /**
   * @override
   * @param {DlfMediaPlayer} player
   */
  async attachToPlayer(player) {
    if (window.location.protocol !== "https:") {
      console.error("Warning: The equalizer will probably fail without HTTPS");
    }

    // Resume audio context
    await this.resumeAudioContext();

    // Load MultiIirProcessor
    const blob = new Blob([`
      ${registerMultiIirProcessor.toString()}
      ${registerMultiIirProcessor.name}();
    `], { type: 'application/javascript; charset=utf-8' });
    // TODO: Object URLs didn't work in Chrome?
    const dataUrl = await blobToDataURL(blob);
    await this.context.audioWorklet.addModule(dataUrl);

    // Connect equalizer
    player.media.crossOrigin = 'anonymous';
    const source = this.context.createMediaElementSource(player.media);
    const eq = new Equalizer(source);
    eq.connect(this.context.destination);

    // Setup view
    this.eqView_ = new EqualizerView(this.env, eq);
    this.eqView_.addEventListener('store_preset', this.handlers.onStorePreset);
    for (const preset of this.presets_) {
      this.eqView_.addPreset(preset);
    }
    for (const [key, preset] of Object.entries(this.getLocalPresets())) {
      this.eqView_.addPreset(preset);
    }
    if (this.defaultPreset_ !== null) {
      this.eqView_.selectPreset(this.defaultPreset_);
    }
    this.innerHTML = '';
    this.append(this.eqView_.domElement);
    this.eqView_.resize();
  }

  /**
   *
   * @param {any} presetsData
   */
  parsePresets(presetsData) {
    if (!Array.isArray(presetsData)) {
      return;
    }

    const presets = filterNonNull(presetsData.map(parsePreset));
    this.presets_.push(...presets);

    if (this.eqView_ !== null) {
      for (const preset of presets) {
        this.eqView_.addPreset(preset);
      }
    }
  }

  /**
   *
   * @param {string} key
   */
  selectPreset(key) {
    if (this.eqView_ === null) {
      this.defaultPreset_ = key;
    } else {
      this.eqView_.selectPreset(key);
      this.defaultPreset_ = null;
    }
  }

  /**
   * In some browsers, due to autoplay restrictions, the audio context needs to
   * be resumed after the first user gesture.
   *
   * This sets up the UI and waits for the context to be resumed.
   *
   * @private
   */
  async resumeAudioContext() {
    if (this.context.state === 'running') {
      this.markAsResumed();
    } else {
      this.append(e('div', { className: "dlf-equalizer-resume" }, [
        this.env.t('control.sound_tools.equalizer.resume_context'),
      ]));
      this.context.resume().then(() => {
        this.markAsResumed();
      });
    }
    window.addEventListener('pointerdown', async () => {
      await this.context.resume();
      this.markAsResumed();
    }, { once: true, capture: true });
    window.addEventListener('keydown', async () => {
      await this.context.resume();
      this.markAsResumed();
    }, { once: true, capture: true });
    await this.resumedPromise;
  }

  /**
   * @private
   * @param {import('./EqualizerView').EqualizerViewEvent<'store_preset'>} event
   */
  onStorePreset(event) {
    const { key, preset } = event.detail;
    localStorage[`dlf.eq.presets.${key}`] = JSON.stringify(preset);
  }

  /**
   * @private
   * @returns {Record<string, dlf.media.eq.FilterPreset>}
   */
  getLocalPresets() {
    /** @type {Record<string, dlf.media.eq.FilterPreset>} */
    const presets = {};
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey === null || !storageKey.startsWith('dlf.eq.presets.')) {
        continue;
      }

      try {
        const preset = parsePreset(JSON.parse(localStorage[storageKey]));

        if (preset !== null) {
          const presetKey = storageKey.substring('dlf.eq.presets.'.length);
          presets[presetKey] = preset;
        }
      } catch (e) {
        //
      }
    }
    return presets;
  }
}

customElements.define('dlf-equalizer', EqualizerPlugin);
