// @ts-check

import EventEmitter from 'events';

/**
 * @template T
 * @typedef ModalFuncs
 * @property {(modal: ValueOf<T>) => void} toggleExclusive Try to toggle the
 * modal while not inducing a state of two open modals.
 * @property {(coverContainer: Element | null) => void} setFullscreen
 * @property {() => boolean} hasOpen
 * @property {() => void} closeNext
 * @property {() => void} closeAll
 * @property {() => Promise<void>} update
 * @property {() => void} resize
 */

/**
 * @template T
 * @typedef {T & ModalFuncs<T> & EventEmitter} ModalsType
 */

/**
 * Mixin to add modal-related utility functions to set of modals.
 *
 * @template {Record<string, Modal>} T
 * @param {T} modals
 * @returns {ModalsType<T>}
 */
export default function Modals(modals) {
  const modalsArray = Object.values(modals);

  // Set DOM element that is used to cover the background of the modals. It is
  // used to make sure that when a modal is open, the background won't respond
  // to mouse actions. It also makes it simpler to detect clicking outside of
  // an open modal.
  const modalCover = document.createElement('div');
  modalCover.className = "sxnd-modal-cover";
  modalCover.addEventListener('click', () => {
    result.closeAll();
  });
  document.body.append(modalCover);

  /** @type {ModalFuncs<T>} */
  const resultFuncs = {
    toggleExclusive: (modal) => {
      if (modal.isOpen) {
        modal.close();
      } else if (!result.hasOpen()) {
        modal.open();
      }
    },
    setFullscreen: (coverContainer) => {
      (coverContainer ?? document.body).append(modalCover);
    },
    hasOpen: () => {
      return modalsArray.some(modal => modal.isOpen);
    },
    closeNext: () => {
      for (const modal of modalsArray) {
        // TODO: Close topmost? Close most recently opened?
        if (modal.isOpen) {
          modal.close();
          break;
        }
      }
    },
    closeAll: () => {
      for (const modal of modalsArray) {
        modal.close();
      }
    },
    update: async () => {
      await Promise.all(
        modalsArray.map(modal => modal.update())
      );
    },
    resize: () => {
      for (const modal of modalsArray) {
        modal.resize();
      }
    },
  };

  /** @type {ModalsType<T>} */
  const result = Object.assign(new EventEmitter(), modals, resultFuncs);

  // TODO: Performance
  window.addEventListener('resize', () => {
    result.resize();
  });

  document.addEventListener('fullscreenchange', () => {
    result.setFullscreen(document.fullscreenElement);
  });

  for (const modal of modalsArray) {
    modal.on('updated', () => {
      if (!modal.isOpen) {
        result.emit('closed', modal);
      }

      if (result.hasOpen()) {
        modalCover.classList.add('shown');
      } else {
        modalCover.classList.remove('shown');
      }
    });
  }

  return result;
}
