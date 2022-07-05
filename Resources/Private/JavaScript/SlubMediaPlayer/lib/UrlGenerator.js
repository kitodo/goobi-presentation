// @ts-check

/**
 * @implements {dlf.media.UrlGenerator}
 */
export default class UrlGenerator {
  /**
   *
   * @param {Browser} env
   */
  constructor(env) {
    /** @private */
    this.env = env;
  }

  /**
   *
   * @param {number | dlf.media.TimeRange | null} timecodeOrRange
   * @returns {URL}
   */
  generateUrl(timecodeOrRange) {
    return typeof timecodeOrRange === 'number'
      ? this.generateTimecodeUrl(timecodeOrRange)
      : this.generateTimerangeUrl(timecodeOrRange);
  }

  /**
   *
   * @param {dlf.media.TimeRange | null} timerange
   * @returns {URL}
   */
  generateTimerangeUrl(timerange) {
    let tc = [];
    if (timerange !== null) {
      if (timerange.endTime !== null && timerange.endTime > timerange.startTime) {
        tc.unshift(timerange.endTime);
      }

      if (timerange.startTime > 0 || tc.length > 0) {
        tc.unshift(timerange.startTime);
      }
    }

    const url = this.env.getLocation();
    if (tc.length > 0) {
      url.searchParams.set('timecode', tc.map(t => t.toString()).join(','));
    } else {
      url.searchParams.delete('timecode');
    }
    return url;
  }

  /**
   *
   * @param {number | null} timecode
   * @returns {URL}
   */
  generateTimecodeUrl(timecode) {
    const timerange = timecode === null
      ? null
      : { startTime: timecode, endTime: null };
    return this.generateTimerangeUrl(timerange);
  }
}
