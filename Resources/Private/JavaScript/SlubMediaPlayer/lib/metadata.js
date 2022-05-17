// @ts-check

import { fillPlaceholders } from '../../lib/util';

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
