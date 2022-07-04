// @ts-check

/**
 *
 * @param {dlf.media.TimeRange | null} timerange
 * @param {Browser} env
 * @returns
 */
export function generateTimerangeUrl(timerange, env) {
  let tc = [];
  if (timerange !== null) {
    if (timerange.endTime !== null && timerange.endTime > timerange.startTime) {
      tc.unshift(timerange.endTime);
    }

    if (timerange.startTime > 0 || tc.length > 0) {
      tc.unshift(timerange.startTime);
    }
  }

  const url = env.getLocation();
  if (tc.length > 0) {
    url.searchParams.set('timecode', tc.map(t => t.toString()).join(','));
  } else {
    url.searchParams.delete('timecode');
  }
  return url;
}

/**
 *
 * @param {number | null} timecode
 * @param {Browser} env
 * @returns
 */
export function generateTimecodeUrl(timecode, env) {
  const timerange = timecode === null
    ? null
    : { startTime: timecode, endTime: null };
  return generateTimerangeUrl(timerange, env);
}
