// @ts-check

import { clamp } from 'lib/util';
import { highPass, highShelf, lowShelf } from 'SlubMediaPlayer/components/equalizer/filters';
import ParamValue from 'SlubMediaPlayer/components/equalizer/lib/ParamValue';

export const paramKeys = /** @type {const} */([
  'deepBaseRolloff',
  'baseBoostRolloff',
  'baseBoost',
  'trebleCut',
]);

/**
 * @typedef {typeof paramKeys[number]} RiaaParamKey
 *
 * @typedef {{
 *  [K in RiaaParamKey]: number | null;
 * }} RiaaParams
 *
 * @typedef {'base' | 'mid' | 'treble'} NodeKey
 *
 * @typedef {{
 *  isActive: boolean;
 *  node: dlf.media.eq.EqIIRFilterNode;
 * }} IIRFilter
 */

/**
 * Time constant to frequency.
 *
 * @param {number} tc
 */
function tcToFc(tc) {
  return 1 / (2 * Math.PI * tc);
}

/**
 *
 * @param {number} fc
 */
function fcToTc(fc) {
  return 1 / (2 * Math.PI * fc);
}

/**
 * @implements {dlf.media.eq.Filterset}
 */
export default class RiaaEq {
  /**
   *
   * @param {BaseAudioContext} context
   */
  constructor(context) {
    /** @private */
    this.audioContext_ = context;

    /** @private */
    this.processorNode = new AudioWorkletNode(context, 'multi-iir-processor');

    /** @private @type {Record<RiaaParamKey, dlf.media.eq.Param<ParamValue>>} */
    this.pp = {
      deepBaseRolloff: this.makeParam('base', 50),
      baseBoostRolloff: this.makeParam('mid', 1000, () => [0, this.pp.baseBoost.frequency.value - 0.01]),
      baseBoost: this.makeParam('mid', 2000, () => [this.pp.baseBoostRolloff.frequency.value + 0.01, Number.POSITIVE_INFINITY]),
      trebleCut: this.makeParam('treble', 5000),
    };

    /** @private @type {dlf.media.eq.Param[]} */
    this.parameters_ = [
      this.pp.deepBaseRolloff,
      this.pp.baseBoostRolloff,
      this.pp.baseBoost,
      this.pp.trebleCut,
    ];

    /** @private */
    this.gain_ = 1;

    /** @private @type {Record<NodeKey, IIRFilter>} */
    this.keyedFilters_ = this.createFilters();

    this.updateFilters();
  }

  get inputNode() {
    return this.processorNode;
  }

  get outputNode() {
    return this.processorNode;
  }

  get nodes() {
    return Object.values(this.keyedFilters_).filter(f => f.isActive).map(f => f.node);
  }

  /**
   * @returns {Readonly<dlf.media.eq.Param[]>}
   */
  get parameters() {
    return this.parameters_;
  }

  get gain() {
    return this.gain_;
  }

  /**
   *
   * @param {Float32Array} frequencies
   * @returns {dlf.media.eq.Curve | null}
   */
  targetCurve(frequencies) {
    // https://www.bonavolta.ch/hobby/en/audio/riaa.htm
    // (Switched t1/t3)

    /** @type {dlf.media.eq.Curve} */
    const curve = {
      name: 'RIAA Target',
      points: [],
    };

    const norm = this.single(1000);

    for (let i = 0; i < frequencies.length; i++) {
      const freq = /** @type {number} */(frequencies[i]);
      const gain = this.single(freq) - norm;
      const phase = 0;

      curve.points.push({ freq, gain, phase });
    }

    return curve;
  }

  /**
   * Change RIAA parameters by time constants.
   *
   * @param {Partial<RiaaParams>} params Time constants in microseconds (treble, medium, base, extreme base)
   */
  resetTc(params) {
    for (const key of paramKeys) {
      const u = params[key];
      if (u === null || u === undefined) {
        this.pp[key].isActive = false;
      } else {
        const freq = tcToFc(u / 1_000_000);
        this.pp[key].isActive = true;
        this.pp[key].frequency.initialize(freq);
      }
    }

    if (this.pp.baseBoost.isActive) {
      if (!this.pp.baseBoostRolloff.isActive) {
        this.pp.baseBoostRolloff.frequency.initialize(10);
      }
    } else {
      this.pp.baseBoostRolloff.isActive = false;
    }

    this.keyedFilters_ = this.createFilters();
    this.updateFilters();
  }

  /**
   * @returns {RiaaParams}
   */
  getTc() {
    const params = /** @type {RiaaParams} */({});

    for (const key of paramKeys) {
      params[key] = this.pp[key].isActive
        ? fcToTc(this.pp[key].frequency.value) * 1_000_000
        : null;
    }

    return params;
  }

  /**
   * @private
   * @param {NodeKey} nodeKey
   * @param {number} initialFrequency
   * @param {() => [number, number]} rangeFn TODO?
   * @returns {dlf.media.eq.Param<ParamValue>}
   */
  makeParam(nodeKey, initialFrequency, rangeFn = () => [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]) {
    return {
      isActive: false,
      frequency: new ParamValue(initialFrequency, (oldValue, newValue, override) => {
        override(clamp(newValue, rangeFn()));

        this.keyedFilters_[nodeKey] = this.makeFilter(nodeKey);
        this.keyedFilters_[nodeKey].isActive = true;
        this.updateFilters();
      }),
      gain: new ParamValue(0),
      getFrequencyResponse: (frequencyResponse) => {
        const node = this.keyedFilters_[nodeKey]?.node ?? null;
        if (node === null) {
          return {
            name: 'Frequency Response',
            points: [],
          };
        } else {
          return frequencyResponse.aggregate([node]).makeCurve(this.gain_);
        }
      },
    };
  }

