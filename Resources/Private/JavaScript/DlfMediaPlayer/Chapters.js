// @ts-check

import TimecodeIndex from 'lib/TimecodeIndex';

/**
 * Represents a set of chapter markers that is ordered by timecode.
 *
 * @extends TimecodeIndex<dlf.media.Chapter>
 */
export default class Chapters extends TimecodeIndex {
  /**
   * Returns the chapter that spans across the specified {@link timecode}.
   *
   * @param {number} timecode
   */
  timeToChapter(timecode) {
    return this.timeToElement(timecode);
  }

  /**
   *
   * @param {(chapter: dlf.media.Chapter) => boolean} predicate
   * @returns {Chapters}
   */
  filter(predicate) {
    return new Chapters(this.elements.filter(predicate));
  }

  /**
   *
   * @param {dlf.media.Chapter | null} lhs
   * @param {dlf.media.Chapter | null} rhs
   * @returns {boolean}
   */
  static isEqual(lhs, rhs) {
    if (lhs === rhs) {
      return true;
    }

    if (lhs === null || rhs === null) {
      // Works because lhs !== rhs
      return false;
    }

    return (
      lhs.timecode === rhs.timecode
      // @ts-expect-error TODO: Don't rely on global dlfUtils
      && !!globalThis.dlfUtils?.arrayEqualsByIdentity(lhs.fileIds, rhs.fileIds)
    );
  }
}
