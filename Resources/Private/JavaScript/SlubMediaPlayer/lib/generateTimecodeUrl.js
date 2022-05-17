// @ts-check

/**
 *
 * @param {number | null} timecode
 * @param {Browser} env
 * @returns
 */
export default function generateTimecodeUrl(timecode, env) {
  const url = env.getLocation();
  if (timecode != null && timecode !== 0) {
    url.searchParams.set('timecode', timecode.toString());
  } else {
    url.searchParams.delete('timecode');
  }
  return url;
}
