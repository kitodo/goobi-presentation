namespace dlf.media.eq {
  type CurvePoint = {
    freq: number;
    gain: number;
    phase: number;
  };

  type Curve = {
    name: string;
    points: CurvePoint[];
  };

  /**
   * Interface used to separate which properties/methods of `class ParamValue`
   * are meant to be accessed only from filterset.
   */
  interface ParamValue {
    readonly value: number;
    readonly initial: number;
    readonly editable: boolean;
    update(fn: (oldValue: number) => number): void;
  }

  type Param<ValueT = ParamValue> = {
    isActive: boolean;
    frequency: ValueT;
    gain: ValueT;
    getFrequencyResponse(
      frequencyResponse: import("SlubMediaPlayer/components/equalizer/FrequencyResponse").default
    ): Curve;
  };

  type EqIIRFilterNode = {
    type: "iir";
    sampleRate: number;
    feedforward: number[];
    feedback: number[];
  };

  type FilterNode = BiquadFilterNode | EqIIRFilterNode;

  type FilterPreset = {
    key?: string;
    group: string;
    label: string;
  } & (
    | {
        mode: "riaa";
        params: import("SlubMediaPlayer/components/equalizer/filtersets/RiaaEq").RiaaParams;
      }
    | {
        mode: "band-iso";
        octaveStep: number;
      }
    | {
        mode: "band";
        bands: import("SlubMediaPlayer/components/equalizer/filtersets/BandEq").BandParams[];
      }
  );

  interface Filterset {
    readonly inputNode: AudioNode;
    readonly outputNode: AudioNode;
    readonly nodes: Readonly<FilterNode[]>;
    readonly parameters: Readonly<Param[]>;
    readonly gain: number;
    targetCurve(frequencies: Float32Array): Curve | null;
  }
}
