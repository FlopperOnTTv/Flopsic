const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/** Web Audio processing adapter. A native Tauri adapter can later keep this same UI-facing API. */
export class AudioEngine {
  private context?: AudioContext;
  private filters: BiquadFilterNode[] = [];
  private preamp?: GainNode;
  private connected = false;

  connect(element: HTMLAudioElement) {
    if (this.connected) return;
    this.context = new AudioContext();
    const source = this.context.createMediaElementSource(element);
    this.filters = frequencies.map((frequency) => {
      const filter = this.context!.createBiquadFilter();
      filter.type = "peaking"; filter.frequency.value = frequency; filter.Q.value = 1.2;
      return filter;
    });
    this.preamp = this.context.createGain();
    source.connect(this.filters[0]);
    this.filters.reduce((previous, next) => { previous.connect(next); return next; }).connect(this.preamp);
    this.preamp.connect(this.context.destination);
    this.connected = true;
  }
  setBand(index: number, decibels: number) { if (this.filters[index]) this.filters[index].gain.value = decibels; }
  setPreamp(decibels: number) { if (this.preamp) this.preamp.gain.value = Math.pow(10, decibels / 20); }
  resume() { return this.context?.resume(); }
}
