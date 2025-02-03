// @ts-check

/**
 * @typedef {{
 *  timecode: number;
 * }} TimecodeIndexObject;
 */

/**
 * Represents a set of objects that is ordered by timecode.
 *
 * @template {TimecodeIndexObject} T
 */
export default class TimecodeIndex {
  /**
   *
   * @param {readonly T[]} elements
   */
  constructor(elements) {
    /**
     * List of elements sorted by timecode.
     *
     * @protected
     */
    this.elements = elements.slice();
    this.elements.sort((a, b) => a.timecode - b.timecode);

    /**
     * @protected
     * @type {Map<T, number>}
     */
    this.elementToIndex = new Map();

    for (const [i, element] of this.elements.entries()) {
      this.elementToIndex.set(element, i);
    }
  }

  /**
   * Returns the element at the specified {@link index} relative to timecode
   * order, or `undefined` if the index is out of bounds.
   *
   * @param {number} index
   * @returns {T | undefined}
   */
  at(index) {
    return this.elements[index];
  }

  /**
   * Returns the index of the specified {@link element} relative to timecode
   * order, or `undefined` if the element is not found.
   *
   * @param {T} element
   * @returns {number | undefined}
   */
  indexOf(element) {
    return this.elementToIndex.get(element);
  }

  /**
   * Returns the element that is found when advancing {@link offset} steps from
   * {@link element}. The {@link offset} may be negative.
   *
   * @param {T} element
   * @param {number} offset
   * @returns {T | undefined}
   */
  advance(element, offset = 1) {
    const idx = this.indexOf(element);
    if (idx !== undefined) {
      return this.elements[idx + offset];
    }
  }

  /**
   * Returns the element that spans across the specified {@link timecode}.
   *
   * @param {number} timecode
   * @returns {T | undefined}
   */
  timeToElement(timecode) {
    return this.timeToEntry(timecode)?.[1];
  }

  /**
   * Returns the element that spans across the specified {@link timecode}, and
   * its index.
   *
   * @param {number} timecode
   * @returns {[number, T] | undefined}
   */
  timeToEntry(timecode) {
    // As the last element is open-ended, we do a binary search like so:
    // - Reduce until we have at most two candidates left
    // - Return the greater element that works

    // Make sure that the typecasts are safe
    if (this.elements.length === 0) {
      return;
    }

    let lower = 0;
    let upper = this.elements.length - 1;

    while (lower + 1 < upper) {
      const next = Math.floor((lower + upper) / 2);

      if (/** @type {T} */(this.elements[next]).timecode <= timecode) {
        lower = next;
      } else {
        upper = next;
      }
    }

    const upperEl = /** @type {T} */(this.elements[upper]);
    if (upperEl.timecode <= timecode) {
      return [upper, upperEl];
    }

    const lowerEl = /** @type {T} */(this.elements[lower]);
    if (lowerEl.timecode <= timecode) {
      return [lower, lowerEl];
    }
  }

  /**
   *
   * @param {(element: T) => boolean} predicate
   * @returns {T | undefined}
   */
  find(predicate) {
    return this.elements.find(predicate);
  }

  /**
   * Iterates through the elements (ordered by timecode).
   *
   * @returns {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this.elements.values();
  }

  /**
   * Iterates through the elements (reversely ordered by timecode).
   *
   * @returns {IterableIterator<T>}
   */
  *reversed() {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      yield /** @type {T} */(this.elements[i]);
    }
  }
}
