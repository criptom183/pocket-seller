import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALLED_STORAGE_KEY = 'pocketseller_pwa_installed_v1';

// Module-level state so beforeinstallprompt is captured immediately even before React mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore subscriber error
    }
  });
}

function getStoredInstalledState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredInstalledState(installed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (installed) {
      localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(INSTALLED_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as unknown as { __deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).__deferredPWAInstallPrompt =
      globalDeferredPrompt;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    setStoredInstalledState(true);
    notifySubscribers();
  });
}

export function checkIsRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneMedia || isNavigatorStandalone);
}

export function checkIsInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIPhoneIPad = /iphone|ipad|ipod/.test(ua);
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isIPhoneIPad || isIPadOS;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [hasBeenInstalled, setHasBeenInstalled] = useState<boolean>(() =>
    getStoredInstalledState()
  );
  const [isRunningStandalone, setIsRunningStandalone] = useState<boolean>(() =>
    checkIsRunningStandalone()
  );
  const [isInIframe] = useState<boolean>(() => checkIsInIframe());
  const [isIOS] = useState<boolean>(() => checkIsIOS());
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setHasBeenInstalled(getStoredInstalledState());
      setIsRunningStandalone(checkIsRunningStandalone());
    };

    subscribers.add(syncState);
    syncState();

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    const handleMediaChange = () => {
      setIsRunningStandalone(checkIsRunningStandalone());
    };

    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      subscribers.delete(syncState);
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    setIsInstalling(true);
    try {
      let promptEvent = globalDeferredPrompt;

      // If globalDeferredPrompt isn't immediately available on click, poll briefly up to 1.5 seconds
      if (!promptEvent) {
        const start = Date.now();
        while (!globalDeferredPrompt && Date.now() - start < 1500) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        promptEvent = globalDeferredPrompt;
      }

      if (!promptEvent) {
        return 'unavailable';
      }

      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        globalDeferredPrompt = null;
        setStoredInstalledState(true);
        notifySubscribers();
        return 'accepted';
      }

      return 'dismissed';
    } catch {
      return 'unavailable';
    } finally {
      setIsInstalling(false);
    }
  }, []);

  const markNotInstalled = useCallback(() => {
    setStoredInstalledState(false);
    notifySubscribers();
  }, []);

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt,
    hasBeenInstalled,
    isRunningStandalone,
    isInIframe,
    isIOS,
    isInstalling,
    install,
    markNotInstalled,
  };
}
