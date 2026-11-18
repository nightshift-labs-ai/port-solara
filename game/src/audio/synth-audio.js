// Every sound in Port Solara is synthesised with WebAudio; the game ships no audio files.
// playSiren: a rising and falling sweep on one square-wave voice. A stolen parked car's alarm
// uses it now (fast and high); the SPD siren will use it slow and wide.
export function playSiren(audio, { seconds = 1.2, low = 620, high = 1180, rate = 2.4, volume = 0.12 } = {}) {
  const ctx = audio.ctx;
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2600;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.03);
  gain.gain.setValueAtTime(volume, t0 + seconds - 0.08);
  gain.gain.linearRampToValueAtTime(0, t0 + seconds);
  for (let t = 0; t < seconds; t += 1 / rate) {
    osc.frequency.setValueAtTime(low, t0 + t);
    osc.frequency.linearRampToValueAtTime(high, t0 + t + 0.5 / rate);
    osc.frequency.linearRampToValueAtTime(low, t0 + t + 1 / rate);
  }
  osc.connect(tone).connect(gain).connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
}

// The sound engine. Nothing is made until unlock() runs inside a click (browsers start audio only
// then). The engine is a saw plus a square an octave down through a low-pass that follows the
// revs over five gears; the tyres are looped seeded noise through a band-pass opened by slip.
export function createSynthAudio() {
  const audio = { ctx: null, master: null, engine: null, tyres: null };

  audio.unlock = () => {
    if (audio.ctx) { audio.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (audio.ctx = new Ctx());
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.55;
    audio.master.connect(ctx.destination);

    const saw = ctx.createOscillator(), sub = ctx.createOscillator();
    saw.type = 'sawtooth'; sub.type = 'square';
    const subLevel = ctx.createGain(); subLevel.gain.value = 0.45;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 2.5;
    const level = ctx.createGain(); level.gain.value = 0;
    saw.connect(filter); sub.connect(subLevel).connect(filter);
    filter.connect(level).connect(audio.master);
    saw.start(); sub.start();
    audio.engine = { saw, sub, filter, level };

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let s = 0x5eed;
    for (let i = 0; i < data.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; data[i] = s / 2147483648 - 1; }
    const hiss = ctx.createBufferSource();
    hiss.buffer = noise; hiss.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 1400; band.Q.value = 1.1;
    const squeal = ctx.createGain(); squeal.gain.value = 0;
    hiss.connect(band).connect(squeal).connect(audio.master);
    hiss.start();
    audio.tyres = { band, squeal };

    // The SPD siren: one square voice through a band-pass, our own four-beat pattern
    // (low, high, low, then a glide up), loudness from the nearest unit's distance.
    const wail = ctx.createOscillator();
    wail.type = 'square'; wail.frequency.value = SIREN_NOTES[0];
    const horn = ctx.createBiquadFilter();
    horn.type = 'bandpass'; horn.frequency.value = 1150; horn.Q.value = 0.9;
    const sirenLevel = ctx.createGain(); sirenLevel.gain.value = 0;
    wail.connect(horn).connect(sirenLevel).connect(audio.master);
    wail.start();
    audio.siren = { wail, level: sirenLevel, beat: -1 };
  };

  // Once per frame with the car Wren drives (or null on foot and in menus) and the distance to
  // the nearest SPD unit with its siren on (Infinity when none).
  audio.update = (car, copDistance = Infinity) => {
    if (!audio.ctx || audio.ctx.state !== 'running') return;
    const t = audio.ctx.currentTime, e = audio.engine, ty = audio.tyres, sn = audio.siren;
    const beat = Math.floor(t / SIREN_BEAT);
    if (beat !== sn.beat) {
      sn.beat = beat;
      const note = beat % SIREN_NOTES.length;
      sn.wail.frequency.setValueAtTime(SIREN_NOTES[note], t);
      if (note === SIREN_NOTES.length - 1) sn.wail.frequency.linearRampToValueAtTime(SIREN_NOTES[1] * 1.12, t + SIREN_BEAT);
    }
    sn.level.gain.setTargetAtTime(0.075 * Math.max(0, 1 - copDistance / 170), t, 0.1);
    if (!car) {
      e.level.gain.setTargetAtTime(0, t, 0.2);
      ty.squeal.gain.setTargetAtTime(0, t, 0.1);
      return;
    }
    const speed = Math.abs(car.speed), span = car.spec.topSpeed / GEARS;
    const gear = Math.min(GEARS - 1, Math.floor(speed / span));
    const inGear = Math.min(1, (speed - gear * span) / span);
    const rpm = gear === 0 ? 0.15 + 0.85 * inGear : 0.45 + 0.55 * inGear;
    const pull = car.throttle > 0 ? 1 : 0;
    const hz = 34 + rpm * 96 + pull * 6;
    e.saw.frequency.setTargetAtTime(hz, t, 0.04);
    e.sub.frequency.setTargetAtTime(hz / 2, t, 0.04);
    e.filter.frequency.setTargetAtTime(280 + rpm * 1500 + pull * 500, t, 0.06);
    e.level.gain.setTargetAtTime(0.07 + rpm * 0.06 + pull * 0.03, t, 0.08);
    const slide = Math.min(1, Math.max(0, (car.slip - 2) / 6) + (car.handbrake && speed > 4 ? 0.5 : 0));
    ty.squeal.gain.setTargetAtTime(slide * 0.2, t, 0.05);
    ty.band.frequency.setTargetAtTime(1100 + slide * 900, t, 0.08);
  };

  // A stolen parked car: a short, fast, high alarm.
  audio.alarm = () => playSiren(audio, { seconds: 1.4, low: 980, high: 1560, rate: 7, volume: 0.09 });
  return audio;
}

const GEARS = 5;
// SPD siren notes in Hz, one per beat; the last glides up into the next bar.
const SIREN_NOTES = [740, 990, 740, 880];
const SIREN_BEAT = 0.34;
