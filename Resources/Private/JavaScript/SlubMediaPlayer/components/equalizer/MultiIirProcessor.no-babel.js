// @ts-check

/// <reference path="../../../../../../Build/node_modules/@types/audioworklet/index.d.ts" />

/**
 * @typedef ChannelBuf
 * @property {number} buf_0 Working buffer
 * @property {number} buf_1 Delay element 1
 * @property {number} buf_2 Delay element 2
 *
 * @typedef FilterCoeffs
 * @property {[number, number, number]} feedforward
 * @property {[1, number, number]} feedback
 *
 * @typedef Filter
 * @property {boolean} updated
 * @property {boolean} isActive
 * @property {FilterCoeffs} iir
 * @property {Record<number, ChannelBuf>} channels
 */

/**
 * Simple processor node to apply cascaded second-order IIR filters that can be dynamically changed.
 *
 * I'd certainly prefer to use IIRFilterNode or even BiquadFilterNode, but:
 * - The builtin BiquadFilterNode currently does not support Q/S parameters for shelving filters.
 *   See https://github.com/WebAudio/web-audio-api/issues/2428.
 * - The builtin IIRFilterNode does not support mutating coefficients,
 *   so we'd have to recreate and reconnect the nodes when parameters change.
 *   This leads to crackles and seems to be slow in Chrome.
 *
 * Observations on crackles:
 * - Most crackles occur when IIR buffers / delay elements are reset,
 *   which explains why it is beneficial to not recreate IIRFilterNode.
 * - Crackles are also reduced by applying normalization gain directly in the processor.
 *   A slight benefit is obtained by interpolating changes in gain.
 *   When gain is not applied, there don't seem to be crackles.
 *
 * The construct with a registration function is used so that it can be imported via Webpack,
 * and the URL of the processor script does not need to be known.
 *
 * The file should not be transpiled with Babel, as Babel would add global symbols that
 * aren't available in an isolated context. AudioWorklet requires a modern browser anyways.
 */
export default function registerMultiIirProcessor() {
  /**
   * Minimum non-denormal floating point number.
   *
   * @see https://github.com/inexorabletash/polyfill/blob/716a3f36ca10fad032083014faf1a47c638e2502/experimental/es-proposed.js#L526
   * @private
   */
  const MIN_NORMAL = 2 ** -1022;

  /**
   *
   * @param {number} value
   * @private
   */
  function denormalToZero(value) {
    return Math.abs(value) < MIN_NORMAL ? 0 : value;
  }

  /**
   * @implements {AudioWorkletProcessorImpl}
   */
  class MultiIirProcessor extends AudioWorkletProcessor {
    constructor() {
      super();

      /** @private @type {Record<string, Filter>} */
      this.filters = {};

      /** @private */
      this.previousGain = 1;

      /** @private */
      this.gain = 1;

      this.port.onmessage = this.onmessage.bind(this);
    }

    /**
     * @private
     * @param {MessageEvent} event
     */
    onmessage(event) {
      const data = event.data;
      if (data == null) {
        return;
      }

      if (data.type === 'filters') {
        this.gain = data.gain;

        for (const filter of Object.values(this.filters)) {
          filter.updated = false;
        }

        for (const [key, value] of Object.entries(data.filters)) {
          if (
            value.node.feedforward.length !== 3
            || value.node.feedback.length !== 3
          ) {
            console.warn("MultiIirProcessor: Only IIR filters with three feedforward/feedback coefficients are supported. Skipping filter.");
            continue;
          }

          // Normalize coefficients if necessary
          if (value.node.feedback[0] !== 1) {
            const a0 = /** @type {number} */(value.node.feedback[0]);
            // Don't worry about mutation, the data is our own by now
            for (let i = 0; i < 3; i++) {
              value.node.feedback[i] /= a0;
              value.node.feedforward[i] /= a0;
            }
          }

          const filter = this.filters[key];
          if (filter === undefined) {
            this.filters[key] = {
              updated: true,
              isActive: value.isActive,
              channels: [],
              iir: value.node,
            };
          } else {
            // Reset buffers when filter is becoming active
            if (value.isActive && !filter.isActive) {
              filter.channels = [];
            }

            filter.updated = true;
            filter.isActive = value.isActive;
            filter.iir = value.node;
          }
        }

        // A filter that isn't sent counts as inactive
        for (const filter of Object.values(this.filters)) {
          if (!filter.updated) {
            filter.isActive = false;
          }
        }
      }
    }

    /**
     * @param {Float32Array[][]} inputs
     * @param {Float32Array[][]} outputs
     * @param {Record<string, Float32Array>} parameters
     * @returns {boolean}
     */
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];

      if (input === undefined || output === undefined) {
        console.warn("MultiIirProcessor: input or output not given");
        return false;
      }

      for (let channelNum = 0; channelNum < input.length; channelNum++) {
        const inputChannel = /** @type {Float32Array} */(input[channelNum]);
        const outputChannel = /** @type {Float32Array} */(output[channelNum]);

        for (let i = 0; i < inputChannel.length; i++) {
          const gain = this.previousGain + (this.gain - this.previousGain) * i / inputChannel.length;
          let sampleOut = /** @type {number} */(inputChannel[i]) * gain;

          for (const [key, filter] of Object.entries(this.filters)) {
            if (!filter.isActive) {
              continue;
            }

            let ch = filter.channels[channelNum];
            if (ch === undefined) {
              ch = filter.channels[channelNum] = {
                buf_0: 0,
                buf_1: 0,
                buf_2: 0,
              };
            }

            // Oriented at https://github.com/miland3r/eq10q/blob/master/dsp/filter.h#L318
            ch.buf_0 = denormalToZero(sampleOut - (filter.iir.feedback[1] ?? 0) * ch.buf_1 - (filter.iir.feedback[2] ?? 0) * ch.buf_2);
            sampleOut = filter.iir.feedforward[0] * ch.buf_0 + filter.iir.feedforward[1] * ch.buf_1 + filter.iir.feedforward[2] * ch.buf_2;

            ch.buf_2 = ch.buf_1;
            ch.buf_1 = ch.buf_0;
          }

          outputChannel[i] = sampleOut;
        }
      }

      this.previousGain = this.gain;

      // Prevent Chrome from eagerly removing the node when it is disconnected temporarily
      return true;
    }
  }

  registerProcessor("multi-iir-processor", MultiIirProcessor);
}
