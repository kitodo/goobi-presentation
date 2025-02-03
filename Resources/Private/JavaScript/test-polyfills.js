// Polyfill classes for running unit tests in Node

global.CustomEvent = class CustomEvent extends Event {
  constructor(type, options) {
    super(type, options);
    this.detail = options?.detail ?? null;
  }
}
