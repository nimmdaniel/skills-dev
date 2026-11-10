import { vosChangelog } from './scripts/vos-changelog/vos-changelog-vite.mjs'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 8 / Rolldown appends a content-hash to the `__VITE_PRELOAD__` marker
// (`__VITE_PRELOAD__50b3…`). Vite's import-analysis then replaces only the
// 16-char marker, leaving `[]50b3…` — invalid JS (black screen, same as vos-6pack).
// Preventive: Capacitor lazy `import('./web')` is not in the web bundle yet, but
// deps are present and Native Google login will pull them in.
function fixRolldownPreloadMarker() {
  return {
    name: 'fix-rolldown-preload-marker',
    renderChunk(code) {
      if (!code.includes('__VITE_PRELOAD__')) return null;
      const next = code.replace(/__VITE_PRELOAD__[a-f\d]{8,}/g, '__VITE_PRELOAD__');
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    vosChangelog({ appId: 'skills', appName: 'Skills', accent: '#fb923c' }),
    react(),
    fixRolldownPreloadMarker(),
  ],
});
