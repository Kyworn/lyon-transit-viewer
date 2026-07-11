import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'lyon-transit-onboarded-v1';

const steps = [
  {
    title: 'Bienvenue sur Lyon Transit',
    body: 'Visualise en temps réel tout le réseau TCL : métro, tram, bus, funiculaire — plus Vélo\'v, autopartage et toilettes publiques.',
    emoji: '👋',
  },
  {
    title: 'Choisis ce que tu vois',
    body: 'Le bouton Couches dans la barre du bas te permet d\'afficher/cacher chaque type de donnée (véhicules, arrêts, Vélo\'v…).',
    emoji: '🗂️',
  },
  {
    title: 'Cherche, sélectionne, favorise',
    body: 'Recherche une ligne ou un arrêt, clique pour voir les prochains passages, et ajoute en favori avec l\'étoile.',
    emoji: '⭐',
  },
  {
    title: 'Itinéraire multimodal',
    body: 'Le bouton Itinéraire calcule un trajet métro+bus+vélo+marche avec horaires temps réel.',
    emoji: '🧭',
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {}
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setOpen(false);
  };

  const next = () => {
    if (step >= steps.length - 1) close();
    else setStep(step + 1);
  };

  const s = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="glass-panel"
            style={{
              width: 'min(440px, 100%)',
              padding: 28,
              background: 'rgba(10, 10, 12, 0.95)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>{s.emoji}</div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {s.title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              {s.body}
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={close}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Passer
              </button>
              <button
                onClick={next}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--accent-glow)',
                }}
              >
                {step >= steps.length - 1 ? 'C\'est parti' : 'Suivant'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
