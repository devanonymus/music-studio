"use client";

import { useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  GhostNote,
  Voice,
  Formatter,
  Beam,
} from "vexflow";

type ScoreViewerProps = {
  currentMeasure: number;
  currentBeat: number;
  isPlaying: boolean;
};

type HighlightPoint = {
  x: number;
  y: number;
};

type DrumStep = {
  hihat?: boolean;
  snare?: boolean;
  kick?: boolean;
};

type DrumMeasure = {
  steps: DrumStep[];
};

const TOTAL_MEASURES = 32;
const MEASURES_PER_SYSTEM = 4;

/*
 * Dimensioni generali della pagina.
 */
const PAGE_MAX_WIDTH = 1420;
const SCORE_MAX_WIDTH = 1320;

/*
 * Scala grafica della notazione.
 *
 * Riduce pentagramma, note, gambi,
 * chiave e indicazione metrica
 * mantenendo la pagina ampia.
 */
const MUSIC_SCALE = 0.84;

/*
 * Dimensioni REALI visualizzate.
 */
const SYSTEM_HEIGHT = 118;
const TOP_MARGIN = 38;
const SIDE_MARGIN = 42;

/*
 * Evidenziatore.
 */
const HIGHLIGHT_WIDTH = 17;
const HIGHLIGHT_HEIGHT = 61;

/*
 * Groove demo:
 *
 * HH: 1 & 2 & 3 & 4 &
 * SD:     2       4
 * BD: 1       3
 */
const SCORE: DrumMeasure[] = Array.from(
  { length: TOTAL_MEASURES },
  (_, measureIndex) => ({
    steps: [
      {
        hihat: true,
        kick: true,
      },
      {
        hihat: true,
      },
      {
        hihat: true,
        snare: true,
      },
      {
        hihat: true,
      },
      {
        hihat: true,
        kick: measureIndex % 2 === 0,
      },
      {
        hihat: true,
      },
      {
        hihat: true,
        snare: true,
      },
      {
        hihat: true,
      },
    ],
  })
);

