// This file declares some additional types used in the SLUB media player.
// There also are @typedef declarations directly in .js files.

interface Window {
  SlubMediaPlayer: {
    new ();
  };
}

interface HTMLElementTagNameMap {
  "dlf-equalizer": import("SlubMediaPlayer/components/equalizer").Equalizer;
  "dlf-marker-table": import("SlubMediaPlayer/components/marker-table").MarkerTable;
}

/**
 * Signals that the theater mode should be changed.
 *
 * Should be dispatched on the window object.
 */
interface DlfTheaterMode
  extends CustomEvent<{
    action: "toggle";
    persist: boolean;
  }> {}

type MetadataArray = Record<string, string[]>;

type PhrasesDict = Record<string, string>;
type LangDef = {
  locale: string;
  twoLetterIsoCode: string;
  phrases: PhrasesDict;
};

type ScreenshotModalConstants = {
  /**
   * Template for filename when downloading screenshot (without extension).
   */
  screenshotFilenameTemplate: string;

  /**
   * Template for comment added to metadata of screenshot image file.
   */
  screenshotCommentTemplate: string;
};

type AppConstantsConfig = import("lib/typoConstants").TypoConstants<
  dlf.media.PlayerConstants & ScreenshotModalConstants
>;

type AppConfig = {
  shareButtons: import("SlubMediaPlayer/modals/BookmarkModal").ShareButtonInfo[];
  lang: LangDef;
  screenshotCaptions?: import("SlubMediaPlayer/Screenshot").ScreenshotCaption[];
  constants?: Partial<AppConstantsConfig> | null;
};

type Keybinding<ScopeT extends string, ActionT extends string> = {
  /**
   * Which keyboard variant this applies to.
   */
  keyboard?: 'ibm' | 'mac' | null;

  /**
   * Modifier to be pressed.
   *
   * See definition of `const Modifier`.
   */
  mod?: "None" | "Ctrl" | "Shift" | "Alt" | "Meta";

  /**
   * Names of the key or keys to be bound.
   *
   * Using multiple keys signifies that all of those inherently trigger the
   * same action. The event handler may use the list of keys to parameterize
   * its action.
   *
   * For creating an alias, consider adding a full keybinding entry instead.
   */
  keys: KeyboardEvent["key"][];

  /**
   * Boolean to indicate that the keypress must / must not be repeated;
   * undefined or null to allow both.
   */
  repeat?: boolean | null;

  /**
   * Active keyboard scope for which the keybinding is relevant; undefined or
   * null to allow any scope.
   */
  scope?: ScopeT | null;

  /**
   * Key of the action to be executed for that keybinding.
   */
  action: ActionT;

  /**
   * Whether or not to use this keybinding for `keydown` events. (Default: `true`.)
   */
  keydown?: boolean;

  /**
   * Whether or not to use this keybinding for `keyup` events. (Default:`false`.)
   */
  keyup?: boolean;

  /**
   * Kind of keybinding as used for grouping in help modal.
   */
  kind: string;

  /**
   * Order value (relative to `kind`) as used in help modal.
   */
  order: number;
};

type KeyEventMode = "down" | "up";

type ModalEventHandlers = {
  updated: () => void;
};

interface Modal extends TypedEvents<ModalEventHandlers> {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  update(): Promise<void>;
  resize(): void;
}
