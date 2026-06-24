/**
 * POST /api/audit — Prelaunch audit endpoint for Cloudflare Pages Functions
 *
 * Accepts { url: "https://..." }
 * Returns structured audit scores and issues
 */

import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

// ─── Analyze with OpenRouter ────────────────────────────────────────────
async function analyzeWithAI(pageData) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://crit.9roq.com',
      'X-Title': 'Prelaunch — Startup Auditor'
    }
  });

  const prompt = `You are a brutally honest startup auditor. Analyze this startup's landing page and score it across 5 dimensions (0-10 each).

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <number 0-10>,
  "dimensions": {
    "product_fit": { "score": <0-10>, "reason": "<brief explanation>" },
    "geo": { "score": <0-10>, "reason": "<brief explanation>" },
    "seo": { "score": <0-10>, "reason": "<brief explanation>" },
    "trust": { "score": <0-10>, "reason": "<brief explanation>" },
    "conversion": { "score": <0-10>, "reason": "<brief explanation>" }
  },
  "issues": [
    {
      "dimension": "PRODUCT_FIT|GEO|SEO|TRUST|CONVERSION",
      "finding": "<what's wrong>",
      "fix": "<what to do about it>",
      "severity": "HIGH|MEDIUM|LOW",
      "impact": "<why this matters>"
    }
  ],
  "verdict": "<one sentence: build, pivot, or kill?>"
}

Be harsh. Most startups score 2-5/10. Only score 8+ if they have clear value prop, pricing, social proof, and strong schema markup.

Page Data:
Title: ${pageData.title}
Description: ${pageData.description}
Headline/Hero: ${pageData.headline}
CTAs: ${pageData.ctas.join(', ')}
Features: ${pageData.features.join(', ')}
Pricing visible: ${pageData.hasPricing}
Testimonials visible: ${pageData.hasTestimonials}
Customer logos: ${pageData.hasLogos}
Pricing page found: ${pageData.pricingPageFound}
Schema types: ${pageData.schemaTypes.join(', ') || 'none'}
Word count: ${pageData.wordCount}`;

  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a startup auditor. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

// ─── Scrape URL ─────────────────────────────────────────────────────────
async function scrapeUrl(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PrelaunchAudit/1.0 (startup auditor; https://crit.9roq.com)',
      'Accept': 'text/html,application/xhtml+xml'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts and styles
  $('script, style, noscript, svg, iframe').remove();

  // Extract key data
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const headline = $('h1').first().text().trim() || $('h2').first().text().trim() || $('.hero h1, .hero h2').first().text().trim() || '';

  // CTAs
  const ctas = [];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (/sign\s*up|get\s*started|try\s*free|book\s*a\s*demo|start\s*now|buy|pricing|subscribe|learn\s*more/i.test(text)) {
      ctas.push($(el).text().trim());
    }
  });

  // Features
  const features = [];
  $('[class*="feature"], [class*="benefit"], li, p, .card, .grid > div').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 200) features.push(text);
  });

  // Pricing indicators
  const bodyText = $('body').text().toLowerCase();
  const hasPricing = /\$\d+|₹\d+|€\d+|£\d+|price|pricing|plan|month|\/mo|per month|free\s*trial/i.test(bodyText);
  const hasTestimonials = /testimonial|review|rating|"|"|customer\s*says?/i.test(bodyText);
  const hasLogos = $('img[src*="logo"], [class*="logo"], [class*="brand"]').length > 0;

  // Pricing page
  const pricingPageFound = typeof $('a[href*="pricing"], a[href*="price"]').attr('href') !== 'undefined';

  // Schema
  const schemaTypes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const schema = JSON.parse($(el).html());
      const types = [].concat(schema['@type'] || []);
      types.forEach(t => schemaTypes.push(t));
    } catch {}
  });

  // Word count
  const text = $('body').text().trim();
  const wordCount = text.split(/\s+/).length;

  return {
    title,
    description,
    headline,
    ctas: [...new Set(ctas)],
    features: [...new Set(features)].slice(0, 20),
    hasPricing,
    hasTestimonials,
    hasLogos,
    pricingPageFound,
    schemaTypes: [...new Set(schemaTypes)],
    wordCount
  };
}

// ─── Pages Function Handler ─────────────────────────────────────────────
export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "url" field' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    try { new URL(normalizedUrl); } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Scrape and analyze
    const pageData = await scrapeUrl(normalizedUrl);
    const analysis = await analyzeWithAI(pageData);

    return new Response(JSON.stringify({ url: normalizedUrl, ...analysis }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Audit failed',
      detail: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}