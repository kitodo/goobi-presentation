// @ts-check

import Environment from 'lib/Environment';
import DlfMediaPlayer from 'DlfMediaPlayer/DlfMediaPlayer';

/**
 * A player plugin is a custom HTML element that attaches to a player instance.
 * For more information, see the extension documentation.
 */
export default class DlfMediaPlugin extends HTMLElement {
  constructor() {
    super();

    /** @protected @type {Translator & Identifier & Browser} */
    this.env = new Environment();

    /** @protected @type {DlfMediaPlayer | null} */
    this.player = null;

    /** @protected */
    this.hasAttached = false;
  }

  get forPlayer() {
    return this.getAttribute('forPlayer');
  }

  set forPlayer(value) {
    if (value === null) {
      this.removeAttribute('forPlayer');
    } else {
      this.setAttribute('forPlayer', value);
    }
  }

  connectedCallback() {
    if (!this.isConnected) {
      return;
    }

    if (!this.hasAttached) {
      // Wait for DOM being parsed
      setTimeout(() => {
        const forPlayer = this.forPlayer;
        if (forPlayer === null) {
          return;
        }

        const player = document.getElementById(forPlayer);
        if (!(player instanceof DlfMediaPlayer)) {
          return;
        }

        this.env = player.getEnv();
        this.player = player;
        this.attachToPlayer(player);
      });

      // Protect against unbounded loop ("alwaysPrependBottomControl" in WaveForm)
      // TODO: Find a better solution
      this.hasAttached = true;
    }
  }

  /**
   * Attach the plugin to a player object. This is called once after
   * `connectedCallback()` has been run.
   *
   * Intended to be overridden in child class.
   *
   * @param {DlfMediaPlayer} player
   * @protected
   * @abstract
   */
  attachToPlayer(player) {
    //
  }
}
