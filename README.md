# prelaunch

> **Paste your startup URL. Get a brutal audit. Know if you're building the right thing.**

`prelaunch` is a terminal-first startup auditor. It scans your live website, scores your product strategy, GEO (Generative Engine Optimization) visibility, and gives you actionable fixes — not fluff.

## One-liner

```bash
curl -fsSL https://crit.9roq.com | bash
```

Paste a URL, get a score. Free.

## How it works

| Step | What happens |
|------|-------------|
| 1. Scan | We fetch your live site — headline, pricing, CTA, features, social proof, schema |
| 2. Score | AI evaluates across 5 dimensions: Product Fit, GEO, SEO, Trust, Conversion |
| 3. Report | Terminal-formatted output with ranked fixes, ranked by impact |
| 4. Execute | Paid: we generate GitHub issues + agent prompts to fix each problem |

## Pricing

| Tier | Price | What you get |
|------|-------|-------------|
| Free | $0 | URL scan + overall score + top 3 issues |
| Pro | $9.99 | Full report across 5 dimensions + prioritized fix list |
| Loop | $19.99 | Everything above + executable GitHub issues + agent prompts |

## Architecture

```
curl crit.9roq.com  ──►  prelaunch.sh  ──►  API server  ──►  AI analysis
                                    │
                                    └──►  Format & render output
```

## Dev

```bash
git clone git@github.com:gur-xyz/prelaunch.git
cd prelaunch
./cli/prelaunch https://example.com
```

## Built by

[x07](https://github.com/gur-xyz) — 9roq founder. Thesis: 98% harness, 2% model.
