// @ts-check

import { EventTarget } from 'DlfMediaPlayer/3rd-party/EventTarget';
import { clamp, e } from 'lib/util';
import Equalizer from 'SlubMediaPlayer/components/equalizer/Equalizer';
import FrequencyResponse from 'SlubMediaPlayer/components/equalizer/FrequencyResponse';
import Scale, { Linear, Logarithmic } from 'SlubMediaPlayer/components/equalizer/Scale';

/**
 * @typedef {{
 *  freqX: number;
 *  gainY: number;
 * }} Position
 *
 * @typedef {{
 *  pointer: Position;
 *  filter: Position;
 * }} Grabbed
 *
 * @typedef {{
 *  param: dlf.media.eq.Param;
 *  pointer: Position;
 *  grabbed: Grabbed | null;
 * }} Hovered
 *
 * @typedef {'original' | 'modified'} PresetVariant
 *
 * @typedef {Record<PresetVariant, dlf.media.eq.FilterPreset>} ShownPreset
 *
 * @typedef {{
 *  selected: ShownPreset | null;
 *  keyToPreset: Record<string, ShownPreset>;
 *  domGroups: Record<string, HTMLOptGroupElement>;
 * }} Presets
 *
 * @typedef {{
 *  store_preset: {
 *    key: string;
 *    preset: dlf.media.eq.FilterPreset;
 *  };
 *  delete_preset: {
 *    key: string;
 *  };
 * }} Events
 */

/**
 * @template {keyof Events} T
 * @typedef {CustomEvent<Events[T]>} EqualizerViewEvent
 */

/**
 * @extends {EventTarget<Events>}
 */
export default class EqualizerView extends EventTarget {
  /**
   *
   * @param {Identifier & Translator} env
   * @param {Equalizer} eq
   */
  constructor(env, eq) {
    super();

    /** @private */
    this.env = env;

    /** @private */
    this.eq_ = eq;

    this.handlers = {
      onCanvasMouseMove: this.onCanvasMouseMove.bind(this),
      onCanvasMouseLeave: this.onCanvasMouseLeave.bind(this),
      onCanvasMouseDown: this.onCanvasMouseDown.bind(this),
      onCanvasMouseUp: this.onCanvasMouseUp.bind(this),
      onCanvasDoubleClick: this.onCanvasDoubleClick.bind(this),
      onCanvasWheel: this.onCanvasWheel.bind(this),
      onChangeActivate: this.onChangeActivate.bind(this),
      onSelectPreset: this.onSelectPreset.bind(this),
      onResetPreset: this.onResetPreset.bind(this),
      onSavePreset: this.onSavePreset.bind(this),
      onDeletePreset: this.onDeletePreset.bind(this),
      onResizeWindow: this.resize.bind(this),
    };

    const elId = {
      activateCheck: this.env.mkid(),
      presetSelect: this.env.mkid(),
      labelInput: this.env.mkid(),
    };

    /** @type {HTMLDivElement} */
    this.$container = e('div', { className: "dlf-equalizer-view" }, [
      e('h2', {}, [this.env.t('control.sound_tools.equalizer.title')]),
      e('section', { className: "eq-controls" }, [
        e('div', { className: "eq-preset" }, [
          // Select
          e('label', {
            htmlFor: elId.presetSelect,
          }, [this.env.t('control.sound_tools.equalizer.preset.label')]),
          this.$presetSelect = e('select', {
            id: elId.presetSelect,
            $change: this.handlers.onSelectPreset,
          }, []),

          // Reset
          e('button', {
            title: this.env.t('control.sound_tools.equalizer.preset.reset'),
            $click: this.handlers.onResetPreset,
          }, [
            e('span', {
              className: 'material-icons-round inline-icon',
            }, ['settings_backup_restore']),
          ]),

          // Save As
          e('button', {
            title: this.env.t('control.sound_tools.equalizer.preset.save'),
            $click: this.handlers.onSavePreset,
          }, [
            e('span', {
              className: 'material-icons-round inline-icon',
            }, ['save_as']),
          ]),

          // Delete
          this.$deletePresetBtn = e('button', {
            disabled: true,
            title: this.env.t('control.sound_tools.equalizer.preset.delete'),
            $click: this.handlers.onDeletePreset,
          }, [
            e('span', {
              className: 'material-icons-round inline-icon',
            }, ['delete']),
          ]),
        ]),
        e('div', { className: "eq-activate" }, [
          /** @type {HTMLInputElement} */
          this.$activateCheck = e('input', {
            id: elId.activateCheck,
            type: 'checkbox',
            checked: this.eq_.active,
            $input: this.handlers.onChangeActivate,
          }),
          e('label', {
            htmlFor: elId.activateCheck,
          }, [this.env.t('control.sound_tools.equalizer.activate')]),
        ]),
      ]),
      /** @type {HTMLCanvasElement} */
      this.$canvas = e('canvas', {
        width: 1000,
        height: 400,
        $mousemove: this.handlers.onCanvasMouseMove,
        $mouseleave: this.handlers.onCanvasMouseLeave,
        $mousedown: this.handlers.onCanvasMouseDown,
        $dblclick: this.handlers.onCanvasDoubleClick,
        $mouseup: this.handlers.onCanvasMouseUp,
        $wheel: this.handlers.onCanvasWheel,
      }),
    ]);

    /** @private */
    this.$ctx = this.$canvas.getContext('2d');

    /** @private */
    this.eqBox = this.calcEqBox();

    /** @private @type {ReturnType<requestAnimationFrame> | null} */
    this.resizeAnimationFrame = null;

    /** @private @type {ReturnType<requestAnimationFrame> | null} */
    this.renderAnimationFrame = null;

    /** @private @type {Hovered | null} */
    this.hovered = null;

    /** @private */
    this.NUM_POINTS = 1000;

    /** @private */
    this.db = new Scale();

    /** @private */
    this.phase = new Scale();

    /** @private */
    this.freq = new Scale();

    /** @private */
    this.frequencies = new Float32Array(this.NUM_POINTS);

    /** @private */
    this.frequencyResponse = new FrequencyResponse(this.NUM_POINTS);

    /** @private */
    this.singleFrequencyResponse = new FrequencyResponse(1);

    /** @private */
    this.frequencyResponseCurve = this.frequencyResponse.makeCurve();

    /** @type {Presets} */
    this.presets = {
      selected: null,
      keyToPreset: {},
      domGroups: {},
    };

    this.addPresetOptgroup('user');

    this.setHovered(null);
    this.initFrequencies();

    window.addEventListener('resize', this.handlers.onResizeWindow);
  }

