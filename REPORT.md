# Godot Dev Assistant — Project Report

---

## What & Why

Godot Dev Assistant is a web application that gives Godot game developers on-demand AI-powered help within three modes:

- **Code Help** - As someone who asks AI for advice and proper structure whenever building a game project, I always want to find the most efficient and professional way. With code help mode, you can input any script code and ask for suggestions to make it better. The conversation is multi-turn — you can ask follow-up questions and the model remembers the full context of your code and previous answers.

- **Pixel Art Feedback** - For people who doesn't know color composition, shading or anything related to it, pixel art feedback mode will give you the rough idea on how to make your game art better!

- **Brainstorm** - Game Developers are always coming up with new ideas, through the brainstorm tab, the agent will help you shape these ideas and give you meaningful suggestions!

### Why this tool?

Godot's documentation is thorough but dense, and developers often need contextual guidance rather than raw reference material. Searching forums or reading through long threads is slow. This tool shortens that loop: a developer pastes their actual code or uploads their actual asset and gets targeted, actionable feedback in seconds.

This tool is mainly for Godot beginners and seasoned developers as well. With the help of this AI tool, solo game developers can easily make their own game! I myself will be using it for my upcoming game called bondweaver!

### What's hard about getting the AI behavior right

Getting the model to give consistently useful advice is harder than it looks. The main challenges are: (1) Godot 4 and Godot 3 have different APIs — the model sometimes gives Godot 3 answers (e.g. `KinematicBody2D` instead of `CharacterBody2D`) even when the user is clearly on Godot 4; (2) in multi-turn conversations, the model can drift and forget the original code context after several exchanges; (3) the "Games That Use This Pattern" section requires the model to make accurate real-world connections — it occasionally names games that don't actually use the pattern described; (4) pixel art feedback quality varies heavily depending on image resolution and subject matter, making keyword-based scoring an imperfect proxy for actual usefulness.

Since Godot is a fairly new open-source game engine, it is still updating and with that some function calls and syntax are either removed or modified.

---

## Iterations

### V1 — Single-page, single-mode prototype

**Change:** Built the initial Code Help mode with a single POST route (`/api/code-help` in `server.js`) that forwarded code and a question to GPT-4o and returned raw plain text.

**Motivating example:** Test case 3 (health system with UI) — the response contained a GDScript code block that rendered as a wall of unformatted text, making it completely unreadable. None of the `mustContain` keywords (`ProgressBar`, `Label`, `signal`) were detectable in the raw output because the response structure was inconsistent.

**Delta:** ASR 33% (2/6 code-help cases passed) — responses were unformatted and keyword matching was unreliable on plain text output.

**Conclusion:** The low ASR was caused by two problems: plain text responses made code blocks unreadable, and the prompt gave no formatting instructions so the model's output structure varied wildly. The obvious next step was to add markdown rendering and explicit formatting instructions in the prompt.

---

### V2 — Markdown rendering, Pixel Art mode, and multimodal input

**Change:** Added marked.js rendering (`handleResponse()` in `public/app.js`) so AI responses display as formatted markdown. Added the Pixel Art tab with a multimodal backend route (`POST /api/pixel-art` in `server.js`) that base64-encodes uploaded images and passes them as data URLs in the OpenAI vision message. Updated the Code Help prompt to explicitly request markdown with headings and code examples.

**Motivating example:** Test case 4 (smooth movement with delta) — V1 returned a response that mentioned `delta` and `lerp` but buried them in an unformatted paragraph. After adding markdown rendering and the formatting instruction, the same question produced a structured response with a `## Smooth Movement` heading and a fenced code block, making keyword matching reliable.

**Delta:** ASR 67% (4/6 code-help cases passed). The pixel art cases were added but initially skipped because image files were not yet included in the repo.

**Conclusion:** Markdown rendering fixed the readability problem and improved keyword hit rate significantly. The remaining failures were cases where the model gave correct but generic advice that didn't include the specific Godot API names in the `mustContain` list. Adding a loading spinner and button-disable logic also improved UX but didn't affect ASR.

---

### V3 — Multi-turn conversation, game references, and full eval suite

**Change:** Rewrote `POST /api/code-help` in `server.js` to support multi-turn conversation. The endpoint now accepts either `{ code, question }` (first turn) or `{ messages, followUp }` (follow-up turns), prepends a system message server-side, and returns `{ result, messages }` so the client can pass the full history back on the next request. Also added a "Games That Use This Pattern" instruction to the system prompt so every response ends with 2–4 real game examples. Added the Brainstorm tab (Class Designer and Game Idea Flesher sub-modes). Completed the eval suite with all 10 test cases running against real image files.

