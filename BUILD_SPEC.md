# Prelaunch — Build Spec

## Overview

Prelaunch is a terminal-first startup auditor at **crit.9roq.com**. Users paste a startup URL, get a brutal structured audit (Product Score, GEO Score, SEO Score), and optionally buy the full executable report.

## Two Faces

### 1. Landing Page (crit.9roq.com)

Design inspired by maxibestof.one / Unkey / Parallel style:
- **Dark theme** — deep charcoal/black background (#0a0a0b or similar)
- **Typography** — Inter (headings), JetBrains Mono (code/terminal elements)
- **Minimal** — lots of whitespace, grid layout, subtle borders
- **Color accent** — a single accent color for CTAs (amber/blue/green)

**Page sections:**

A. **Hero** — Paste URL input + one-line tagline. A live terminal emulator window below showing an example audit output (ASCII rendered, animated typing effect)
B. **How it works** — 3 steps (Paste URL → Get Score → Execute Fixes) with icons
C. **Sample Report** — A real-looking terminal output screenshot/rendering showing score: 3/10, top issues listed
D. **Pricing** — 3 tiers: Free ($0), Pro ($9.99), Loop ($19.99)
E. **CTA** — "Audit your startup" paste input

**The terminal emulator** should render in the browser with:
- A dark terminal window with green/amber text
- Animated typing effect showing the audit report being generated
- Realistic-looking output

### 2. CLI Tool (curl | bash)

A single bash script served via HTTPS that:
1. Prompts user for a URL (or accepts via `curl | bash -s -- https://...`)
2. Validates the URL
3. Calls the audit API
4. Renders a beautiful terminal-formatted report using ANSI codes (bold, colors, box-drawing chars)

The CLI script should be self-contained (no npm, no python needed — pure bash + curl).

### 3. Audit API

A simple backend (Node.js preferred since Codex can build it easily) that:
1. Accepts POST with `{ url: "https://..." }`
2. Fetches the URL, extracts: headline/hero text, pricing visibility, CTA text, features listed, social proof signals (logos, testimonials), schema markup
3. Sends extracted data to OpenAI API for analysis
4. Returns structured JSON with: overall score, dimension scores, ranked issues, fix suggestions
5. Returns GEO+SEO scores based on schema presence, content structure, semantic clarity

## File Structure

```
prelaunch/
├── README.md
├── index.html              # Landing page (crit.9roq.com)
├── style.css               # Landing page styles
├── js/
│   └── main.js             # Terminal animation, URL input handler
├── cli/
│   └── prelaunch.sh        # The curl | bash entry point script
├── api/
│   ├── package.json        # Node.js project
│   ├── server.js           # Express/Fastify server
│   ├── analyzer.js         # URL scraping + AI analysis logic
│   └── .env.example        # OPENAI_API_KEY
├── CNAME                   # For custom domain on pages
└── .gitignore
```

## Key Design Decisions

- No frameworks for landing page — pure HTML+CSS+JS (fast, no build step)
- CLI is pure bash + curl — zero dependencies, works everywhere
- API uses OpenAI for analysis (cheapest model — gpt-4o-mini)
- GEO Score checks: schema markup, source citations, content structure, authority signals
- Product Score checks: clear value prop, pricing visible, single CTA, feature focus, social proof
- Everything deployable via GitHub Pages + a simple serverless function or small VPS

## Terminal Report Format

The CLI output should use ANSI box-drawing characters and colors:

```
╔═══════════════════════════════════════════╗
║           PRELAUNCH AUDIT                 ║
║           https://example.com             ║
╚═══════════════════════════════════════════╝

 PRODUCT FIT     ████████░░░░  3.1/10
 GEO             ██░░░░░░░░░░  1.2/10
 SEO             █████░░░░░░░  4.8/10
 TRUST           ██████░░░░░░  5.5/10
 CONVERSION      ████████░░░░  7.2/10

 ⚠ TOP ISSUES

 1. [PRODUCT] Headline is generic — "AI-powered platform"
    → Fix: Name the specific job your customer hires you for
    → Impact: High

 2. [GEO] No schema markup found
    → Fix: Add Organization + Product schema
    → Impact: High

 3. [TRUST] No testimonials or logos visible
    → Fix: Add customer logos above the fold
    → Impact: Medium

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Full report + 8 more fixes at crit.9roq.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Tasks for Codex

1. Create `index.html` — the complete landing page with the animated terminal hero
2. Create `style.css` — dark minimal design, Inter + JetBrains Mono fonts via Google Fonts
3. Create `js/main.js` — terminal typing animation, paste URL handler
4. Create `cli/prelaunch.sh` — the curl|bash CLI tool
5. Create `api/package.json` + `api/server.js` + `api/analyzer.js` — the audit API
6. Create `CNAME` with `crit.9roq.com`

## Constraints

- No React, no Vue, no build step — pure HTML/CSS/JS
- Fonts loaded from Google Fonts CDN
- CLI script uses only: bash, curl, grep, sed, tr (standard unix tools)
- API uses Express.js (simplest Node.js framework)
- All files go in the repo root (for GitHub Pages)