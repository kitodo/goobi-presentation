/**
 * Type assertion for {@link dlf.media.PlayerMode}.
 *
 * @param {unknown} obj
 * @returns {obj is dlf.media.PlayerMode}
 */
export function isPlayerMode(obj) {
  return obj === 'audio' || obj === 'video';
}
