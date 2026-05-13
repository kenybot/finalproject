'use strict';

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');

// ── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static('public'));

// ── Multer (10 MB file size limit) ───────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── POST /api/code-help ───────────────────────────────────────────────────────

app.post('/api/code-help', async (req, res, next) => {
  try {
    const { code, question } = req.body;

    const prompt = `You are an expert Godot game developer and GDScript tutor.
The developer has shared the following GDScript code:

\`\`\`gdscript
${code}
\`\`\`

Their question is: ${question}

Provide structured advice focused on Godot game development patterns such as
state machines, animation trees, signals, and scene composition.
Format your response as markdown with clear headings and code examples where relevant.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = completion.choices[0].message.content;
    res.status(200).json({ result: responseText });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ── POST /api/pixel-art ───────────────────────────────────────────────────────

app.post('/api/pixel-art', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    // Handle multer errors (e.g. file too large)
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
      }
      return next(err);
    }

    try {
      const { question } = req.body;
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Encode image as base64 data URL
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Construct the vision message
      const visionMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert pixel art critic for game developers. The developer asks: ${question}. Provide visual feedback and improvement suggestions as markdown.`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      };

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [visionMessage],
      });

      const responseText = completion.choices[0].message.content;
      res.status(200).json({ result: responseText });
    } catch (err) {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({ error: err.message });
    }
  });
});

// ── Global error handler (must be last — 4 arguments) ────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { app, upload, openai };
