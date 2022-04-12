// @ts-check

/**
 * Calculate frequency/phase response of IIR filters.
 */
export default class FrequencyResponse {
  /**
   *
   * @param {number} numPoints
   */
  constructor(numPoints) {
    this.numPoints = numPoints;

    this.frequencies_ = new Float32Array(numPoints);
    this.bufMagnitude_ = new Float32Array(numPoints);
    this.bufPhase_ = new Float32Array(numPoints);

    this.magnitudeResponse_ = new Float32Array(numPoints);
    this.phaseResponse_ = new Float32Array(numPoints);
  }

  /**
   *
   * @param {number} idx
   * @param {number} freq
   */
  setFrequency(idx, freq) {
    this.frequencies_[idx] = freq;
  }

  /**
   *
   * @param {Float32Array} frequencies
   */
  setFrequencies(frequencies) {
    this.frequencies_ = frequencies;
  }

  /**
   *
   * @param {Readonly<dlf.media.eq.FilterNode[]>} nodes
   * @returns {this}
   */
  aggregate(nodes) {
    this.magnitudeResponse_.fill(1);
    this.phaseResponse_.fill(0);

    for (const node of nodes) {
      if (node instanceof BiquadFilterNode) {
        node.getFrequencyResponse(
          this.frequencies_,
          this.bufMagnitude_,
          this.bufPhase_,
        );
      } else {
        // Manual IIR filter
        // https://www.earlevel.com/main/2016/12/01/evaluating-filter-frequency-response/
        for (let i = 0; i < this.frequencies_.length; i++) {
          const f = /** @type {number} */(this.frequencies_[i])
          const w = 2 * Math.PI * f / node.sampleRate;

          const [nom_real, nom_imag] = this.fft(node.feedforward, w);
          const [denom_real, denom_imag] = this.fft(node.feedback, w);

          // Division of complex numbers. The denominator gets squared inside sqrt and can be pulled out.
          const h_real = nom_real * denom_real + nom_imag * denom_imag;
          const h_imag = nom_imag * denom_real - nom_real * denom_imag;
          const mag = Math.sqrt(h_real ** 2 + h_imag ** 2) / (denom_real ** 2 + denom_imag ** 2);

          const phase = Math.atan2(h_imag, h_real);

          this.bufMagnitude_[i] = mag;
          this.bufPhase_[i] = phase;
        }
      }

      for (let i = 0; i < this.numPoints; i++) {
        this.magnitudeResponse_[i] *= /** @type {number} */(this.bufMagnitude_[i]);
        this.phaseResponse_[i] += /** @type {number} */(this.bufPhase_[i]);
      }
    }

    return this;
  }

  /**
   * @private
   * @param {number[]} coefficients
   * @param {number} w
   * @returns {[number, number]}
   */
  fft(coefficients, w) {
    let real = 0;
    let imag = 0;
    for (let j = 0; j < coefficients.length; j++) {
      const coeff = /** @type {number} */(coefficients[j]);
      real += coeff * Math.cos(-j * w);
      imag += coeff * Math.sin(-j * w);
    }
    return [real, imag];
  }

  makeCurve(offGain = 1) {
    /** @type {dlf.media.eq.Curve} */
    const curve = {
      name: 'Frequency Response',
      points: [],
    };

    for (let i = 0; i < this.numPoints; i++) {
      const magnitude =/** @type {number} */(this.magnitudeResponse_[i]);
      const gain = this.magToDb(magnitude * offGain);
      const phase = /** @type {number} */(this.phaseResponse_[i]);

      curve.points.push({
        freq: /** @type {number} */(this.frequencies_[i]),
        gain,
        phase,
      });
    }

    return curve;
  }

  /**
   *
   * @param {number} mag
   */
  magToDb(mag) {
    // https://www.mathworks.com/help/signal/ref/mag2db.html
    // https://en.wikipedia.org/wiki/Decibel (third paragraph)
    return 20 * Math.log10(mag);
  }
}
