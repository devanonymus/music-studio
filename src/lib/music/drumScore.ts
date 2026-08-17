export type DrumSubdivision = 4 | 8 | 16;

export type DrumInstrument =
  | "kick"
  | "snare"
  | "hihat"
  | "openHihat"
  | "ride"
  | "crash"
  | "tomHigh"
  | "tomMid"
  | "tomFloor";

export type DrumStep = {
  instruments: DrumInstrument[];
  accent?: boolean;
  ghost?: boolean;
};

export type DrumMeasure = {
  number: number;
  subdivision: DrumSubdivision;
  steps: DrumStep[];
};

export type DrumScore = {
  id: string;
  title: string;
  artist?: string;

  bpm: number;

  timeSignature: {
    beats: number;
    beatValue: number;
  };

  measures: DrumMeasure[];
};
