// @ts-check

import JPEG from 'lib/image/jpeg';
import PNG from 'lib/image/png';

/**
 * @type {ImageFormatDesc[]}
 */
const imageFormats = [
  {
    mimeType: 'image/png',
    extension: "png",
    label: "PNG",
    parseBinaryString: (s) => {
      return PNG.fromBinaryString(s);
    },
  },
  {
    mimeType: 'image/jpeg',
    extension: "jpg",
    label: "JPEG",
    parseBinaryString: (s) => {
      return JPEG.fromBinaryString(s);
    },
  },
  {
    mimeType: 'image/tiff',
    extension: "tiff",
    label: "TIFF",
    parseBinaryString: () => undefined,
  },
];

export default imageFormats;
