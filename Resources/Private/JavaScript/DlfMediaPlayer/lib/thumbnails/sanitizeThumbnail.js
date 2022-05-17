// @ts-check

/**
 * Make sure that {@link thumbnail} does not exceed given {@link maxDuration}.
 *
 * @template {dlf.media.Thumbnail} T
 * @param {T} thumbnail
 * @param {number} maxDuration
 * @returns {T | null}
 */
export default function sanitizeThumbnail(thumbnail, maxDuration) {
  const hasValidDuration = (
    thumbnail.startTime < maxDuration
    && thumbnail.imageTime < maxDuration
  )
  if (!hasValidDuration) {
    return null;
  }

  return {
    ...thumbnail,
    duration: Math.min(thumbnail.duration, maxDuration - thumbnail.startTime),
  };
}
