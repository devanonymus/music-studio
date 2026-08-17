"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Renderer,
} from "vexflow";

import {
  createDemoDrumScore,
} from "@/data/demo-drum-score";

import type {
  DrumSubdivision,
} from "@/lib/music/drumScore";

import {
  renderDrumMeasure,
} from "@/lib/music/renderDrumMeasure";

type ScoreViewerProps = {
  currentMeasure: number;
  currentBeat: number;
  isPlaying: boolean;
  subdivision: DrumSubdivision;
};

type HighlightPoint = {
  x: number;
  y: number;
};

const PAGE_MAX_WIDTH = 1420;
const SCORE_MAX_WIDTH = 1320;

const MUSIC_SCALE = 0.86;

const SYSTEM_HEIGHT = 132;
const TOP_MARGIN = 46;
const SIDE_MARGIN = 50;

const HIGHLIGHT_WIDTH = 18;
const HIGHLIGHT_HEIGHT = 66;

export default function ScoreViewer({
  currentMeasure,
  currentBeat,
  isPlaying,
  subdivision,
}: ScoreViewerProps) {
  const scoreRef =
    useRef<HTMLDivElement | null>(null);

  const systemRefs =
    useRef<Record<number, HTMLDivElement | null>>({});

  const [
    highlightMap,
    setHighlightMap,
  ] = useState<
    Record<string, HighlightPoint>
  >({});

  const score =
    createDemoDrumScore(
      subdivision
    );

  const measuresPerSystem =
    subdivision === 16
      ? 2
      : 4;

  useEffect(() => {
    const root =
      scoreRef.current;

    if (!root) {
      return;
    }

    let resizeTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const drawScore = () => {
      const element =
        scoreRef.current;

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
        logicalSideMargin *
          2;

      const measureWidth =
        contentWidth /
        measuresPerSystem;

      const numberOfSystems =
        Math.ceil(
          score.measures.length /
            measuresPerSystem
        );

      const realHeight =
        TOP_MARGIN +
        numberOfSystems *
          SYSTEM_HEIGHT +
        45;

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

      score.measures.forEach(
        (measure, index) => {
          const systemIndex =
            Math.floor(
              index /
                measuresPerSystem
            );

          const column =
            index %
            measuresPerSystem;

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

          const result =
            renderDrumMeasure({
              context,
              score,
              measure,
              staveX,
              staveY,
              measureWidth,
              column,
              musicScale:
                MUSIC_SCALE,
            });

          result.highlightPositions.forEach(
            (position) => {
              positions[
                `${measure.number}-${position.step}`
              ] = {
                x: position.x,
                y: position.y,
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
  }, [score]);

  /*
   * AUTOSCROLL
   */
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const system =
      Math.floor(
        (currentMeasure - 1) /
          measuresPerSystem
      );

    systemRefs.current[
      system
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [
    currentMeasure,
    isPlaying,
  ]);

  const highlight =
    highlightMap[
      `${currentMeasure}-${currentBeat}`
    ];

  const numberOfSystems =
    Math.ceil(
      score.measures.length /
        measuresPerSystem
    );

  return (
    <section
      className="mx-auto w-full"
      style={{
        maxWidth:
          PAGE_MAX_WIDTH,
      }}
    >
      <div className="mb-6 flex items-end justify-between px-1">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Batteria
          </p>

          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-neutral-950">
            {score.title}
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
                ? subdivisionLabel(
                    currentBeat,
                    subdivision
                  )
                : "-"
            }
          />

        </div>

      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_16px_55px_rgba(0,0,0,0.045)]">

        <div
          className="relative mx-auto w-full"
          style={{
            maxWidth:
              SCORE_MAX_WIDTH,
          }}
        >

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

          {isPlaying &&
            currentBeat > 0 &&
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
                    "none",
                }}
              >
                <div
                  style={{
                    width:
                      HIGHLIGHT_WIDTH,

                    height:
                      HIGHLIGHT_HEIGHT,

                    borderRadius:
                      "7px",

                    background:
                      "rgba(250,204,21,0.12)",

                    border:
                      "1px solid rgba(234,179,8,0.70)",

                    boxShadow:
                      "0 0 8px rgba(234,179,8,0.10)",
                  }}
                />
              </div>
            )}

          <div
            ref={scoreRef}
            className="mx-auto w-full"
          />

        </div>

      </div>

    </section>
  );
}

function subdivisionLabel(
  subdivisionIndex: number,
  resolution: DrumSubdivision
) {
  if (resolution === 4) {
    const labels = [
      "1",
      "2",
      "3",
      "4",
    ];

    return (
      labels[
        subdivisionIndex - 1
      ] ?? "-"
    );
  }

  if (resolution === 8) {
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
        subdivisionIndex - 1
      ] ?? "-"
    );
  }

  const labels = [
    "1", "e", "&", "a",
    "2", "e", "&", "a",
    "3", "e", "&", "a",
    "4", "e", "&", "a",
  ];

  return (
    labels[
      subdivisionIndex - 1
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
