// Visibility is also emitted by the Android WebView. Returning never invents work.
export function attachRunnerLifecycle(runner, doc = globalThis.document, nav = globalThis.navigator) {
  let lock = null, disposed = false;
  const acquire = async () => {
    if (disposed || doc?.visibilityState === 'hidden' || runner.phase === 'done' || lock || !nav?.wakeLock) return;
    try {
      const acquired = await nav.wakeLock.request('screen');
      if (disposed || doc?.visibilityState === 'hidden') await acquired.release();
      else { lock = acquired; acquired.addEventListener?.('release', () => { if (lock === acquired) lock = null; }); }
    } catch { /* Screen lock prevention is optional; the runner remains usable. */ }
  };
  const release = () => { const held = lock; lock = null; held?.release().catch(() => {}); };
  const hidden = () => { runner.suspend('App verlassen – Weiter zum Fortsetzen'); release(); };
  const visibility = () => { if (doc.visibilityState === 'hidden') hidden(); else acquire(); };
  doc?.addEventListener('visibilitychange', visibility);
  doc?.defaultView?.addEventListener('pagehide', hidden);
  acquire();
  return () => {
    disposed = true; release();
    doc?.removeEventListener('visibilitychange', visibility);
    doc?.defaultView?.removeEventListener('pagehide', hidden);
  };
}
