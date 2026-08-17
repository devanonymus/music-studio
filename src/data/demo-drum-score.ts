import type {
  DrumMeasure,
  DrumScore,
  DrumStep,
  DrumSubdivision,
} from "@/lib/music/drumScore";

function step(
  instruments: DrumStep["instruments"]
): DrumStep {
  return {
    instruments,
  };
}

function createEighthMeasure(
  number: number
): DrumMeasure {
  return {
    number,
    subdivision: 8,
    steps: [
      step(["hihat", "kick"]),
      step(["hihat"]),
      step(["hihat", "snare"]),
      step(["hihat"]),
      step(["hihat", "kick"]),
      step(["hihat"]),
      step(["hihat", "snare"]),
      step(["hihat"]),
    ],
  };
}

function createQuarterMeasure(
  number: number
): DrumMeasure {
  return {
    number,
    subdivision: 4,
    steps: [
      step(["hihat", "kick"]),
      step(["hihat", "snare"]),
      step(["hihat", "kick"]),
      step(["hihat", "snare"]),
    ],
  };
}

function createSixteenthMeasure(
  number: number
): DrumMeasure {
  return {
    number,
    subdivision: 16,

    /*
     * 1 e & a 2 e & a
     * 3 e & a 4 e & a
     */
    steps: [
      step(["hihat", "kick"]),
      step(["hihat"]),
      step(["hihat"]),
      step(["hihat"]),

      step(["hihat", "snare"]),
      step(["hihat"]),
      step(["hihat", "kick"]),
      step(["hihat"]),

      step(["hihat", "kick"]),
      step(["hihat"]),
      step(["hihat"]),
      step(["hihat"]),

      step(["hihat", "snare"]),
      step(["hihat"]),
      step(["hihat", "kick"]),
      step(["hihat"]),
    ],
  };
}

function createMeasure(
  number: number,
  subdivision: DrumSubdivision
): DrumMeasure {
  switch (subdivision) {
    case 4:
      return createQuarterMeasure(
        number
      );

    case 16:
      return createSixteenthMeasure(
        number
      );

    case 8:
    default:
      return createEighthMeasure(
        number
      );
  }
}

export function createDemoDrumScore(
  subdivision: DrumSubdivision
): DrumScore {
  return {
    id: `groove-demo-${subdivision}`,

    title: "Groove Demo 01",

    bpm: 80,

    timeSignature: {
      beats: 4,
      beatValue: 4,
    },

    measures: Array.from(
      {
        length: 32,
      },
      (_, index) =>
        createMeasure(
          index + 1,
          subdivision
        )
    ),
  };
}

/*
 * Manteniamo anche l'export precedente
 * per eventuale codice vecchio.
 */
export const demoDrumScore =
  createDemoDrumScore(8);
