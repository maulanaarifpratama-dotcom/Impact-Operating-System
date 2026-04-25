import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Problem } from '@/components/landing/Problem';
import { Solution } from '@/components/landing/Solution';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { Footer } from '@/components/landing/Footer';

export default function Index() {
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
