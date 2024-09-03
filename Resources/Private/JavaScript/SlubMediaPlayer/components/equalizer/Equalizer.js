// @ts-check

import BandEq from 'SlubMediaPlayer/components/equalizer/filtersets/BandEq';
import RiaaEq from 'SlubMediaPlayer/components/equalizer/filtersets/RiaaEq';
import FrequencyResponse from 'SlubMediaPlayer/components/equalizer/FrequencyResponse';

/**
 * @typedef {{
 *  destination: AudioNode;
 *  analyzer: AnalyserNode;
 * }} Connection
 */

export default class Equalizer {
  /**
   *
   * @param {AudioNode} source
   */
  constructor(source) {
    /** @private */
    this.source_ = source;

    /** @private */
    this.audioContext_ = source.context;

    /** @private */
    this.fftSize_ = 8192;

    /** @private */
    this.fftData_ = new Float32Array(this.fftSize_);

    /** @private @type {Connection | null} */
    this.connection_ = null;

    /** @private */
    this.active_ = false;

    /** @type {dlf.media.eq.Filterset} */
    this.filterset_ = new BandEq(this.audioContext_);
  }

  get audioContext() {
    return this.audioContext_;
  }

  /**
   * Whether or not the equalizer is active.
   */
  get active() {
    return this.active_;
  }

  set active(value) {
    if (value !== this.active_) {
      this.active_ = value;

      if (value) {
        this.activate();
      } else {
        this.deactivate();
      }
    }
  }

  get filterset() {
    return this.filterset_;
  }

  /**
   * @returns {dlf.media.eq.Param[]}
   */
  get activeParams() {
    return this.filterset_.parameters.filter(p => p.isActive);
  }

  /**
   *
   * @param {FrequencyResponse} frequencyResponse
   * @returns {dlf.media.eq.Curve}
   */
  getFrequencyResponse(frequencyResponse) {
    return frequencyResponse.aggregate(this.filterset_.nodes).makeCurve(this.filterset.gain);
  }

  /**
   *
   * @param {AudioNode} destination
   */
  connect(destination) {
    const analyzer = this.audioContext_.createAnalyser();
    analyzer.smoothingTimeConstant = 0;
    analyzer.fftSize = this.fftSize_;

    this.connection_ = {
      destination,
      analyzer,
    };

    this.source_.connect(analyzer);
    analyzer.connect(destination);
  }

  /**
   *
   * @param {Equalizer['filterset']} filterset
   */
  setFilters(filterset) {
    this.deactivate();
    this.filterset_ = filterset;
    if (this.active_) {
      this.activate();
    }
  }

  /**
   * @param {dlf.media.eq.FilterPreset} preset
   */
  loadPreset(preset) {
    let filterset;

    switch (preset.mode) {
      case 'riaa': {
        filterset = new RiaaEq(this.audioContext);
        filterset.resetTc(preset.params);
        break;
      }

      case 'band-iso': {
        filterset = new BandEq(this.audioContext);
        filterset.autofill(preset.octaveStep);
        break;
      }

      case 'band': {
        filterset = new BandEq(this.audioContext);
        for (const band of preset.bands) {
          filterset.addBand(band.frequency, band.octaves, band.gain);
        }
        break;
      }
    }

    this.setFilters(filterset);
  }

  /**
   * @param {string} label
   * @returns {dlf.media.eq.FilterPreset | null}
   */
  exportPreset(label) {
    const base = {
      group: 'user',
      label,
    };

    if (this.filterset_ instanceof BandEq) {
      return {
        ...base,
        mode: 'band',
        bands: this.filterset_.getBands(),
      };
    } else if (this.filterset_ instanceof RiaaEq) {
      return {
        ...base,
        mode: 'riaa',
        params: this.filterset_.getTc(),
      };
    } else {
      return null;
    }
  }

  /**
   *
   * @param {number} gain
   * @returns {dlf.media.eq.Curve | null}
   */
  fft(gain) {
    if (this.connection_ === null) {
      return null;
    }

    this.connection_.analyzer.getFloatFrequencyData(this.fftData_);
    /** @type {dlf.media.eq.Curve} */
    const fftCurve = {
      name: 'FFT',
      points: [],
    };
    for (let i = 0; i < this.fftData_.length; i++) {
      let fftDb = /** @type {number} */(this.fftData_[i]);
      fftCurve.points.push({
        freq: this.audioContext.sampleRate / this.fftData_.length * i,
        gain: gain + fftDb,
        phase: 0,
      });
    }

    return fftCurve;
  }

  /**
   * @private
   */
  deactivate() {
    if (this.connection_ !== null) {
      this.source_.disconnect();
      this.source_.connect(this.connection_.analyzer);
    }
  }

  /**
   * @private
   */
  activate() {
    if (this.connection_ !== null) {
      const { analyzer } = this.connection_;

      this.source_.disconnect();

      this.source_.connect(this.filterset_.inputNode);
      this.filterset_.outputNode.connect(analyzer);
    }
  }
}
