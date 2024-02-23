// @ts-check

import WaveformData from 'waveform-data';
import Peaks from 'peaks.js';

import { clamp, e } from '../../../lib/util';
import DlfMediaPlayer from '../../DlfMediaPlayer';
import ShakaFrontend from '../../frontend/ShakaFrontend';
import { action } from '../../lib/action';
import DlfMediaPlugin from '../../DlfMediaPlugin';

/**
 * Custom element to display and interact with a waveform.
 *
 * HTML attributes:
 * - `forPlayer`: ID of attached player to synchronize playhead and markers
 * - `src`: URL of the waveform data
 * - `type`: MIME type of the waveform data. Currently, only 'application/vnd.kitodo.audiowaveform' is supported.
 */
export default class WaveForm extends DlfMediaPlugin {
  static get observedAttributes() {
    return /** @type {const} */(['hidden']);
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.$style = e('style', {}, [`
      .container {
        position: relative;
        display: block;
        height: 100px;
      }

      .wave-overview {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.3);
      }
    `]);

    this.$container = e('div', { className: "container" }, [
      this.$waveOverview = e('div', { className: "wave-overview" }),
    ]);

    shadow.append(this.$style, this.$container);

    /** @private @type {string | null} */
    this.nextUrl = null;

    /** @private @type {import('peaks.js').PeaksInstance | null} */
    this.peaks_ = null;

    /** @private */
    this.waveformdata = null;

    /** @private */
    this.minSamplesPerPixel = 0;

    /** @private */
    this.maxSamplesPerPixel = Number.POSITIVE_INFINITY;

    /** @private */
    this.samplesPerPixel = 0;

    /** @private @type {import('peaks.js').WaveformZoomView | null} */
    this.zoomview = null;

    /** @private */
    this.handlers = {
      onWheel: this.onWheel.bind(this),
      onResize: this.onResize.bind(this),
    };

    /** @private @type {Partial<import('peaks.js').PeaksEvents>} */
    this.peaksHandlers = {
      'points.dragend': (event) => {
        if (this.player !== null && event.point.id !== undefined) {
          this.player.getMarkers().update({
            id: event.point.id,
            startTime: event.point.time,
            labelText: event.point.labelText,
            color: event.point.color,
          }, /* activate= */ true);
        }
      },
      'segments.dragend': (event) => {
        if (this.player !== null && event.segment.id !== undefined) {
          this.player.getMarkers().update({
            id: event.segment.id,
            startTime: event.segment.startTime,
            endTime: event.segment.endTime,
            labelText: event.segment.labelText,
            color: typeof event.segment.color === 'string'
              ? event.segment.color
              : undefined,
          }, /* activate= */ true);
        }
      },
    }

    /** @private @type {Partial<import('../../../DlfMediaPlayer/Markers').Handlers>} */
    this.markersHandlers = {
      'remove': (event) => {
        for (const segment of event.detail.segments) {
          if (this.peaks_ !== null) {
            if (segment.endTime === undefined) {
              this.peaks_.points.removeById(segment.id);
            } else {
              this.peaks_.segments.removeById(segment.id);
            }
          }
        }
      },
      'remove_all': () => {
        if (this.peaks_ !== null) {
          this.peaks_.points.removeAll();
          this.peaks_.segments.removeAll();
        }
      },
      'add': (event) => {
        this.peaksAddSegments(event.detail.segments);
      },
      'update': (event) => {
        const { segment, prevSegment } = event.detail;
        if (this.peaks_ !== null) {
          if (prevSegment.endTime === undefined && segment.endTime !== undefined) {
            // Convert point to segment
            this.peaks_.points.removeById(segment.id);
            this.peaks_.segments.add({
              id: segment.id,
              startTime: segment.startTime,
              endTime: segment.endTime,
              labelText: segment.labelText,
              color: segment.color,
              editable: segment.editable,
            });
          } else if (segment.endTime === undefined) {
            this.peaks_.points.getPoint(segment.id)?.update(segment);
          } else {
            this.peaks_.segments.getSegment(segment.id)?.update({
              time: segment.startTime,
              ...segment
            });
          }
        }
      },
    }

    this.registerEventHandlers();
  }

  /**
   * @param {typeof WaveForm['observedAttributes'][number]} name
   * @param {*} oldValue
   * @param {*} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'hidden': {
        if (!this.hidden) {
          this.tryInitPeaks();
        }
        break;
      }
    }
  }

  /**
   * @private
   */
  registerEventHandlers() {
    this.$waveOverview.addEventListener('wheel', this.handlers.onWheel);

    if ('ResizeObserver' in globalThis) {
      // TODO: Check that this is performant enough
      new ResizeObserver(this.handlers.onResize)
        .observe(this.$container)
    } else {
      window.addEventListener('resize', this.handlers.onResize);
    }
  }

