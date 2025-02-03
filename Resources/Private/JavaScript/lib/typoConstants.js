// @ts-check

/**
 * @typedef {string | number | boolean | null | undefined} TypoValue
 */

/**
 * @template Obj
 * @typedef {Partial<Record<keyof Obj, TypoValue>>} TypoConstants
 */

/**
 * Simple utility to parse constants into a typed object.
 *
 * @template {Record<string, TypoValue>} Obj
 * @param {TypoConstants<Obj>} values
 * @param {Obj} defaults
 * @returns {Obj}
 */
export default function typoConstants(values, defaults) {
  const result = /** @type {Obj} */(Object.assign({}, defaults));

  for (const [key, def] of Object.entries(defaults)) {
    const value = values[key];
    const valueDefaulted = value ?? def;

    switch (typeof def) {
      case 'boolean':
        // @ts-expect-error
        result[key] = valueDefaulted === true || Boolean(Number(valueDefaulted));
        break;

      case 'number':
        // @ts-expect-error
        result[key] = Number(valueDefaulted);
        break;

      case 'string':
        // @ts-expect-error
        result[key] = String(valueDefaulted);
        break;
    }
  }

  return result;
}
