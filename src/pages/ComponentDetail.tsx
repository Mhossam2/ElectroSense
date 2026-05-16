import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Activity, AlertTriangle, BookOpen, Zap,
  Lightbulb, Wrench, Brain, ChevronLeft, ChevronRight, Sparkles,
  CheckCircle2, XCircle, Calculator as CalcIcon, BookMarked
} from "lucide-react";
import EmbeddedCalculator from "@/components/learn/EmbeddedCalculator";
import EmbeddedReference from "@/components/learn/EmbeddedReference";

interface CompData {
  name: string;
  color: string;
  textColor: string;
  borderColor: string;
  symbol: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  oneLiner: string;
  analogy: { title: string; body: string };
  whatItDoes: string;
  whenToUse: string[];
  formulas: { eq: string; meaning: string }[];
  ranges: string[];
  failures: { symptom: string; cause: string }[];
  howMeasured: string;
  funFact: string;
  quiz: { q: string; choices: string[]; answer: number; explain: string };
}

const componentData: Record<string, CompData> = {
  resistor: {
    name: "Resistor",
    color: "bg-resistor", textColor: "text-resistor", borderColor: "border-resistor",
    symbol: "R", difficulty: "Beginner",
    oneLiner: "A resistor is a tiny part that controls how much electricity flows through a wire.",
    analogy: {
      title: "Think of it like a garden hose",
      body: "If electricity is water, a resistor is like squeezing the hose. Squeeze harder (bigger resistance) → less water flows. The pressure is voltage, the flow is current.",
    },
    whatItDoes:
      "Resistors limit current. They turn unwanted electrical energy into heat. Every circuit needs them — to protect LEDs from burning out, to set the speed of timing circuits, to divide voltage, and much more.",
    whenToUse: [
      "Limiting current to an LED so it doesn't burn out",
      "Pulling a microcontroller pin HIGH or LOW",
      "Building a voltage divider to read a sensor",
      "Setting the gain of an amplifier",
    ],
    formulas: [
      { eq: "V = I × R", meaning: "Ohm's Law: voltage equals current times resistance" },
      { eq: "P = I² × R", meaning: "Power dissipated as heat" },
      { eq: "R_series = R₁ + R₂ + …", meaning: "Resistors in series add up" },
      { eq: "1/R_parallel = 1/R₁ + 1/R₂", meaning: "Parallel resistors → less total resistance" },
    ],
    ranges: ["Carbon Film: 1Ω – 10MΩ", "Metal Film: 1Ω – 1MΩ (±1%)", "Wire Wound: 0.1Ω – 100kΩ", "SMD: 0Ω – 10MΩ"],
    failures: [
      { symptom: "Reads ∞ or open", cause: "Burned out from too much current — most common failure" },
      { symptom: "Value drifted", cause: "Heat damage over time" },
      { symptom: "Visible cracks", cause: "Mechanical or thermal stress" },
    ],
    howMeasured:
      "The LCR meter sends a tiny known signal through the resistor and measures how much the voltage drops. The phase angle stays near 0° because pure resistors don't store energy.",
    funFact: "Some resistors are color-coded with stripes — the colors form a number you can decode. Check the Reference tab!",
    quiz: {
      q: "What happens if you put two 10kΩ resistors in parallel?",
      choices: ["20kΩ", "10kΩ", "5kΩ", "100kΩ"],
      answer: 2,
      explain: "Parallel resistors give a SMALLER total resistance. Two equal resistors in parallel = half the value.",
    },
  },
  capacitor: {
    name: "Capacitor",
    color: "bg-capacitor", textColor: "text-capacitor", borderColor: "border-capacitor",
    symbol: "C", difficulty: "Beginner",
    oneLiner: "A capacitor is a tiny rechargeable bucket that quickly stores and releases electricity.",
    analogy: {
      title: "Like a small water bucket",
      body: "Imagine a bucket connected to a pipe. It fills up (charges) when water flows in, and empties (discharges) when there's somewhere for water to go. Bigger bucket = more capacitance.",
    },
    whatItDoes:
      "Capacitors smooth out bumpy voltages, store small amounts of energy, block DC while letting AC through, and create timing delays. They're the second most common part after resistors.",
    whenToUse: [
      "Smoothing the output of a power supply (filter cap)",
      "Coupling audio between amplifier stages (block DC, pass AC)",
      "Creating a delay or oscillator with a resistor (RC timing)",
      "Decoupling — placed near every chip to absorb noise",
    ],
    formulas: [
      { eq: "C = Q / V", meaning: "Capacitance = charge stored per volt" },
      { eq: "Xc = 1 / (2πfC)", meaning: "Reactance — how much it 'resists' AC at frequency f" },
      { eq: "E = ½CV²", meaning: "Energy stored in joules" },
      { eq: "τ = R × C", meaning: "Charging time constant — see the Calculator!" },
    ],
    ranges: ["Ceramic: 1pF – 100µF", "Electrolytic: 0.1µF – 10000µF", "Film: 1nF – 100µF", "Tantalum: 0.1µF – 1000µF"],
    failures: [
      { symptom: "Capacitance dropped", cause: "Aging or heat — common in old electrolytics" },
      { symptom: "High ESR", cause: "Internal degradation — circuit may be unstable" },
      { symptom: "Bulged/leaking top", cause: "Pressure buildup — replace immediately" },
      { symptom: "Short circuit", cause: "Dielectric breakdown — usually after over-voltage" },
    ],
    howMeasured:
      "The meter applies a small AC signal at a known frequency. From the impedance and phase (~−90°), it calculates capacitance. ESR comes from any in-phase resistance.",
    funFact: "Electrolytic capacitors have a + and − side. Connect them backwards and they can literally explode!",
    quiz: {
      q: "Which type of capacitor MUST be connected the right way around?",
      choices: ["Ceramic", "Film", "Electrolytic", "All of them"],
      answer: 2,
      explain: "Electrolytic (and tantalum) caps are polarized. Ceramic and film caps don't care about direction.",
    },
  },
  inductor: {
    name: "Inductor",
    color: "bg-inductor", textColor: "text-inductor", borderColor: "border-inductor",
    symbol: "L", difficulty: "Intermediate",
    oneLiner: "An inductor is a coil that resists changes in current using a magnetic field.",
    analogy: {
      title: "Like a heavy flywheel",
      body: "Once a flywheel is spinning, it doesn't want to stop. Once it's stopped, it doesn't want to start. An inductor does the same with current — it resists sudden changes by storing energy in a magnetic field.",
    },
    whatItDoes:
      "Inductors smooth current (instead of voltage like a cap), filter out high-frequency noise, store energy for switching power supplies, and form resonant circuits with capacitors for radio tuning.",
    whenToUse: [
      "Smoothing current in a switching power supply (buck/boost)",
      "Blocking high-frequency noise on a power line (choke)",
      "Building a tuned filter or oscillator with a capacitor",
      "Generating a high voltage spike (ignition coils)",
    ],
    formulas: [
      { eq: "V = L × (dI/dt)", meaning: "Voltage spikes when current changes fast" },
      { eq: "X_L = 2πfL", meaning: "Reactance grows with frequency" },
      { eq: "E = ½LI²", meaning: "Energy stored in the magnetic field" },
      { eq: "f = 1 / (2π√(LC))", meaning: "Resonance with a capacitor — see Calculator!" },
    ],
    ranges: ["SMD: 1nH – 100µH", "Through-hole: 1µH – 100mH", "Power: 1µH – 10mH", "RF: 1nH – 10µH"],
    failures: [
      { symptom: "Shorted turns", cause: "Insulation broke down — inductance drops" },
      { symptom: "Core saturated", cause: "Too much current — loses inductance under load" },
      { symptom: "DCR increased", cause: "Wire damage or corrosion" },
    ],
    howMeasured:
      "The meter measures impedance at a test frequency. Inductance comes from the imaginary (reactive) part. Phase near +90° confirms it's behaving inductively.",
    funFact: "Suddenly opening a circuit with an inductor can produce thousands of volts — that's how spark plugs work!",
    quiz: {
      q: "What does an inductor do at very high frequencies?",
      choices: ["Acts like a wire", "Acts like an open circuit", "Acts like a capacitor", "Stores DC voltage"],
      answer: 1,
      explain: "X_L grows with frequency. At very high frequency, the inductor's reactance is huge — it blocks AC like an open circuit.",
    },
  },
  diode: {
    name: "Diode",
    color: "bg-diode", textColor: "text-diode", borderColor: "border-diode",
    symbol: "D", difficulty: "Beginner",
    oneLiner: "A diode is a one-way valve for electricity.",
    analogy: {
      title: "Like a check-valve in plumbing",
      body: "A check-valve lets water flow one direction but slams shut if it tries to go backwards. A diode does the same with current — forward = conducts, backward = blocks.",
    },
    whatItDoes:
      "Diodes convert AC to DC (rectification), protect circuits from reverse polarity, clip signal voltages, and — in the case of LEDs — emit light when current flows through them.",
    whenToUse: [
      "Converting AC wall voltage to DC inside a power supply",
      "Protecting a circuit if the user plugs the battery in backwards",
      "Lighting up an LED (it's a special diode!)",
      "Suppressing voltage spikes from relays/motors (flyback diode)",
    ],
    formulas: [
      { eq: "I = Iₛ × (e^(V/Vₜ) − 1)", meaning: "Shockley equation — diode current is exponential" },
      { eq: "Vₜ = kT/q ≈ 26 mV", meaning: "Thermal voltage at room temperature" },
      { eq: "Vf ≈ 0.7 V (Si)", meaning: "Forward voltage drop for silicon diodes" },
      { eq: "Vf ≈ 0.3 V (Schottky)", meaning: "Lower drop — used for efficiency" },
    ],
    ranges: ["Silicon Vf: 0.6–0.7V", "Schottky Vf: 0.15–0.45V", "LED Vf: 1.8–3.3V", "Zener Vz: 2.4–200V"],
    failures: [
      { symptom: "Shorted (conducts both ways)", cause: "Over-current — the junction fused" },
      { symptom: "Open (blocks both ways)", cause: "Internal damage" },
      { symptom: "Leakage in reverse", cause: "Heat damage to the junction" },
    ],
    howMeasured:
      "The meter measures forward voltage drop and junction capacitance. The exponential I-V curve makes diodes easy to identify.",
    funFact: "An LED is a diode that gives off light. Its color depends on the semiconductor material used inside.",
    quiz: {
      q: "What's the typical forward voltage of a standard silicon diode?",
      choices: ["0.3 V", "0.7 V", "1.5 V", "5 V"],
      answer: 1,
      explain: "Silicon diodes drop about 0.7 V when conducting. Schottky drops less (~0.3 V), LEDs drop more (1.8–3.3 V).",
    },
  },
  bjt: {
    name: "BJT (Bipolar Transistor)",
    color: "bg-bjt", textColor: "text-bjt", borderColor: "border-bjt",
    symbol: "Q", difficulty: "Advanced",
    oneLiner: "A BJT uses a tiny base current to control a much bigger collector current.",
    analogy: {
      title: "Like a faucet handle",
      body: "Turning the handle (small effort) controls a torrent of water (big flow). A small base current opens the path for a much larger current to flow from collector to emitter.",
    },
    whatItDoes:
      "BJTs amplify weak signals, switch loads on and off, and form the building blocks of analog circuits like amplifiers and op-amps. They come in two flavors: NPN and PNP.",
    whenToUse: [
      "Amplifying audio or sensor signals",
      "Switching a relay, motor, or LED from a microcontroller pin",
      "Building current sources and voltage references",
      "Mixing or oscillating in radio circuits",
    ],
    formulas: [
      { eq: "Iᴄ = β × Iʙ", meaning: "Collector current = gain × base current" },
      { eq: "Iᴇ = Iᴄ + Iʙ", meaning: "Emitter carries both" },
      { eq: "Vʙᴇ ≈ 0.7 V", meaning: "Base-emitter junction acts like a diode" },
      { eq: "gₘ = Iᴄ / Vₜ", meaning: "Transconductance — sets amplifier gain" },
    ],
    ranges: ["Small signal β: 100–800", "Power β: 20–100", "fT: 1MHz–10GHz", "Ic(max): 100mA–50A"],
    failures: [
      { symptom: "B-E shorted", cause: "Static discharge or over-voltage" },
      { symptom: "C-E shorted", cause: "Over-current or thermal runaway" },
      { symptom: "β way too low", cause: "Junction degradation" },
    ],
    howMeasured:
      "The meter probes the two PN junctions (B-E and B-C) to identify NPN vs PNP, measure junction capacitances, and verify the transistor is alive.",
    funFact: "The first transistor — built at Bell Labs in 1947 — was a BJT. It earned the inventors a Nobel Prize.",
    quiz: {
      q: "If a BJT has β = 100 and you push 10µA into the base, what's the collector current?",
      choices: ["10 µA", "100 µA", "1 mA", "10 mA"],
      answer: 2,
      explain: "Iᴄ = β × Iʙ = 100 × 10µA = 1000µA = 1 mA. The base current is amplified 100×.",
    },
  },
  mosfet: {
    name: "MOSFET",
    color: "bg-mosfet", textColor: "text-mosfet", borderColor: "border-mosfet",
    symbol: "M", difficulty: "Advanced",
    oneLiner: "A MOSFET is an electronic switch controlled by voltage on its gate.",
    analogy: {
      title: "Like a magnetic door lock",
      body: "You don't need to push the door — just hold a magnet near the sensor and it opens. The MOSFET's gate works the same way: applying voltage opens the channel for current to flow, with almost no current going INTO the gate.",
    },
    whatItDoes:
      "MOSFETs are the workhorse switching device of modern electronics. They power motors, light up LEDs efficiently, and form the billions of transistors inside every CPU.",
    whenToUse: [
      "Switching high currents from a logic-level signal",
      "PWM control of a motor or LED strip",
      "Building DC-DC converters (buck/boost regulators)",
      "Replacing relays for silent, fast, reliable switching",
    ],
    formulas: [
      { eq: "Iᴅ = ½k(Vɢs − Vth)²", meaning: "Drain current in saturation" },
      { eq: "Rᴅs(on)", meaning: "Resistance when fully on — lower = more efficient" },
      { eq: "gₘ = 2Iᴅ / (Vɢs − Vth)", meaning: "Transconductance" },
      { eq: "Ciss = Cɢs + Cɢᴅ", meaning: "Input capacitance — affects switching speed" },
    ],
    ranges: ["Logic level Vth: 1–2V", "Standard Vth: 2–4V", "Rds(on): 1mΩ–10Ω", "Id(max): 100mA–200A"],
    failures: [
      { symptom: "Gate-source shorted", cause: "ESD damage — handle with care!" },
      { symptom: "Drain-source shorted", cause: "Over-current or over-voltage" },
      { symptom: "Stays slightly on", cause: "Gate charge degradation" },
    ],
    howMeasured:
      "The meter measures the gate capacitances (Ciss, Coss, Crss) and verifies the threshold voltage to confirm the MOSFET is healthy.",
    funFact: "There are more MOSFETs in the world than any other manufactured object — trillions of them in CPUs alone!",
    quiz: {
      q: "Why is the gate of a MOSFET easily damaged by static electricity?",
      choices: [
        "It carries huge current",
        "The thin oxide insulator can break down",
        "It overheats easily",
        "It's made of glass",
      ],
      answer: 1,
      explain: "The gate is separated by a microscopically thin insulating oxide layer. A static spark (thousands of volts) can punch right through and ruin it.",
    },
  },
};

