// src/input.js — keyboard state tracker
'use strict';

const input = (() => {
  const held = new Set();        // keys currently held down
  const justDown = new Set();    // keys pressed this frame (cleared by consumer)

  document.addEventListener('keydown', e => {
    if (!held.has(e.code)) justDown.add(e.code);
    held.add(e.code);
    // Prevent page scroll
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', e => {
    held.delete(e.code);
  });

  return {
    // Is a key currently held?
    isDown(code) { return held.has(code); },

    // Was a key pressed this frame? Consumes the flag.
    wasPressed(code) {
      if (justDown.has(code)) { justDown.delete(code); return true; }
      return false;
    },

    // Returns the first active direction from arrow keys or WASD, or null.
    getDir() {
      if (held.has('ArrowUp')    || held.has('KeyW')) return { dx: 0, dy: -1 };
      if (held.has('ArrowDown')  || held.has('KeyS')) return { dx: 0, dy:  1 };
      if (held.has('ArrowLeft')  || held.has('KeyA')) return { dx: -1, dy: 0 };
      if (held.has('ArrowRight') || held.has('KeyD')) return { dx:  1, dy: 0 };
      return null;
    },

    // Returns 0-9 if a digit key is currently held, else -1.
    getDigit() {
      for (let i = 0; i <= 9; i++) {
        if (held.has('Digit' + i)) return i;
      }
      return -1;
    },

    clearAll() { justDown.clear(); },
  };
})();
