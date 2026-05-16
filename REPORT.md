# Godot Dev Assistant — Project Report

---

## What & Why

Godot Dev Assistant is a web application that gives Godot game developers on-demand AI-powered help within three modes:

- ** Code Help** - As someone who asks AI for advice and proper structure whenever buidling a game project, I always want to find the most efficient and professional way. With code help mode, you can input any script code and ask for suggestions to make it better. 
  
- **Pixel Art Feedback** - For people who doesn't know color composition , shading or anything related to it, pixel art feedback mode will give you the rough idea on how to make your game art better!

- **Brainstorm** - Game Developers are always coming up with new ideas, through the brainstorm tab, the agent will help you shape these ideas and give you meaningful suggestions!

### Why this tool?

Godot's documentation is thorough but dense, and developers often need contextual guidance rather than raw reference material. Searching forums or reading through long threads is slow. This tool shortens that loop: a developer pastes their actual code or uploads their actual asset and gets targeted, actionable feedback in seconds.


## Iterations

### Version 1 — Single-page, single-mode prototype

The first working version had only the Code Help mode. The entire UI was a single form with a textarea, a text input, and a submit button. The backend had one route (`POST /api/code-help`) that forwarded the code and question to GPT-4o and returned the raw response text as plain text.

Key limitations discovered during this iteration:
- Plain text responses were hard to read; code examples were not formatted.
- There was no loading indicator, so the UI appeared frozen while waiting for the API.
- The API key was temporarily hard-coded in `server.js` during local testing (removed before any commit).

### Version 2 — Markdown rendering and Pixel Art mode added

The second iteration addressed the readability problem by integrating marked.js. The `handleResponse` function was introduced to pipe the AI response through `marked.parse()` before injecting it into the DOM. This made code blocks, headings, and bullet lists render correctly.

Pixel Art mode was added in this iteration. The initial approach sent the image as a URL, which required the image to be publicly hosted. This was impractical for local development, so the approach was changed to base64-encoding the uploaded image buffer server-side and passing it as a data URL in the OpenAI vision message. This removed the dependency on external hosting entirely.

A loading spinner and button-disable logic were also added in this iteration to give users clear feedback while the API call was in flight.

### Version 3 — Validation, error handling, and evaluation suite

The third iteration hardened the application for real use. Client-side validation was added to both forms: the Code Help form checks that neither the code textarea nor the question input is empty before sending a request; the Pixel Art form checks that a file is selected and the question is non-empty. Inline error messages are displayed adjacent to the form rather than in the shared response area, so validation feedback is clearly associated with the input that caused it.

Server-side error handling was also formalised. The backend now returns structured `{ error: string }` JSON for all failure cases (OpenAI API errors, oversized uploads, unhandled exceptions), and the frontend's `handleError` function renders these consistently in the response output area.

The evaluation suite (`eval/`) was built in this iteration. It defines ten labeled test cases (six Code Help, four Pixel Art) and an automated runner that sends each case to the live backend, checks the response against keyword criteria, and reports an Actionable Suggestion Rate (ASR). The target ASR is ≥ 70%.

---

## Code Walkthrough

### `server.js`

The entry point for the backend. It:

1. Calls `dotenv.config()` to load `OPENAI_API_KEY` from `.env` before anything else runs.
2. Sets up Express middleware: `express.json()` for JSON body parsing and `express.static('public')` to serve the frontend.
3. Configures a multer instance with a 10 MB file size limit using in-memory storage (`multer.memoryStorage()`), so uploaded images are held in `req.file.buffer` rather than written to disk.
4. Instantiates the OpenAI client once at startup: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
5. Defines `POST /api/code-help`: reads `req.body.code` and `req.body.question`, constructs a structured GDScript tutor prompt, calls `openai.chat.completions.create` with `model: "gpt-4o"`, and returns `{ result: responseText }`.
6. Defines `POST /api/pixel-art`: applies the multer middleware inline, reads `req.file.buffer` and `req.body.question`, base64-encodes the image into a data URL, constructs a vision message (text part + image_url part), calls the same GPT-4o model, and returns `{ result: responseText }`.
7. Registers a four-argument global error handler as the last middleware, which catches any unhandled exception and returns HTTP 500 with `{ error: "An unexpected error occurred." }`.

