// install.js — PWA install / uninstall handling

let deferredPrompt = null;
let isInstalled = false;

export function initInstall({ onInstallAvailable, onInstalled, onInstallHide }) {
  // Detect if already running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    isInstalled = true;
    onInstalled?.();
    return;
  }

  // iOS: no beforeinstallprompt, show manual guide
  if (isIOS()) {
    onInstallAvailable?.({ type: 'ios' });
    return;
  }

  // Chrome/Android: capture the event
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    onInstallAvailable?.({ type: 'native' });
  });

  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    onInstalled?.();
    onInstallHide?.();
  });
}

export async function triggerInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

export function getUninstallInstructions() {
  if (isIOS()) {
    return 'Na iOS: naciśnij przycisk Udostępnij → „Usuń z ekranu głównego"';
  }
  if (/android/i.test(navigator.userAgent)) {
    return 'Na Android: przytrzymaj ikonę aplikacji → „Odinstaluj" lub usuń ze strony Ustawienia';
  }
  return 'W Chrome: menu (⋮) → „Odinstaluj Śpiewnik…"';
}

export function isIOS() {
  return /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export function getIOSInstallInstructions() {
  return [
    'Otwórz tę stronę w przeglądarce Safari',
    'Naciśnij przycisk Udostępnij (⬆)',
    'Wybierz „Dodaj do ekranu głównego"',
    'Naciśnij „Dodaj"'
  ];
}

export function checkInstallState() {
  return isInstalled;
}
