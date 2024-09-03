// @ts-check

import $ from 'jquery';

import { e } from 'lib/util';
import Component from 'SlubMediaPlayer/lib/Component';

/**
 * @typedef {{
 *  show: boolean;
 * }} BaseState
 */

/**
 * @template {object} ModalState
 * @extends {Component<BaseState & ModalState>}
 * @implements {Modal}
 */
export default class SimpleModal extends Component {
  /**
   *
   * @param {HTMLElement} parent
   * @param {ModalState & Partial<BaseState>} state
   */
  constructor(parent, state) {
    super({
      show: false,
      ...state,
    });

    /**
     * @private
     */
    this.parent = parent;

    /**
     * Whether a show/hide animation is currently running. This is to avoid
     * "backlogs" of animations when the user keeps pressing a key that toggles
     * modal visibility.
     *
     * @private
     */
    this.isAnimating = false;

    /**
     * @protected
     */
    this.$main = e('div', { className: "sxnd-modal" }, [
      this.$headline = e('div', { className: "headline-container" }, [
        this.$title = e('h3'),
        this.$close = e('span', {
          className: "modal-close material-icons-round",
          $click: this.close.bind(this),
        }, ["close"]),
      ]),
      this.$body = e('div', { className: "body-container" }),
    ]);

    this.parent.append(this.$main);

    /**
     * @private
     */
    this.jqMain = $(this.$main);

    this.resize();
  }

  resize() {
    // TODO: Find a CSS-only approach. It should
    //  - resize dynamically relative to the parent's height (not to viewport)
    //  - allow to scroll on body when overflowing
    //  - allow transparent background of modal
    //  - allow to center the modal vertically
    this.$body.style.maxHeight = `calc(${this.parent.clientHeight}px - 11rem)`;
  }

  /**
   * Whether or not the modal is currently open.
   *
   * @returns {boolean}
   */
  get isOpen() {
    return this.state.show;
  }

  /**
   * Opens or closes the modal depending on {@link value}.
   *
   * @param {boolean} value
   */
  open(value = true) {
    if (this.isAnimating) {
      return;
    }

    // @ts-expect-error TODO: Why wouldn't this work?
    this.setState({
      show: value,
    });
  }

  /**
   * Closes the modal.
   */
  close() {
    this.open(false);
  }

  /**
   * Toggles whether the modal is opened.
   */
  toggle() {
    this.open(!this.state.show);
  }

  /**
   * @override
   * @param {BaseState & ModalState} state
   */
  render(state) {
    const { show } = state;

    if (show !== this.state.show) {
      this.isAnimating = true;
      const fn = show ? 'show' : 'hide';
      this.jqMain[fn]({
        duration: 'fast',
        complete: () => {
          this.isAnimating = false;
        },
      });
    }
  }
}
