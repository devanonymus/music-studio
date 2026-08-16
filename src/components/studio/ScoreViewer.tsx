"use client";

import { useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
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

const PAGE_MAX_WIDTH = 1420;
const SCORE_MAX_WIDTH = 1320;

const MUSIC_SCALE = 0.88;

const SYSTEM_HEIGHT = 126;
const TOP_MARGIN = 44;
const SIDE_MARGIN = 48;

const HIGHLIGHT_WIDTH = 16;
const HIGHLIGHT_HEIGHT = 70;

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
        kick:
          measureIndex % 2 === 0,
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

      const realWidth =
        Math.max(
          1000,
          Math.min(
            element.clientWidth,
            SCORE_MAX_WIDTH
          )
        );

      const logicalWidth =
        realWidth /
        MUSIC_SCALE;

      const logicalSideMargin =
        SIDE_MARGIN /
        MUSIC_SCALE;

      const logicalSystemHeight =
        SYSTEM_HEIGHT /
        MUSIC_SCALE;

      const logicalTopMargin =
        TOP_MARGIN /
        MUSIC_SCALE;

      const contentWidth =
        logicalWidth -
        logicalSideMargin * 2;

      const measureWidth =
        contentWidth /
        MEASURES_PER_SYSTEM;

      const systems =
        Math.ceil(
          TOTAL_MEASURES /
            MEASURES_PER_SYSTEM
        );

      const realHeight =
        TOP_MARGIN +
        systems *
          SYSTEM_HEIGHT +
        40;

      const renderer =
        new Renderer(
          element,
          Renderer.Backends.SVG
        );

      renderer.resize(
        realWidth,
        realHeight
      );

      const context =
        renderer.getContext();

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
            column *
              measureWidth;

          const systemTop =
            logicalTopMargin +
            systemIndex *
              logicalSystemHeight;

          const staveY =
            systemTop + 28;

          /*
           * =========================
           * PENTAGRAMMA
           * =========================
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

            if (
              measureNumber === 1
            ) {
              stave.addTimeSignature(
                "4/4"
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
            String(
              measureNumber
            ),
            staveX + 9,
            staveY - 12
          );

          context.restore();

          /*
           * =========================
           * UNA SOLA VOCE DRUM
           * =========================
           *
           * Ogni ottavo è un singolo
           * evento musicale.
           *
           * Se nello stesso istante
           * abbiamo:
           *
           * HH + SNARE
           *
           * oppure
           *
           * HH + KICK
           *
           * le note vengono inserite
           * nello stesso StaveNote.
           */

          const notes =
            measure.steps.map(
              (step) => {
                const keys: string[] =
                  [];

                /*
                 * Cassa
                 */
                if (step.kick) {
                  keys.push(
                    "f/3"
                  );
                }

                /*
                 * Rullante
                 */
                if (step.snare) {
                  keys.push(
                    "c/5"
                  );
                }

                /*
                 * Hi-hat
                 */
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
           * =========================
           * VOCE 4/4
           * =========================
           */

          const voice =
            new Voice({
              numBeats: 4,
              beatValue: 4,
            });

          voice.addTickables(
            notes
          );

          /*
           * =========================
           * SPAZIATURA
           * =========================
           */

          const leftReserve =
            column === 0
              ? 80
              : 28;

          const rightReserve =
            20;

          const formatWidth =
            measureWidth -
            leftReserve -
            rightReserve;

          new Formatter()
            .joinVoices([
              voice,
            ])
            .format(
              [voice],
              formatWidth
            );

          voice.draw(
            context,
            stave
          );

          /*
           * =========================
           * BEAM
           * =========================
           *
           * Due gruppi da quattro
           * ottavi.
           */

          const beam1 =
            new Beam(
              notes.slice(
                0,
                4
              )
            );

          const beam2 =
            new Beam(
              notes.slice(
                4,
                8
              )
            );

          beam1
            .setContext(
              context
            )
            .draw();

          beam2
            .setContext(
              context
            )
            .draw();

          /*
           * =========================
           * HIGHLIGHT POSITIONS
           * =========================
           */

          notes.forEach(
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
                    47
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
              100
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
   * =========================
   * AUTOSCROLL
   * =========================
   */

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const system =
      Math.floor(
        (currentMeasure - 1) /
          MEASURES_PER_SYSTEM
      );

    systemRefs.current[
      system
    ]?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center",
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

  const systems =
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

      {/* SCORE HEADER */}

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

      {/* SCORE PAPER */}

      <div className="relative overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_16px_55px_rgba(0,0,0,0.045)]">

        <div
          className="relative mx-auto w-full"
          style={{
            maxWidth:
              SCORE_MAX_WIDTH,
          }}
        >

          {/* SYSTEM REFERENCES */}

          {Array.from({
            length:
              systems,
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

          {/* ACTIVE NOTE */}

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
                    "left 40ms linear, top 40ms linear",
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
                      "rgba(250,204,21,0.13)",

                    border:
                      "1px solid rgba(234,179,8,0.72)",

                    boxShadow:
                      "0 0 8px rgba(234,179,8,0.10)",
                  }}
                />

              </div>
            )}

          {/* VEXFLOW */}

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