const slugOrder = ["resistor", "capacitor", "inductor", "diode", "bjt", "mosfet"];

const ComponentDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const comp = componentData[slug || "resistor"];
  const [quizPick, setQuizPick] = useState<number | null>(null);

  if (!comp) {
    return (
      <div className="px-4 pt-8 pb-4">
        <p className="text-center text-muted-foreground">Component not found</p>
        <button onClick={() => navigate("/learn")} className="mt-4 mx-auto block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          Back to Library
        </button>
      </div>
    );
  }

  const idx = slugOrder.indexOf(slug || "");
  const prevSlug = idx > 0 ? slugOrder[idx - 1] : null;
  const nextSlug = idx >= 0 && idx < slugOrder.length - 1 ? slugOrder[idx + 1] : null;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Top nav */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate("/learn")} className="flex items-center gap-1 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Library</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => prevSlug && navigate(`/learn/${prevSlug}`)}
            disabled={!prevSlug}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Previous component"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => nextSlug && navigate(`/learn/${nextSlug}`)}
            disabled={!nextSlug}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Next component"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-5 rounded-2xl border bg-gradient-to-br p-5 ${comp.borderColor}/30 from-card to-card/50 card-glow`}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${comp.color}/15 border ${comp.borderColor}/30`}>
            <span className={`font-mono text-3xl font-bold ${comp.textColor}`}>{comp.symbol}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold leading-tight">{comp.name}</h1>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                comp.difficulty === "Beginner" ? "bg-inductor/15 text-inductor" :
                comp.difficulty === "Intermediate" ? "bg-resistor/15 text-resistor" :
                "bg-mosfet/15 text-mosfet"
              }`}>
                {comp.difficulty}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{comp.oneLiner}</p>
          </div>
        </div>
      </motion.div>

      {/* Content sections */}
      <div className="space-y-3">

        {/* Analogy */}
        <Section delay={0.05} icon={Lightbulb} title={comp.analogy.title} accent={comp.textColor}>
          <p className="text-sm leading-relaxed">{comp.analogy.body}</p>
        </Section>

        {/* What it does */}
        <Section delay={0.1} icon={BookOpen} title="What it does" accent={comp.textColor}>
          <p className="text-sm text-muted-foreground leading-relaxed">{comp.whatItDoes}</p>
        </Section>

        {/* When to use */}
        <Section delay={0.15} icon={Wrench} title="When you'd use one" accent={comp.textColor}>
          <ul className="space-y-1.5">
            {comp.whenToUse.map((u, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className={`${comp.textColor} mt-0.5`}>▸</span>
                <span className="text-muted-foreground leading-relaxed">{u}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Formulas with meanings */}
        <Section delay={0.2} icon={Zap} title="Key formulas" accent={comp.textColor}>
          <div className="space-y-2">
            {comp.formulas.map((f, i) => (
              <div key={i} className="rounded-lg bg-secondary/60 p-2.5">
                <code className={`font-mono text-sm font-semibold ${comp.textColor} block mb-0.5`}>{f.eq}</code>
                <p className="text-[11px] text-muted-foreground">{f.meaning}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Try-it Calculator (contextual) */}
        <Section delay={0.22} icon={CalcIcon} title="Try it yourself" accent="text-primary">
          <p className="text-xs text-muted-foreground mb-3">
            Plug in real values and see the math come alive — these are the calculations you'll
            actually use when working with {comp.name.toLowerCase()}s.
          </p>
          <EmbeddedCalculator slug={slug || ""} accent={comp.textColor} />
        </Section>

        {/* Quick Reference (contextual) */}
        {(slug === "resistor" || slug === "capacitor" || slug === "inductor" ||
          slug === "diode" || slug === "bjt" || slug === "mosfet") && (
          <Section delay={0.24} icon={BookMarked} title="Quick reference" accent={comp.textColor}>
            <EmbeddedReference slug={slug} accent={comp.textColor} />
          </Section>
        )}

        {/* Typical ranges */}
        <Section delay={0.25} icon={Activity} title="Typical ranges" accent={comp.textColor}>
          <div className="grid gap-1.5">
            {comp.ranges.map((r) => (
              <p key={r} className="text-xs text-muted-foreground flex gap-2">
                <span className={comp.textColor}>•</span>
                {r}
              </p>
            ))}
          </div>
        </Section>

        {/* Failure modes */}
        <Section delay={0.3} icon={AlertTriangle} title="When things go wrong" accent="text-destructive">
          <div className="space-y-2">
            {comp.failures.map((f, i) => (
              <div key={i} className="rounded-lg border border-destructive/15 bg-destructive/5 p-2.5">
                <p className="text-xs font-semibold text-destructive mb-0.5">{f.symptom}</p>
                <p className="text-[11px] text-muted-foreground">{f.cause}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How LCR measures */}
        <Section delay={0.35} icon={Activity} title="How your meter measures it" accent="text-primary">
          <p className="text-sm text-muted-foreground leading-relaxed">{comp.howMeasured}</p>
        </Section>

        {/* Fun fact */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Did you know?</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{comp.funFact}</p>
        </motion.div>

        {/* Quiz */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border border-border bg-card p-4 card-glow"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className={`h-4 w-4 ${comp.textColor}`} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick check</p>
          </div>
          <p className="text-sm font-medium mb-3">{comp.quiz.q}</p>
          <div className="grid gap-2">
            {comp.quiz.choices.map((c, i) => {
              const isPicked = quizPick === i;
              const isCorrect = i === comp.quiz.answer;
              const showState = quizPick !== null;
              return (
                <button
                  key={i}
                  onClick={() => quizPick === null && setQuizPick(i)}
                  disabled={quizPick !== null}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    !showState
                      ? "border-border bg-secondary/40 hover:border-primary/30 hover:bg-secondary"
                      : isCorrect
                        ? "border-inductor/40 bg-inductor/10 text-inductor"
                        : isPicked
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border bg-secondary/20 text-muted-foreground opacity-60"
                  }`}
                >
                  <span>{c}</span>
                  {showState && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {showState && isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {quizPick !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-lg bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{comp.quiz.explain}</p>
                  <button
                    onClick={() => setQuizPick(null)}
                    className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Prev/Next pager */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={() => prevSlug && navigate(`/learn/${prevSlug}`)}
          disabled={!prevSlug}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-left transition-all hover:border-primary/30 disabled:opacity-30 disabled:hover:border-border"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Previous</p>
            <p className="text-xs font-bold truncate">{prevSlug ? componentData[prevSlug].name : "—"}</p>
          </div>
        </button>
        <button
          onClick={() => nextSlug && navigate(`/learn/${nextSlug}`)}
          disabled={!nextSlug}
          className="flex items-center justify-end gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-right transition-all hover:border-primary/50 disabled:opacity-30"
        >
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary">Next</p>
            <p className="text-xs font-bold truncate">{nextSlug ? componentData[nextSlug].name : "Done!"}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </button>
      </div>
    </div>
  );
};

const Section = ({
  title, icon: Icon, children, accent, delay = 0,
}: {
  title: string; icon: any; children: React.ReactNode; accent: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-xl border border-border bg-card p-4 card-glow"
  >
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className={`h-4 w-4 ${accent}`} />
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
    {children}
  </motion.div>
);

export default ComponentDetail;
