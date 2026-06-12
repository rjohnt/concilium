"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, PartyPopper, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface BuildCompleteCelebrationProps {
  ticketId: string;
  ticketTitle: string;
}

export function BuildCompleteCelebration({
  ticketId,
  ticketTitle,
}: BuildCompleteCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Stagger the animation entrance
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Generate confetti particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.5,
    color: i % 3 === 0 ? "#c9a84c" : i % 3 === 1 ? "#6b8f5e" : "#6b8fa8",
    size: 4 + Math.random() * 8,
  }));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-olive/30 bg-gradient-to-br from-olive/5 via-raised to-[var(--success-100)]"
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  left: `${p.x}%`,
                  top: -10,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
                animate={{
                  y: [0, 400],
                  x: [0, (Math.random() - 0.5) * 100],
                  opacity: [1, 0],
                  rotate: [0, 360 * Math.random()],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-olive/20 border-2 border-olive/40 mb-4"
            >
              <PartyPopper size={40} className="text-olive" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-ink-primary mb-2"
            >
              Build Complete!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-ink-secondary mb-2"
            >
              {ticketTitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-ink-muted mb-6"
            >
              <CheckCircle2 size={12} className="inline mr-1 text-olive" />
              The build report has been generated and the ticket is now complete.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-3"
            >
              <Link
                href={`/ticket/${ticketId}`}
                className="btn-primary"
              >
                <Sparkles size={16} />
                View Ticket
              </Link>
              <Link
                href="/"
                className="btn-secondary"
              >
                <ArrowRight size={16} />
                Dashboard
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
