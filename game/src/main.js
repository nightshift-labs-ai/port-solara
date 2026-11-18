import * as THREE from 'three';
import { buildCityDistricts, districtAt } from './world/city-builder.js';
import { buildRoadNetwork } from './world/road-network.js';
import { createSunSoakedLighting } from './world/sunlight-and-sea.js';
import { PORT_SOLARA_NAMES } from './story/port-solara-lore.js';
import { readKeyboardAndMouse, FIXED_STEP_SECONDS, MAX_SUBSTEPS } from './core/fixed-step-input.js';
import { createSeededRandom, createSpatialHash } from './core/seeded-world-tools.js';

// Boots Port Solara: one shared game object, the city, and a 60 Hz fixed-step loop.
export function bootPortSolara() {
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('city-view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 16 / 10, 0.3, 480);
  const game = {
    THREE, scene, camera, renderer, params,
    seed: Number(params.get('seed') || 1),
    lore: PORT_SOLARA_NAMES,
    collide: createSpatialHash(16),
    input: readKeyboardAndMouse(canvas),
    time: 0,
    tick: 0,
    districtAt,
  };
  game.random = createSeededRandom(game.seed);

  const t0 = performance.now();
  buildRoadNetwork(game);
  game.light = createSunSoakedLighting(game);
  buildCityDistricts(game);
  game.cityBuildMs = performance.now() - t0;

  game.step = () => {
    game.time += FIXED_STEP_SECONDS;
    game.tick++;
  };
  game.render = () => {
    const a = game.time * 0.05;
    camera.position.set(-60 + Math.cos(a) * 220, 90, Math.sin(a) * 220);
    camera.lookAt(-40, 10, -40);
    game.light.follow(camera.position);
    renderer.render(scene, camera);
  };
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  let last = performance.now(), acc = 0;
  renderer.setAnimationLoop((now) => {
    acc = Math.min(acc + (now - last) / 1000, FIXED_STEP_SECONDS * MAX_SUBSTEPS);
    last = now;
    while (acc >= FIXED_STEP_SECONDS) { game.step(); acc -= FIXED_STEP_SECONDS; }
    game.render();
  });
  window.portSolara = game;
  return game;
}

bootPortSolara();
