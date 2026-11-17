/**
 * frontend/src/js/pwa.js
 * PWA Registration & Install Prompt Handler (PWA Builder Compliant)
 */

let deferredPrompt = null;

export function initPwa() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for SW updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available! Reloading...');
              }
            });
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Capture Install Prompt for PWA Builder / Chrome / Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured');

    // Show in-app install button
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBanner) {
      installBanner.classList.remove('hidden');
    }
  });

  // 3. Handle Successful Installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed!');
    deferredPrompt = null;
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBanner) {
      installBanner.classList.add('hidden');
    }
  });
}

/**
 * Trigger browser native install dialog
 */
export async function promptPwaInstall() {
  if (!deferredPrompt) {
    alert('Aplikasi sudah terpasang atau browser Anda belum mendukung instalasi PWA otomatis.');
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  deferredPrompt = null;

  const installBanner = document.getElementById('pwa-install-banner');
  if (installBanner) {
    installBanner.classList.add('hidden');
  }
}
