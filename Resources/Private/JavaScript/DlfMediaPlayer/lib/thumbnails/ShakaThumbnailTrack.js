// @ts-check

/**
 * @implements {dlf.media.ThumbnailTrack}
 */
export default class ShakaThumbnailTrack {
  /**
   *
   * @param {shaka.Player} player
   * @param {shaka.extern.Track} track Image track for thumbnails
   */
  constructor(player, track) {
    /** @private */
    this.player = player;

    /** @private */
    this.track = track;
  }

  get bandwidth() {
    return this.track.bandwidth;
  }

  /**
   *
   * @param {number} position
   * @returns {Promise<dlf.media.ThumbnailOnTrack | null>}
   */
  async getThumb(position) {
    const thumb = await this.player.getThumbnails(this.track.id, position);
    if (thumb === null) {
      return null;
    }

    return {
      track: this,
      ...thumb,
      // TODO: Make this more flexible than just accomodating ffmpeg's fps filter
      imageTime: thumb.startTime + thumb.duration / 2 - 0.00001,
      bandwidth: this.track.bandwidth,
    };
  }
}
