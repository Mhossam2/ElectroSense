import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * 📘 TAILWIND CSS CHEAT SHEET
 * A reference page documenting every Tailwind class used across this project,
 * grouped by purpose. Visit /cheatsheet to view it.
 */

type ClassRow = { cls: string; meaning: string; cssEquivalent: string };

type Section = {
  title: string;
  emoji: string;
  description: string;
  rows: ClassRow[];
};

const sections: Section[] = [
  {
    title: "Layout — Display & Flexbox",
    emoji: "📐",
    description:
      "Controls HOW elements arrange themselves on the page. Flexbox is the most common layout system in this project.",
    rows: [
      { cls: "flex", meaning: "Make this a flex container (children align in a row)", cssEquivalent: "display: flex;" },
      { cls: "inline-flex", meaning: "Like flex, but the container itself flows inline (like text)", cssEquivalent: "display: inline-flex;" },
      { cls: "grid", meaning: "Make this a grid container", cssEquivalent: "display: grid;" },
      { cls: "block", meaning: "Force element onto its own line", cssEquivalent: "display: block;" },
      { cls: "hidden", meaning: "Don't render this element", cssEquivalent: "display: none;" },
      { cls: "flex-col", meaning: "Stack flex children vertically instead of horizontally", cssEquivalent: "flex-direction: column;" },
      { cls: "flex-1", meaning: "Take up all remaining space", cssEquivalent: "flex: 1 1 0%;" },
      { cls: "items-center", meaning: "Vertically center children (in a flex row)", cssEquivalent: "align-items: center;" },
      { cls: "justify-center", meaning: "Horizontally center children (in a flex row)", cssEquivalent: "justify-content: center;" },
      { cls: "justify-between", meaning: "Push children to opposite ends", cssEquivalent: "justify-content: space-between;" },
      { cls: "gap-2 / gap-4", meaning: "Space between flex/grid children (0.5rem / 1rem)", cssEquivalent: "gap: 0.5rem; / 1rem;" },
      { cls: "grid-cols-2", meaning: "Create 2 equal columns in a grid", cssEquivalent: "grid-template-columns: repeat(2, 1fr);" },
    ],
  },
  {
    title: "Spacing — Padding & Margin",
    emoji: "📏",
    description:
      "Tailwind's spacing scale: 1 unit = 0.25rem = 4px. So `p-4` = 16px padding.",
    rows: [
      { cls: "p-4", meaning: "Padding on all 4 sides (16px)", cssEquivalent: "padding: 1rem;" },
      { cls: "px-3", meaning: "Padding LEFT and RIGHT only (12px)", cssEquivalent: "padding-inline: 0.75rem;" },
      { cls: "py-2", meaning: "Padding TOP and BOTTOM only (8px)", cssEquivalent: "padding-block: 0.5rem;" },
      { cls: "pt-6", meaning: "Padding TOP only (24px)", cssEquivalent: "padding-top: 1.5rem;" },
      { cls: "m-auto", meaning: "Auto margin — centers element horizontally", cssEquivalent: "margin: auto;" },
      { cls: "mt-4", meaning: "Margin TOP only (16px)", cssEquivalent: "margin-top: 1rem;" },
      { cls: "mb-2", meaning: "Margin BOTTOM only (8px)", cssEquivalent: "margin-bottom: 0.5rem;" },
      { cls: "space-y-4", meaning: "Vertical space BETWEEN child elements (16px each)", cssEquivalent: "child > * + * { margin-top: 1rem; }" },
    ],
  },
  {
    title: "Sizing — Width & Height",
    emoji: "📦",
    description: "Set how big elements should be. `w-` = width, `h-` = height.",
    rows: [
      { cls: "w-full", meaning: "100% of parent's width", cssEquivalent: "width: 100%;" },
      { cls: "h-screen", meaning: "100% of viewport height", cssEquivalent: "height: 100vh;" },
      { cls: "w-10 / h-10", meaning: "40px square (used for icons/buttons)", cssEquivalent: "width/height: 2.5rem;" },
      { cls: "w-24 / h-24", meaning: "96px (logo size on splash)", cssEquivalent: "width/height: 6rem;" },
      { cls: "max-w-md", meaning: "Max width of 28rem — keeps content readable", cssEquivalent: "max-width: 28rem;" },
      { cls: "min-h-screen", meaning: "AT LEAST full viewport height", cssEquivalent: "min-height: 100vh;" },
    ],
  },
  {
    title: "Colors — Semantic Tokens (IMPORTANT!)",
    emoji: "🎨",
    description:
      "We NEVER use raw colors like `bg-blue-500`. Instead we use SEMANTIC tokens defined in index.css. This way the app supports dark/light mode automatically.",
    rows: [
      { cls: "bg-background", meaning: "Page background color (dark in dark mode, light in light)", cssEquivalent: "background: hsl(var(--background));" },
      { cls: "bg-card", meaning: "Card background — slightly lighter than page bg", cssEquivalent: "background: hsl(var(--card));" },
      { cls: "bg-primary", meaning: "Brand color background (cyan/blue accent)", cssEquivalent: "background: hsl(var(--primary));" },
      { cls: "bg-muted", meaning: "Subtle gray background for less-important areas", cssEquivalent: "background: hsl(var(--muted));" },
      { cls: "text-foreground", meaning: "Default text color (auto-adapts to theme)", cssEquivalent: "color: hsl(var(--foreground));" },
      { cls: "text-muted-foreground", meaning: "Faded text — for hints, captions, secondary info", cssEquivalent: "color: hsl(var(--muted-foreground));" },
      { cls: "text-primary", meaning: "Accent text color (used for highlights)", cssEquivalent: "color: hsl(var(--primary));" },
      { cls: "text-resistor", meaning: "Orange — for resistor-related UI", cssEquivalent: "color: hsl(var(--resistor));" },
      { cls: "text-capacitor", meaning: "Blue — for capacitor-related UI", cssEquivalent: "color: hsl(var(--capacitor));" },
      { cls: "text-inductor", meaning: "Green — for inductor-related UI", cssEquivalent: "color: hsl(var(--inductor));" },
      { cls: "border-border", meaning: "Default border color (theme-aware)", cssEquivalent: "border-color: hsl(var(--border));" },
      { cls: "bg-primary/10", meaning: "Primary color at 10% opacity (the /N is opacity!)", cssEquivalent: "background: hsl(var(--primary) / 0.1);" },
    ],
  },
  {
    title: "Typography — Text styling",
    emoji: "🔤",
    description: "Font size, weight, alignment, and family.",
    rows: [
      { cls: "text-xs", meaning: "Extra small text (12px)", cssEquivalent: "font-size: 0.75rem;" },
      { cls: "text-sm", meaning: "Small text (14px) — most common", cssEquivalent: "font-size: 0.875rem;" },
      { cls: "text-base", meaning: "Default body text (16px)", cssEquivalent: "font-size: 1rem;" },
      { cls: "text-lg / text-xl", meaning: "Larger text (18px / 20px) — section headers", cssEquivalent: "font-size: 1.125 / 1.25rem;" },
      { cls: "text-3xl", meaning: "Big heading (30px) — page titles", cssEquivalent: "font-size: 1.875rem;" },
      { cls: "font-medium / font-semibold / font-bold", meaning: "Text weight (500 / 600 / 700)", cssEquivalent: "font-weight: 500/600/700;" },
      { cls: "font-mono", meaning: "Use JetBrains Mono — for measurement values", cssEquivalent: "font-family: 'JetBrains Mono';" },
      { cls: "tracking-tight", meaning: "Tighter letter spacing (for headings)", cssEquivalent: "letter-spacing: -0.025em;" },
      { cls: "text-center", meaning: "Center-align text", cssEquivalent: "text-align: center;" },
      { cls: "uppercase", meaning: "TRANSFORM TEXT TO UPPERCASE", cssEquivalent: "text-transform: uppercase;" },
    ],
  },
  {
    title: "Borders & Rounded corners",
    emoji: "🔲",
    description: "Outline edges and round the corners of elements.",
    rows: [
      { cls: "border", meaning: "1px border (uses border-border color)", cssEquivalent: "border-width: 1px;" },
      { cls: "border-2", meaning: "2px border", cssEquivalent: "border-width: 2px;" },
      { cls: "border-t", meaning: "Border on TOP edge only", cssEquivalent: "border-top-width: 1px;" },
      { cls: "rounded-md", meaning: "Slightly rounded corners (6px)", cssEquivalent: "border-radius: 0.375rem;" },
      { cls: "rounded-lg", meaning: "More rounded (8px) — used on cards", cssEquivalent: "border-radius: 0.5rem;" },
      { cls: "rounded-2xl", meaning: "Very rounded (16px) — used on the splash logo", cssEquivalent: "border-radius: 1rem;" },
      { cls: "rounded-full", meaning: "Fully circular (for avatars, pills, badges)", cssEquivalent: "border-radius: 9999px;" },
    ],
  },
  {
    title: "Positioning",
    emoji: "📍",
    description: "Place elements at exact spots, layer them on top of each other, or stick them to the screen.",
    rows: [
      { cls: "relative", meaning: "Position context for absolute children", cssEquivalent: "position: relative;" },
      { cls: "absolute", meaning: "Take out of flow, position relative to nearest `relative` parent", cssEquivalent: "position: absolute;" },
      { cls: "fixed", meaning: "Pin to viewport — stays put when scrolling (used for BottomNav)", cssEquivalent: "position: fixed;" },
      { cls: "inset-0", meaning: "top:0, right:0, bottom:0, left:0 — fill parent completely", cssEquivalent: "inset: 0;" },
      { cls: "top-0 / bottom-0", meaning: "Stick to top/bottom edge", cssEquivalent: "top: 0; / bottom: 0;" },
      { cls: "z-50 / z-[100]", meaning: "Stack order — higher z appears on top", cssEquivalent: "z-index: 50; / 100;" },
    ],
  },
  {
    title: "Effects — Shadows, Opacity, Transforms",
    emoji: "✨",
    description: "Visual polish: depth, see-through, and movement.",
    rows: [
      { cls: "shadow-sm / shadow-md / shadow-lg", meaning: "Drop shadow sizes (small → large)", cssEquivalent: "box-shadow: ...;" },
      { cls: "opacity-50", meaning: "50% see-through", cssEquivalent: "opacity: 0.5;" },
      { cls: "scale-95", meaning: "Shrink to 95% of size", cssEquivalent: "transform: scale(0.95);" },
      { cls: "translate-y-2", meaning: "Move down by 8px", cssEquivalent: "transform: translateY(0.5rem);" },
      { cls: "blur-sm", meaning: "Soft blur effect", cssEquivalent: "filter: blur(4px);" },
    ],
  },
  {
    title: "Interactivity — Hover, Focus, Disabled",
    emoji: "👆",
    description:
      "Prefix any class with `hover:`, `focus:`, `disabled:` to apply only in that state.",
    rows: [
      { cls: "hover:bg-accent", meaning: "Change bg color when mouse hovers", cssEquivalent: ":hover { background: ...; }" },
      { cls: "focus-visible:ring-2", meaning: "Show 2px ring when focused via keyboard (accessibility!)", cssEquivalent: ":focus-visible { box-shadow: ring; }" },
      { cls: "disabled:opacity-50", meaning: "Fade button when disabled", cssEquivalent: ":disabled { opacity: 0.5; }" },
      { cls: "cursor-pointer", meaning: "Show hand cursor on hover", cssEquivalent: "cursor: pointer;" },
      { cls: "transition-colors", meaning: "Smooth color changes (150ms)", cssEquivalent: "transition: color, bg-color 150ms;" },
    ],
  },
  {
    title: "Responsive — Different sizes per device",
    emoji: "📱",
    description:
      "Prefix with `sm:`, `md:`, `lg:` to apply ONLY on bigger screens. Mobile-first!",
    rows: [
      { cls: "text-sm md:text-base", meaning: "Small on mobile, normal on tablets+", cssEquivalent: "font-size: 14px; @media(md){16px}" },
      { cls: "grid-cols-1 md:grid-cols-2", meaning: "1 column on mobile, 2 on tablets+", cssEquivalent: "1 col → 2 cols at md breakpoint" },
      { cls: "hidden md:block", meaning: "Hide on mobile, show on tablets+", cssEquivalent: "display:none; @media(md){display:block}" },
    ],
  },
  {
    title: "Animations (custom in this project)",
    emoji: "🎬",
    description: "Defined in tailwind.config.ts and index.css.",
    rows: [
      { cls: "animate-fade-in", meaning: "Fade up from below over 0.4s", cssEquivalent: "Custom keyframe (see config)" },
      { cls: "animate-scale-in", meaning: "Pop in by scaling from 95% → 100%", cssEquivalent: "Custom keyframe (see config)" },
      { cls: "animate-pulse-dot", meaning: "Pulsing dot — used for 'live measuring' indicator", cssEquivalent: "Custom keyframe (see index.css)" },
      { cls: "animate-scan-line", meaning: "Sliding line — splash screen loading bar", cssEquivalent: "Custom keyframe (see index.css)" },
    ],
  },
  {
    title: "Custom utility classes (in this project)",
    emoji: "🛠️",
    description: "Defined in src/index.css under @layer utilities. UNIQUE to this app.",
    rows: [
      { cls: "font-mono-measurement", meaning: "JetBrains Mono — used for ALL numeric measurement values", cssEquivalent: "font-family: 'JetBrains Mono';" },
      { cls: "text-glow-primary", meaning: "Cyan glow effect on text (dark mode only)", cssEquivalent: "text-shadow: cyan glow;" },
      { cls: "text-glow-resistor", meaning: "Orange glow on resistor values", cssEquivalent: "text-shadow: orange glow;" },
      { cls: "bg-grid-pattern", meaning: "Subtle grid background (used on splash & circuit builder)", cssEquivalent: "background: grid lines;" },
      { cls: "card-glow", meaning: "Card with subtle inner highlight + outer shadow", cssEquivalent: "Custom box-shadow combo;" },
    ],
  },
];

