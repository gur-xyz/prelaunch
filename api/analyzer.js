import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Fetch and parse a URL, extracting relevant startup page content.
 */
export async function scrapeUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PrelaunchBot/1.0 (audit tool; crit.9roq.com)' },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeout);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, navs for cleaner text
  $('script, style, nav, footer, iframe, noscript').remove();

  const extracted = {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    headline: $('h1').first().text().trim(),
    subheadline: $('h2').first().text().trim(),
    ctas: [],
    features: [],
    pricing: null,
    socialProof: [],
    schemaTypes: [],
    bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000),
  };

  // Extract CTAs
  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 80) {
      const href = $(el).attr('href') || '';
      const isCTA = /sign\s*up|get\s*started|try\s*free|buy|pricing|start|subscribe|book\s*a\s*demo|learn\s*more/i.test(text);
      if (isCTA) {
        extracted.ctas.push({ text, href });
      }
    }
  });

  // Extract features (h3 + following p)
  $('h3, h4, .feature, .benefit').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 120) {
      extracted.features.push(text);
    }
  });

  // Extract pricing hints
  const priceMatch = html.match(/\$\d+(\.\d{2})?\/?(month|yr|year|mo)?/i);
  if (priceMatch) {
    extracted.pricing = priceMatch[0];
  }

  // Extract social proof signals
  $('[class*="testimonial"], [class*="review"], [class*="quote"], blockquote').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      extracted.socialProof.push(text.slice(0, 200));
    }
  });

  // Logo/trust signals
  $('[class*="logo"], [class*="trusted"], [class*="customer"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 3) {
      extracted.socialProof.push(`[Trust signal] ${text.slice(0, 150)}`);
    }
  });

  // Extract schema types
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const types = [];
      if (Array.isArray(data)) {
        data.forEach(item => types.push(item['@type']));
      } else {
        types.push(data['@type']);
      }
      extracted.schemaTypes.push(...types.filter(Boolean));
    } catch { /* skip invalid JSON */ }
  });

  return extracted;
}

/**
 * Analyze extracted page data using OpenAI and return structured audit results.
 */
export async function analyzePage(url, extracted) {
  const prompt = `You are a brutal, no-BS startup auditor. Analyze this startup's landing page and score it across 5 dimensions (0-10).

URL: ${url}
Title: ${extracted.title}
Description: ${extracted.description}
Headline: ${extracted.headline}
Subheadline: ${extracted.subheadline}
Features found: ${extracted.features.join(' | ') || 'none'}
CTAs found: ${extracted.ctas.map(c => c.text).join(' | ') || 'none'}
Pricing hint: ${extracted.pricing || 'none found'}
Social proof signals: ${extracted.socialProof.length}
Schema types: ${extracted.schemaTypes.join(', ') || 'none'}
Body text (first 4000 chars): ${extracted.bodyText}

Score each dimension:
1. **PRODUCT FIT** — Is the value prop clear? Does the headline name a specific job-to-be-done or is it generic ("AI-powered platform")? Is there a single clear CTA?
2. **GEO** (Generative Engine Optimization) — Is there schema markup (Organization, Product, FAQ, HowTo)? Is content structured with clear headings and semantic HTML? Are sources cited?
3. **SEO** — Title tag quality, meta description, heading hierarchy, URL structure signals, keyword presence.
4. **TRUST** — Social proof (testimonials, logos, reviews), security badges, clear privacy policy, about page link, professional design.
5. **CONVERSION** — Pricing visibility, CTA clarity, urgency signals, friction reduction, feature-benefit mapping.

Return STRICT JSON only (no markdown):
{
  "overall_score": <number 0-10>,
  "dimensions": {
    "product_fit": { "score": <number 0-10>, "reason": "<short reason>" },
    "geo": { "score": <number 0-10>, "reason": "<short reason>" },
    "seo": { "score": <number 0-10>, "reason": "<short reason>" },
    "trust": { "score": <number 0-10>, "reason": "<short reason>" },
    "conversion": { "score": <number 0-10>, "reason": "<short reason>" }
  },
  "issues": [
    {
      "dimension": "PRODUCT|GEO|SEO|TRUST|CONVERSION",
      "severity": "HIGH|MEDIUM|LOW",
      "finding": "<what's wrong>",
      "fix": "<how to fix>",
      "impact": "<why it matters>"
    }
  ],
  "verdict": "<one-line brutal verdict>"
}

Include at least 3 issues, at most 10. Be direct, specific, and actionable.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a brutally honest startup auditor. Return ONLY valid JSON. No markdown, no backticks, no explanation.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content || '';
  
  // Strip markdown code fences if present
  const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse AI response: ${content.slice(0, 300)}`);
  }
}
