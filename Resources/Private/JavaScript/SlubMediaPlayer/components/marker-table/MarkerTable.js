// @ts-check

import {
  arrayToCsv,
  cmp,
  download,
  e,
  fillPlaceholders,
  setElementClass,
  textToHtml,
} from '../../../lib/util';
import {
  buildTimeString,
  DlfMediaPlayer,
  DlfMediaPlugin,
} from '../../../DlfMediaPlayer';
import { getKeybindingText } from '../../lib/trans';
import SlubMediaPlayer from '../../SlubMediaPlayer';

/**
 * @typedef {{
 *  segment: import('../../../DlfMediaPlayer/Markers').Segment;
 *  $tr: HTMLTableRowElement;
 *  $id: HTMLTableCellElement;
 *  $labelEditBox: HTMLInputElement;
 *  $startTime: HTMLTableCellElement;
 *  $endTime: HTMLTableCellElement;
 * }} Row
 */

/**
 * @template {HTMLElement} [T = HTMLElement]
 * @typedef {T & {
 *  rowId?: string;
 * }} WithRow
 */

/**
 * Custom element to display, edit and download the markers in an attached
 * {@link DlfMediaPlayer}.
 */
export default class MarkerTable extends DlfMediaPlugin {
  constructor() {
    super();

    /** @private @type {Record<string, Row>} */
    this.rows = {};

    /** @private */
    this.rowCount = 0;

    /** @type {HTMLElement | null} */
    this.$container = null;

    /** @private @type {Partial<import('../../../DlfMediaPlayer/Markers').Handlers>} */
    this.markersHandlers = {
      'remove': (event) => {
        for (const segment of event.detail.segments) {
          this.removeRowById(segment.id);
        }
      },
      'remove_all': () => {
        this.clearTable();
      },
      'add': (event) => {
        this.syncSegments(event.detail.segments);
      },
      'update': (event) => {
        const { segment } = event.detail;
        this.syncSegment(segment);
      },
      'activate_segment': (event) => {
        const { segment } = event.detail;
        for (const row of Object.values(this.rows)) {
          setElementClass(row.$tr, 'active-segment',
            segment !== null && row.segment.id === segment.id);
        }
      },
    };

    /** @private */
    this.handlers = {
      onLabelEditKeydown: this.rowEvent(this.onLabelEditKeydown.bind(this)),
      onLabelEditInput: this.rowEvent(this.onLabelEditInput.bind(this)),
      onDeleteRow: this.rowEvent(this.onDeleteRow.bind(this)),
      onSeekToStartTime: this.rowEvent(this.onSeekToStartTime.bind(this)),
      onSeekToEndTime: this.rowEvent(this.onSeekToEndTime.bind(this)),
      onClear: this.onClear.bind(this),
      onDownloadCsv: this.onDownloadCsv.bind(this),
    };
  }

  /**
   * @override
   * @param {DlfMediaPlayer} player
   */
  attachToPlayer(player) {
    this.$container = e('div', {
      className: "dlf-media-markers is-empty",
    }, [
      e('h2', {}, [this.env.t('control.sound_tools.marker_table.title')]),
      e('div', {
        className: "dlf-media-markers-empty-msg",
        innerHTML: this.getEmptyTableHTML(),
      }),
      e('div', { className: "dlf-media-markers-list" }, [
        this.$exportCsvButton = e('a', {
          href: '#',
          $click: this.handlers.onDownloadCsv,
        }, [this.env.t('control.sound_tools.marker_table.download_csv')]),
        ", ",
        this.$exportCsvButton = e('a', {
          href: '#',
          $click: this.handlers.onClear,
        }, [this.env.t('control.sound_tools.marker_table.clear')]),
        e('table', {}, [
          e('thead', {}, [
            e('tr', {}, [
              e('th', {}, [this.env.t('control.sound_tools.marker_table.entry.name')]),
              e('th', {}, [this.env.t('control.sound_tools.marker_table.entry.startTime')]),
              e('th', {}, [this.env.t('control.sound_tools.marker_table.entry.endTime')]),
              e('th', {}, [""]),
            ]),
          ]),
          this.$body = e('tbody', {}, [
            //
          ]),
        ]),
      ]),
    ]);

    for (const [event, handler] of Object.entries(this.markersHandlers)) {
      // @ts-expect-error: `Object.entries()` is too coarse-grained
      player.getMarkers().addEventListener(event, handler);
    }

    this.syncSegments(player.getMarkers().getSegments());
    this.append(this.$container);
  }

