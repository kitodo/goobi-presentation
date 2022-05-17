// @ts-check

import { domJoin, e, setElementClass } from '../../lib/util';
import SimpleModal from '../lib/SimpleModal';
import { getKeybindingText } from '../lib/trans';

/**
 * @typedef {string} KeybindingKind See `Keybinding::kind`.
 * @typedef {string} KeybindingAction See `Keybinding::action`.
 * @typedef {Keybinding<string, KeybindingAction>} ShownKeybinding
 * @typedef {Record<KeybindingKind, Record<KeybindingAction, ShownKeybinding[]>>} KeybindingGroups
 *
 * @typedef {{
 *  thead: HTMLTableSectionElement;
 *  tbody: HTMLTableSectionElement;
 *  rows: {
 *    action: KeybindingAction;
 *    tr: HTMLTableRowElement;
 *  }[];
 * }} TableSection
 */

/**
 * Groups list of keybindings by overall group (used to split by tables)
 * and action.
 *
 * @param {ShownKeybinding[]} keybindings
 * @returns {KeybindingGroups}
 */
function groupKeybindings(keybindings) {
  // Prepopulate to determine an order
  /** @type {KeybindingGroups} */
  const result = {
    'navigate': {},
    'player': {},
    'other': {},
  };

  const keybindingsSorted = keybindings.slice();
  keybindingsSorted.sort((a, b) => a.order - b.order);

  for (const kb of keybindingsSorted) {
    let kind = result[kb.kind];
    if (!kind) {
      kind = result[kb.kind] = {};
    }

    let action = kind[kb.action];
    if (!action) {
      action = kind[kb.action] = [];
    }

    action.push(kb);
  }

  return result;
}

/**
 * @extends {SimpleModal<{}>}
 */
export default class HelpModal extends SimpleModal {
  /**
   *
   * @param {HTMLElement} parent
   * @param {Translator} env
   * @param {object} config
   * @param {Record<string, string | number>} config.constants
   * @param {ShownKeybinding[]} config.keybindings
   * @param {(actionKey: KeybindingAction) => boolean} config.actionIsAvailable
   */
  constructor(parent, env, config) {
    super(parent, {});

    /** @private */
    this.env = env;
    /** @private */
    this.config = config;

    /** @private @type {TableSection[]} */
    this.tableSections = [];

    this.createBodyDom();
    this.updateRowVisibility();
  }

  /**
   *
   * @override
   * @param {boolean} value
   */
  open(value = true) {
    if (value) {
      this.updateRowVisibility();
    }

    super.open(value);
  }

  createBodyDom() {
    const env = this.env;

    this.$main.classList.add('help-modal');
    this.$title.innerText = env.t('modal.help.title');

    const $table = e("table", { className: "keybindings-table" });

    const allKbGrouped = groupKeybindings(this.config.keybindings);
    for (const [kind, kbGrouped] of Object.entries(allKbGrouped)) {
      const keybindings = [...Object.entries(kbGrouped)];
      if (keybindings.length === 0) {
        continue;
      }

      /** @type {TableSection} */
      const section = {
        thead: e("thead", {}, [
          e("th", { className: "kb-group", colSpan: 2 }, [
            env.t(`action.kind.${kind}`)
          ]),
        ]),
        tbody: e("tbody", {}),
        rows: [],
      };

      for (const [action, kbs] of keybindings) {
        const tr = e("tr", {}, [
          e("td", { className: "key" }, this.listKeybindings(kbs)),
          e("td", { className: "action" }, [this.describeAction(action)]),
        ]);

        section.rows.push({ action, tr });
        section.tbody.append(tr);
      }

      $table.append(section.thead, section.tbody);
      this.tableSections.push(section);
    }

    this.$body.append($table);
  }

  /**
   * Generates and concatenates texts of multiple keybindings.
   *
   * @param {ShownKeybinding[]} kbs
   */
  listKeybindings(kbs) {
    return domJoin(kbs.map(kb => getKeybindingText(this.env, kb)), e("br"));
  }

  /**
   * Returns a translated string describing {@link action}.
   *
   * @param {KeybindingAction} action
   * @returns {string}
   */
  describeAction(action) {
    return this.env.t(`action.${action}`, this.config.constants);
  }

  updateRowVisibility() {
    for (const section of this.tableSections) {
      let someIsAvailable = false;

      for (const row of section.rows) {
        const isAvailable = this.config.actionIsAvailable(row.action);

        row.tr.setAttribute('aria-disabled', isAvailable ? 'false' : 'true');
        const text = isAvailable ? "" : this.env.t('action.unavailable');
        row.tr.setAttribute('title', text);
        row.tr.setAttribute('aria-label', text);

        someIsAvailable ||= isAvailable;
      }

      setElementClass(section.thead, 'action-unavailable', !someIsAvailable);
      setElementClass(section.tbody, 'action-unavailable', !someIsAvailable);
    }
  }
}
