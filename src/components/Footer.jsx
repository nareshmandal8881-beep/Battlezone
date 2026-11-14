import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaYoutube, FaDiscord } from 'react-icons/fa';
import { APK_URL, showDownload } from './DownloadApp';

const Footer = () => (
  <footer className="border-t border-ink mt-16">
    <div className="wrap py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-[14px]">
      <div className="col-span-2">
        <p className="display text-[28px] mb-2">BattleZone</p>
        <p className="text-muted max-w-sm">
          Custom-room tournaments for mobile and PC players. Pay the entry, get the room ID before the match, play.
        </p>
        <div className="flex gap-4 mt-4 text-lg">
          <a href="#instagram" aria-label="Instagram" className="hover:text-accent"><FaInstagram /></a>
          <a href="#youtube" aria-label="YouTube" className="hover:text-accent"><FaYoutube /></a>
          <a href="#discord" aria-label="Discord" className="hover:text-accent"><FaDiscord /></a>
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3">Site</p>
        <ul className="space-y-2">
          <li><Link to="/tournaments" className="hover:underline">Tournaments</Link></li>
          <li><Link to="/leaderboard" className="hover:underline">Leaderboard</Link></li>
          <li><Link to="/profile" className="hover:underline">My profile</Link></li>
          {showDownload() && <li><a href={APK_URL} download className="hover:underline">Android app (APK)</a></li>}
        </ul>
      </div>
      <div>
        <p className="eyebrow mb-3">Help</p>
        <ul className="space-y-2">
          <li><a href="#contact" className="hover:underline">Contact</a></li>
          <li><a href="#terms" className="hover:underline">Terms</a></li>
          <li><a href="#refunds" className="hover:underline">Refund policy</a></li>
        </ul>
      </div>
    </div>
    <div className="wrap py-4 border-t border-line flex flex-col sm:flex-row justify-between gap-2 text-[12px] text-muted font-mono">
      <span>© {new Date().getFullYear()} BattleZone</span>
      <span>Payments by Razorpay</span>
    </div>
  </footer>
);

export default Footer;
