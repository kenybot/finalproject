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
//
// Supports multi-turn conversation.
//
// Request body (first turn):
//   { code: string, question: string }
//
// Request body (follow-up turns):
//   { messages: Array<{ role: 'user'|'assistant', content: string }>, followUp: string }
//
// The system prompt is always prepended server-side so the client never needs
// to manage it. On the first turn the code is embedded in the initial user
// message; on follow-up turns the existing messages array is used as-is and
// the new follow-up question is appended.

app.post('/api/code-help', async (req, res, next) => {
  try {
    const { code, question, messages: clientMessages, followUp } = req.body;

    const SYSTEM_MESSAGE = {
      role: 'system',
      content:
        'You are an expert Godot game developer and GDScript tutor. ' +
        'Provide structured advice focused on Godot game development patterns such as ' +
        'state machines, animation trees, signals, and scene composition. ' +
        'Format all responses as markdown with clear headings and code examples where relevant. ' +
        'At the end of every response, add a section titled "## Games That Use This Pattern" ' +
        'listing 2–4 real, well-known games that use the same pattern or mechanic the developer ' +
        'is working on. For each game, write one sentence explaining how it uses the pattern. ' +
        'This helps the developer visualize the concept in a finished product.',
    };

    let messages;

    if (Array.isArray(clientMessages) && clientMessages.length > 0 && followUp) {
      // ── Follow-up turn: use existing history + new question ────────────────
      const trimmedFollowUp = followUp.trim();
      if (!trimmedFollowUp) {
        return res.status(400).json({ error: 'followUp is required' });
      }
      messages = [
        SYSTEM_MESSAGE,
        ...clientMessages,
        { role: 'user', content: trimmedFollowUp },
      ];
    } else {
      // ── First turn: embed the code and initial question ────────────────────
      if (!code || !question) {
        return res.status(400).json({ error: 'code and question are required' });
      }
      const firstUserMessage = `The developer has shared the following GDScript code:

\`\`\`gdscript
${code}
\`\`\`

Their question is: ${question}`;

      messages = [SYSTEM_MESSAGE, { role: 'user', content: firstUserMessage }];
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    const responseText = completion.choices[0].message.content;

    // Return the assistant reply plus the updated messages array so the client
    // can pass it back on the next turn without re-sending the full code.
    const updatedMessages = [
      ...messages.slice(1), // strip the system message before sending to client
      { role: 'assistant', content: responseText },
    ];

    res.status(200).json({ result: responseText, messages: updatedMessages });
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

// ── POST /api/class-designer ──────────────────────────────────────────────────

app.post('/api/class-designer', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'description is required' });
    }

    const prompt = `You are a Godot architecture expert.
The developer has described a class they want to create:

${description}

Return a GDScript class scaffold formatted as markdown containing:
- A suggested class name
- A list of properties with GDScript types and descriptions
- A list of methods with signatures and descriptions
- A list of signals with descriptions
- A complete GDScript code template`;

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

// ── POST /api/game-idea-flesher ───────────────────────────────────────────────

app.post('/api/game-idea-flesher', async (req, res) => {
  try {
    const { concept } = req.body;

    if (!concept || concept.trim() === '') {
      return res.status(400).json({ error: 'concept is required' });
    }

    const prompt = `You are a Godot game design consultant.
The developer has described a game concept:

${concept}

Return a structured brainstorm document formatted as markdown with exactly four sections:
1. Mind Map — a hierarchical outline of themes, mechanics, and entities
2. UML Diagram — text-based entity/class relationships as a markdown code block
3. Gameplay Loop — a written description of the core repeating cycle
4. Suggestions — actionable recommendations for implementing this game in Godot`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = completion.choices[0].message.content;
    res.status(200).json({ result: responseText });
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
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
