import { useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Problem } from '@/components/landing/Problem';
import { Solution } from '@/components/landing/Solution';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { Footer } from '@/components/landing/Footer';

export default function Index() {
  // Smooth-scroll to anchor target on initial load + on subsequent hash changes.
  // 100ms delay lets layout/animations settle before we measure target offset.
  // Fixes: direct-load of /#pricing or /#features not auto-scrolling.
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      const id = hash.slice(1);
      window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Pricing />
        <WaitlistForm />
      </main>
      <Footer />
    </div>
  );
}
