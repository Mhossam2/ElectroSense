import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Sparkles, Zap, GraduationCap, ArrowRight, Activity
} from "lucide-react";

const components = [
  {
    name: "Resistor", slug: "resistor", color: "bg-resistor", textColor: "text-resistor",
    symbol: "R", tagline: "Limits current",
    oneLiner: "Like a narrow pipe for electrons — restricts how much current can flow.",
    difficulty: "Beginner", range: "1Ω – 10MΩ",
    keywords: ["ohm", "ω", "ohms law", "current limit"],
  },
  {
    name: "Capacitor", slug: "capacitor", color: "bg-capacitor", textColor: "text-capacitor",
    symbol: "C", tagline: "Stores charge",
    oneLiner: "A tiny rechargeable bucket for electricity — fills up, then releases.",
    difficulty: "Beginner", range: "1pF – 10000µF",
    keywords: ["farad", "µf", "nf", "smoothing"],
  },
  {
    name: "Inductor", slug: "inductor", color: "bg-inductor", textColor: "text-inductor",
    symbol: "L", tagline: "Stores magnetism",
    oneLiner: "A coil that hates current changes — uses a magnetic field to push back.",
    difficulty: "Intermediate", range: "1µH – 100H",
    keywords: ["henry", "coil", "choke"],
  },
  {
    name: "Diode", slug: "diode", color: "bg-diode", textColor: "text-diode",
    symbol: "D", tagline: "One-way valve",
    oneLiner: "Electricity's check-valve — current passes one way, blocked the other.",
    difficulty: "Beginner", range: "0.3V – 0.7V Vf",
    keywords: ["led", "rectifier", "schottky", "zener"],
  },
  {
    name: "BJT", slug: "bjt", color: "bg-bjt", textColor: "text-bjt",
    symbol: "Q", tagline: "Current amplifier",
    oneLiner: "A small current at the base controls a much bigger one — like a faucet.",
    difficulty: "Advanced", range: "β: 50–300",
    keywords: ["transistor", "npn", "pnp", "amplifier"],
  },
  {
    name: "MOSFET", slug: "mosfet", color: "bg-mosfet", textColor: "text-mosfet",
    symbol: "M", tagline: "Voltage switch",
    oneLiner: "An efficient electronic switch — voltage on the gate turns it on/off.",
    difficulty: "Advanced", range: "Vth: 1–5V",
    keywords: ["fet", "transistor", "switch", "power"],
  },
];

const learningPaths = [
  {
    title: "Beginner's Path",
    icon: GraduationCap,
    description: "Start here if you're new to electronics",
    color: "text-resistor",
    border: "border-resistor/30",
    bg: "bg-resistor/5",
    steps: ["resistor", "capacitor", "diode"],
  },
  {
    title: "Power Electronics",
    icon: Zap,
    description: "Switching, regulation & power components",
    color: "text-mosfet",
    border: "border-mosfet/30",
    bg: "bg-mosfet/5",
    steps: ["mosfet", "diode", "inductor"],
  },
  {
    title: "Analog & Signals",
    icon: Activity,
    description: "Filters, amplifiers & frequency response",
    color: "text-capacitor",
    border: "border-capacitor/30",
    bg: "bg-capacitor/5",
    steps: ["capacitor", "inductor", "bjt"],
  },
];

const LearnIndex = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return components;
    return components.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q) ||
      c.symbol.toLowerCase() === q ||
      c.keywords.some(k => k.includes(q))
    );
  }, [query]);

  // Mock "currently measuring" — capacitor for the demo
  const detected = components.find(c => c.slug === "capacitor")!;

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Learn Hub</span>
        </div>
        <h1 className="text-2xl font-bold leading-tight mb-1">Master your components</h1>
        <p className="text-sm text-muted-foreground">
          Bite-sized lessons with formulas, calculators and references — all in one place per part.
        </p>
      </motion.div>

      {/* "Currently measuring" featured card */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/learn/${detected.slug}`)}
            className="mb-5 w-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 text-left transition-all hover:border-primary/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Now Measuring</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${detected.color}/15 border ${detected.color.replace("bg-", "border-")}/30`}>
                <span className={`font-mono text-2xl font-bold ${detected.textColor}`}>{detected.symbol}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">Learn about {detected.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{detected.oneLiner}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            </div>
          </motion.button>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components, symbols, or topics…"
              className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Learning paths */}
          {!query && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Learning Paths
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {learningPaths.map((path, i) => (
                  <motion.button
                    key={path.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/learn/${path.steps[0]}`)}
                    className={`shrink-0 w-[200px] rounded-xl border p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${path.border} ${path.bg}`}
                  >
                    <path.icon className={`h-4 w-4 mb-1.5 ${path.color}`} />
                    <p className={`text-xs font-bold mb-0.5 ${path.color}`}>{path.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{path.description}</p>
                    <div className="mt-2 flex items-center gap-0.5">
                      {path.steps.map((s, idx) => (
                        <span key={s} className="text-[9px] font-mono text-muted-foreground">
                          {components.find(c => c.slug === s)?.symbol}
                          {idx < path.steps.length - 1 && <span className="mx-1 opacity-40">→</span>}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Component grid */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {query ? `Results (${filtered.length})` : "All Components"}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No components match "{query}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((comp, i) => (
                <motion.button
                  key={comp.slug}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/learn/${comp.slug}`)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 active:scale-[0.97]"
                >
                  {/* Difficulty pill */}
                  <span className={`absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    comp.difficulty === "Beginner" ? "bg-inductor/15 text-inductor" :
                    comp.difficulty === "Intermediate" ? "bg-resistor/15 text-resistor" :
                    "bg-mosfet/15 text-mosfet"
                  }`}>
                    {comp.difficulty}
                  </span>

                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-2 ${comp.color}/15 border ${comp.color.replace("bg-", "border-")}/20`}>
                    <span className={`font-mono text-xl font-bold ${comp.textColor}`}>{comp.symbol}</span>
                  </div>
                  <p className="text-sm font-bold">{comp.name}</p>
                  <p className={`text-[10px] font-medium ${comp.textColor} mb-1`}>{comp.tagline}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{comp.oneLiner}</p>
                </motion.button>
              ))}
            </div>
          )}
    </div>
  );
};

export default LearnIndex;
