import { init } from './ui.js';

// Small delay so the splash is visible on first paint, then boot the app.
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(init, 500);
});
