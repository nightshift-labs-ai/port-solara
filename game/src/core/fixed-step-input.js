// Keyboard and mouse: handlers only record state and queue presses; the fixed tick reads them.
export function readKeyboardAndMouse(canvas) {
  const input = {
    held: new Set(),
    presses: [],
    lookX: 0,
    lookY: 0,
    pointerLocked: false,
    axis(neg, pos) { return (this.held.has(pos) ? 1 : 0) - (this.held.has(neg) ? 1 : 0); },
    takePresses() { const p = this.presses; this.presses = []; return p; },
    takeLook() { const l = { x: this.lookX, y: this.lookY }; this.lookX = 0; this.lookY = 0; return l; },
    setKey(code, down) {
      if (down && !this.held.has(code)) this.presses.push(code);
      if (down) this.held.add(code); else this.held.delete(code);
    },
  };
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    input.setKey(e.code, true);
  });
  addEventListener('keyup', (e) => input.setKey(e.code, false));
  addEventListener('blur', () => input.held.clear());
  canvas.addEventListener('click', () => { if (!input.pointerLocked && canvas.requestPointerLock) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => { input.pointerLocked = document.pointerLockElement === canvas; });
  addEventListener('mousemove', (e) => {
    if (!input.pointerLocked) return;
    input.lookX += e.movementX;
    input.lookY += e.movementY;
  });
  return input;
}

export const FIXED_STEP_SECONDS = 1 / 60;
export const MAX_SUBSTEPS = 4;