  /**
   * @private
   * @param {Row} row
   * @param {KeyboardEvent} event
   */
  onLabelEditKeydown(row, event) {
    // TODO: Use global keybindings table?
    if (event.key === 'Enter') {
      row.$labelEditBox.blur();
    }
  }

  /**
   * @private
   * @param {Row} row
   * @param {Event} event
   */
  onLabelEditInput(row, event) {
    if (this.player === null) {
      return;
    }

    this.player.getMarkers().update({
      id: row.segment.id,
      labelText: row.$labelEditBox.value,
    });
  }

  /**
   * @private
   * @param {Row} row
   */
  onDeleteRow(row) {
    if (this.player === null) {
      return;
    }

    this.player.getMarkers().removeById(row.segment.id);
  }

  /**
   * @private
   * @param {Row} row
   */
  onSeekToStartTime(row) {
    if (this.player === null) {
      return;
    }

    this.player.seekTo(row.segment.startTime);
    this.player.getMarkers().activateSegmentById(row.segment.id);
  }

  /**
   * @private
   * @param {Row} row
   */
  onSeekToEndTime(row) {
    if (this.player === null) {
      return;
    }

    this.player.seekTo(row.segment.endTime ?? row.segment.startTime);
    this.player.getMarkers().activateSegmentById(row.segment.id);
  }

  /**
   * @private
   * @param {MouseEvent} event
   */
  onClear(event) {
    event.preventDefault();

    if (this.player === null) {
      return;
    }

    // TODO: No raw alert/confirm?
    if (confirm(this.env.t('control.sound_tools.marker_table.clear.confirm'))) {
      this.player.getMarkers().removeAll();
    }
  }

  /**
   * @private
   * @param {MouseEvent} event
   */
  onDownloadCsv(event) {
    event.preventDefault();
    const csvText = arrayToCsv([
      ["ID", "Label", "Start [s]", "End [s]"],
      ...Object.values(this.rows).map(row => [
        row.segment.id,
        row.segment.labelText,
        row.segment.startTime.toString(),
        row.segment.endTime?.toString() ?? '',
      ])
    ]);
    const csv = new Blob([csvText], { type: 'text/csv' });
    download(csv, "markers.csv");
  }

  /**
   * Transform an event handler using a {@link Row} into an event handler that
   * can be attached to a {@link WithRow} DOM object.
   *
   * @private
   * @template {Event} EventT
   * @param {(row: Row, event: EventT) => void} handler
   * @returns {(e: EventT) => void}
   */
  rowEvent(handler) {
    return (e) => {
      const el = /** @type {WithRow} */(e.currentTarget);
      if (el.rowId === undefined) {
        return;
      }

      const row = this.rows[el.rowId];
      if (row === undefined) {
        return;
      }

      handler(row, e);
    };
  }

  /**
   * Update rows for the given {@link segments}, and create rows as necessary.
   *
   * @private
   * @param {import('../../../DlfMediaPlayer/Markers').Segment[]} segments
   */
  syncSegments(segments) {
    for (const segment of segments) {
      this.syncSegment(segment);
    }
  }

  /**
   * Update row for the given {@link segment}. If no such row exists yet,
   * create one.
   *
   * @private
   * @param {import('../../../DlfMediaPlayer/Markers').Segment} segment
   */
  syncSegment(segment) {
    let isNew = false;
    let row = this.rows[segment.id];
    if (row === undefined) {
      row = this.rows[segment.id] = this.createRow(segment);
      isNew = true;
      this.rowCount++;
    }

    const oldSegment = Object.assign({}, row.segment);
    Object.assign(row.segment, segment);

    // The check also makes sure the input field isn't blurred by unnecessary re-insertion
    if (isNew || this.cmpSegment(segment, oldSegment) !== 0) {
      this.insertRow(row);
    }

    row.$labelEditBox.value = segment.labelText;
    row.$labelEditBox.readOnly = !segment.editable;

    row.$startTime.textContent = buildTimeString(segment.startTime, true);
    row.$endTime.textContent = segment.endTime === undefined
      ? ''
      : buildTimeString(segment.endTime, true);

    this.update();
  }

