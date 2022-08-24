// @ts-check

/**
 * Serialize a two-dimensional array (row-major) as CSV.
 *
 * @param {string[][]} data
 * @returns {string}
 */
export function arrayToCsv(data) {
  return data.map(
    // To serialize row, wrap in double quotes and escape quotes
    row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';')
  ).join('\n');
}

/**
 * Clamp {@link value} into the closed interval [{@link min}, {@link max}].
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
 * Compare two values. Returns a format suited for the standard `sort` function.
 *
 * This can be chained via the `||` operator to sort on multiple fields:
 *
 *     array.sort((lhs, rhs) => (
 *       cmp(lhs.primaryField, rhs.primaryField)
 *       || cmp(lhs.secondaryField, rhs.secondaryField)
 *     ));
 *
 * @param {any} lhs
 * @param {any} rhs
 * @returns {number}
 */
export function cmp(lhs, rhs) {
  if (lhs < rhs) {
    return -1;
  }

  if (lhs > rhs) {
    return 1;
  }

  return 0;
}

/**
 * For each key-value-pair in {@link values}, replace `{key}` by `value` within
 * {@link template}.
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
 * Zero-left-pad {@link value} to at least {@link length} digits.
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
 * Convert {@link blob} into a string containing the binary blob data. This can
 * be useful to raw manipulation of the binary data stored in the blob.
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBinaryString(blob) {
  return readBlob(blob, 'readAsBinaryString');
}

/**
 * Convert {@link blob} to a data URL.
 *
 * Compared to object URLs, data URLs can be slower, but are sometimes required
 * to avoid compatibility issues.
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataURL(blob) {
  return readBlob(blob, 'readAsDataURL');
}

/**
 * Read {@link blob} into another format.
 *
 * Promisification of `FileReader`.
 *
 * @param {Blob} blob
 * @param {'readAsArrayBuffer' | 'readAsBinaryString' | 'readAsDataURL' | 'readAsText'} method
 * @returns {Promise<string>}
 */
export function readBlob(blob, method) {
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
    reader[method](blob);
  });
}

/**
 * Load {@link blob} (assumed to contain an image) into an `HTMLImageElement`.
 *
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
export function blobToImage(blob) {
  return withObjectUrl(blob, loadImage);
}

/**
 * Load an image from {@link src} into an `HTMLImageElement`.
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
 * Download a file from a `Blob` or from a URL.
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
 * Call {@link callback} with a temporary object URL to {@link obj}.
 *
 * The object URL is automatically revoked once the callback returns, or, if
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
 * Convert binary string into an `ArrayBuffer`.
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
 * Ensure that an element may not be dragged.
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
 * Create a DOM tree in a declarative syntax. `e` is short for "element".
 *
 * Example:
 *
 *     this.$container = e('div', { className: 'container' }, [
 *       this.$button = e('button', { $click: this.onResume }, ['Resume']),
 *     ]);
 *
 * This is equivalent to:
 *
 *     this.$container = document.createElement('div');
 *     this.$container.className = 'container';
 *     this.$button = document.createElement('button');
 *     button.addEventListener('click', this.onResume);
 *     button.textContent = 'Resume';
 *     this.$container.appendChild(button);
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag Tag name of the element to be created.
 * @param {Partial<HTMLElementTagNameMap[K]> & Partial<EventListeners<'$'>>} attrs Key-value-map of
 * properties to be set on the HTML element. If the key starts with a `$` sign,
 * it is interpreted as event handler.
 * @param {(HTMLElement | string | null | undefined | boolean)[]} children Array of children to be
 * appended to the element. Strings are appended as text nodes. Anything other
 * than a string or a DOMElement is skipped.
 * @returns {HTMLElementTagNameMap[K]}
 */
export function e(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key[0] === '$') {
      element.addEventListener(key.substring(1), value);
    } else {
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
 * Add or remove class from {@link element} depending on boolean.
 *
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} shouldHaveClass
 */
export function setElementClass(element, className, shouldHaveClass) {
  if (shouldHaveClass) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

/**
 * Sanitize {@link str} for use in a file name.
 *
 * @param {string} str
 * @returns {string}
 */
export function sanitizeBasename(str) {
  const result = str.replace(/[^a-zA-Z0-9()]+/g, "_");
  return result.length > 0 ? result : "_";
}

/**
 * HTML-encode {@link text}.
 *
 * @param {string} text
 * @returns {string}
 */
export function textToHtml(text) {
  return e('span', { innerText: text }).innerHTML;
}

/**
 * Get array containing only the non-null values in {@link arr}.
 *
 * Compared to just `array.filter(x => x !== null)`, this is used for typechecking.
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
