import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

const APP_NAME = 'PocketSeller - WhatsApp Order Hub';
const SHORT_NAME = 'PocketSeller';
const GITHUB_PAGES_LIVE_URL = 'https://criptom183.github.io/pocket-seller/';

function getEffectiveLiveUrl(): string {
  if (typeof window === 'undefined') return GITHUB_PAGES_LIVE_URL;
  const href = window.location.href.split('#')[0];
  if (href.includes('github.io')) {
    return href;
  }
  return GITHUB_PAGES_LIVE_URL;
}

type ActiveModalType = 'none' | 'ios' | 'iframe' | 'fallback_menu' | 'troubleshoot';

export const PWAInstallButton: React.FC = () => {
  const {
    hasBeenInstalled,
    isRunningStandalone,
    isInIframe,
    isIOS,
    isInstalling,
    install,
    markNotInstalled,
  } = usePWAInstall();

  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const liveUrl = getEffectiveLiveUrl();

  // Generate QR code whenever iframe modal is opened
  useEffect(() => {
    let active = true;
    if (activeModal === 'iframe') {
      QRCode.toDataURL(liveUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          if (active) setQrDataUrl(url);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [activeModal, liveUrl]);

  const handleSmartInstallClick = async () => {
    if (isIOS) {
      setActiveModal('ios');
      return;
    }

    if (isInIframe) {
      setActiveModal('iframe');
      return;
    }

    const outcome = await install();
    if (outcome === 'unavailable') {
      setActiveModal('fallback_menu');
    }
  };

  // Wire any remaining secondary install buttons (#headerInstallPwaBtn, #installBannerBtn, #modalInstallPromptBtn)
  useEffect(() => {
    const buttonIds = ['headerInstallPwaBtn', 'installBannerBtn', 'modalInstallPromptBtn'];
    const handleExternalClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      void handleSmartInstallClick();
    };

    const attachedElements: HTMLElement[] = [];
    buttonIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        if (isRunningStandalone) {
          el.classList.add('hidden');
        } else {
          el.classList.remove('hidden');
          el.addEventListener('click', handleExternalClick);
          attachedElements.push(el);
        }
      }
    });

    return () => {
      attachedElements.forEach((el) => {
        el.removeEventListener('click', handleExternalClick);
      });
    };
  });

  const handleCopyLiveLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(liveUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = liveUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Ignore copy error
    }
  };

  const handleReinstallReset = () => {
    markNotInstalled();
    setActiveModal('fallback_menu');
  };

  // Hide completely when launched as an installed standalone PWA from the phone's home screen
  if (isRunningStandalone) {
    return null;
  }

  return (
    <>
      {/* Home Screen Install Banner - Always visible in browser tabs so the user can easily install */}
      <div className="mb-4 rounded-[24px] bg-white text-[#0A1233] p-4 sm:p-5 shadow-xs border border-[#E3E5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src="pwa-192x192.png"
            alt={SHORT_NAME}
            className="w-12 h-12 rounded-2xl border border-[#E3E5F0] shadow-xs shrink-0 object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-semibold tracking-tight text-[#0A1233]">
                Install {SHORT_NAME} on Your Phone
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6EAF8] text-[#0F2273]">
                100% Offline Ready
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 leading-snug">
              Save to your home screen like a native app &mdash; works offline &amp; keeps orders safe.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            id="smartPwaInstallTriggerBtn"
            onClick={handleSmartInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto px-5 py-3 rounded-[16px] bg-[#0F2273] hover:bg-[#071A52] active:scale-95 text-white text-xs sm:text-sm font-extrabold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[46px]"
          >
            <span className="text-base leading-none">📲</span>
            <span>{isInstalling ? 'Checking...' : 'Install App / Save to Phone'}</span>
          </button>
          {hasBeenInstalled && (
            <button
              type="button"
              onClick={() => setActiveModal('troubleshoot')}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-[#0F2273] underline underline-offset-2 text-center cursor-pointer whitespace-nowrap"
            >
              Can&apos;t find app icon?
            </button>
          )}
        </div>
      </div>

      {/* MODAL 1: iOS Safari Step-by-Step Guide */}
      {activeModal === 'ios' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1233]/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal('none');
          }}
        >
          <div className="bg-white w-full max-w-md rounded-[26px] shadow-2xl border border-[#E3E5F0] overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="./pwa-192x192.png"
                  alt={SHORT_NAME}
                  className="w-11 h-11 rounded-2xl border border-[#E3E5F0]"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0A1233]">
                    Install on iPhone / iPad
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add {SHORT_NAME} to your Home Screen in 2 taps
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-9 h-9 rounded-full bg-[#F4F5FA] hover:bg-[#E6EAF8] text-[#0A1233] flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FDECE6] text-[#B43E18] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-[#0A1233]">Tap the Share button in Safari</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Look at the bottom (or top) bar of Safari and tap the{' '}
                    <strong className="text-[#0A1233]">Share icon (square with arrow pointing up ⎋)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FDECE6] text-[#B43E18] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-[#0A1233]">Select &ldquo;Add to Home Screen&rdquo;</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Scroll down the share sheet, tap{' '}
                    <strong className="text-[#0A1233]">&ldquo;Add to Home Screen ⊞&rdquo;</strong>, then tap{' '}
                    <strong className="text-[#0A1233]">Add</strong> in the top-right corner.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="w-full py-3 rounded-[16px] bg-[#0F2273] hover:bg-[#071A52] text-white text-xs sm:text-sm font-extrabold cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Iframe Preview Modal (Open Live App + Copy Link + Auto QR Code) */}
      {activeModal === 'iframe' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1233]/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal('none');
          }}
        >
          <div className="bg-white w-full max-w-md rounded-[26px] shadow-2xl border border-[#E3E5F0] overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="./pwa-192x192.png"
                  alt={SHORT_NAME}
                  className="w-11 h-11 rounded-2xl border border-[#E3E5F0]"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0A1233]">
                    Install {SHORT_NAME} on Phone
                  </h3>
                  <p className="text-xs text-slate-500">
                    Open the live app outside the preview frame to install
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-9 h-9 rounded-full bg-[#F4F5FA] hover:bg-[#E6EAF8] text-[#0A1233] flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#B43E18] font-medium leading-relaxed bg-[#FDECE6] border border-[#F7D1C4] rounded-2xl p-3">
              Browsers block direct app installation inside preview frames. Scan the QR code below with your phone camera or open the live link directly:
            </p>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-3 bg-[#F4F5FA] rounded-2xl border border-[#E3E5F0]">
                <img
                  src={qrDataUrl}
                  alt="Scan QR code to install PocketSeller"
                  className="w-44 h-44 rounded-xl bg-white p-2 shadow-xs"
                />
                <span className="text-[11px] font-bold text-slate-600 mt-2">
                  Scan with your phone camera to open &amp; install
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-[16px] bg-[#0F2273] hover:bg-[#071A52] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <span>🚀 Open Live App</span>
              </a>
              <button
                type="button"
                onClick={handleCopyLiveLink}
                className="w-full py-3 px-4 rounded-[16px] bg-[#E6EAF8] hover:bg-[#D8DFF5] text-[#0F2273] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{copiedLink ? '✓ Link Copied!' : '📋 Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Fallback / Incognito 2-Step Browser Menu Guide */}
      {activeModal === 'fallback_menu' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1233]/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal('none');
          }}
        >
          <div className="bg-white w-full max-w-md rounded-[26px] shadow-2xl border border-[#E3E5F0] overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="./pwa-192x192.png"
                  alt={SHORT_NAME}
                  className="w-11 h-11 rounded-2xl border border-[#E3E5F0]"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0A1233]">
                    Add {SHORT_NAME} to Phone
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quick 2-step install from your browser menu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-9 h-9 rounded-full bg-[#F4F5FA] hover:bg-[#E6EAF8] text-[#0A1233] flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FDECE6] text-[#B43E18] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-[#0A1233]">Tap the 3-dot browser menu (⋮)</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tap the <strong className="text-[#0A1233]">⋮ menu icon</strong> in the top-right corner of Chrome (or your mobile browser).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FDECE6] text-[#B43E18] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-[#0A1233]">
                    Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Select <strong className="text-[#0A1233]">📲 Install app</strong> (or <strong className="text-[#0A1233]">Add to Home screen</strong>) and confirm. Note: Make sure you are not in Incognito/Private mode.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="w-full py-3 rounded-[16px] bg-[#0F2273] hover:bg-[#071A52] text-white text-xs sm:text-sm font-extrabold cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Post-Install Troubleshooting Modal ("App Added to Phone! Can't find it?") */}
      {activeModal === 'troubleshoot' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1233]/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal('none');
          }}
        >
          <div className="bg-white w-full max-w-md rounded-[26px] shadow-2xl border border-[#E3E5F0] overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="./pwa-192x192.png"
                  alt={SHORT_NAME}
                  className="w-11 h-11 rounded-2xl border border-[#E3E5F0]"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0A1233]">
                    Where is {SHORT_NAME} on my phone?
                  </h3>
                  <p className="text-xs text-slate-500">
                    How to locate or re-add the app icon
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-9 h-9 rounded-full bg-[#F4F5FA] hover:bg-[#E6EAF8] text-[#0A1233] flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] space-y-1">
                <p className="font-extrabold text-[#0A1233]">
                  1. Check your Android App Drawer
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Swipe up from the bottom of your phone&apos;s home screen to open the <strong>App Drawer</strong>, search for <strong>&ldquo;{SHORT_NAME}&rdquo;</strong>, and long-press the icon to <strong>&ldquo;Add to Home&rdquo;</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4F5FA] border border-[#E3E5F0] space-y-1">
                <p className="font-extrabold text-[#0A1233]">
                  2. Check your Notification Bar
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Android takes a few seconds to build and verify the standalone app package (WebAPK). Check your top notification bar for <em>&ldquo;Adding {APP_NAME}...&rdquo;</em> or <em>&ldquo;App installed&rdquo;</em>.
                </p>
              </div>
            </div>

            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleReinstallReset}
                className="w-full py-3 px-4 rounded-[16px] bg-[#E6EAF8] hover:bg-[#D8DFF5] text-[#0F2273] text-xs font-extrabold cursor-pointer transition-colors"
              >
                🔄 Re-install / Show Install Button Again
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-full py-2.5 px-4 rounded-[16px] bg-[#F4F5FA] hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
