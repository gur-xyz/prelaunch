import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scrapeUrl, analyzePage } from './analyzer.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'prelaunch-audit-api' });
});

// POST /audit — accepts { url: "https://..." }
app.post('/audit', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "url" field' });
  }

  let normalizedUrl;
  try {
    normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    new URL(normalizedUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const extracted = await scrapeUrl(normalizedUrl);
    const result = await analyzePage(normalizedUrl, extracted);

    return res.json({
      url: normalizedUrl,
      ...result,
    });
  } catch (err) {
    console.error('Audit error:', err.message);
    return res.status(500).json({
      error: 'Audit failed',
      detail: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Prelaunch API running on http://localhost:${PORT}`);
  console.log(`Try: curl -X POST http://localhost:${PORT}/audit -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'`);
});
