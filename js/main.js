/* ─── Prelaunch — Main JS ─────────────────────────────────────────────── */
/* Terminal typing animation, paste URL handler, scroll animations        */
/* ────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Terminal Typing Animation ────────────────────────────────────── */

  const terminalBody = document.getElementById('terminal-body');
  if (!terminalBody) return;

  // The sample audit report to "type out"
  const reportLines = [
    { text: '╔══════════════════════════════════════════╗', cls: 'accent' },
    { text: '║          PRELAUNCH AUDIT                  ║', cls: 'accent' },
    { text: '║          https://example.com              ║', cls: 'dim' },
    { text: '╚══════════════════════════════════════════╝', cls: 'accent' },
    { text: '' },
    { text: ' PRODUCT FIT     ████████░░  3.1/10', cls: 'score' },
    { text: ' GEO             ██░░░░░░░░  1.2/10' },
    { text: ' SEO             █████░░░░░  4.8/10', cls: 'score' },
    { text: ' TRUST           ██████░░░░  5.5/10' },
    { text: ' CONVERSION      ████████░░  7.2/10', cls: 'score' },
    { text: '' },
    { text: ' ⚠ TOP ISSUES', cls: 'accent' },
    { text: '' },
    { text: '  1. [PRODUCT] Headline is generic', cls: 'error' },
    { text: '     → Name the specific job...', cls: 'dim' },
    { text: '     Impact: High', cls: 'dim' },
    { text: '' },
    { text: '  2. [GEO] No schema markup found', cls: 'error' },
    { text: '     → Add Organization + Product schema', cls: 'dim' },
    { text: '     Impact: High', cls: 'dim' },
    { text: '' },
    { text: '  3. [TRUST] No testimonials or logos', cls: 'error' },
    { text: '     → Add customer logos above the fold', cls: 'dim' },
    { text: '     Impact: Medium', cls: 'dim' },
    { text: '' },
    { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', cls: 'dim' },
    { text: ' Full report + 8 more fixes at crit.9roq.com', cls: 'dim' },
    { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', cls: 'dim' },
  ];

  let lineIndex = 0;
  let charIndex = 0;
  let isTyping = false;
  let currentLineEl = null;

  function createLine(text, cls) {
    const div = document.createElement('div');
    div.className = 'terminal-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    return div;
  }

  function startTyping() {
    terminalBody.innerHTML = '';
    lineIndex = 0;
    charIndex = 0;
    typeNextChar();
  }

  function typeNextChar() {
    if (lineIndex >= reportLines.length) {
      // Animation complete — show blinking cursor
      const cursor = document.createElement('span');
      cursor.className = 'terminal-cursor';
      terminalBody.appendChild(cursor);
      return;
    }

    const line = reportLines[lineIndex];
    const text = line.text || '';
    const cls = line.cls || '';

    if (!isTyping) {
      // Start a new line
      currentLineEl = createLine('', cls);
      terminalBody.appendChild(currentLineEl);
      isTyping = true;
      charIndex = 0;
    }

    if (charIndex < text.length) {
      // Type the next character
      currentLineEl.textContent += text[charIndex];
      charIndex++;
      const delay = Math.random() * 30 + 15; // 15-45ms per char
      setTimeout(typeNextChar, delay);
    } else {
      // Line done, move to next
      isTyping = false;
      lineIndex++;
      const delay = text ? 150 : 80; // pause between lines
      setTimeout(typeNextChar, delay);
    }
  }

  // Start the typing animation after a brief delay
  const initialDelay = setTimeout(() => {
    startTyping();
  }, 600);

  // Restart animation every cycle for visitors who stay
  const restartInterval = setInterval(() => {
    if (lineIndex >= reportLines.length) {
      setTimeout(() => {
        lineIndex = 0;
        charIndex = 0;
        isTyping = false;
        currentLineEl = null;
        startTyping();
      }, 4000);
    }
  }, 1000);

  /* ─── URL Paste Handler ────────────────────────────────────────────── */

  const pasteInputs = document.querySelectorAll('.input-group input');
  const pasteForms = document.querySelectorAll('.input-group');

  pasteForms.forEach(form => {
    const input = form.querySelector('input');
    const button = form.querySelector('button');

    if (!input || !button) return;

    button.addEventListener('click', async () => {
      const url = input.value.trim();
      if (!url) return;

      button.disabled = true;
      button.textContent = 'Auditing...';

      // Show status message
      let statusEl = form.parentElement.querySelector('.status-msg');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'status-msg';
        form.parentElement.appendChild(statusEl);
      }

      statusEl.textContent = 'Scanning ' + url + '...';
      statusEl.className = 'status-msg';

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        statusEl.textContent = `Score: ${data.overall_score || '?'}/10 — built for ${url}`;
        statusEl.className = 'status-msg success';

        // Scroll to sample report section
        const sampleSection = document.querySelector('.sample-section');
        if (sampleSection) {
          sampleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        statusEl.textContent = 'Audit failed: ' + err.message;
        statusEl.className = 'status-msg error';
      } finally {
        button.disabled = false;
        button.textContent = 'Audit →';
      }
    });

    // Enter key to submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        button.click();
      }
    });
  });

  /* ─── Scroll-triggered reveal animations ───────────────────────────── */

  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    revealElements.forEach(el => el.classList.add('visible'));
  }

  /* ─── Smooth scroll for nav links ──────────────────────────────────── */

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});