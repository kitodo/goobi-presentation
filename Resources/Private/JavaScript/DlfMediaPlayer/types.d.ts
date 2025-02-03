// This file declares some additional types used in the media player.
// There also are @typedef declarations directly in .js files.

interface Window {
  DlfMediaPlayer: {
    new ();
  };
}

interface HTMLElementTagNameMap {
  "dlf-waveform": import("DlfMediaPlayer/components/waveform").WaveForm;
}

declare module "shaka-player/dist/shaka-player.ui" {
  export = shaka;
}

interface HTMLElementEventMap {
  chapterchange: dlf.media.ChapterChangeEvent;
}

namespace dlf {
  interface Network<T> {
    get(url: string): Promise<T>;
    getCached(url: string): T | null;
    abortPending(): void;
  }

  namespace media {
    type TimeRange = {
      startTime: number;
      endTime: number | null;
    };

    type Chapter = {
      title: string;
      timecode: number;
      fileIds: string[];
      pageNo: number | null;
    };

    type Source = {
      mimeType: string;
      url: string;
      fileId: string | null;
      frameRate: number | null;
    };

    type PlayerMode = "audio" | "video";

    type PlayerConstants = {
      /**
       * Number of seconds in which to still rewind to previous chapter.
       */
      prevChapterTolerance: number;

      /**
       * Volume increase/decrease in relevant keybinding.
       */
      volumeStep: number;

      /**
       * Number of seconds to seek or rewind in relevant keybinding.
       */
      seekStep: number;

      /**
       * Trick play factor for continuous rewind/seek.
       * TODO: Check if this should be input as setting or retrieved from current manifest
       */
      trickPlayFactor: number;

      /**
       * Whether or not to switch to landscape in fullscreen mode.
       */
      forceLandscapeOnFullscreen: boolean;
    };

    type PlayerConfig = {
      lang: LangDef;
    };

    type PlayerAction = {
      isAvailable: () => boolean;
      // TODO: Make action more independent of keybindings; could also be triggered in gesture
      /**
       * Execute action. May return `false` to indicate that the action did not apply.
       */
      execute: (
        kb?: Keybinding<any, any>,
        keyIndex?: number,
        mode?: KeyEventMode
      ) => boolean | void;
    };

    type Fps = {
      rate: number;
      vifa: import("DlfMediaPlayer/3rd-party/VideoFrame").default;
    };

    type MediaProperties = {
      poster: string | null;
      variantGroups: import("DlfMediaPlayer/VariantGroups").default | null;
      chapters: import("DlfMediaPlayer/Chapters").default | null;
      fps: Fps | null;
    };

    type PlayerProperties = {
      mode: PlayerMode;
      locale: string;
      state: "poster" | "media";
      error: string | null;
      controlElements: HTMLElement[];
      actions: Readonly<Record<string, dlf.media.PlayerAction>>;
      playerView: HTMLElement | null;
    };

    /**
     * Frontend to encapsulate the visible part of the player.
     *
     * See the developers documentation for more information.
     */
    interface PlayerFrontend<
      PlayerT extends PlayerProperties = PlayerProperties
    > {
      destroy();

      /**
       * Main DOM element / container of the frontend.
       */
      get domElement(): HTMLElement;

      get seekBar():
        | import("DlfMediaPlayer/controls/FlatSeekBar").default
        | null;

      /**
       * ``Gestures`` object that is configured to only dispatch gestures that
       * are admissible on the player.
       */
      get gestures(): import("lib/Gestures").default | null;

      updateMediaProperties(props: Partial<MediaProperties>);
      updatePlayerProperties(props: Partial<PlayerProperties>);

      /**
       * Handle `Esc` key press, e.g., to close open tooltips or popups.
       *
       * @returns Whether or not the UI has changed. This can be used to execute
       * only one `Esc` action at a time.
       */
      handleEscape(): boolean;

      /**
       * React to a manual seek by the user (e.g., by using a keybinding), as
       * opposed to automatic seeks such as seeking to the initial timecode.
       * This may be used, for example, to hide the poster after a user action.
       */
      afterManualSeek();
    }

    interface UrlGenerator {
      generateUrl(timecodeOrRange: number | TimeRange | null): URL;
    }

    /**
     * Signals that the current chapter has changed.
     *
     * Dispatched on DlfMediaPlayer.
     */
    interface ChapterChangeEvent
      extends CustomEvent<EventDetail["chapterchange"]> {}

    /**
     * Signals that {@link MediaProperties} have changed or become available.
     *
     * Should be dispatched on a Shaka control ({@link shaka.ui.Controls}).
     */
    interface MediaPropertiesEvent
      extends CustomEvent<EventDetail["dlf-media-properties"]> {}

    /**
     * Registers seekbar to parent DlfMediaPlayer.
     *
     * Should be dispatched on a Shaka control ({@link shaka.ui.Controls}).
     */
    interface SeekBarEvent
      extends CustomEvent<EventDetail["dlf-media-seek-bar"]> {}

    /**
     * Signals that the user has manually seeked to a video position.
     *
     * Should be dispatched on a Shaka control ({@link shaka.ui.Controls}).
     */
    interface ManualSeekEvent
      extends CustomEvent<EventDetail["dlf-media-manual-seek"]> {}

    type EventDetail = {
      chapterchange: {
        curChapter: Chapter | null;
        prevChapter: Chapter | null;
      };
      "dlf-media-properties": {
        updateProps: Partial<MediaProperties>;
        fullProps: MediaProperties;
      };
      "dlf-media-seek-bar": {
        seekBar: import("DlfMediaPlayer/controls/FlatSeekBar").default;
      };
      "dlf-media-manual-seek": {};
    };

    /**
     * Description of a thumbnail on a tileset.
     *
     * Generally oriented at {@link shaka.extern.Thumbnail}.
     */
    type Thumbnail = {
      uris: string[];
      imageTime: number;
      startTime: number;
      duration: number;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      bandwidth: number;
    };

    type ThumbnailOnTrack = Thumbnail & {
      track: ThumbnailTrack;
    };

    interface ThumbnailTrack {
      readonly bandwidth: number;
      getThumb(position: number): Promise<ThumbnailOnTrack | null>;
    }
  }
}
