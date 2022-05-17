// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

import { e } from '../../lib/util';
import VariantGroups from '../VariantGroups';

/**
 * Control panel element to show current playback time.
 *
 * Listens to the following custom events:
 * - {@link dlf.media.MediaPropertiesEvent}
 */
export default class VideoTrackSelection extends shaka.ui.SettingsMenu {
  /**
   *
   * @param {Translator & Identifier} env
   */
  static register(env) {
    const key = env.mkid();

    shaka.ui.OverflowMenu.registerElement(key, {
      create(rootElement, controls) {
        return new VideoTrackSelection(rootElement, controls, env);
      },
    });

    return key;
  }

  /**
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   * @param {Translator} env
   */
  constructor(parent, controls, env) {
    super(parent, controls, 'switch_video');

    /** @private Avoid naming conflicts with parent class */
    this.dlf = {
      env,
      activeCheck: e("i", {
        className: "material-icons-round shaka-chosen-item",
      }, ["done"]),
      /** @type {VariantGroups | null} */
      variantGroups: null,
    };

    this.updateStrings();
    this.updateVisibility();

    /** @type {Record<string, HTMLElement>} */
    this.menuButtons = {};

    if (this.eventManager) {
      this.eventManager.listen(this.controls, 'dlf-media-properties', (ev) => {
        const detail = /** @type {dlf.media.MediaPropertiesEvent} */(ev).detail;
        const { variantGroups } = detail.updateProps;
        if (variantGroups !== undefined) {
          try {
            this.setVariantGroups(variantGroups);
          } catch (err) {
            // TODO: Shaka seems to handle exceptions occurring in listeners
            console.error(err);
          }
        }
      });

      this.eventManager.listen(this.player, 'variantchanged', () => {
        this.markActiveGroup();
      });
    }
  }

  /**
   * @private
   *
   * @param {VariantGroups | null} variantGroups
   */
  setVariantGroups(variantGroups) {
    this.dlf.variantGroups = variantGroups;

    this.clearMenu();
    this.updateVisibility();

    if (variantGroups === null) {
      return;
    }

    for (const group of variantGroups) {
      const button = e("button", {
        $click: () => {
          this.dlf.variantGroups?.selectGroupByKey(group.key);
        },
      }, [
        e("span", {}, [group.key]),
      ]);

      this.menu.appendChild(button);

      this.menuButtons[group.key] = button;
    }

    this.markActiveGroup();
  }

  /**
   * @private
   */
  clearMenu() {
    for (const button of Object.values(this.menuButtons)) {
      button.remove();
    }
    this.menuButtons = {};
  }

  /**
   * Updates UI to show which group is active
   *
   * @private
   */
  markActiveGroup() {
    const activeGroup = this.dlf.variantGroups?.findActiveGroup();
    if (activeGroup) {
      this.menuButtons[activeGroup.key]?.appendChild(this.dlf.activeCheck);
      this.currentSelection.textContent = activeGroup.key;
    }
  }

  /**
   * Checks if the menu item should be shown and updates the UI accordingly.
   *
   * @private
   */
  updateVisibility() {
    if ((this.dlf.variantGroups?.numGroups ?? 0) > 0) {
      this.button.classList.remove('shaka-hidden');
    } else {
      this.button.classList.add('shaka-hidden');
    }
  }

  /**
   * @private
   */
  updateStrings() {
    const back = this.dlf.env.t('control.back');
    const label = this.dlf.env.t('control.video-track.title');

    this.backButton.ariaLabel = back;
    this.button.ariaLabel = label;
    this.nameSpan.textContent = label;
    this.backSpan.textContent = label;
  }
}
