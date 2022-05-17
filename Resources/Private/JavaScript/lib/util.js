// @ts-check

/**
 * Clamps {@link value} into the closed interval [{@link min}, {@link max}].
 *
 * @param {number} value
 * @param {[number, number]} range
 * @returns {number}
 */
export function clamp(value, [min, max]) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

/**
 *
 * @private
 * @param {string} template
 * @param {Record<string, string | undefined>} values
 * @returns {string}
 */
export function fillPlaceholders(template, values) {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      result = result.split(`{${key}}`).join(value);
    }
  }

  return result;
}

/**
 * Zero-pad {@link value} to at least {@link length} digits.
 *
 * @param {number} value
 * @param {number} length
 * @returns {string}
 */
export function zeroPad(value, length) {
  return value.toString().padStart(length, '0');
}

/**
 * Extracts the mime type from a data URL.
 *
 * @param {string} dataUrl
 * @returns {string | undefined}
 */
export function dataUrlMime(dataUrl) {
  return dataUrl.match(/data:(.*);/)?.[1];
}

/**
 * Creates a `Blob` representing the image contained in the canvas.
 *
 * This is a promisification of `canvas.toBlob(type, quality)`.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number | undefined} quality JPEG or WebP image quality in range
 * `[0, 1]`.
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mimeType, quality = undefined) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject();
      }
    }, mimeType, quality);
  });
}

/**
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBinaryString(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(null);
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsBinaryString(blob);
  });
}

/**
 * Loads a `Blob` that contains an image into an `HTMLImageElement`.
 *
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
export function blobToImage(blob) {
  return withObjectUrl(blob, loadImage);
}

/**
 * Loads an image from {@link src} into an `HTMLImageElement`.
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export async function loadImage(src) {
  const image = e('img');
  image.decoding = 'async';
  image.src = src;
  await image.decode();
  return image;
}

/**
 * Downloads a file from a `Blob` or from a URL.
 *
 * @param {Blob | string} obj
 * @param {string} filename Name of the target file.
 */
export function download(obj, filename) {
  if (typeof obj === 'string') {
    e("a", { href: obj, download: filename }).click();
  } else {
    withObjectUrl(obj, (objectUrl) => {
      download(objectUrl, filename);
    });
  }
}

/**
 * Calls {@link callback} with a temporary object URL to {@link obj}.
 *
 * The object URL is automatically resolved once the callback returns, or, if
 * the callback returns a promise, once that promise resolves.
 *
 * @template T
 * @param {Blob | MediaSource} obj
 * @param {(objectUrl: string) => T} callback
 * @returns {T}
 */
export function withObjectUrl(obj, callback) {
  // Outside of try-catch because no cleanup needed if this throws
  const objectUrl = URL.createObjectURL(obj);

  let result;

  try {
    result = callback(objectUrl);
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw e;
  }

  if (result instanceof Promise) {
    const resultPromise = result;

    // @ts-expect-error
    // - The typing isn't exact because `T` could be extending `Promise` (TODO).
    // - Simply doing `result.then().catch()` or `result.finally()` without
    //   creating a new Promise wouldn't suffice, as that would alter behavior
    //   w.r.t. unhandled rejections (TODO: demnstrate in test case?).
    return new Promise((resolve, reject) => {
      resultPromise
        .then((value) => {
          URL.revokeObjectURL(objectUrl);
          resolve(value);
        })
        .catch((e) => {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        });
    });
  } else {
    URL.revokeObjectURL(objectUrl);
    return result;
  }
}

/**
 *
 * @param {string} s
 * @returns {ArrayBuffer}
 */
export function binaryStringToArrayBuffer(s) {
  const buffer = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    buffer[i] = s.charCodeAt(i);
  }
  return buffer;
}

/**
 * May be used as event handlers in situations where the default action should
 * not be triggered (for example, to prevent dragging or submitting a form).
 *
 * @param {Event} e
 * @returns {boolean}
 */
export function cancelAction(e) {
  e.preventDefault();
  return false;
}

/**
 * Ensures that an element may not be dragged.
 *
 * @param {HTMLElement} e
 */
export function disableDragging(e) {
  e.draggable = false;
  e.ondragstart = cancelAction;
}

/**
 * Return a new array derived from {@link array} by inserting copies of
 * {@link elements} between any two consecutive elements.
 *
 * @param {(string | HTMLElement)[]} array
 * @param {(string | HTMLElement) | (string | HTMLElement)[]} elements
 * @returns {(string | HTMLElement)[]}
 */
export function domJoin(array, elements) {
  const result = [];

  const elementsArr = Array.isArray(elements) ? elements : [elements];

  for (let i = 0; i < array.length; i++) {
    if (i > 0) {
      for (const element of elementsArr) {
        const elementClone = typeof element === 'string'
          ? element
          : /** @type {HTMLElement} */(element.cloneNode(true));

        result.push(elementClone);
      }
    }

    result.push(/** @type {string | HTMLElement} */(array[i]));
  }

  return result;
}

/**
 * Creates a nested HTML element.
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Partial<HTMLElementTagNameMap[K]> & Partial<EventListeners<'$'>>} attrs
 * @param {(HTMLElement | string | null | undefined | boolean)[]} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function e(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key[0] === '$') {
      // @ts-expect-error: `Object.entries()` is too coarse-grained
      element.addEventListener(key.substring(1), value);
    } else {
      // @ts-expect-error: `Object.entries()` is too coarse-grained
      element[key] = value;
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.append(
        document.createTextNode(child)
      );
    } else if (child instanceof HTMLElement) {
      element.append(child);
    }
  }

  return element;
}

/**
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} hasClass
 */
export function setElementClass(element, className, hasClass) {
  if (hasClass) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

/**
 * Sanitizes {@link str} for use in a file name.
 *
 * @param {string} str
 * @returns {string}
 */
export function sanitizeBasename(str) {
  const result = str.replace(/[^a-zA-Z0-9()]+/g, "_");
  return result.length > 0 ? result : "_";
}

/**
 * Returns HTML-encoded string that represents {@link text}.
 *
 * @param {string} text
 * @returns {string}
 */
export function textToHtml(text) {
  return e('span', { innerText: text }).innerHTML;
}

/**
 *
 * @template T
 * @param {(T | null)[]} arr
 * @returns {T[]}
 */
export function filterNonNull(arr) {
  return arr.filter(
    /** @type {(x: T | null) => x is T} */(x => x !== null)
  );
}
