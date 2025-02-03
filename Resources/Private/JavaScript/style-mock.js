module.exports = {
  /**
   * This handles (discards) style imports during Jest tests (see package.json).
   *
   * @returns {string}
   */
  process() {
    return {
      code: "",
    };
  },
};