export default function ScoreViewer({
  currentMeasure,
  currentBeat,
  isPlaying,
}: ScoreViewerProps) {
  const scoreRef =
    useRef<HTMLDivElement | null>(null);

  const systemRefs =
    useRef<Record<number, HTMLDivElement | null>>({});

  const [highlightMap, setHighlightMap] =
    useState<Record<string, HighlightPoint>>({});

  useEffect(() => {
    const root = scoreRef.current;

    if (!root) {
      return;
    }

    let resizeTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const drawScore = () => {
      const element = scoreRef.current;

      if (!element) {
        return;
      }

      element.innerHTML = "";

      /*
       * Larghezza reale disponibile.
       */
      const realWidth = Math.max(
        1000,
        Math.min(
          element.clientWidth,
          SCORE_MAX_WIDTH
        )
      );

      /*
       * Disegniamo VexFlow in coordinate
       * logiche più grandi e poi riduciamo
       * tutto usando MUSIC_SCALE.
       */
      const logicalWidth =
        realWidth / MUSIC_SCALE;

      const logicalSideMargin =
        SIDE_MARGIN / MUSIC_SCALE;

      const logicalSystemHeight =
        SYSTEM_HEIGHT / MUSIC_SCALE;

      const logicalTopMargin =
        TOP_MARGIN / MUSIC_SCALE;

      const availableWidth =
        logicalWidth -
        logicalSideMargin * 2;

      const measureWidth =
        availableWidth /
        MEASURES_PER_SYSTEM;

      const numberOfSystems =
        Math.ceil(
          TOTAL_MEASURES /
            MEASURES_PER_SYSTEM
        );

      const realHeight =
        TOP_MARGIN +
        numberOfSystems *
          SYSTEM_HEIGHT +
        35;

      const logicalHeight =
        realHeight / MUSIC_SCALE;

      const renderer =
        new Renderer(
          element,
          Renderer.Backends.SVG
        );

      /*
       * SVG con dimensione reale.
       */
      renderer.resize(
        realWidth,
        realHeight
      );

      const context =
        renderer.getContext();

      /*
       * Ridimensionamento della musica.
       */
      context.scale(
        MUSIC_SCALE,
        MUSIC_SCALE
      );

      const positions: Record<
        string,
        HighlightPoint
      > = {};

      SCORE.forEach(
        (measure, index) => {
          const measureNumber =
            index + 1;

          const systemIndex =
            Math.floor(
              index /
                MEASURES_PER_SYSTEM
            );

          const column =
            index %
            MEASURES_PER_SYSTEM;

          const staveX =
            logicalSideMargin +
            column * measureWidth;

          const systemTop =
            logicalTopMargin +
            systemIndex *
              logicalSystemHeight;

          /*
           * Abbassiamo leggermente
           * il pentagramma rispetto
           * al numero di battuta.
           */
          const staveY =
            systemTop + 24;

          const stave =
            new Stave(
              staveX,
              staveY,
              measureWidth
            );

          /*
           * Chiave solo all'inizio
           * di ciascun sistema.
           */
          if (column === 0) {
            stave.addClef(
              "percussion"
            );

            /*
             * 4/4 soltanto sulla
             * prima riga.
             */
            if (measureNumber === 1) {
              stave.addTimeSignature(
                "4/4"
              );
            }
          }

          stave
            .setContext(context)
            .draw();

          /*
           * NUMERO BATTUTA
           *
           * Più piccolo e sempre
           * nella stessa posizione.
           */
          context.save();

          context.setFont(
            "Arial",
            9,
            "normal"
          );

          context.fillText(
            String(measureNumber),
            staveX + 9,
            staveY - 11
          );

          context.restore();

          /*
           * ==========================
           * VOCE SUPERIORE
           * HI-HAT + RULLANTE
           * ==========================
           */

          const upperNotes =
            measure.steps.map(
              (step) => {
                const keys: string[] =
                  [];

                if (step.snare) {
                  keys.push(
                    "c/5"
                  );
                }

                if (step.hihat) {
                  keys.push(
                    "g/5/x2"
                  );
                }

                return new StaveNote({
                  clef:
                    "percussion",
                  keys,
                  duration:
                    "8",
                  stemDirection:
                    1,
                });
              }
            );

          /*
           * ==========================
           * VOCE INFERIORE
           * CASSA
           * ==========================
           *
           * Dove NON c'è la cassa,
           * usiamo GhostNote.
           *
           * Mantiene il timing
           * senza stampare pause.
           */

          const lowerNotes =
            measure.steps.map(
              (step) => {
                if (step.kick) {
                  return new StaveNote({
                    clef:
                      "percussion",
                    keys: [
                      "f/3",
                    ],
                    duration:
                      "8",
                    stemDirection:
                      -1,
                  });
                }

                return new GhostNote({
                  duration:
                    "8",
                });
              }
            );

          const upperVoice =
            new Voice({
              numBeats: 4,
              beatValue: 4,
            });

          const lowerVoice =
            new Voice({
              numBeats: 4,
              beatValue: 4,
            });

          upperVoice.addTickables(
            upperNotes
          );

          lowerVoice.addTickables(
            lowerNotes
          );

          /*
           * Spazio destinato realmente
           * alle note.
           */
          const leftReserve =
            column === 0
              ? 78
              : 28;

          const rightReserve =
            18;

          const formattingWidth =
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
              formattingWidth
            );

          upperVoice.draw(
            context,
            stave
          );

          lowerVoice.draw(
            context,
            stave
          );

          /*
           * HI-HAT in ottavi.
           *
           * Due gruppi:
           *
           * 1 & 2 &
           * 3 & 4 &
           */
          const beamFirstHalf =
            new Beam(
              upperNotes.slice(
                0,
                4
              )
            );

          const beamSecondHalf =
            new Beam(
              upperNotes.slice(
                4,
                8
              )
            );

          beamFirstHalf
            .setContext(context)
            .draw();

          beamSecondHalf
            .setContext(context)
            .draw();

          /*
           * Posizione esatta di
           * ogni ottavo.
           *
           * Convertiamo le coordinate
           * VexFlow nelle coordinate
           * reali dopo lo scaling.
           */
          upperNotes.forEach(
            (
              note,
              stepIndex
            ) => {
              positions[
                `${measureNumber}-${stepIndex + 1}`
              ] = {
                x:
                  note.getAbsoluteX() *
                  MUSIC_SCALE,

                y:
                  (
                    staveY +
                    49
                  ) *
                  MUSIC_SCALE,
              };
            }
          );
        }
      );

      setHighlightMap(
        positions
      );
    };

    drawScore();

    const observer =
      new ResizeObserver(
        () => {
          if (resizeTimer) {
            clearTimeout(
              resizeTimer
            );
          }

          resizeTimer =
            setTimeout(
              drawScore,
              120
            );
        }
      );

    observer.observe(
      root
    );

    return () => {
      observer.disconnect();

      if (resizeTimer) {
        clearTimeout(
          resizeTimer
        );
      }
    };
  }, []);

  /*
   * AUTOSCROLL
   *
   * Avviene solamente quando
   * cambiamo riga dello spartito.
   */
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const currentSystem =
      Math.floor(
        (currentMeasure - 1) /
          MEASURES_PER_SYSTEM
      );

    systemRefs.current[
      currentSystem
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [
    currentMeasure,
    isPlaying,
  ]);

  const activeStep =
    currentBeat;

  const highlight =
    highlightMap[
      `${currentMeasure}-${activeStep}`
    ];

  const numberOfSystems =
    Math.ceil(
      TOTAL_MEASURES /
        MEASURES_PER_SYSTEM
    );

  return (
    <section
      className="mx-auto w-full"
      style={{
        maxWidth:
          PAGE_MAX_WIDTH,
      }}
    >

      {/* HEADER */}

      <div className="mb-6 flex items-end justify-between px-1">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Batteria
          </p>

          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-neutral-950">
            Groove Demo 01
          </h2>
        </div>

        <div className="flex gap-12">

          <ScoreInfo
            label="Battuta"
            value={String(
              currentMeasure
            )}
          />

          <ScoreInfo
            label="Suddivisione"
            value={
              currentBeat > 0
                ? getSubdivisionLabel(
                    currentBeat
                  )
                : "-"
            }
          />

        </div>

      </div>

      {/* FOGLIO */}

      <div className="relative overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_16px_55px_rgba(0,0,0,0.045)]">

        <div
          className="relative mx-auto w-full"
          style={{
            maxWidth:
              SCORE_MAX_WIDTH,
          }}
        >

          {/* RIFERIMENTI AUTOSCROLL */}

          {Array.from({
            length:
              numberOfSystems,
          }).map(
            (_, system) => (
              <div
                key={system}
                ref={(element) => {
                  systemRefs.current[
                    system
                  ] = element;
                }}
                className="pointer-events-none absolute left-0 right-0"
                style={{
                  top:
                    TOP_MARGIN +
                    system *
                      SYSTEM_HEIGHT,
                  height:
                    SYSTEM_HEIGHT,
                }}
              />
            )
          )}

          {/* HIGHLIGHT */}

          {isPlaying &&
            activeStep > 0 &&
            highlight && (
              <div
                className="pointer-events-none absolute z-20"
                style={{
                  left:
                    highlight.x,

                  top:
                    highlight.y,

                  transform:
                    "translate(-50%, -50%)",

                  transition:
                    "left 45ms linear, top 45ms linear",
                }}
              >
                <div
                  style={{
                    width:
                      HIGHLIGHT_WIDTH,

                    height:
                      HIGHLIGHT_HEIGHT,

                    borderRadius:
                      "6px",

                    background:
                      "rgba(250, 204, 21, 0.13)",

                    border:
                      "1px solid rgba(234, 179, 8, 0.70)",

                    boxShadow:
                      "0 0 8px rgba(234, 179, 8, 0.11)",
                  }}
                />
              </div>
            )}

          {/* SPARTITO */}

          <div
            ref={scoreRef}
            className="mx-auto w-full"
          />

        </div>
      </div>
    </section>
  );
}

function getSubdivisionLabel(
  subdivision: number
) {
  const labels = [
    "1",
    "&",
    "2",
    "&",
    "3",
    "&",
    "4",
    "&",
  ];

  return (
    labels[
      subdivision - 1
    ] ?? "-"
  );
}

function ScoreInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[86px] text-right">

      <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-neutral-400">
        {label}
      </p>

      <p className="mt-1.5 text-[17px] font-semibold tracking-tight text-neutral-950">
        {value}
      </p>

    </div>
  );
}
