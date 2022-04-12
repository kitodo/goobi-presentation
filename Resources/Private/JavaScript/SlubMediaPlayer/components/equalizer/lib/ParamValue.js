// @ts-check

/**
 * @implements {dlf.media.eq.ParamValue}
 */
export default class ParamValue {
  /**
   *
   * @param {number} value
   * @param {((oldValue: number, newValue: number, override: (value: number) => void) => void) | null} updateFn
   */
  constructor(value, updateFn = null) {
    /** @private */
    this.initial_ = value;

    /** @private */
    this.value_ = value;

    /** @private */
    this.updateFn_ = updateFn;
  }

  get initial() {
    return this.initial_;
  }

  get value() {
    return this.value_;
  }

  get editable() {
    return this.updateFn_ !== null;
  }

  /**
   * TODO?
   *
   * @param {number} value
   */
  initialize(value) {
    this.initial_ = value;
    this.value_ = value;
  }

  /**
   *
   * @param {(oldValue: number) => number} fn
   */
  update(fn) {
    if (this.updateFn_ !== null) {
      const oldValue = this.value_;
      const newValue = fn(oldValue);
      this.value_ = newValue;
      this.updateFn_(oldValue, newValue, (value) => {
        this.value_ = value;
      });
    }
  }
}
