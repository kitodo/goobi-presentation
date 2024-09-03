// @ts-check

import { EventTarget } from 'DlfMediaPlayer/3rd-party/EventTarget';

/**
 * @typedef {{
 *  id: string;
 *  startTime: number;
 *  endTime?: number;
 *  labelText: string;
 *  color?: string;
 *  editable: boolean;
 *  toTimeRange: () => dlf.media.TimeRange;
 * }} Segment
 *
 * @typedef {Omit<Segment, 'id' | 'labelText' | 'editable'  | 'toTimeRange'> & Partial<Pick<Segment, 'id' | 'labelText' | 'editable'>>} SegmentAddOptions
 *
 * @typedef {{
 *  add: {
 *    segments: Segment[];
 *  };
 *  remove: {
 *    segments: Segment[];
 *  };
 *  remove_all: {};
 *  update: {
 *    segment: Segment;
 *    prevSegment: Segment;
 *  };
 *  activate_segment: {
 *    segment: Segment | null;
 *  };
 * }} Events
 *
 * @typedef {{
 *  [K in keyof Events]: import('./3rd-party/EventTarget').EventHandler<Events[K]>;
 * }} Handlers
 */

/**
 * Observable list of markers/segments.
 *
 * Additionally, one marker/segment at a time can be *active*. This is intended
 * to allow editing or removing segments via keybindings.
 * - {@link activeSegment} is the segment that is currently active.
 * - To activate a segment, call {@link activateSegmentById} or use the
 *   'activate' parameter in {@link update}.
 * - The `activate_segment` event is fired whenever activation changes.
 *
 * @extends {EventTarget<Events>}
 */
export default class Markers extends EventTarget {
  constructor() {
    super();

    /** @private */
    this.cnt_ = 0;

    /** @private @type {Segment | null} */
    this.activeSegment_ = null;

    /** @private @type {Record<string, Segment>} */
    this.segments_ = {};
  }

  /**
   * @returns {Readonly<Segment> | null}
   */
  get activeSegment() {
    return this.activeSegment_;
  }

  /**
   *
   * @param {SegmentAddOptions} segment
   * @returns {Readonly<Segment>} The newly created segment.
   */
  add(segment) {
    const id = segment.id ?? this.makeId();
    const newSegment = this.segments_[id] = {
      labelText: '',
      editable: true,
      ...segment,
      id,
      toTimeRange() {
        return {
          startTime: this.startTime,
          endTime: this.endTime ?? null,
        };
      }
    };
    this.dispatchEvent(new CustomEvent('add', {
      detail: {
        segments: [newSegment],
      },
    }));
    this.activateSegmentById(newSegment.id);
    return newSegment;
  }

  /**
   * Update any non-`undefined` properties in {@link segment}.
   *
   * @param {Partial<Omit<Segment, 'id'>> & Pick<Segment, 'id'>} segment
   * @param {boolean} activate Whether or not the update activates the segment.
   */
  update(segment, activate = false) {
    const s = this.segments_[segment.id];
    const prevSegment = Object.assign({}, s);
    if (s !== undefined) {
      for (const [key, value] of Object.entries(segment)) {
        if (value !== undefined) {
          // @ts-expect-error: `Object.entries()` is too coarse-grained
          s[key] = value;
        }
      }
      this.dispatchEvent(new CustomEvent('update', {
        detail: {
          segment: s,
          prevSegment,
        },
      }));
      if (activate) {
        this.activateSegment(s);
      }
    }
  }

  /**
   *
   * @param {string} id
   */
  removeById(id) {
    const oldSegment = this.segments_[id];
    delete this.segments_[id];
    if (oldSegment !== undefined) {
      this.dispatchEvent(new CustomEvent('remove', {
        detail: {
          segments: [oldSegment],
        },
      }));
    }
    if (this.activeSegment_ !== null && id === this.activeSegment_.id) {
      this.activateSegment(null);
    }
  }

  removeAll() {
    this.segments_ = {};
    this.dispatchEvent(new CustomEvent('remove_all', {
      detail: {},
    }));
    this.activateSegment(null);
  }

  /**
   *
   * @param {string} id
   */
  activateSegmentById(id) {
    const segment = this.segments_[id];
    if (segment === undefined) {
      return;
    }

    this.activateSegment(segment);
  }

  /**
   *
   * @protected
   * @param {Segment | null} segment
   */
  activateSegment(segment) {
    if (segment !== this.activeSegment_) {
      this.activeSegment_ = segment;
      this.dispatchEvent(new CustomEvent('activate_segment', {
        detail: {
          segment: this.activeSegment_,
        },
      }));
    }
  }

  /**
   *
   * @param {string} id
   * @returns {Readonly<Segment> | undefined}
   */
  getSegment(id) {
    return this.segments_[id];
  }

  /**
   *
   * @returns {Readonly<Segment>[]}
   */
  getSegments() {
    return Object.values(this.segments_);
  }

  /**
   *
   * @private
   * @returns {string}
   */
  makeId() {
    return `dlf.segments.${this.cnt_++}`;
  }
}
