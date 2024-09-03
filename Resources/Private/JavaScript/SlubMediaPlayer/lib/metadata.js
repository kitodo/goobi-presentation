// @ts-check

import { getTimeStringPlaceholders } from 'DlfMediaPlayer/index';
import { fillPlaceholders } from 'lib/util';

/**
 * In {@link template} string, fill placeholders representing metadata with the
 * value given in {@link metadata}.
 *
 * @param {string} template
 * @param {MetadataArray} metadata
 * @returns {string}
 */
export function fillMetadata(template, metadata) {
  const firstMetadataValues = Object.fromEntries(
    Object.entries(metadata).map(([key, values]) => [key, values[0] ?? ''])
  );

  return fillPlaceholders(template, firstMetadataValues);
}

/**
 * Create metadata array that extends {@link metadata} and contains additional
 * information that may be relevant for filling placeholders.
 *
 * The result may be used, in particular, with {@link fillMetadata}.
 *
 * @param {dlf.media.UrlGenerator} gen
 * @param {MetadataArray} metadata
 * @param {number | dlf.media.TimeRange | null} timecode
 * @param {number | null} fps
 * @returns {MetadataArray}
 */
export function makeExtendedMetadata(gen, metadata, timecode, fps) {
  const url = gen.generateUrl(timecode);

  /** @type {MetadataArray} */
  const result = {
    ...metadata,
    host: [`${location.protocol}//${location.host}`],
    url: [url.toString()],
  };

  // TODO: What's actually a good behavior when timecode is missing?
  let startTime = 0;
  if (typeof timecode === 'number') {
    startTime = timecode;
  } else if (timecode !== null) {
    startTime = timecode.startTime;
  }
  const timeStringPlaceholders = getTimeStringPlaceholders(startTime, fps);
  for (const [key, value] of Object.entries(timeStringPlaceholders)) {
    result[key] = [value];
  }

  return result;
}
