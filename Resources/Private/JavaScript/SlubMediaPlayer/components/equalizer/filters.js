// @ts-check

// The filter code is based upon EQ10Q, licensed under GPL:
//
//     Copyright (C) 2009 by Pere Ràfols Soler
//     sapista2@gmail.com
//
//     This program is free software; you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation; either version 2 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
// See
// - http://eq10q.sourceforge.net/
// - https://github.com/miland3r/eq10q
//
// Additional hints are taken from the Audio EQ Cookbook:
//     https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html

/**
 * @typedef {{
 *  frequency: number;
 *  sampleRate: number;
 * }} PassFilter
 *
 * @typedef ShelvingFilterBase
 * @property {number} frequency
 * @property {number} gain
 * @property {number} sampleRate
 *
 * @typedef ShelvingFilterSlope
 * @property {number} S Shelf slope parameter of the filter.
 *
 * @typedef {ShelvingFilterBase & ShelvingFilterSlope} ShelvingFilter
 */

/**
 * Calculate IIR filter coefficients for first-order lowpass filter.
 *
 * @param {PassFilter} filter
 * @returns {dlf.media.eq.EqIIRFilterNode}
 */
export function lowPass({ frequency, sampleRate }) {
  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#L100
  let w0 = 2 * Math.PI * (frequency / sampleRate);

  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#151
  w0 = Math.tan(w0 / 2.0);
  return normalize({
    type: 'iir',
    sampleRate,
    feedforward: [w0, w0, 0],
    feedback: [w0 + 1, w0 - 1, 0],
  });
}

/**
 * Calculate IIR filter coefficients for first-order highpass filter.
 *
 * @param {PassFilter} options
 * @returns {dlf.media.eq.EqIIRFilterNode}
 */
export function highPass({ frequency, sampleRate }) {
  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#L100
  let w0 = 2 * Math.PI * (frequency / sampleRate);

  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#105
  w0 = Math.tan(w0 / 2.0);
  return normalize({
    type: 'iir',
    sampleRate,
    feedforward: [1, -1, 0],
    feedback: [w0 + 1, w0 - 1, 0],
  });
}

/**
 * Calculate IIR filter coefficients of lowshelf filter with variable S (slope).
 *
 * @param {ShelvingFilter} filter
 * @returns {dlf.media.eq.EqIIRFilterNode}
 */
export function lowShelf({ frequency, gain, S, sampleRate }) {
  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#L100
  const w0 = 2 * Math.PI * (frequency / sampleRate);

  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#L197
  // const A = Math.sqrt((filter.gain));
  const A = 10 ** (gain / 40);

  const Q = slopeToQuality(A, S);

  const cos_w0 = Math.cos(w0);
  const alpha = Math.sin(w0) / 2 * (1 / Q);
  const interm = 2 * Math.sqrt(A) * alpha;

  return normalize({
    type: 'iir',
    sampleRate,
    feedforward: [
      A * ((A + 1) - (A - 1) * cos_w0 + interm),
      2 * A * ((A - 1) - (A + 1) * cos_w0),
      A * ((A + 1) - (A - 1) * cos_w0 - interm),
    ],
    feedback: [
      (A + 1) + (A - 1) * cos_w0 + interm,
      -2 * ((A - 1) + (A + 1) * cos_w0),
      (A + 1) + (A - 1) * cos_w0 - interm,
    ],
  });
}

/**
 * Calculate IIR filter coefficients of highshelf filter with variable S (slope).
 *
 * @param {ShelvingFilter} filter
 * @returns {dlf.media.eq.EqIIRFilterNode}
 */
export function highShelf({ frequency, gain, S, sampleRate }) {
  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#L100
  const w0 = 2 * Math.PI * (frequency / sampleRate);

  // https://github.com/miland3r/eq10q/blob/be880a46dfb5311cdd6c1d20976acff190d0692b/dsp/filter.h#210
  // const A = Math.sqrt((filter.gain));
  const A = 10 ** (gain / 40);

  const Q = slopeToQuality(A, S);

  const cos_w0 = Math.cos(w0);
  const alpha = Math.sin(w0) / 2 * (1 / Q);
  const interm = 2 * Math.sqrt(A) * alpha;

  return normalize({
    type: 'iir',
    sampleRate,
    feedforward: [
      A * ((A + 1) + (A - 1) * cos_w0 + interm),
      -2 * A * ((A - 1) + (A + 1) * cos_w0),
      A * ((A + 1) + (A - 1) * cos_w0 - interm),
    ],
    feedback: [
      (A + 1) - (A - 1) * cos_w0 + interm,
      2 * ((A - 1) - (A + 1) * cos_w0),
      (A + 1) - (A - 1) * cos_w0 - interm,
    ],
  });
}

/**
 *
 * @param {number} A
 * @param {number} S
 */
function slopeToQuality(A, S) {
  // https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html, shelf slope
  return 1 / Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
}

/**
 * Normalize IIR filter coefficients.
 *
 * @param {dlf.media.eq.EqIIRFilterNode} options
 */
function normalize(options) {
  let a0 = /** @type {number} */(options.feedback[0]);

  for (let i = 0; i < 3; i++) {
    options.feedback[i] /= a0;
    options.feedforward[i] /= a0;
  }

  return options;
}
