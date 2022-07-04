// @ts-check

import { getTimeStringPlaceholders } from '../../DlfMediaPlayer';
import { fillPlaceholders } from '../../lib/util';
import { generateTimecodeUrl, generateTimerangeUrl } from './generateTimecodeUrl';

/**
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
 *
 * @param {Browser} env
 * @param {MetadataArray} metadata
 * @param {number | dlf.media.TimeRange | null} timecode
 * @param {number | null} fps
 * @returns {MetadataArray}
 */
export function makeExtendedMetadata(env, metadata, timecode, fps) {
  const url = typeof timecode === 'number'
    ? generateTimecodeUrl(timecode, env)
    : generateTimerangeUrl(timecode, env);

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
