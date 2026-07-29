import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LYNK_EBOOK_URL, LYNK_PAKET_URL } from './BerdayaHero';

export const BerdayaStickyCTA: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky CTA after scrolling past 400px
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="p-3 sm:p-4 rounded-2xl bg-[#0A1D25]/95 border border-teal-500/40 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
        
        <div className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-snug">Buku & Paket Berdaya</h4>
            <p className="text-xs text-slate-300">Pilih opsi sesuai kebutuhan organisasi Anda</p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto">
          <a href={LYNK_EBOOK_URL} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial">
            <Button size="sm" variant="outline" className="w-full border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs py-2.5 px-3 rounded-lg">
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              <span>Ebook Rp129rb</span>
            </Button>
          </a>

          <a href={LYNK_PAKET_URL} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial">
            <Button size="sm" className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-md shadow-teal-500/20">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-300" />
              <span>Paket Rp499rb</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
        </div>

      </div>
    </div>
  );
};
