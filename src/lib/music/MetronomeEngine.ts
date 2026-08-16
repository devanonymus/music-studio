export type MetronomeTickCallback = (
  subdivision: number,
  measure: number
) => void;

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private bpm = 80;
  private beatsPerMeasure = 4;
  private subdivisionsPerBeat = 2;

  private currentSubdivision = 0;
  private currentMeasure = 1;

  private nextNoteTime = 0;

  private timerId: number | null = null;
  private isRunning = false;

  private scheduleAheadTime = 0.1;
  private lookahead = 25;

  private volume = 1;

  private onTick?: MetronomeTickCallback;

  constructor(onTick?: MetronomeTickCallback) {
    this.onTick = onTick;
  }

  private getContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();

      this.masterGain =
        this.audioContext.createGain();

      this.masterGain.gain.value =
        this.volume;

      this.masterGain.connect(
        this.audioContext.destination
      );
    }

    return this.audioContext;
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(
      20,
      Math.min(300, bpm)
    );
  }

  setTimeSignature(
    beatsPerMeasure: number
  ) {
    this.beatsPerMeasure =
      beatsPerMeasure;
  }

  setSubdivision(
    subdivisionsPerBeat: number
  ) {
    this.subdivisionsPerBeat =
      Math.max(
        1,
        subdivisionsPerBeat
      );
  }

  setVolume(value: number) {
    this.volume = Math.max(
      0,
      Math.min(1, value)
    );

    if (
      this.masterGain &&
      this.audioContext
    ) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.audioContext.currentTime,
        0.01
      );
    }
  }

  private nextNote() {
    const secondsPerBeat =
      60 / this.bpm;

    const secondsPerSubdivision =
      secondsPerBeat /
      this.subdivisionsPerBeat;

    this.nextNoteTime +=
      secondsPerSubdivision;

    this.currentSubdivision++;

    const totalSubdivisions =
      this.beatsPerMeasure *
      this.subdivisionsPerBeat;

    if (
      this.currentSubdivision >=
      totalSubdivisions
    ) {
      this.currentSubdivision = 0;
      this.currentMeasure++;
    }
  }

  private scheduleClick(
    subdivision: number,
    measure: number,
    time: number
  ) {
    const context =
      this.getContext();

    if (!this.masterGain) {
      return;
    }

    const oscillator =
      context.createOscillator();

    const clickGain =
      context.createGain();

    const isFirstSubdivision =
      subdivision === 0;

    const isMainBeat =
      subdivision %
        this.subdivisionsPerBeat ===
      0;

    /*
     * 1 = più forte
     * 2 3 4 = medi
     * & = più leggero
     */
    if (isFirstSubdivision) {
      oscillator.frequency.value =
        1450;
    } else if (isMainBeat) {
      oscillator.frequency.value =
        1050;
    } else {
      oscillator.frequency.value =
        750;
    }

    const peak =
      isFirstSubdivision
        ? 0.9
        : isMainBeat
          ? 0.55
          : 0.28;

    clickGain.gain.setValueAtTime(
      0.0001,
      time
    );

    clickGain.gain.exponentialRampToValueAtTime(
      peak,
      time + 0.002
    );

    clickGain.gain.exponentialRampToValueAtTime(
      0.0001,
      time + 0.045
    );

    oscillator.connect(
      clickGain
    );

    clickGain.connect(
      this.masterGain
    );

    oscillator.start(time);
    oscillator.stop(
      time + 0.05
    );

    const delay =
      Math.max(
        0,
        (
          time -
          context.currentTime
        ) * 1000
      );

    window.setTimeout(() => {
      this.onTick?.(
        subdivision + 1,
        measure
      );
    }, delay);
  }

  private scheduler = () => {
    if (
      !this.audioContext ||
      !this.isRunning
    ) {
      return;
    }

    while (
      this.nextNoteTime <
      this.audioContext.currentTime +
        this.scheduleAheadTime
    ) {
      this.scheduleClick(
        this.currentSubdivision,
        this.currentMeasure,
        this.nextNoteTime
      );

      this.nextNote();
    }
  };

  async start() {
    if (this.isRunning) {
      return;
    }

    const context =
      this.getContext();

    if (
      context.state ===
      "suspended"
    ) {
      await context.resume();
    }

    this.isRunning = true;

    this.currentSubdivision = 0;
    this.currentMeasure = 1;

    this.nextNoteTime =
      context.currentTime + 0.08;

    this.scheduler();

    this.timerId =
      window.setInterval(
        this.scheduler,
        this.lookahead
      );
  }

  stop() {
    this.isRunning = false;

    if (this.timerId !== null) {
      window.clearInterval(
        this.timerId
      );

      this.timerId = null;
    }

    this.currentSubdivision = 0;
    this.currentMeasure = 1;
  }

  reset() {
    this.stop();
  }

  getRunningState() {
    return this.isRunning;
  }
}
