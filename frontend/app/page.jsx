"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel"
        style={{ maxWidth: '600px', width: '90%' }}
      >
        <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem', textShadow: '0 0 10px var(--primary-glow)' }}>
          RoadGuardian AI
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
          Real-time AI-powered pothole detection and maintenance planning.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button className="neon-btn" onClick={() => router.push('/login')}>
            Login
          </button>
          <button className="neon-btn accent" onClick={() => router.push('/register')}>
            Register
          </button>
        </div>
      </motion.div>
    </div>
  );
}
