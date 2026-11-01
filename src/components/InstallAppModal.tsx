import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle,
  WifiOff,
  HardHat,
  Apple,
  Monitor,
  ExternalLink,
  Share2,
  Copy,
  Check,
  X,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../utils/pwa';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportBackup?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onExportBackup,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'quick' | 'android' | 'ios' | 'desktop'>('quick');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pwabuilderUrl = `https://www.pwabuilder.com/app?url=${encodeURIComponent(currentUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('Open and install Tahir Builders SiteLedger App on your phone: ' + currentUrl)}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenDirectTab = () => {
    window.open(currentUrl, '_blank');
  };

  const handle1ClickInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    } else {
      // If prompt not ready or in iframe, open direct tab
      handleOpenDirectTab();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Install Tahir Builders App</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  PWA &amp; APK
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Standalone Construction Site Management • 100% Offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Selection Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-3 sm:px-4 pt-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'quick'
                ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Install</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'android'
                ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (APK)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ios'
                ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'desktop'
                ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows &amp; Mac</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-stone-800 text-sm overflow-y-auto flex-1">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                <img src="/apple-touch-icon.png" alt="App Icon" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  TBD SiteLedger (PWA &amp; APK Ready)
                </p>
                <p className="text-xs text-stone-600 mt-0.5">
                  {isInstalled
                    ? 'Currently open in standalone app mode. You can also install or sideload to another phone below.'
                    : 'Installable app for Android, iOS, Windows & Mac with 100% offline access.'}
                </p>
              </div>
            </div>
            {isInstalled && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standalone</span>
              </span>
            )}
          </div>

          {/* TAB 1: QUICK 1-TAP INSTALL */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 sm:p-5 rounded-xl border border-stone-200 text-center space-y-3.5">
                <h4 className="font-black text-stone-900 text-base">Direct Install to Home Screen</h4>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Installs Tahir Builders directly onto your Android phone or PC. Creates a real home screen icon, launches full-screen, and works without internet.
                </p>

                {/* Main 1-Click Action */}
                <div className="space-y-2">
                  <button
                    onClick={handle1ClickInstall}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-orange-500/20 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>{isInstallable ? 'Install App Directly (1-Click)' : 'Install App / Open in Browser'}</span>
                  </button>

                  {/* Standalone APK Quick Download */}
                  <a
                    href={pwabuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs text-stone-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition active:scale-[0.98] cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-amber-800" />
                    <span>Download Standalone Android .APK via PWABuilder</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                  </a>
                </div>

                {isInIframe && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    💡 <strong>Tip:</strong> If inside a preview frame, tapping the button above opens the standalone browser tab where Android automatically shows the native install prompt!
                  </p>
                )}
              </div>

              {/* Offline highlight */}
              <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                  <WifiOff className="w-4 h-4 text-orange-600" />
                  <span>Works 100% Offline at Remote Construction Sites</span>
                </div>
                <p className="text-xs text-stone-600">
                  Once installed, no mobile data or Wi-Fi is needed. All labor daily attendance, site sheets, materials, and contracts are saved securely on your local device.
                </p>
              </div>

              {/* WhatsApp Share & Copy Link for Mobile */}
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    Open on your Android phone:
                  </label>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono text-stone-800 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-stone-700 transition cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID (WEBAPK & NATIVE APK) */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {/* Method 1: Direct WebAPK */}
              <div className="bg-amber-50/70 p-4 sm:p-5 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>Method 1: Direct Android Install (WebAPK)</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Google Chrome on Android packages this PWA into an official <strong>WebAPK</strong>. It appears directly in your phone’s App Drawer with its own app icon and splash screen without requiring “Allow Unknown Sources”.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-stone-800 font-medium bg-white p-3 rounded-lg border border-amber-200">
                  <li>Open this app link in <strong>Google Chrome</strong> on Android.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> in Chrome’s top-right corner.</li>
                  <li>Tap <strong>&ldquo;Install app&rdquo;</strong> (or &ldquo;Add to Home screen&rdquo;).</li>
                  <li>Tap <strong>Install</strong>. Android installs the standalone app!</li>
                </ol>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handle1ClickInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstallable ? 'Trigger Android Install Prompt Now' : 'Open in Chrome to Install'}</span>
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-emerald-400 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <span>Send Link to Phone</span>
                  </a>
                </div>
              </div>

              {/* Method 2: Sideloadable APK */}
              <div className="bg-stone-50 p-4 sm:p-5 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                    <FileCode className="w-4 h-4 text-orange-600" />
                    <span>Method 2: Standalone .APK File (PWABuilder)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Official Microsoft Tool
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  If you need a physical <code className="bg-white px-1 py-0.5 rounded font-mono text-orange-700 border border-stone-300">.apk</code> file to sideload via WhatsApp or USB to workers without internet access:
                </p>
                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 text-xs">
                  <p className="font-semibold text-stone-800">1-Click Direct Generation:</p>
                  <p className="text-stone-600">
                    We pre-configured PWABuilder with your app URL. Tap the button below &rarr; click <strong>&ldquo;Package for Android&rdquo;</strong> to download your signed <code className="font-mono text-stone-800">.apk</code> file!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <a
                    href={pwabuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Generate &amp; Download .APK Now</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPLE IOS */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 space-y-4 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-stone-900 text-white shadow-md">
                  <Apple className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Install on iPhone &amp; iPad</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Apple iOS Safari requires adding to home screen via the native share sheet.
                  </p>
                </div>

                <div className="text-left space-y-3 bg-white p-4 rounded-xl border border-stone-200">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        Open in Safari &amp; Tap Share
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        In Safari bottom toolbar, tap the <strong className="inline-flex items-center gap-1 text-blue-600"><Share2 className="w-3 h-3" /> Share</strong> button.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        Select "Add to Home Screen"
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Scroll down the menu and tap <strong>Add to Home Screen</strong> <span className="text-stone-400 font-mono text-[11px]">(+ icon)</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        Tap "Add" in Top-Right
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        The <strong>TahirBuild</strong> app icon will appear immediately on your home screen and open without Safari address bars!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DESKTOP */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                  <Monitor className="w-4 h-4 text-amber-700" />
                  <span>Windows PC, Mac &amp; Chromebook</span>
                </div>
                <p className="text-xs text-stone-600">
                  You can install this app as a standalone desktop program with its own taskbar/dock icon and window.
                </p>
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 space-y-2 text-xs">
                  <p className="font-semibold text-stone-800">In Google Chrome or Microsoft Edge:</p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600">
                    <li>Look at the right side of the address bar at the top of your screen.</li>
                    <li>Click the <strong>Install Icon</strong> <span className="text-stone-400 font-mono">(computer screen with a down arrow)</span>.</li>
                    <li>Or click the 3 dots in the top-right &rarr; <strong>Save and share</strong> &rarr; <strong>Install Tahir Builders</strong>.</li>
                  </ol>
                </div>
                {isInstallable && (
                  <button
                    onClick={handle1ClickInstall}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on This Computer Now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sideload & Backup sharing notice */}
          {onExportBackup && (
            <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Transfer Data Between Phone &amp; PC</span>
                </p>
                <p className="text-[11px] text-stone-600">
                  Download a backup file to move all sites, wages, and weekly reports across installed devices.
                </p>
              </div>
              <button
                onClick={onExportBackup}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Backup JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-500 font-medium">
            Tahir Builders &amp; Developers • Construction Control System
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