  /**
   * @override
   * @inheritdoc
   * @param {DlfMediaPlayer} player
   */
  async attachToPlayer(player) {
    const src = this.getAttribute('src');
    const mimeType = this.getAttribute('type');
    if (!src || mimeType !== 'application/vnd.kitodo.audiowaveform') {
      return;
    }

    player.addActions({
      'sound_tools.waveform.toggle': action({
        execute: () => {
          this.hidden = !this.hidden;
        },
      }),
    });

    this.adaptPeaksMarkers();

    // TODO: ShakaFrontend check
    if (player.ui instanceof ShakaFrontend) {
      player.ui.alwaysPrependBottomControl(this);
    }

    player.media.addEventListener('loadedmetadata', (e) => {
      this.updateZoom(this.maxSamplesPerPixel);
    });
    this.load(src);
  }

  /**
   * @private
   * @param {string} url
   */
  async load(url) {
    this.nextUrl = url;

    const response = await fetch(url);
    const data = await response.arrayBuffer();

    // If loadWaveform is called again before the previous call has finished,
    // at least have a predictable outcome. (TODO: Consider aborting fetch)
    if (url === this.nextUrl) {
      this.waveformdata = WaveformData.create(data);
      this.updateZoom(this.maxSamplesPerPixel);
      this.tryInitPeaks();
    }
  }

  /**
   * @private
   */
  tryInitPeaks() {
    const waveformdata = this.waveformdata;
    if (this.peaks_ !== null || this.hidden || this.player?.media == null || waveformdata === null) {
      return;
    }

    /** @type {import('peaks.js').PeaksOptions} */
    const options = {
      logger: (...args) => {
        console.log(...args);
      },
      mediaElement: this.player.media,
      zoomview: {
        container: this.$waveOverview,
      },
      waveformData: {
        arraybuffer: waveformdata.toArrayBuffer(),
      },
      waveformCache: true,
    };

    Peaks.init(options, (err, peaks) => {
      if (!peaks) {
        console.log(err);
        return;
      }

      // The player may hide poster on manual seek
      // TODO: Find a more robust solution
      peaks.player.seek = (time) => {
        this.player?.seekTo(time);
      };

      this.peaks_ = peaks;

      this.zoomview = peaks.views.getView('zoomview');
      this.zoomview?.setZoom({
        seconds: waveformdata.duration,
      });
      this.zoomview?.setWheelMode('scroll');

      this.adaptPeaksMarkers();
    });
  }

  /**
   * @private
   */
  adaptPeaksMarkers() {
    if (this.peaks_ === null || this.player === null) {
      return;
    }

    // TODO: Also call "off", and handle new Peaks instance ("waveformHandlersRegistered")?

    this.peaksAddSegments(this.player.getMarkers().getSegments());

    for (const [event, handler] of Object.entries(this.peaksHandlers)) {
      // @ts-expect-error: `Object.entries()` is too coarse-grained
      this.peaks_.on(event, handler);
    }

    for (const [event, handler] of Object.entries(this.markersHandlers)) {
      this.player.getMarkers()
        // @ts-expect-error: `Object.entries()` is too coarse-grained
        .addEventListener(event, handler);
    }
  }

  /**
   * @private
   * @param {import('../../Markers').Segment[]} segments
   */
  peaksAddSegments(segments) {
    if (this.peaks_ !== null) {
      for (const segment of segments) {
        if (segment.endTime === undefined) {
          this.peaks_.points.add({
            id: segment.id,
            time: segment.startTime,
            labelText: segment.labelText,
            color: segment.color,
            editable: segment.editable,
          });
        } else {
          this.peaks_.segments.add({
            id: segment.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            labelText: segment.labelText,
            color: segment.color,
            editable: segment.editable,
          });
        }
      }
    }
  }

  /**
   * @private
   * @param {WheelEvent} e
   */
  onWheel(e) {
    const zoomInFactor = 1.5 ** (-e.deltaY / 100);
    this.updateZoom(this.samplesPerPixel / zoomInFactor);
  }

  /**
   * @private
   */
  onResize() {
    this.zoomview?.fitToContainer();
    this.updateZoom();
  }

  /**
   * @private
   * @param {number} samplesPerPixel
   */
  updateZoom(samplesPerPixel = this.samplesPerPixel) {
    if (this.waveformdata === null) {
      return;
    }

    const { sample_rate, seconds_per_pixel, duration } = this.waveformdata;

    this.minSamplesPerPixel = seconds_per_pixel * sample_rate;
    this.maxSamplesPerPixel = clamp(
      duration * sample_rate / this.$waveOverview.offsetWidth,
      [this.minSamplesPerPixel, Number.POSITIVE_INFINITY]
    );

    this.samplesPerPixel = clamp(
      samplesPerPixel,
      [this.minSamplesPerPixel, this.maxSamplesPerPixel]
    );

    if (this.zoomview !== null) {
      this.zoomview.setZoom({ scale: this.samplesPerPixel });
    }
  }
}

customElements.define('dlf-waveform', WaveForm);
