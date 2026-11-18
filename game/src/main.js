import * as THREE from 'three';

// Boots Port Solara: renderer, scene and a 60 Hz fixed-step loop.
export function bootPortSolara() {
  const canvas = document.getElementById('city-view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6fa8dc);
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.5, 480);
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

bootPortSolara();
