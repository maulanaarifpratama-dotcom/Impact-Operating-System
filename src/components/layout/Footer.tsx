import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Globe, Linkedin, Instagram, Twitter } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer() {
  return (
    <footer className="bg-brand-surface-deep border-t border-white/5 py-12 sm:py-16 text-slate-300">
      <div className="container max-w-6xl mx-auto px-4">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-auto text-teal-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Sistem manajemen program terlengkap dan pertama di Indonesia yang didedikasikan sepenuhnya untuk mengoptimalkan operasional dan akuntabilitas NGO.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://linkedin.com/company/impactory" 
                target="_blank" 
                rel="noreferrer noopener"
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-teal-500/10 hover:text-teal-400 border border-white/5 transition-colors flex items-center justify-center text-slate-400"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com/impactoryindonesia" 
                target="_blank" 
                rel="noreferrer noopener"
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-teal-500/10 hover:text-teal-400 border border-white/5 transition-colors flex items-center justify-center text-slate-400"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://x.com/impactoryid" 
                target="_blank" 
                rel="noreferrer noopener"
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-teal-500/10 hover:text-teal-400 border border-white/5 transition-colors flex items-center justify-center text-slate-400"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links Column 1: Produk */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Produk</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="/#features" className="text-slate-400 hover:text-teal-400 transition-colors">Fitur</a>
              </li>
              <li>
                <Link to="/pricing" className="text-slate-400 hover:text-teal-400 transition-colors">Harga</Link>
              </li>
              <li>
                <Link to="/dashboard/grant-finder" className="text-slate-400 hover:text-teal-400 transition-colors">Grant Finder</Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Perusahaan */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Perusahaan</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-teal-400 transition-colors">Tentang</Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-teal-400 transition-colors">Kontak</Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Legal */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-teal-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-teal-400 transition-colors">Syarat Layanan</Link>
              </li>
            </ul>
          </div>

          {/* Links Column 4: Sosial */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">Sosial</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="https://linkedin.com/company/impactory" target="_blank" rel="noreferrer noopener" className="text-slate-400 hover:text-teal-400 transition-colors">LinkedIn</a>
              </li>
              <li>
                <a href="https://instagram.com/impactoryindonesia" target="_blank" rel="noreferrer noopener" className="text-slate-400 hover:text-teal-400 transition-colors">Instagram</a>
              </li>
              <li>
                <a href="https://x.com/impactoryid" target="_blank" rel="noreferrer noopener" className="text-slate-400 hover:text-teal-400 transition-colors">Twitter/X</a>
              </li>
            </ul>
          </div>

        </div>

        <hr className="border-white/5 my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wider uppercase">
            © 2026 Impactory. Dibuat dengan <Heart className="inline h-3 w-3 text-rose-500 fill-rose-500 mx-0.5" /> untuk NGO Indonesia.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Globe className="h-3.5 w-3.5 text-slate-600" />
            <span>Indonesia</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
