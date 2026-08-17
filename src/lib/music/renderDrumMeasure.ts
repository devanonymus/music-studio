import {
  Beam,
  Formatter,
  GhostNote,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";

import type {
  DrumMeasure,
  DrumScore,
} from "@/lib/music/drumScore";

type RenderDrumMeasureArgs = {
  context: any;
  score: DrumScore;
  measure: DrumMeasure;

  staveX: number;
  staveY: number;
  measureWidth: number;

  column: number;
  musicScale: number;
};

export type DrumMeasureRenderResult = {
  highlightPositions: {
    step: number;
    x: number;
    y: number;
  }[];
};

export function renderDrumMeasure({
  context,
  score,
  measure,
  staveX,
  staveY,
  measureWidth,
  column,
  musicScale,
}: RenderDrumMeasureArgs): DrumMeasureRenderResult {
  /*
   * ================================
   * STAVE
   * ================================
   */

  const stave =
    new Stave(
      staveX,
      staveY,
      measureWidth
    );

  if (column === 0) {
    stave.addClef(
      "percussion"
    );

    if (measure.number === 1) {
      stave.addTimeSignature(
        `${score.timeSignature.beats}/${score.timeSignature.beatValue}`
      );
    }
  }

  stave
    .setContext(context)
    .draw();

  /*
   * Numero battuta
   */

  context.save();

  context.setFont(
    "Arial",
    9,
    "normal"
  );

  context.fillText(
    String(measure.number),
    staveX + 9,
    staveY - 13
  );

  context.restore();

  /*
   * ================================
   * DURATA
   * ================================
   */

  const duration =
    subdivisionToVexDuration(
      measure.subdivision
    );

  /*
   * ================================
   * VOCE SUPERIORE
   * ================================
   *
   * Hi-hat
   * Open hi-hat
   * Rullante
   * Ride
   * Crash
   * Tom
   */

  const upperNotes =
    measure.steps.map(
      (step) => {
        const keys: string[] = [];

        /*
         * TOM FLOOR
         */
        if (
          step.instruments.includes(
            "tomFloor"
          )
        ) {
          keys.push("a/3");
        }

        /*
         * TOM MID
         */
        if (
          step.instruments.includes(
            "tomMid"
          )
        ) {
          keys.push("d/4");
        }

        /*
         * RULLANTE
         */
        if (
          step.instruments.includes(
            "snare"
          )
        ) {
          keys.push("c/5");
        }

        /*
         * TOM HIGH
         */
        if (
          step.instruments.includes(
            "tomHigh"
          )
        ) {
          keys.push("e/5");
        }

        /*
         * HI-HAT
         */
        if (
          step.instruments.includes(
            "hihat"
          ) ||
          step.instruments.includes(
            "openHihat"
          )
        ) {
          keys.push(
            "g/5/x2"
          );
        }

        /*
         * RIDE
         */
        if (
          step.instruments.includes(
            "ride"
          )
        ) {
          keys.push(
            "a/5/x2"
          );
        }

        /*
         * CRASH
         */
        if (
          step.instruments.includes(
            "crash"
          )
        ) {
          keys.push(
            "c/6/x2"
          );
        }

        /*
         * Se in questo step abbiamo
         * solamente cassa,
         * la voce superiore deve comunque
         * occupare correttamente il tempo.
         */
        if (keys.length === 0) {
          return new GhostNote({
            duration,
          });
        }

        return new StaveNote({
          clef:
            "percussion",

          keys,

          duration,

          stemDirection:
            1,
        });
      }
    );

  /*
   * ================================
   * VOCE INFERIORE
   * ================================
   *
   * Per ora:
   * kick / bass drum
   */

  const lowerNotes =
    measure.steps.map(
      (step) => {
        const hasKick =
          step.instruments.includes(
            "kick"
          );

        if (!hasKick) {
          return new GhostNote({
            duration,
          });
        }

        return new StaveNote({
          clef:
            "percussion",

          keys: [
            "f/3",
          ],

          duration,

          stemDirection:
            1,
        });
      }
    );

  /*
   * ================================
   * VOICES
   * ================================
   */

  const upperVoice =
    new Voice({
      numBeats:
        score.timeSignature.beats,

      beatValue:
        score.timeSignature.beatValue,
    });

  const lowerVoice =
    new Voice({
      numBeats:
        score.timeSignature.beats,

      beatValue:
        score.timeSignature.beatValue,
    });

  upperVoice.addTickables(
    upperNotes
  );

  lowerVoice.addTickables(
    lowerNotes
  );

  /*
   * ================================
   * FORMAT
   * ================================
   */

  const leftReserve =
    column === 0
      ? 82
      : 30;

  const rightReserve =
    22;

  const formatWidth =
    measureWidth -
    leftReserve -
    rightReserve;

  new Formatter()
    .joinVoices([
      upperVoice,
      lowerVoice,
    ])
    .format(
      [
        upperVoice,
        lowerVoice,
      ],
      formatWidth
    );

  /*
   * ================================
   * DRAW
   * ================================
   */

  upperVoice.draw(
    context,
    stave
  );

  lowerVoice.draw(
    context,
    stave
  );

  /*
   * ================================
   * BEAMS
   * ================================
   *
   * Li generiamo automaticamente
   * solo sulla voce superiore.
   */

  const visibleUpperNotes =
    upperNotes.filter(
      (
        note
      ): note is StaveNote =>
        note instanceof StaveNote
    );

  if (
    measure.subdivision === 8 ||
    measure.subdivision === 16
  ) {
    const beams =
      Beam.generateBeams(
        visibleUpperNotes,
        {
          stemDirection: 1,
        }
      );

    beams.forEach(
      (beam) => {
        beam
          .setContext(context)
          .draw();
      }
    );
  }

  /*
   * ================================
   * HIGHLIGHT POSITIONS
   * ================================
   *
   * Cerchiamo una posizione reale
   * anche quando la voce superiore
   * è GhostNote.
   */

  const highlightPositions =
    measure.steps.map(
      (_, stepIndex) => {
        const upper =
          upperNotes[
            stepIndex
          ];

        const lower =
          lowerNotes[
            stepIndex
          ];

        let x = 0;

        if (
          upper instanceof
          StaveNote
        ) {
          x =
            upper.getAbsoluteX();
        } else if (
          lower instanceof
          StaveNote
        ) {
          x =
            lower.getAbsoluteX();
        } else {
          /*
           * Entrambe GhostNote:
           * usiamo comunque la
           * posizione temporale
           * della voce superiore.
           */

          x =
            upper.getAbsoluteX();
        }

        return {
          step:
            stepIndex + 1,

          x:
            x *
            musicScale,

          y:
            (
              staveY +
              47
            ) *
            musicScale,
        };
      }
    );

  return {
    highlightPositions,
  };
}

/*
 * ==================================
 * HELPERS
 * ==================================
 */

function subdivisionToVexDuration(
  subdivision: number
) {
  switch (
    subdivision
  ) {
    case 4:
      return "q";

    case 8:
      return "8";

    case 16:
      return "16";

    default:
      return "8";
  }
}
