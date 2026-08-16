"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import ScoreViewer from "./ScoreViewer";

import {
  MetronomeEngine,
} from "@/lib/music/MetronomeEngine";

const BPM = 80;
const BEATS_PER_MEASURE = 4;
const TOTAL_MEASURES = 32;

export default function MusicStudio() {
  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentBeat, setCurrentBeat] =
    useState(0);

  const [
    currentMeasure,
    setCurrentMeasure,
  ] = useState(1);

  const [
    metronomeVolume,
    setMetronomeVolume,
  ] = useState(100);

  const metronomeRef =
    useRef<MetronomeEngine | null>(null);

  useEffect(() => {
    const engine = new MetronomeEngine(
      (beat, measure) => {
        setCurrentBeat(beat);

        if (measure > TOTAL_MEASURES) {
          engine.stop();

          setIsPlaying(false);
          setCurrentMeasure(1);
          setCurrentBeat(0);

          return;
        }

        setCurrentMeasure(measure);
      }
    );

    engine.setBpm(BPM);

    engine.setTimeSignature(
      BEATS_PER_MEASURE
    );

    engine.setSubdivision(2);

    metronomeRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  async function togglePlayback() {
    const engine = metronomeRef.current;

    if (!engine) return;

    if (isPlaying) {
      engine.stop();

      setIsPlaying(false);
      setCurrentBeat(0);

      return;
    }

    setCurrentMeasure(1);
    setCurrentBeat(0);

    await engine.start();

    setIsPlaying(true);
  }

  function reset() {
    metronomeRef.current?.reset();

    setIsPlaying(false);
    setCurrentMeasure(1);
    setCurrentBeat(0);
  }

  return (
    <main className="min-h-screen bg-[#f3f3f1] pb-[150px]">
      <header className="border-b border-neutral-200 bg-white/95">
        <div className="mx-auto flex max-w-[1420px] flex-col justify-between gap-6 px-6 py-7 md:flex-row md:items-end md:px-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Music Studio
            </p>

            <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-neutral-950 md:text-[46px]">
              Groove Demo 01
            </h1>

            <p className="mt-3 text-base text-neutral-500">
              Batteria · Studio ritmico
            </p>
          </div>

          <div className="flex gap-8">
            <Info
              label="Tempo"
              value={`${BPM} BPM`}
            />

            <Info
              label="Metro"
              value="4/4"
            />

            <Info
              label="Livello"
              value="Base"
            />
          </div>
        </div>
      </header>

      <section className="px-4 py-7 md:px-8 md:py-9">
        <ScoreViewer
          currentMeasure={
            currentMeasure
          }
          currentBeat={currentBeat}
          isPlaying={isPlaying}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/90 bg-white/95 shadow-[0_-12px_36px_rgba(0,0,0,0.055)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1420px] flex-col gap-3 px-6 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <span className="w-12 text-sm font-medium text-neutral-500">
              {currentMeasure}
            </span>

            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full bg-neutral-950 transition-[width] duration-100"
                style={{
                  width: `${
                    ((currentMeasure - 1) /
                      TOTAL_MEASURES) *
                    100
                  }%`,
                }}
              />
            </div>

            <span className="text-sm font-medium text-neutral-500">
              {TOTAL_MEASURES}
            </span>
          </div>

          <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
            <div className="flex min-w-[220px] items-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Metronomo
                </p>

                <p className="mt-1 text-sm font-medium text-neutral-950">
                  Sempre attivo
                </p>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={
                  metronomeVolume
                }
                onChange={(event) => {
                  const value = Number(event.target.value);

                  setMetronomeVolume(value);

                  metronomeRef.current?.setVolume(
                    value / 100
                  );
                }}
                className="w-28 accent-neutral-950"
              />

              <span className="w-10 text-right text-xs text-neutral-500">
                {metronomeVolume}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-100"
              >
                Reset
              </button>

              <button
                onClick={
                  togglePlayback
                }
                className="flex min-w-[138px] items-center justify-center rounded-full bg-neutral-950 px-8 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-neutral-800"
              >
                {isPlaying
                  ? "Pausa"
                  : "Play"}
              </button>
            </div>

            <div className="flex min-w-[220px] justify-end gap-8">
              <Info
                label="Battuta"
                value={`${currentMeasure}`}
              />

              <Info
                label="Beat"
                value={
                  currentBeat
                    ? ["1", "&", "2", "&", "3", "&", "4", "&"][currentBeat - 1]
                    : "—"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}
