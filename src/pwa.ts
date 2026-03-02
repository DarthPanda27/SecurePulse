export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          const shouldUpdate = window.confirm(
            'A new SecurePulse update is available. Reload now to use the latest version?',
          );

          if (shouldUpdate) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
