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
  //
  // Why this is more involved than a single scrollIntoView:
  // - On direct load (e.g. user opens /#pricing in a new tab) the browser tries to
  //   jump before React has mounted the section, so the element is missing or
  //   measured at 0. We poll with rAF for up to ~1.5s until the target exists AND
  //   its offset stabilises (images/fonts can shift layout).
  // - The Navbar is sticky and ~64px tall, so we manually offset by NAV_OFFSET
  //   instead of relying on scrollIntoView (which would land the section under
  //   the navbar). `scroll-mt-20` on each section is a CSS fallback for the
  //   browser's own anchor jump.
  useEffect(() => {
    const NAV_OFFSET = 72; // sticky navbar (h-16 = 64px) + small breathing room

    const scrollToTarget = (id: string) => {
      let lastTop = -1;
      let stableFrames = 0;
      const start = performance.now();

      const tick = () => {
        const el = document.getElementById(id);
        const elapsed = performance.now() - start;

        if (!el) {
          if (elapsed < 1500) requestAnimationFrame(tick);
          return;
        }

        const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;

        // Wait until the offset is stable across 2 frames (layout settled),
        // or bail out after the budget so we still scroll *something*.
        if (Math.abs(top - lastTop) < 1) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        lastTop = top;

        if (stableFrames >= 2 || elapsed > 1500) {
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          return;
        }
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const handleHash = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      const id = decodeURIComponent(hash.slice(1));
      scrollToTarget(id);
    };

    // Cancel the browser's default jump (which lands under the navbar)
    // and run our own offset-aware scroll.
    if (window.location.hash) {
      // Reset scroll so the polling loop measures from a known position.
      window.scrollTo({ top: 0, behavior: 'auto' });
      handleHash();
    }
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
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
