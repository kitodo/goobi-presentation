// @ts-check

import { getTimeStringPlaceholders } from '../../DlfMediaPlayer';
import { fillPlaceholders } from '../../lib/util';
import generateTimecodeUrl from './generateTimecodeUrl';

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
 * @param {number | null} timecode
 * @param {number | null} fps
 * @returns {MetadataArray}
 */
export function makeExtendedMetadata(env, metadata, timecode, fps) {
  const url = generateTimecodeUrl(timecode, env);

  /** @type {MetadataArray} */
  const result = {
    ...metadata,
    host: [`${location.protocol}//${location.host}`],
    url: [url.toString()],
  };

  // TODO: What's actually a good behavior when timecode is missing?
  const timeStringPlaceholders = getTimeStringPlaceholders(timecode ?? 0, fps);
  for (const [key, value] of Object.entries(timeStringPlaceholders)) {
    result[key] = [value];
  }

  return result;
}
