/**
 * eval/run-eval.js
 *
 * Evaluation runner for the Godot Dev Assistant.
 * Sends each test case to the running backend and measures the
 * Actionable Suggestion Rate (ASR):
 *   - A test PASSES if ≥ 3 of the mustContain keywords are found in the
 *     AI response (case-insensitive).
 *   - ASR = passed / total-non-skipped tests
 *   - Target: ASR ≥ 0.70
 *
 * Usage: node eval/run-eval.js
 * Requires the backend to be running at http://localhost:3000
 *
 * Requirements: 8.1, 8.3, 8.4
 */

'use strict';

const fs = require('fs');
const path = require('path');
const testCases = require('./test-cases.js');

const BASE_URL = 'http://localhost:3000';
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Send a Code Help request to the backend.
 * @param {string} code
 * @param {string} question
 * @returns {Promise<string>} AI response text
 */
async function sendCodeHelp(code, question) {
  const response = await fetch(`${BASE_URL}/api/code-help`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, question }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data.result;
}

/**
 * Send a Pixel Art request to the backend as multipart/form-data.
 * @param {string} imagePath  Path relative to project root
 * @param {string} question
 * @returns {Promise<string>} AI response text
 */
async function sendPixelArt(imagePath, question) {
  const absolutePath = path.resolve(PROJECT_ROOT, imagePath);
  const imageBuffer = fs.readFileSync(absolutePath);

  // Determine MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/png';

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('image', blob, path.basename(imagePath));
  formData.append('question', question);

  const response = await fetch(`${BASE_URL}/api/pixel-art`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data.result;
}

/**
 * Count how many mustContain keywords appear in the response (case-insensitive).
 * @param {string} responseText
 * @param {string[]} keywords
 * @returns {{ matched: string[], count: number }}
 */
function checkKeywords(responseText, keywords) {
  const lower = responseText.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
  return { matched, count: matched.length };
}

/**
 * Main evaluation runner.
 */
async function runEval() {
  let passed = 0;
  let total = 0; // non-skipped tests

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const testNum = i + 1;

    // ── Pixel Art: check image existence before sending ──────────────────────
    if (tc.type === 'pixel-art') {
      const absolutePath = path.resolve(PROJECT_ROOT, tc.input.imagePath);
      if (!fs.existsSync(absolutePath)) {
        console.log(`[SKIP] Test ${testNum}: SKIPPED — image not found`);
        continue;
      }
    }

    total++;

    try {
      let responseText;

      if (tc.type === 'code-help') {
        responseText = await sendCodeHelp(tc.input.code, tc.input.question);
      } else {
        responseText = await sendPixelArt(tc.input.imagePath, tc.input.question);
      }

      const { matched, count } = checkKeywords(responseText, tc.label.mustContain);
      const pass = count >= 3;

      if (pass) {
        passed++;
        console.log(
          `[PASS] Test ${testNum}: matched keywords: ${matched.join(', ')}`
        );
      } else {
        console.log(
          `[FAIL] Test ${testNum}: matched keywords: ${matched.join(', ') || '(none)'}`
        );
      }
    } catch (err) {
      console.log(`[FAIL] Test ${testNum}: error — ${err.message}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const asr = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  console.log(`\nPassed: ${passed} / Total: ${total} | ASR: ${asr}%`);

  if (total > 0 && passed / total >= 0.70) {
    console.log('✓ ASR target met (≥ 70%)');
  } else if (total > 0) {
    console.log('✗ ASR target NOT met (< 70%)');
  }
}

runEval().catch((err) => {
  console.error('Fatal error running eval:', err.message);
  process.exit(1);
});
