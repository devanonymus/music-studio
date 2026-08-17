export type MetronomeTickCallback = (
  subdivision: number,
  measure: number
) => void;

type VisualEvent = {
  subdivision: number;
  measure: number;
  time: number;
};

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
  private animationFrameId: number | null = null;

  private isRunning = false;

  /*
   * Audio schedulato 100ms in anticipo.
   */
  private scheduleAheadTime = 0.1;

  /*
   * Scheduler audio controllato ogni 25ms.
   */
  private lookahead = 25;

  private volume = 1;

  /*
   * Gli eventi visivi vengono messi qui.
   * NON usiamo più setTimeout.
   */
  private visualQueue: VisualEvent[] = [];

  private onTick?: MetronomeTickCallback;

  constructor(
    onTick?: MetronomeTickCallback
  ) {
    this.onTick = onTick;
  }

  private getContext() {
    if (!this.audioContext) {
      this.audioContext =
        new AudioContext();

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
    this.bpm =
      Math.max(
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
    this.volume =
      Math.max(
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

  /*
   * =================================
   * AVANZAMENTO TEMPORALE
   * =================================
   */

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

  /*
   * =================================
   * CLICK AUDIO
   * =================================
   */

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
     * Primo movimento:
     * click più alto.
     *
     * Beat principali:
     * click medio.
     *
     * Suddivisioni:
     * click più leggero.
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

    /*
     * IMPORTANTISSIMO:
     *
     * Salviamo l'evento visivo
     * usando ESATTAMENTE lo stesso
     * timestamp AudioContext.
     */
    this.visualQueue.push({
      subdivision:
        subdivision + 1,

      measure,

      time,
    });
  }

  /*
   * =================================
   * AUDIO SCHEDULER
   * =================================
   */

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

  /*
   * =================================
   * VISUAL CLOCK
   * =================================
   *
   * requestAnimationFrame controlla
   * il vero clock AudioContext.
   *
   * Quindi highlight e click
   * condividono la stessa timeline.
   */

  private visualLoop = () => {
    if (
      !this.audioContext ||
      !this.isRunning
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    /*
     * Recuperiamo tutti gli eventi
     * che devono essere già visibili.
     */
    while (
      this.visualQueue.length >
        0 &&
      this.visualQueue[0].time <=
        now
    ) {
      const event =
        this.visualQueue.shift();

      if (event) {
        this.onTick?.(
          event.subdivision,
          event.measure
        );
      }
    }

    this.animationFrameId =
      requestAnimationFrame(
        this.visualLoop
      );
  };

  /*
   * =================================
   * START
   * =================================
   */

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

    /*
     * Pulizia totale prima
     * della nuova esecuzione.
     */
    this.visualQueue = [];

    this.currentSubdivision = 0;
    this.currentMeasure = 1;

    this.isRunning = true;

    /*
     * Piccolo preroll tecnico.
     */
    this.nextNoteTime =
      context.currentTime +
      0.08;

    /*
     * Prepariamo audio.
     */
    this.scheduler();

    this.timerId =
      window.setInterval(
        this.scheduler,
        this.lookahead
      );

    /*
     * Avviamo il clock visivo.
     */
    this.animationFrameId =
      requestAnimationFrame(
        this.visualLoop
      );
  }

  /*
   * =================================
   * STOP
   * =================================
   */

  stop() {
    this.isRunning = false;

    if (
      this.timerId !== null
    ) {
      window.clearInterval(
        this.timerId
      );

      this.timerId = null;
    }

    if (
      this.animationFrameId !==
      null
    ) {
      cancelAnimationFrame(
        this.animationFrameId
      );

      this.animationFrameId =
        null;
    }

    this.visualQueue = [];

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