  get domElement() {
    return this.$container;
  }

  /**
   * Auto-resize canvas element. Should be called after inserting
   * {@link domElement}.
   */
  resize() {
    if (this.resizeAnimationFrame === null) {
      this.resizeAnimationFrame = requestAnimationFrame(() => {
        this.resizeAnimationFrame = null;
        // "-100": Make room for wheel scrolling on smaller devices
        const width = clamp(this.$container.offsetWidth - 100, [100, 1000]);
        const height = clamp(400 / 1000 * width, [200, 400]);
        this.$canvas.width = width;
        this.$canvas.height = height;
        this.eqBox = this.calcEqBox();
        this.initFrequencies();
      });
    }
  }

  /**
   * @private
   */
  calcEqBox() {
    const left = 40;
    return new DOMRect(left, 0, this.$canvas.width - left, this.$canvas.height - 20);
  }

  /**
   * @private
   */
  initFrequencies() {
    const maxFreq = this.eq_.audioContext.sampleRate / 2;

    // TODO: Find better place
    this.db = new Scale(-24, 24, this.eqBox.bottom, this.eqBox.top, Linear);
    this.phase = new Scale(-2 * Math.PI, 2 * Math.PI, this.eqBox.bottom, this.eqBox.top, Linear);
    this.freq = new Scale(10, maxFreq, this.eqBox.left, this.eqBox.right, Logarithmic);

    const freqResp = new Scale(10, maxFreq, 0, this.NUM_POINTS - 1, Logarithmic);
    for (let i = 0; i < this.NUM_POINTS; i++) {
      this.frequencies[i] = freqResp.invert(i);
    }

    this.frequencyResponse.setFrequencies(this.frequencies);
    this.updateFrequencyResponse();
  }

