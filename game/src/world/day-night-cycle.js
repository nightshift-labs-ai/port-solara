import * as THREE from 'three';

// Time of day from the game clock. Today's golden hour holds from 07:00 to 18:20; dusk runs to
// 19:45 into a navy night under a low moon, and a short dawn (05:30-07:00) brings the day back.
// The title always shows golden hour (the brand). In the day plateau nothing is written; coming
// back into it puts the stored boot values back, never a recomputed blend.
export function createDayNightCycle(game) {
  const { light, renderer, scene } = game;
  const { sun, hemi, bounce, sky, sunDisc, glow, sunDir } = light;
  const C = (h) => new THREE.Color(h);
  const cols = sky.geometry.attributes.color, pos = sky.geometry.attributes.position;
  const day = {
    sky: cols.array.slice(), dir: sunDir.clone(), exposure: renderer.toneMappingExposure,
    fog: scene.fog.color.clone(), bg: scene.background.clone(), sun: [sun.color.clone(), sun.intensity],
    hemi: [hemi.color.clone(), hemi.groundColor.clone(), hemi.intensity],
    bounce: [bounce.color.clone(), bounce.intensity], disc: sunDisc.material.color.clone(), glow: glow.material.opacity,
  };
  // Night: an ultramarine dome over a cobalt-teal glow, a cool moon (40 degrees west of south,
  // 17 up), a blue-grey sky fill and the city's warm glow kept on the east bounce.
  const night = {
    fog: C(0x24456e), sun: [C(0xa8c0ff), 1.3], hemi: [C(0x5a78b8), C(0x5a5060), 0.7],
    bounce: [C(0xffb27a), 0.8], disc: C(0xe4ecff), exposure: 1.05,
  };
  const moonDir = new THREE.Vector3(-0.64, 0.29, 0.71).normalize();
  // The night dome from the same height bands as the day one.
  const bands = [[0, C(0x3f7fa6)], [0.09, C(0x2e5d93)], [0.3, C(0x1f3d73)], [0.75, C(0x14285a)]];
  const nightSky = new Float32Array(cols.array.length), up = new Float32Array(pos.count), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(0, pos.getY(i) / 450);
    up[i] = Math.min(1, h / 0.75);
    let k = 0;
    while (k < 2 && h >= bands[k + 1][0]) k++;
    c.copy(bands[k][1]).lerp(bands[k + 1][1], Math.min(1, (h - bands[k][0]) / (bands[k + 1][0] - bands[k][0]))).toArray(nightSky, i * 3);
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const levelAt = (m) => (m >= 1090 ? smooth(1100, 1185, m) : 1 - smooth(330, 420, m));
  let plateau = true;

  function restore() {
    plateau = true;
    cols.array.set(day.sky); cols.needsUpdate = true;
    sunDir.copy(day.dir); renderer.toneMappingExposure = day.exposure;
    scene.fog.color.copy(day.fog); scene.background.copy(day.bg);
    sun.color.copy(day.sun[0]); sun.intensity = day.sun[1];
    hemi.color.copy(day.hemi[0]); hemi.groundColor.copy(day.hemi[1]); hemi.intensity = day.hemi[2];
    bounce.color.copy(day.bounce[0]); bounce.intensity = day.bounce[1];
    sunDisc.material.color.copy(day.disc); sunDisc.visible = true; sunDisc.scale.setScalar(light.skyScale);
    glow.visible = true; glow.material.opacity = day.glow;
    document.body.classList.remove('night-grade');
    game.nightWindows.value = 0;
  }

  const cycle = {
    level: 0,
    // 0 by day, 1 at full night: the clock's minute of the day, golden hour on the title.
    levelNow() {
      const m = ((game.clockMinutes() % 1440) + 1440) % 1440;
      return game.mode === 'title' ? 0 : levelAt(m);
    },
    update() {
      const n = cycle.level = cycle.levelNow();
      if (n === 0) { if (!plateau) restore(); return; }
      plateau = false;
      // The dome darkens from the top down, so the horizon keeps its warmth longest.
      const a = cols.array;
      for (let i = 0; i < up.length; i++) {
        const t = smooth(0, 1, (n - 0.45 * (1 - up[i])) / 0.55);
        for (let j = i * 3; j < i * 3 + 3; j++) a[j] = day.sky[j] + (nightSky[j] - day.sky[j]) * t;
      }
      cols.needsUpdate = true;
      scene.fog.color.lerpColors(day.fog, night.fog, n);
      scene.background.lerpColors(day.bg, night.fog, n);
      // One light: the sun fades out, the moon fades in, swapping where both are dark.
      const moon = n >= 0.5, w = moon ? n * 2 - 1 : 1 - n * 2, src = moon ? night : day;
      sunDir.copy(moon ? moonDir : day.dir);
      sun.color.copy(src.sun[0]); sun.intensity = src.sun[1] * w;
      hemi.color.lerpColors(day.hemi[0], night.hemi[0], n); hemi.groundColor.lerpColors(day.hemi[1], night.hemi[1], n);
      hemi.intensity = day.hemi[2] + (night.hemi[2] - day.hemi[2]) * n;
      bounce.color.lerpColors(day.bounce[0], night.bounce[0], n);
      bounce.intensity = day.bounce[1] + (night.bounce[1] - day.bounce[1]) * n;
      renderer.toneMappingExposure = day.exposure + (night.exposure - day.exposure) * n;
      sunDisc.material.color.copy(src.disc);
      sunDisc.visible = w > 0.05;
      sunDisc.scale.setScalar(light.skyScale * Math.min(1, w * 3) * (moon ? 0.55 : 1));
      glow.visible = !moon; glow.material.opacity = day.glow * w;
      document.body.classList.toggle('night-grade', n > 0.5);
      game.nightWindows.value = smooth(0.25, 0.8, n); // windows light up through dusk
    },
    // Everything the cycle writes, for the self-test's plateau check.
    readout() {
      const hex = (o) => o.getHex();
      return [Array.from(cols.array), sunDir.toArray(), renderer.toneMappingExposure, hex(scene.fog.color), hex(scene.background),
        hex(sun.color), sun.intensity, hex(hemi.color), hex(hemi.groundColor), hemi.intensity, hex(bounce.color), bounce.intensity,
        hex(sunDisc.material.color), sunDisc.visible, sunDisc.scale.x, glow.visible, glow.material.opacity, document.body.className];
    },
  };
  return cycle;
}
