// @ts-check

/**
 * @typedef {{
 *  convert: (input: number) => number;
 *  invert: (input: number) => number;
 * }} SkewFn
 */

/** @type {SkewFn} */
export const Logarithmic = {
  convert: x => x <= 0 ? Number.NEGATIVE_INFINITY : Math.log(x),
  invert: Math.exp,
};

/** @type {SkewFn} */
export const Linear = {
  convert: x => x,
  invert: x => x,
};

/**
 * Map values of a range onto another range, using a skew function.
 */
export default class Scale {
  /**
   *
   * @param {number} inputMin
   * @param {number} inputMax
   * @param {number} outputMin
   * @param {number} outputMax
   * @param {SkewFn} skew
   */
  constructor(inputMin = 0, inputMax = 1, outputMin = 0, outputMax = 1, skew = Linear) {
    /** @private */
    this.skew = skew;
    /** @private */
    this.inputMin_ = inputMin;
    /** @private */
    this.inputMax_ = inputMax;
    /** @private */
    this.outputMin_ = outputMin;
    /** @private */
    this.inputMinConv_ = this.skew.convert(inputMin);
    /** @private */
    this.convScale_ = (outputMax - outputMin) / (this.skew.convert(this.inputMax_) - this.inputMinConv_);
  }

  get max() {
    return this.inputMax_;
  }

  /**
   *
   * @param {number} input
   * @returns {number}
   */
  convert(input) {
    return (this.skew.convert(input) - this.inputMinConv_) * this.convScale_ + this.outputMin_;
  }

  /**
   *
   * @param {number} output
   * @returns {number}
   */
  invert(output) {
    return this.skew.invert((output - this.outputMin_) / this.convScale_ + this.inputMinConv_);
  }
}