  /**
   * @private
   * @param {Event} e
   */
  onChangeActivate(e) {
    this.eq_.active = this.$activateCheck.checked;
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onCanvasMouseMove(e) {
    /** @type {Position} */
    const pointer = {
      freqX: e.offsetX,
      gainY: e.offsetY,
    };

    if (this.hovered !== null && this.hovered.grabbed) {
      const newGain = this.db.invert(pointer.gainY + (this.hovered.grabbed.filter.gainY - this.hovered.grabbed.pointer.gainY));
      this.updateFilterGain(this.hovered.param, () => newGain);

      const newFreq = this.freq.invert(pointer.freqX + (this.hovered.grabbed.filter.freqX - this.hovered.grabbed.pointer.freqX));
      this.updateFilterFreq(this.hovered.param, () => newFreq);
    } else {
      const freq = this.freq.invert(pointer.freqX);

      let min = null;

      for (const param of this.eq_.activeParams) {
        const cur = {
          /** @type {Grabbed | null} */
          grabbed: null,
          pointer,
          dist: Math.abs(param.frequency.value - freq),
          param,
        };

        if (min === null || cur.dist <= min.dist) {
          min = cur;
        }
      }

      this.setHovered(min);
    }
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onCanvasMouseLeave(e) {
    this.setHovered(null);
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onCanvasMouseDown(e) {
    if (this.hovered !== null) {
      const pointer = {
        freqX: e.offsetX,
        gainY: e.offsetY,
      };

      const filter = {
        gainY: this.db.convert(this.hovered.param.gain.value),
        freqX: this.freq.convert(this.hovered.param.frequency.value),
      };

      this.setHovered({
        ...this.hovered,
        grabbed: {
          pointer,
          filter,
        },
      });
    }
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onCanvasMouseUp(e) {
    if (this.hovered?.grabbed != null) {
      // TODO: Should we do this?
      // Set value directly on click
      // const pointerGainY = e.offsetY;
      // if (Math.abs(pointerGainY - this.hovered.grabbed.pointer.gainY) === 0) {
      //   this.updateFilterGain(this.hovered.param, () => this.db.invert(pointerGainY));
      // }

      this.setHovered({
        ...this.hovered,
        grabbed: null,
      });
    }
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onCanvasDoubleClick(e) {
    const param = this.hovered?.param;
    if (param != null) {
      this.updateFilterGain(param, () => param.gain.initial);
      this.updateFilterFreq(param, () => param.frequency.initial);
    }
  }

  /**
   * @private
   * @param {WheelEvent} e
   */
  onCanvasWheel(e) {
    if (this.hovered !== null && this.hovered.grabbed === null) {
      e.preventDefault();
      const deltaPx = e.deltaY / 4;
      let deltaDb = this.db.invert(this.eqBox.height / 2 - deltaPx);
      // Assume that when values are a bit large, they are too large
      if (Math.abs(deltaDb) > 1) {
        deltaDb /= 5;
      }
      this.updateFilterGain(this.hovered.param, (old) => old - deltaDb);
    }
  }

  /**
   * @private
   * @param {Hovered | null} hovered
   */
  setHovered(hovered) {
    this.hovered = hovered;

    if (hovered?.grabbed) {
      this.$canvas.style.cursor = 'grab';
    } else {
      this.$canvas.style.cursor = 'pointer';
    }

    this.scheduleRenderGraph();
  }

  /**
   * @private
   * @param {dlf.media.eq.Param} param
   * @param {(oldValue: number) => number} fn
   */
  updateFilterGain(param, fn) {
    this.updateEqValue(param.gain, fn, [-24, 24]);
  }

  /**
   * @private
   * @param {dlf.media.eq.Param} param
   * @param {(oldValue: number) => number} fn
   */
  updateFilterFreq(param, fn) {
    this.updateEqValue(param.frequency, fn, [10, this.freq.max]);
  }

  /**
   * @private
   * @param {dlf.media.eq.ParamValue} param
   * @param {(oldValue: number) => number} fn
   * @param {[number, number]} bounds
   */
  updateEqValue(param, fn, bounds) {
    if (param.editable) {
      param.update((oldValue) => {
        return clamp(fn(oldValue), bounds);
      });

      this.updateFrequencyResponse();
    }
  }

  /**
   * @private
   * @param {Event} e
   */
  onSelectPreset(e) {
    this.selectPreset(this.$presetSelect.value);
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onResetPreset(e) {
    this.selectPreset(this.$presetSelect.value, 'original');
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onSavePreset(e) {
    // TODO: Now raw prompt?
    const label = prompt(this.env.t('control.sound_tools.equalizer.preset.save.name'));
    if (!label) {
      return;
    }

    const preset = this.eq_.exportPreset(label);
    if (preset === null) {
      return;
    }

    const key = this.addPreset(preset);
    this.selectPreset(key);

    this.dispatchEvent(new CustomEvent('store_preset', {
      detail: {
        key,
        preset,
      },
    }));
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onDeletePreset(e) {
    const key = this.$presetSelect.value;
    const preset = this.presets.keyToPreset[key];
    if (preset === undefined || preset.original.group !== 'user') {
      return;
    }

    this.presets.domGroups[preset.original.group]
      ?.querySelector(`option[value="${key}"]`)
      ?.remove();

    // Update UI for next preset in line
    this.selectPreset(this.$presetSelect.value);

    this.dispatchEvent(new CustomEvent('delete_preset', {
      detail: {
        key,
      },
    }));
  }

  /**
   *
   * @param {dlf.media.eq.FilterPreset} preset
   * @returns {string} Key of new preset
   */
  addPreset(preset) {
    const key = preset.key ?? this.env.uuidv4();
    this.presets.keyToPreset[key] = {
      original: preset,
      modified: preset,
    };

    let $optgroup = this.presets.domGroups[preset.group];
    if ($optgroup === undefined) {
      $optgroup = this.addPresetOptgroup(preset.group);
    }

    const $option = e('option', {
      value: key,
    }, [preset.label]);
    $optgroup.append($option);

    return key;
  }

  /**
   *
   * @param {string} key
   * @param {PresetVariant} variant
   */
  selectPreset(key, variant = 'modified') {
    if (this.presets.selected !== null) {
      const modified = this.eq_.exportPreset('');
      if (modified !== null) {
        this.presets.selected.modified = modified;
      }
    }

    const preset = this.presets.keyToPreset[key];
    if (preset !== undefined) {
      this.presets.selected = preset;

      this.eq_.loadPreset(preset[variant]);
      preset.modified = preset[variant];

      this.$presetSelect.value = key;
      this.$deletePresetBtn.disabled = preset.original.group !== 'user';
      this.updateFrequencyResponse();
    }
  }

  /**
   * @private
   * @param {string} group
   */
  addPresetOptgroup(group) {
    const optgroup = e('optgroup', {
      label: this.env.t(`control.sound_tools.equalizer.preset.group.${group}`),
    }, []);
    this.presets.domGroups[group] = optgroup;
    this.$presetSelect.appendChild(optgroup);
    return optgroup;
  }

  /**
   * Draw FFT analysis of current audio. Can be used to test frequency response
   * with white noise.
   *
   * @param {number} gain
   */
  fftSnapshot(gain) {
    this.fftCurve = this.eq_.fft(gain);
    this.scheduleRenderGraph();
  }

  /**
   * Recalculate frequency response and render graph.
   *
   * @private
   */
  updateFrequencyResponse() {
    this.frequencyResponseCurve = this.eq_.getFrequencyResponse(this.frequencyResponse);
    this.scheduleRenderGraph();
  }

  /**
   * Render full graph on next animation frame.
   *
   * @private
   */
  scheduleRenderGraph() {
    if (this.renderAnimationFrame === null) {
      this.renderAnimationFrame = requestAnimationFrame(() => {
        this.renderGraph();
        this.renderAnimationFrame = null;
      });
    }
  }

  /**
   * Render full graph into the canvas.
   *
   * @private
   */
  renderGraph() {
    if (this.$ctx === null) {
      return;
    }

    const box = this.eqBox;

    this.$ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

    // Gain/phase lines (horizontally)
    for (let dB = -24; dB <= 24; dB += 6) {
      const y = this.db.convert(dB);

      this.$ctx.strokeStyle = '#ddd';
      this.$ctx.beginPath();
      this.$ctx.moveTo(box.left, y);
      this.$ctx.lineTo(box.right, y);
      this.$ctx.stroke();

      let textY = y + 4; // center to line
      if (dB > 0) {
        textY = y + 10; // below line
      } else if (dB < 0) {
        textY = y; // above line
      }
      this.$ctx.font = '12px Arial';
      this.$ctx.fillStyle = '#aaa';
      this.$ctx.textAlign = 'right';
      this.$ctx.fillText(`${dB} dB`, box.left - 4, textY, box.width);
    }

    // Frequency lines (vertically)
    for (const mag of [10, 100, 1000, 10000]) {
      for (let factor = 1; factor < 10; factor++) {
        this.$ctx.strokeStyle = factor <= 1 ? '#aaa' : '#ddd';
        const x = this.freq.convert(mag * factor);
        this.$ctx.beginPath();
        this.$ctx.moveTo(x, this.eqBox.top);
        this.$ctx.lineTo(x, this.eqBox.bottom);
        this.$ctx.stroke();
      }

      this.$ctx.font = '12px Arial';
      this.$ctx.textAlign = 'left';
      this.$ctx.fillStyle = '#aaa';
      const x = this.freq.convert(mag);
      this.$ctx.fillText(`${mag} Hz`, x, box.bottom + 12);
    }

    // Target curve
    const targetCurve = this.eq_.filterset.targetCurve(this.frequencies);
    if (targetCurve !== null) {
      this.drawEqCurve(targetCurve);
    }

    // Frequency and phase response curves
    this.$ctx.strokeStyle = 'black';
    this.drawEqCurve(this.frequencyResponseCurve, 'gain');
    this.$ctx.setLineDash([5, 15]);
    this.drawEqCurve(this.frequencyResponseCurve, 'phase');
    this.$ctx.setLineDash([]);

    // Single frequency response
    if (this.hovered !== null) {
      const curve = this.hovered.param.getFrequencyResponse(this.frequencyResponse);
      this.$ctx.strokeStyle = 'transparent';
      this.$ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.fillEqCurve(curve);
    }

    // Values under cursor
    if (this.hovered !== null) {
      const freq = this.freq.invert(this.hovered.pointer.freqX);
      const freqStr = freq.toLocaleString(undefined, { maximumFractionDigits: 0 });

      this.singleFrequencyResponse.setFrequency(0, freq);
      const curve = this.eq_.getFrequencyResponse(this.singleFrequencyResponse);
      const point = curve.points[0];
      if (point !== undefined) {
        const gainStr = point.gain.toLocaleString(undefined, { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
        const phaseDeg = point.phase / Math.PI * 180;
        const phaseStr = phaseDeg.toLocaleString(undefined, { maximumFractionDigits: 0 });

        this.$ctx.font = '12px Arial';
        this.$ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.$ctx.textAlign = 'left';
        this.$ctx.fillText(`${freqStr} Hz: ${gainStr} dB, ${phaseStr}°`, box.left + 2, box.top + 12);
      }
    }

    // Filter parameter controls
    for (const param of this.eq_.activeParams) {
      const x = this.freq.convert(param.frequency.value);
      const y = this.db.convert(param.gain.value);
      this.$ctx.fillStyle = param === this.hovered?.param ? 'red' : 'blue';
      this.$ctx.beginPath();
      this.$ctx.arc(x, y, 3, 0, 2 * Math.PI);
      this.$ctx.fill();
    }

    // FFT curve
    if (this.fftCurve) {
      this.$ctx.strokeStyle = 'green';
      this.drawEqCurve(this.fftCurve);
    }
  }

  /**
   * @private
   * @param {dlf.media.eq.Curve} curve
   * @param {'gain' | 'phase'} part
   */
  fillEqCurve(curve, part = 'gain') {
    if (this.$ctx === null) {
      return;
    }

    const first = curve.points[0];
    const last = curve.points[curve.points.length - 1];
    if (first && last) {
      curve.points.splice(0, 0, {
        freq: first.freq,
        gain: 0,
        phase: 0,
      });
      curve.points.push({
        freq: last.freq,
        gain: 0,
        phase: 0,
      });
    }
    this.drawEqCurve(curve, part);
    this.$ctx.closePath();
    this.$ctx.fill();
  }

  /**
   * @private
   * @param {dlf.media.eq.Curve} curve
   * @param {'gain' | 'phase'} part
   */
  drawEqCurve(curve, part = 'gain') {
    if (this.$ctx === null) {
      return;
    }

    // this.$ctx.strokeStyle = 'black';
    this.$ctx.beginPath();
    let isFirst = true;
    for (const point of curve.points) {
      const x = this.freq.convert(point.freq);
      const y = part === 'gain'
        ? this.db.convert(point.gain)
        : this.phase.convert(point.phase);

      if (isFirst) {
        this.$ctx.moveTo(x, y)
        isFirst = false;
      } else {
        this.$ctx.lineTo(x, y);
      }
    }
    this.$ctx.stroke();
  }
}