### `public/index.html`

The single HTML file that defines the entire UI structure. Notable points:

- The tab navigation uses `role="tablist"` and `role="tab"` ARIA attributes so screen readers understand the tab relationship.
- Each panel uses `role="tabpanel"` with `aria-labelledby` pointing to its tab button.
- Inline error containers (`#code-help-error`, `#pixel-art-error`) use `role="alert"` and `aria-live="polite"` so validation messages are announced to assistive technologies.
- The shared `#loading` div and `#response-output` div sit outside the panels so they persist across tab switches.
- marked.js is loaded from the jsDelivr CDN before `app.js` so `marked.parse` is available when the script runs.

### `public/app.js`

All client-side interaction logic. Organised into four sections:

- **Tab switching** — `switchTab(tabName)` toggles the `active` class and `aria-selected` attribute on the tab buttons and sets `display` on the panels. Called on click and once on page load to enforce the default state.
- **Shared UI helpers** — `setLoadingState(isLoading, submitBtn)` shows/hides the spinner and disables/enables the submit button. `handleResponse(data)` renders markdown. `handleError(err)` displays a plain-text error.
- **Code Help form** — `submitCodeHelp()` validates both fields, then POSTs `{ code, question }` as JSON to `/api/code-help`. Uses `async/await` with a `try/catch/finally` block; the `finally` block always restores the loading state.
- **Pixel Art form** — `submitPixelArtFn()` validates the file selection and question, builds a `FormData` object, and POSTs it to `/api/pixel-art`. The `Content-Type` header is intentionally omitted so the browser sets the correct multipart boundary automatically.

### `eval/`

The evaluation directory contains two files:

- **`eval/test-cases.js`** — exports an array of ten test case objects. Each object has a `type` (`'code-help'` or `'pixel-art'`), an `input` object (with `code`/`imagePath` and `question`), and a `label` object with a `mustContain` array of keywords the AI response should include.
- **`eval/run-eval.js`** — the evaluation runner. It iterates over the test cases, sends each to the running backend via HTTP, checks whether at least three of the `mustContain` keywords appear in the response (case-insensitive), and prints a per-test result. Pixel Art cases whose image file does not exist on disk are skipped rather than failed. The final summary line reports `Passed: X / Total: Y | ASR: Z%`.

---

## AI Disclosure & Safety

### How `OPENAI_API_KEY` is protected

The API key is stored exclusively in a `.env` file on the server. It is loaded at startup via `dotenv.config()` and accessed only through `process.env.OPENAI_API_KEY`. The key is never included in any HTTP response, never logged, and never referenced in any frontend file.

The `.env` file is listed in `.gitignore`, which means it is excluded from version control. Only `.env.example` — which contains the variable name with an empty placeholder value (`OPENAI_API_KEY=`) — is committed to the repository. This ensures that no real credentials can be accidentally pushed to a remote.

The frontend has no knowledge of the key's existence. All OpenAI API calls are made server-side; the browser only communicates with the Express server's two REST endpoints.

### How user inputs are handled

User-supplied data flows through the application as follows:

1. **Code Help**: the GDScript code and question are sent from the browser to the backend as a JSON POST body. The backend interpolates them directly into a prompt string, which is then sent to the OpenAI API as the `content` of a user message. The values are not stored, logged, or written to disk.

2. **Pixel Art**: the image file and question are sent as a multipart/form-data POST. Multer buffers the image in memory (`multer.memoryStorage()`); it is never written to the filesystem. The backend base64-encodes the buffer and includes it as a data URL in the OpenAI vision message alongside the question text. Neither the image nor the question is persisted after the response is returned.

There is no SQL database and no shell command execution in this application. User inputs cannot trigger SQL injection or command injection. The relevant security consideration is **prompt injection**: because user-supplied text is embedded directly into the prompt sent to GPT-4o, a malicious user could craft inputs designed to manipulate the model's output. This risk is inherent to any LLM-powered application that incorporates user content into prompts. Mitigations in this context are limited — the application does not act on the model's output in any automated way, so the practical impact is confined to the quality of the response the attacker themselves receives.