  /**
   * @private
   */
  updateFilters() {
    const norm = this.single(1000);
    this.gain_ = 10 ** (-norm / 20);
    this.processorNode.port.postMessage({
      type: 'filters',
      gain: this.gain_,
      filters: this.keyedFilters_,
    });
  }

  /**
   * @private
   */
  createFilters() {
    const result = {
      base: this.makeFilter('base'),
      mid: this.makeFilter('mid'),
      treble: this.makeFilter('treble'),
    };

    result.base.isActive = this.pp.deepBaseRolloff.isActive;
    result.mid.isActive = this.pp.baseBoost.isActive;
    result.treble.isActive = this.pp.trebleCut.isActive;

    return result;
  }

  /**
   *
   * @private
   * @param {NodeKey} nodeKey
   * @returns {IIRFilter}
   */
  makeFilter(nodeKey) {
    switch (nodeKey) {
      case 'base': return this.makeBaseFilter();
      case 'mid': return this.makeMidFilter();
      case 'treble': return this.makeTrebleFilter();
    }
  }

  /**
   * @private
   */
  makeBaseFilter() {
    return {
      isActive: false,
      node: highPass({
        frequency: this.pp.deepBaseRolloff.frequency.value,
        sampleRate: this.audioContext_.sampleRate,
      }),
    };
  }

  /**
   * @private
   */
  makeMidFilter() {
    // midGain = 10 * Math.log10(1 + (baseBoost / freq) ** 2) - 10 * Math.log10(1 + (baseBoostRolloff / freq) ** 2)
    // midGain / 10 = Math.log10(1 + (baseBoost / freq) ** 2) - Math.log10(1 + (baseBoostRolloff / freq) ** 2)
    // midGain / 10 = Math.log10((1 + (baseBoost / freq) ** 2) / (1 + (baseBoostRolloff / freq) ** 2))
    // 10 ^ (midGain / 10) = (1 + (baseBoost / freq) ** 2) / (1 + (baseBoostRolloff / freq) ** 2)

    // 10 ^ (((10 * Math.log10(1 + baseBoost ** 2) - 10 * Math.log10(1 + baseBoostRolloff ** 2)) / 2) / 10) = (1 + (baseBoost / freq) ** 2) / (1 + (baseBoostRolloff / freq) ** 2)
    // 10 ^ ((Math.log10((1 + baseBoost ** 2) / (1 + baseBoostRolloff ** 2))) / 2) = (1 + (baseBoost / freq) ** 2) / (1 + (baseBoostRolloff / freq) ** 2)
    // sqrt((1 + baseBoost ** 2) / (1 + baseBoostRolloff ** 2)) = (1 + (baseBoost / freq) ** 2) / (1 + (baseBoostRolloff / freq) ** 2)

    // For midFreq, ask Wolfram Alpha to solve

    const maxGain = 10 * Math.log10(1 + this.pp.baseBoost.frequency.value ** 2) - 10 * Math.log10(1 + this.pp.baseBoostRolloff.frequency.value ** 2);
    const midGain = maxGain / 2;

    const midFreq =
      Math.sqrt(this.pp.baseBoost.frequency.value ** 2 - this.pp.baseBoostRolloff.frequency.value ** 2 * 10 ** (midGain / 10))
      / Math.sqrt(10 ** (midGain / 10) - 1);

    return {
      isActive: false,
      node: lowShelf({
        frequency: midFreq,
        gain: maxGain,
        S: 0.5,
        sampleRate: this.audioContext_.sampleRate,
      }),
    };
  }

  /**
   * @private
   */
  makeTrebleFilter() {
    const maxGain = this.single(20000);
    const midGain = maxGain / 2;

    // midGain = -10 * Math.log10(1 + (freq / this.pp.trebleCut.frequency.value) ** 2)
    // -midGain / 10 = Math.log10(1 + (freq / this.pp.trebleCut.frequency.value) ** 2)
    // 10 ** (-midGain / 10) = 1 + (freq / this.pp.trebleCut.frequency.value) ** 2
    // 10 ** (-midGain / 10) - 1 = (freq / this.pp.trebleCut.frequency.value) ** 2
    // Math.sqrt(10 ** (-midGain / 10) - 1) = freq / this.pp.trebleCut.frequency.value
    // freq = Math.sqrt(10 ** (-midGain / 10) - 1) * this.pp.trebleCut.frequency.value

    const midFreq =
      Math.sqrt(10 ** (-midGain / 10) - 1) * this.pp.trebleCut.frequency.value;

    return {
      isActive: false,
      node: highShelf({
        frequency: midFreq,
        gain: maxGain,
        S: 0.5,
        sampleRate: this.audioContext_.sampleRate,
      }),
    };
  }

  /**
   * Get target gain at given {@link frequency}.
   *
   * @private
   * @param {number} frequency
   */
  single(frequency) {
    let result = 0;

    if (this.pp.deepBaseRolloff.isActive) {
      result -= 10 * Math.log10(1 + (this.pp.deepBaseRolloff.frequency.value / frequency) ** 2);
    }

    if (this.pp.baseBoost.isActive) {
      result += 10 * Math.log10(1 + (this.pp.baseBoost.frequency.value / frequency) ** 2);
      result -= 10 * Math.log10(1 + (this.pp.baseBoostRolloff.frequency.value / frequency) ** 2)
    }

    if (this.pp.trebleCut.isActive) {
      result -= 10 * Math.log10(1 + (frequency / this.pp.trebleCut.frequency.value) ** 2);
    }

    return result;
  }
}