const CheatSheet = () => {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          📘 Tailwind <span className="text-primary text-glow-primary">Cheat Sheet</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Every Tailwind class used in this project, grouped by purpose. Read top-to-bottom to learn the entire styling system.
        </p>
      </div>

      {/* Quick legend */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <h2 className="mb-2 font-semibold text-foreground">🧭 How to read Tailwind</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Each class = one CSS rule. Stack them in <code className="rounded bg-muted px-1 font-mono text-xs">className</code>.</li>
            <li>• Numbers follow a scale: <code className="rounded bg-muted px-1 font-mono text-xs">1 = 4px, 2 = 8px, 4 = 16px, 8 = 32px</code></li>
            <li>• Prefixes change WHEN a class applies: <code className="rounded bg-muted px-1 font-mono text-xs">hover:</code>, <code className="rounded bg-muted px-1 font-mono text-xs">md:</code>, <code className="rounded bg-muted px-1 font-mono text-xs">dark:</code></li>
            <li>• Opacity: add <code className="rounded bg-muted px-1 font-mono text-xs">/N</code> to any color → <code className="rounded bg-muted px-1 font-mono text-xs">bg-primary/10</code> = 10% opacity</li>
          </ul>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span>{section.emoji}</span>
                <span>{section.title}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Class</th>
                      <th className="pb-2 pr-4 font-medium">What it does</th>
                      <th className="hidden pb-2 font-medium md:table-cell">Real CSS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.cls} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 align-top">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {row.cls}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 align-top text-foreground">{row.meaning}</td>
                        <td className="hidden py-2 align-top font-mono text-xs text-muted-foreground md:table-cell">
                          {row.cssEquivalent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Footer tips */}
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">💡 Final tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong className="text-foreground">Always use semantic tokens</strong> (bg-primary, text-foreground) — never raw colors like bg-blue-500. This keeps dark/light mode working.</p>
            <p>• <strong className="text-foreground">Mobile-first</strong>: write the mobile styles first, then add <code className="rounded bg-muted px-1 font-mono text-xs">md:</code> overrides for larger screens.</p>
            <p>• <strong className="text-foreground">When in doubt</strong>, search the official docs at <span className="text-primary">tailwindcss.com/docs</span> — every class is documented.</p>
            <p>• <strong className="text-foreground">Custom values</strong>: use brackets like <code className="rounded bg-muted px-1 font-mono text-xs">w-[73px]</code> or <code className="rounded bg-muted px-1 font-mono text-xs">z-[100]</code> for exact numbers.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheatSheet;
