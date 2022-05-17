// @ts-check

import { fillPlaceholders, zeroPad } from '../../lib/util';

/**
 * Formats {@link totalSeconds} to a time string.
 *
 * The base format is `hh:mm:ss:ff`. Hours and frames are included depending on
 * {@link showHour} and {@link fps}. The first part is not zero-padded.
 *
 * Adopted from shaka.ui.Utils.buildTimeString.
 *
 * @param {number} totalSeconds Total number of seconds to be formatted.
 * @param {boolean} showHour Whether or not to show hours.
 * @param {number | null} fps (Optional) Number of FPS used to calculate frame
 * count.
 * @returns {string}
 */
export default function buildTimeString(totalSeconds, showHour, fps = null) {
  let template = showHour ? "{h}:{mm}:{ss}" : "{m}:{ss}";
  if (fps) {
    template += ":{ff}";

    if (!showHour) {
      template += "f";
    }
  }

  return timeStringFromTemplate(template, totalSeconds, fps);
}

/**
 *
 * @param {string} template Template string used for building the output.
 * @param {number} totalSeconds Total number of seconds to be formatted.
 * @param {number | null} fps (Optional) Number of FPS used to calculate frame count.
 * @returns {string}
 */
export function timeStringFromTemplate(template, totalSeconds, fps = null) {
  const parts = getTimeStringParts(totalSeconds, fps ?? 0);

  return fillPlaceholders(template, {
    h: `${parts.hours}`,
    hh: zeroPad(parts.hours, 2),
    m: `${parts.totalMinutes}`,
    mm: zeroPad(parts.minutes, 2),
    ss: zeroPad(parts.seconds, 2),
    ff: zeroPad(parts.frames, 2),
  });
}

/**
 *
 * @param {number} totalSeconds
 * @param {number} fps
 * @returns {Record<'hours' | 'minutes' | 'totalMinutes' | 'seconds' | 'frames', number>}
 */
export function getTimeStringParts(totalSeconds, fps = 0) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const totalMinutes = hours * 60 + minutes;
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds % 1) * fps);

  return { hours, minutes, totalMinutes, seconds, frames };
}
