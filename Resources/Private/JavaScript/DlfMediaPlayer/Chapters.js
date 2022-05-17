// @ts-check

import TimecodeIndex from '../lib/TimecodeIndex';

/**
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
}
