"use client";
/** A calm, premium blurred backdrop for the lock / setup screens. */
import { motion } from "framer-motion";

export function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      <motion.div
        className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-primary/25 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-500/20 blur-[120px]"
        animate={{ x: [0, -50, 0], y: [0, -30, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/3 top-1/2 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-[130px]"
        animate={{ x: [0, 40, 0], y: [0, -50, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_100%)]" />
    </div>
  );
}
