// @ts-check

import piexifjs from 'piexifjs';

/**
 * @typedef {{
 *  '0th': Record<ValueOf<typeof piexifjs.ImageIFD>, string>;
 *  'Exif': Record<ValueOf<typeof piexifjs.ExifIFD>, string>;
 * }} ExifData
 */

/**
 * @implements {ImageFormat}
 */
export default class JPEG {
  /**
   *
   * @param {string} jpegData Binary string of JPEG data
   */
  constructor(jpegData) {
    /**
     * @private
     * @type {string}
     */
    this.jpeg = jpegData;

    /**
     * @private
     * @type {ExifData}
     */
    this.exif = piexifjs.load(jpegData);
  }

  /**
   * Constructs JPEG image from binary string.
   *
   * @param {string} s
   * @returns {JPEG}
   */
  static fromBinaryString(s) {
    return new JPEG(s);
  }

  /**
   * Exports the JPEG image to a binary string.
   *
   * @returns {string}
   */
  toBinaryString() {
    const exifDump = piexifjs.dump(this.exif);
    return piexifjs.insert(exifDump, this.jpeg);
  }

  /**
   * Add EXIF metadata to the JPEG image.
   *
   * @param {Partial<ImageMetadata>} metadata
   */
  addMetadata(metadata) {
    if (metadata.title) {
      // https://www.exiv2.org/tags.html
      //   "A character string giving the title of the image."
      // TODO: Filter out non-ASCII?
      this.exif['0th'][piexifjs.ImageIFD.ImageDescription] = metadata.title;
    }

    if (metadata.comment) {
      // TODO: exiftool says "Invalid EXIF text encoding for UserComment"?
      this.exif['Exif'][piexifjs.ExifIFD.UserComment] = metadata.comment;
    }
  }

  /**
   * @returns {ImageMetadata}
   */
  getMetadata() {
    return {
      title: this.exif['0th'][piexifjs.ImageIFD.ImageDescription] ?? "",
      comment: this.exif['Exif'][piexifjs.ExifIFD.UserComment] ?? "",
    };
  }
}