**Motivating example:** Test case 2 (connecting movement with animation) — in V2, a follow-up question like "how do I blend between walk and run animations?" produced a generic answer because the model had no memory of the original code. With multi-turn history, the same follow-up correctly referenced the `AnimationTree` structure from the first response.

**Delta:** ASR 80% (8/10 cases passed on full suite). The two failures were pixel art cases where the model described the image accurately but used synonyms not in the `mustContain` list (e.g. "hue" instead of "color", "luminance" instead of "contrast").

**Conclusion:** Multi-turn conversation improved response coherence on follow-up questions. The remaining failures point to a weakness in keyword-based scoring — the metric doesn't capture semantic similarity. A next step would be to use an embedding-based similarity score instead of exact keyword matching, which would handle synonym variation.

---

## Code Walkthrough

A user opens the Code Help tab, pastes a GDScript `CharacterBody2D` movement script, types "How do I add a double jump?", and clicks **Get Code Help**.

1. **`public/index.html` (form submit)** — The `<form id="form-code-help">` submit event fires. The `novalidate` attribute means browser validation is skipped; all validation is handled in JS.

2. **`public/app.js` — `submitCodeHelp()`** — The function reads `codeInput.value.trim()` and `codeQuestion.value.trim()`. If either is empty it sets `codeHelpError.textContent` and returns early. Otherwise it calls `setLoadingState(true, submitCodeHelpBtn)` to show the spinner and disable the button, then POSTs `{ code, question }` as JSON to `/api/code-help`.

3. **`server.js` — `POST /api/code-help` (around line 35)** — The handler checks whether `req.body.messages` is present. On a first turn it isn't, so it builds a `messages` array: a system message (Godot tutor persona + formatting instructions + "Games That Use This Pattern" directive) followed by a user message that embeds the code in a fenced GDScript block and appends the question. It calls `openai.chat.completions.create({ model: 'gpt-4o', messages })` and returns `{ result: responseText, messages: updatedMessages }` — the updated history is sent back so the client can use it on follow-up turns.

4. **`public/app.js` — response handling** — On success, `codeHelpMessages = data.messages` stores the history. `showConversationView()` hides the initial form and shows the conversation thread. `appendMessageBubble('user', ...)` and `appendMessageBubble('assistant', data.result)` render the exchange as chat bubbles, with the assistant bubble piped through `marked.parse()`.

**Design decision:** The system message is always prepended server-side rather than sent from the client. The alternative was to have the client include the system message in the `messages` array it sends. I rejected that because it would let a user craft a malicious system message by manipulating the request body, partially bypassing the intended persona. Keeping it server-side means the system prompt is always authoritative.

---

## AI Disclosure & Safety

### How I used Kiro

It is my first time using an AI CLI and it blew my mind, with this I can expand the website as much as I want as I will be working as a solo developer.

I used Kiro (an AI coding assistant) throughout this project to scaffold boilerplate, debug issues, and implement features. Three specific moments where it failed and how I recovered:

1. **Multi-turn endpoint — wrong message structure.** When I asked Kiro to implement multi-turn conversation, it initially placed the system message inside the client-side `messages` array that gets sent back and forth. This meant the system prompt was duplicated on every follow-up turn, inflating token usage and causing the model to occasionally contradict its own persona. I caught this by reading the generated code carefully, identified the duplication, and told Kiro to strip the system message before returning `updatedMessages` to the client and re-add it server-side on every request.

2. **Pixel Art eval — skipped test cases.** Kiro generated the initial `test-cases.js` with placeholder image paths (`eval/images/character.png`, `eval/images/tileset.png`) that didn't exist. The eval runner silently skipped all four pixel art cases, giving a misleadingly high ASR on only 6 tests. I noticed the SKIP output in the terminal, added real image files, and updated the test cases to use the actual filenames.

3. **Brainstorm tab — concurrent file edits caused conflicts.** When Kiro implemented the Brainstorm tab, it dispatched multiple subagents to edit `app.js` and `index.html` simultaneously. One agent overwrote changes made by another, leaving the `switchBrainstormMode` function missing from the file. I caught this by running the app and seeing a `ReferenceError` in the browser console, then manually verified the file and re-ran the affected task.

### Safety risk

The primary safety risk in this app is **prompt injection**: user-supplied GDScript code and questions are embedded directly into the prompt sent to GPT-4o. A user could craft input designed to override the system persona (e.g. pasting `Ignore all previous instructions and...` as their "code"). The mitigation I chose is that the app never acts on the model's output in any automated way — it only displays text to the user who submitted the request. There is no agentic loop, no code execution, and no data persistence, so the practical blast radius of a successful injection is limited to the attacker receiving a degraded or off-topic response.
