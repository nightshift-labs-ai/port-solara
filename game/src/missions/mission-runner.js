// Runs a story mission as a data list of steps. Entering a step sets the mission panel's text,
// the gold world marker and the GPS target; each fixed tick checks the step's goal, and a step
// with `seconds` fails the mission when its timer runs out. Step kinds:
//   goto       { at: {x, z}, radius }               reach a spot (on foot or driving)
//   steal      { car: 'ALBACORE GT' }               be at the wheel of that car (any car if omitted)
//   deliver    { at, radius }                       stop a car inside the radius (under 4 m/s)
//   chase      { target: (game) => {x, z}, radius } close to within radius of a moving target
//   loseWanted {}                                   WANTED back to zero
//   dialogue   { lines: [{ who, text, secs }] }     subtitles, then on
//   eliminate / defend                              stubs until combat (M4): a short beat, then on
export class MissionRunner {
  constructor(game) {
    this.game = game;
    this.mission = null;
    this.index = 0;
    this.stepAt = 0;
    this.startedAt = 0;
    this.result = null;
    this.target = null;
    this.subtitle = null;
    this.marker = buildMarker(game.THREE);
    this.marker.visible = false;
    game.scene.add(this.marker);
  }

  get active() { return !!this.mission; }
  get step() { return this.mission ? this.mission.steps[this.index] : null; }

  start(mission) {
    this.mission = mission;
    this.result = null;
    this.startedAt = this.game.time;
    this.enter(0);
  }

  enter(i) {
    this.index = i;
    this.stepAt = this.game.time;
    const step = this.step;
    this.target = step.at ? { x: step.at.x, z: step.at.z } : null;
    this.subtitle = null;
    if (step.heat && this.game.wantedLevel.pips < step.heat) {
      const f = this.game.focus;
      this.game.wantedLevel.commit('theft', f.x, f.z, step.heat);
    }
  }

  // One fixed tick.
  update() {
    const step = this.step;
    if (!step) { this.marker.visible = false; return; }
    const game = this.game, f = game.focus, age = game.time - this.stepAt;
    if (step.kind === 'chase' && step.target) this.target = step.target(game);
    if (step.seconds && age > step.seconds) { this.finish(false, step.failText || 'OUT OF TIME'); return; }
    if (this.done(step, f, age)) {
      if (this.index + 1 < this.mission.steps.length) this.enter(this.index + 1);
      else this.finish(true);
      return;
    }
    this.marker.visible = !!this.target;
    if (this.target) {
      this.marker.position.set(this.target.x, 0, this.target.z);
      this.marker.rotation.y = game.time * 1.4;
    }
  }

  done(step, f, age) {
    const game = this.game, near = (r) => this.target && Math.hypot(f.x - this.target.x, f.z - this.target.z) < r;
    switch (step.kind) {
      case 'goto': return near(step.radius || 10);
      case 'steal': return !!game.vehicle && (!step.car || game.vehicle.name === step.car);
      case 'deliver': return !!game.vehicle && Math.abs(game.vehicle.speed) < 4 && near(step.radius || 10);
      case 'chase': return near(step.radius || 8);
      case 'loseWanted': return game.wantedLevel.pips === 0;
      case 'dialogue': {
        let t = age;
        for (const line of step.lines) {
          if (t < line.secs) { this.subtitle = line; return false; }
          t -= line.secs;
        }
        this.subtitle = null;
        return true;
      }
      case 'eliminate': case 'defend': return age > (step.secs || 3);
      default: return true;
    }
  }

  finish(passed, reason = '') {
    const m = this.mission, game = this.game;
    this.result = {
      passed, reason, title: m.title, at: game.time,
      time: game.time - this.startedAt,
      cash: passed ? m.reward?.cash || 0 : 0,
      rep: passed ? m.reward?.rep || 0 : 0,
    };
    if (passed) game.cash += this.result.cash;
    this.mission = null;
    this.target = null;
    this.subtitle = null;
    this.marker.visible = false;
  }

  // What the HUD's mission panel shows this frame (null when no mission runs).
  panel() {
    const m = this.mission, step = this.step;
    if (!m) return null;
    const f = this.game.focus;
    const dist = this.target ? Math.hypot(f.x - this.target.x, f.z - this.target.z) : null;
    const next = m.steps[this.index + 1];
    return {
      header: `MISSION ${m.number}/${m.of} · ${m.title.toUpperCase()}`,
      objective: step.text + (dist != null ? ` · ${formatDistance(dist)}` : ''),
      stage: this.index + 1, stages: m.steps.length,
      timer: step.seconds ? Math.max(0, step.seconds - (this.game.time - this.stepAt)) : null,
      next: next ? `NEXT · ${next.text}` : `NEXT · ${m.payoffText || 'Collect from ' + m.giver}`,
    };
  }
}

export function formatDistance(d) {
  return d >= 100 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
}

// A gold beam with a spinning ring at its foot: 2 draw calls, additive so it reads in sun.
function buildMarker(THREE) {
  const group = new THREE.Group();
  const gold = (opacity) => new THREE.MeshBasicMaterial({ color: 0xffc21f, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true).translate(0, 13, 0), gold(0.28));
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 24).rotateX(-Math.PI / 2).translate(0, 0.12, 0), gold(0.8));
  group.add(beam, ring);
  group.renderOrder = 3;
  return group;
}
