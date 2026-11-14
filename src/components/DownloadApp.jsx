import React from 'react';
import { Capacitor } from '@capacitor/core';
import { FaAndroid } from 'react-icons/fa';

// Firebase's free plan can't host APK files, so the APK lives in the GitHub repo.
export const APK_URL = 'https://github.com/nareshmandal8881-beep/Battlezone/raw/main/apk/BattleZone.apk';

// Hidden inside the Android app itself (it's already installed there).
export const showDownload = () => !Capacitor.isNativePlatform();

export const DownloadAppButton = ({ className = 'btn btn-light', label = 'Download app' }) =>
  showDownload() ? (
    <a href={APK_URL} download="BattleZone.apk" className={className}>
      <FaAndroid className="text-[16px]" /> {label}
    </a>
  ) : null;

// Full-width strip used on the home page.
export const DownloadAppStrip = () =>
  showDownload() ? (
    <section className="border-b border-ink bg-ink text-white">
      <div className="wrap py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <FaAndroid className="text-[40px] text-[#3ddc84] shrink-0" />
          <div>
            <h2 className="text-[32px] sm:text-[40px]">Get the Android app</h2>
            <p className="text-[#bdb9b0] text-[14px] mt-1 max-w-md">
              Same account, faster Google login, and it updates itself whenever we ship something new. About 7 MB.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <a href={APK_URL} download="BattleZone.apk"
            className="btn h-12 px-6 bg-white text-ink border-white hover:bg-accent hover:border-accent hover:text-white">
            <FaAndroid /> Download APK
          </a>
          <span className="font-mono text-[11px] text-[#8d8a83]">Android 5.1+ · allow "install unknown apps" when asked</span>
        </div>
      </div>
    </section>
  ) : null;
