// @ts-check

import { blobToImage } from '../lib/util';

/**
 * @enum {number}
 */
const LoadState = /** @type {const} */ ({
  /** The task is prepared, but execution has not started. */
  Pending: 0,
  /** The image is being fetched from the remote URL. */
  Fetching: 1,
  /** The image has been fetched. Decoding not yet started. */
  Fetched: 2,
  /** The image has been loaded, but not yet decoded. */
  Decoding: 3,
  /** The image has been loaded and decoded. */
  Available: 4,
});

/**
 * @typedef {{
 *  type: typeof LoadState.Pending;
 *  url: string;
 * }} StatePending
 *
 * @typedef {{
 *  type: typeof LoadState.Fetching;
 *  abortController: AbortController;
 *  responsePromise: Promise<Response>;
 * }} StateFetching
 *
 * @typedef {{
 *  type: typeof LoadState.Fetched;
 *  imageBlob: Blob;
 * }} StateFetched
 *
 * @typedef {{
 *  type: typeof LoadState.Decoding;
 *  imagePromise: Promise<HTMLImageElement>;
 * }} StateDecoding
 *
 * @typedef {{
 *  type: typeof LoadState.Available;
 *  image: HTMLImageElement;
 * }} StateCompleted
 *
 * @typedef {StatePending | StateFetching | StateFetched | StateDecoding | StateCompleted} State
 *
 * @typedef {{
 *  state: State;
 *  promise: Promise<HTMLImageElement> | null;
 *  stopNext: boolean;
 * }} Task
 */

/**
 * Fetch images to a cache.
 *
 * @implements {dlf.Network<HTMLImageElement>}
 */
export default class ImageFetcher {
  constructor() {
    /**
     * Map from URL to task.
     *
     * @private
     * @type {Record<string, Task>}
     */
    this.tasks = {};
  }

  /**
   * Gets an image from {@link url}. If the image is currently being loaded, or
   * has already been loaded, this returns a cached promise. (So this method is
   * idempotent.)
   *
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  get(url) {
    const task =
      this.tasks[url] ??= this.createTask(url);

    return this.resumeTask(task);
  }

  /**
   * Gets the image from {@link url} if it is already loaded and cached.
   *
   * @param {string} url
   * @returns {HTMLImageElement | null}
   */
  getCached(url) {
    const state = this.tasks[url]?.state;
    return state?.type === LoadState.Available
      ? state.image
      : null;
  }

  /**
   * Aborts pending request that have been initiated by calling {@link get}.
   */
  abortPending() {
    for (const [url, task] of Object.entries(this.tasks)) {
      // TODO: actually abort network request?
      this.stopTask(task);
    }
  }

  /**
   * @protected
   * @param {string} url
   * @returns {Task}
   */
  createTask(url) {
    return {
      state: {
        type: LoadState.Pending,
        url,
      },
      promise: null,
      stopNext: false, // Value shouldn't matter because promise === null
    };
  }

  /**
   * @protected
   * @param {Task} task
   */
  stopTask(task) {
    task.stopNext = true;
  }

  /**
   * @protected
   * @param {Task} task
   * @returns {Promise<HTMLImageElement>}
   */
  resumeTask(task) {
    // If we're still in the `for(;;)` loop, this just tells them to
    // continue. It's not a race condition (I think) because of JavaScript's
    // single-threaded nature.
    task.stopNext = false;

    if (task.promise === null) {
      task.promise = new Promise(async (resolve, reject) => {
        try {
          // progressTask makes sure that this loop doesn't run indefinitely
          for (; ;) {
            if (task.state.type === LoadState.Available) {
              resolve(task.state.image);
              break;
            }

            if (task.stopNext) {
              task.promise = null;
              break;
            }

            await this.progressTask(task);
          }
        } catch (e) {
          reject(e);
        }
      });
    }

    return task.promise;
  }

  /**
   * This should be the only method that re-sets `task.state`.
   *
   * @protected
   * @param {Task} task
   */
  async progressTask(task) {
    switch (task.state.type) {
      case LoadState.Pending: {
        const abortController = new AbortController();
        const url = task.state.url;
        const responsePromise = fetch(url, { signal: abortController.signal });
        task.state = {
          type: LoadState.Fetching,
          abortController,
          responsePromise,
        }
        break;
      }

      case LoadState.Fetching: {
        const response = await task.state.responsePromise;
        if (response.ok) {
          task.state = {
            type: LoadState.Fetched,
            imageBlob: await response.blob(),
          };
        } else {
          throw response;
        }
        break;
      }

      case LoadState.Fetched: {
        task.state = {
          type: LoadState.Decoding,
          imagePromise: blobToImage(task.state.imageBlob),
        };
        break;
      }

      case LoadState.Decoding: {
        const image = await task.state.imagePromise;
        task.state = {
          type: LoadState.Available,
          image,
        };
        break;
      }

      case LoadState.Available:
        break;
    }
  }
}
