type ValueOf<T> = T[keyof T];

/**
 * Map names of event listeners, prefixed by {@link Prefix}, to the type of
 * their respective handler callbacks.
 */
type EventListeners<Prefix extends string> = {
  [X in ValueOf<EventListenersDesc<Prefix>>["prefixed"]]: Extract<
    ValueOf<EventListenersDesc<Prefix>>,
    { prefixed: X }
  >["handler"];
};

// With inspiration from https://stackoverflow.com/a/56416192 (inverting Record)
type EventListenersDesc<Prefix extends string> = {
  [X in keyof GlobalEventHandlersEventMap]: {
    key: X;
    prefixed: `${Prefix}${X}`;
    handler: (event: GlobalEventHandlersEventMap[X]) => any;
  };
};

interface ImageFormat {
  addMetadata(metadata: Partial<ImageMetadata>);
  toBinaryString(): string;
}

type ImageFormatDesc = {
  mimeType: string;
  extension: string;
  label: string;
  parseBinaryString: (s: string) => ImageFormat | undefined;
};

type ImageMetadata = {
  title: string;
  comment: string;
};

/**
 * Query browser-related information and capabilities.
 */
interface Browser {
  /**
   * Returns the current window location URL.
   */
  getLocation(): URL;

  /**
   * Checks whether MSE are supported.
   */
  supportsMediaSource(): boolean;

  /**
   * Checks whether canvas can be dumped to an image of the specified
   * {@link mimeType}.
   */
  supportsCanvasExport(mimeType: string): boolean;

  /**
   * Checks whether video playback of the given {@link mimeType} is supported
   * natively.
   */
  supportsVideoMime(mimeType: string): boolean;

  /**
   * Checks whether the browser is in full screen.
   */
  isInFullScreen(): boolean;

  /**
   * Toggle full screen, using {@link fullscreenElement} if switching to full
   * screen.
   */
  toggleFullScreen(fullscreenElement: HTMLElement, forceLandscape: boolean);
}

/**
 * Generate identifiers.
 */
interface Identifier {
  /**
   * Generates an identifier that is unique with respect to this instance.
   *
   * It may be used, for example, to link an <input /> element to a <label />,
   * or to group radio boxes.
   */
  mkid(): string;
}

/**
 * Translate phrases via an identifier key.
 */
interface Translator {
  /**
   * Get translated phrase of given {@link key}.
   */
  t(key: string, values?: Record<string, string | number>, fallback?: () => string): string;
}

interface TypedEvents<Handlers> {
  on<T extends keyof Handlers>(event: T, callback: Handlers[T]): void;
}