  /**
   * Create table row object (without yet inserting).
   *
   * @private
   * @param {import('../../../DlfMediaPlayer/Markers').Segment} segment
   * @returns {Row}
   */
  createRow(segment) {
    let $tr, $id, $startTime, $endTime;

    /** @type {WithRow<HTMLButtonElement>} */
    const $deleteBtn = e('button', {
      title: this.env.t('control.sound_tools.marker_table.entry.delete'),
      $click: this.handlers.onDeleteRow,
    }, [
      e('span', {
        className: 'material-icons-round inline-icon',
      }, ['delete']),
    ]);
    $deleteBtn.rowId = segment.id;

    /** @type {WithRow<HTMLInputElement>} */
    const $labelEditBox = e('input', {
      placeholder: segment.id,
      value: segment.labelText,
      readOnly: !segment.editable,
      $keydown: this.handlers.onLabelEditKeydown,
      $input: this.handlers.onLabelEditInput,
    });
    $labelEditBox.rowId = segment.id;

    /** @type {WithRow<HTMLTableCellElement>[]} */
    const cells = [
      $id = e('td', {
        className: "marker-id-col",
      }, [$labelEditBox]),
      $startTime = e('td', {
        className: "marker-start-col",
        title: this.env.t('control.sound_tools.marker_table.jump_to_start'),
        $click: this.handlers.onSeekToStartTime,
      }),
      $endTime = e('td', {
        className: "marker-end-col",
        title: this.env.t('control.sound_tools.marker_table.jump_to_end'),
        $click: this.handlers.onSeekToEndTime,
      }),
      e('td', { className: "marker-buttons-col" }, [
        $deleteBtn,
      ]),
    ];

    for (const cell of cells) {
      cell.rowId = segment.id;
    }

    $tr = e('tr', {}, cells);

    return {
      segment: Object.assign({}, segment), // TODO?
      $tr, $id, $labelEditBox, $startTime, $endTime
    };
  }

  /**
   * Insert or rearrange row into table.
   *
   * @private
   * @param {Row} row
   */
  insertRow(row) {
    if (this.$body === undefined) {
      return;
    }

    // TODO: The linear time complexity (instead of logarithmic) here is a bit ugly.
    //       Perhaps find a better way, perhaps generalizing TimecodeIndex.
    let hasInserted = false;
    for (const exRow of Object.values(this.rows)) {
      if (row !== exRow && this.cmpSegment(row.segment, exRow.segment) < 0) {
        this.$body.insertBefore(row.$tr, exRow.$tr);
        hasInserted = true;
        break;
      }
    }
    if (!hasInserted) {
      this.$body.append(row.$tr);
    }
  }

  /**
   * @private
   * @param {string | undefined} id
   */
  removeRowById(id) {
    if (id === undefined) {
      return;
    }

    const row = this.rows[id];
    if (row !== undefined) {
      this.removeRow(row);
    }
  }

  /**
   * @private
   */
  clearTable() {
    if (this.$body !== undefined) {
      this.$body.innerHTML = '';
    }

    this.rows = {};
    this.rowCount = 0;

    this.update();
  }

  /**
   * @private
   * @param {Row} row
   */
  removeRow(row) {
    row.$tr.remove();
    delete this.rows[row.segment.id];
    this.rowCount--;
    this.update();
  }

  /**
   * Get HTML code shown when the table is empty.
   *
   * @private
   */
  getEmptyTableHTML() {
    // TODO: Handle case when there is no keybinding. (Hide marker table completely?)
    if (!(this.player instanceof SlubMediaPlayer)) {
      return '';
    }

    const keybindings = this.player.getKeybindings();

    const keybindingAdd = keybindings.find(
      kb => kb.action === 'sound_tools.segments.add'
    );

    const keybindingClose = keybindings.find(
      kb => kb.action === 'sound_tools.segments.close'
    );

    const isEmptyTemplate = this.env.t('control.sound_tools.marker_table.empty', {
      keybindingAdd: "{keybindingAdd}",
      keybindingClose: "{keybindingClose}",
    });

    return fillPlaceholders(textToHtml(isEmptyTemplate), {
      keybindingAdd: keybindingAdd ? getKeybindingText(this.env, keybindingAdd).innerHTML : '',
      keybindingClose: keybindingClose ? getKeybindingText(this.env, keybindingClose).innerHTML : '',
    });
  }

  /**
   * @private
   */
  update() {
    if (this.$container === null) {
      return;
    }

    setElementClass(this.$container, 'is-empty', this.rowCount === 0);
  }

  /**
   * Compare segments for sorting in UI.
   *
   * @private
   * @param {import('../../../DlfMediaPlayer/Markers').Segment} lhs
   * @param {import('../../../DlfMediaPlayer/Markers').Segment} rhs
   * @returns {number}
   */
  cmpSegment(lhs, rhs) {
    return (
      cmp(lhs.startTime, rhs.startTime)
      || cmp(lhs.endTime ?? lhs.startTime, rhs.endTime ?? rhs.startTime)
    );
  }
}

customElements.define('dlf-marker-table', MarkerTable);
