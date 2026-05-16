import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SplashScreen = () => {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => navigate("/connect"), 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background bg-grid-pattern"
        >
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(200_100%_50%/0.08)_0%,transparent_60%)]" />
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mb-6"
          >
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/30 bg-card">
              <Activity className="h-12 w-12 text-primary drop-shadow-[0_0_12px_hsl(200,100%,50%)]" />
              <div className="absolute inset-0 rounded-2xl bg-primary/5" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-3xl font-bold tracking-tight text-foreground"
          >
            Smart <span className="text-primary text-glow-primary">LCR</span> Lab
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            Precision Component Analysis
          </motion.p>

          {/* Scanning line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-border"
          >
            <div className="h-full w-1/3 rounded-full bg-primary animate-scan-line" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
