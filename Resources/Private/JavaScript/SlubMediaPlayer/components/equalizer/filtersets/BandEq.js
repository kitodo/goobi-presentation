// @ts-check

import ParamValue from '../lib/ParamValue';

/**
 * @typedef {{
 *  source: AudioNode;
 *  destination: AudioNode;
 * }} EqConnection
 *
 * @typedef {{
 *  node: BiquadFilterNode;
 *  param: dlf.media.eq.Param;
 *  options: {
 *    type: 'peaking';
 *    frequency: number;
 *    gain: number;
 *    Q: number;
 *  };
 * }} Band
 *
 * @typedef {{
 *  frequency: number;
 *  octaves: number;
 *  gain: number;
 * }} BandParams
 */

/**
 * @implements {dlf.media.eq.Filterset}
 */
export default class BandEq {
  /**
   *
   * @param {BaseAudioContext} context
   */
  constructor(context) {
    /** @private */
    this.audioContext_ = context;

    /** @private @type {Band[]} */
    this.bands_ = [];

    /** @private @type {AudioNode | null} */
    this.prevNode_ = null;

    /** @private */
    this.fallbackNode_ = new GainNode(context);
  }

  /**
   *
   * @param {number} bwOct Bandwidth in octaves
   */
  static octavesToQ(bwOct) {
    // https://www.ranecommercial.com/legacy/note101.html, Filter Fundamentals

    // return (2 ** (bwOct / 2)) / (2 ** bwOct - 1);

    const lower = 2 ** (-bwOct / 2);
    const upper = 2 ** (bwOct / 2);
    return 1 / (upper - lower);
  }

  /**
   *
   * @param {number} q
   */
  static qToOctaves(q) {
    // Q = freq / bandwidth

    //    q = 1 / (2 * Math.sinh(Math.LN2 / 2 * bwOct)
    // => 1 / q = 2 * Math.sinh(Math.LN2 / 2 * bwOct)
    // => Math.asinh((1 / q) / 2) = Math.LN2 / 2 * bwOct
    return Math.asinh((1 / q) / 2) / (Math.LN2 / 2);
  }

  get gain() {
    return 1;
  }

  /**
   * @type {Readonly<BiquadFilterNode[]>}
   */
  get nodes() {
    return this.bands_.map(band => band.node);
  }

  get parameters() {
    return this.bands_.map(band => band.param);
  }

  get inputNode() {
    return this.nodes[0] ?? this.fallbackNode_;
  }

  get outputNode() {
    return this.nodes[this.nodes.length - 1] ?? this.fallbackNode_;
  }

  /**
   *
   * @param {Float32Array} frequencies
   * @returns {dlf.media.eq.Curve | null}
   */
  targetCurve(frequencies) {
    return null;
  }

  /**
   * @returns {BandParams[]}
   */
  getBands() {
    return this.bands_.map(band => ({
      frequency: band.options.frequency,
      octaves: BandEq.qToOctaves(band.options.Q),
      gain: band.options.gain,
    }));
  }

  /**
   *
   * @param {number} bwOct
   */
  autofill(bwOct) {
    this.addBand(1000, bwOct, 0);

    for (let step = 1; ; step++) {
      let has = false;

      for (const sign of [-1, 1]) {
        const frequency = 1000 * 2 ** (sign * step * bwOct);
        if (!(20 <= frequency && frequency <= 20_000)) {
          continue;
        }

        this.addBand(frequency, bwOct, 0);
        has = true;
      }

      if (!has) {
        break;
      }
    }
  }

  /**
   *
   * @param {number} frequency
   * @param {number} bwOct
   * @param {number} gain
   */
  addBand(frequency, bwOct, gain) {
    /** @type {Band['options']} */
    const options = {
      type: 'peaking',
      frequency,
      gain,
      Q: BandEq.octavesToQ(bwOct),
    };

    const bwHz = frequency / options.Q;

    const node = new BiquadFilterNode(this.audioContext_, options);

    if (this.prevNode_ !== null) {
      this.prevNode_.connect(node);
    }

    this.prevNode_ = node;

    this.bands_.push({
      node,
      param: {
        isActive: true,
        frequency: new ParamValue(options.frequency),
        gain: new ParamValue(options.gain, (oldValue, newValue) => {
          node.gain.value = options.gain = newValue;
          // Q = freq / bandwidth
          // bandwidth = freq / Q
          // node.Q.value = BandEq.octavesToQ(bwOct);
        }),
        getFrequencyResponse: (frequencyResponse) => {
          return frequencyResponse.aggregate([node]).makeCurve(this.gain);
        },
      },
      options,
    });
  }
}
