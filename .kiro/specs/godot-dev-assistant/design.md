# Design Document

## Overview

Godot Dev Assistant is a single-page web application with a vanilla HTML/CSS/JS frontend and a Node.js/Express backend. The two modes — Code Help and Pixel Art — share a common response-rendering pipeline but differ in their input forms and backend prompt construction. GPT-4o handles both text-only (code analysis) and multimodal (image + text) requests. All AI communication is server-side; the frontend never touches the OpenAI API key.

---

## Architecture

```
Browser (Vanilla HTML/CSS/JS)
  │
  │  HTTP POST (JSON or multipart/form-data)
  ▼
Node.js / Express Server
  ├── POST /api/code-help   → prompt builder → OpenAI GPT-4o (text)
  ├── POST /api/pixel-art   → multer → prompt builder → OpenAI GPT-4o (vision)
  └── GET  /                → serves public/ static files
  │
  │  OpenAI SDK (server-side only)
  ▼
OpenAI API (GPT-4o)
```

The frontend and backend are cleanly decoupled: the frontend only knows about the two REST endpoints and the JSON response shape `{ result: string }`. The backend owns all OpenAI interaction.

---

## Components

### Frontend (`public/`)

**`index.html`** — Single HTML file containing:
- Tab navigation bar with "Code Help" and "Pixel Art" buttons
- Code Help panel: `<textarea>` for GDScript, `<input>` for question, submit button
- Pixel Art panel: `<input type="file">` for image, `<input>` for question, submit button
- Shared response output area (`<div id="response-output">`)
- Loading indicator (`<div id="loading">`)
- Inline validation error containers per panel
- `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js">` CDN tag
- `<script src="app.js">` for all interaction logic

**`public/app.js`** — Client-side JavaScript:
- Tab switching: toggles `active` class and shows/hides panels
- Form validation: checks for empty/whitespace-only inputs before submission
- `submitCodeHelp()`: POSTs `{ code, question }` as JSON to `/api/code-help`
- `submitPixelArt()`: POSTs `FormData` (image + question) to `/api/pixel-art`
- `handleResponse(data)`: calls `marked.parse(data.result)` and injects HTML into output area
- `handleError(err)`: displays human-readable error in output area
- Loading state management: show/hide indicator, disable/enable submit button

**`public/style.css`** — Styling for tabs, panels, response area, loading spinner, error messages.

### Backend (`server.js`)

**Express app** with:
- `express.json()` middleware for JSON body parsing
- `express.static('public')` to serve frontend files
- `multer({ limits: { fileSize: 10 * 1024 * 1024 } })` for image uploads (10 MB cap)
- `dotenv.config()` to load `OPENAI_API_KEY` from `.env`
- OpenAI client instantiated once at startup: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`

**Route handlers:**

`POST /api/code-help`
- Reads `req.body.code` and `req.body.question`
- Constructs a structured prompt (see Prompt Design section)
- Calls `openai.chat.completions.create(...)` with `model: "gpt-4o"`
- Returns `{ result: responseText }` as JSON

`POST /api/pixel-art`
- Multer parses the multipart body; image is in `req.file.buffer`
- Reads `req.body.question`
- Encodes image as base64 data URL
- Calls `openai.chat.completions.create(...)` with vision message format
- Returns `{ result: responseText }` as JSON

**Global error handler** middleware catches unhandled exceptions and returns HTTP 500 with a generic message.

### Evaluation Suite (`eval/`)

**`eval/run-eval.js`** — Node.js script that:
- Imports labeled test cases from `eval/test-cases.js`
- For each test case, sends the input to the running backend via HTTP
- Compares the AI response against the expected label criteria (keyword/pattern matching)
- Prints a summary: `Passed: X / Total: Y`

**`eval/test-cases.js`** — Array of ≥10 test case objects:
```js
{
  type: 'code-help' | 'pixel-art',
  input: { code?, question, imagePath? },
  label: { mustContain: string[], mustNotContain?: string[] }
}
```

---

## Interfaces

### REST API

#### `POST /api/code-help`

Request:
```json
{
  "code": "func _ready():\n    pass",
  "question": "How should I implement a state machine here?"
}
```

Response (200):
```json
{
  "result": "## State Machine Pattern\n\nFor Godot, consider using..."
}
```

Response (4xx/5xx):
```json
{
  "error": "Descriptive error message"
}
```

#### `POST /api/pixel-art`

Request: `multipart/form-data`
- `image`: binary file (PNG/JPG/GIF/WebP, max 10 MB)
- `question`: string

Response (200):
```json
{
  "result": "## Visual Feedback\n\nYour sprite uses a limited palette..."
}
```

Response (4xx/5xx):
```json
{
  "error": "Descriptive error message"
}
```

### Frontend ↔ Backend Contract

The frontend always expects one of two shapes:
- Success: `{ result: string }` — markdown text, rendered via `marked.parse()`
- Error: HTTP non-2xx with `{ error: string }` — displayed as plain text in the output area

---

## Data Models

### Code Help Request (client → server)
```js
{
  code: string,      // GDScript source, non-empty
  question: string   // developer question, non-empty
}
```

### Pixel Art Request (client → server, multipart)
```
image: File          // image file, max 10 MB
question: string     // developer question, non-empty
```

### AI Response (server → client)
```js
{
  result: string     // markdown-formatted AI response
}
```

### Error Response (server → client)
```js
{
  error: string      // human-readable error description
}
```

### Eval Test Case
```js
{
  type: 'code-help' | 'pixel-art',
  input: {
    code?: string,
    imagePath?: string,
    question: string
  },
  label: {
    mustContain: string[],     // substrings that must appear in response
    mustNotContain?: string[]  // substrings that must not appear
  }
}
```

---

## Prompt Design

### Code Help Prompt

```
You are an expert Godot game developer and GDScript tutor.
The developer has shared the following GDScript code:

\`\`\`gdscript
{code}
\`\`\`

Their question is: {question}

Provide structured advice focused on Godot game development patterns such as
state machines, animation trees, signals, and scene composition.
Format your response as markdown with clear headings and code examples where relevant.
```

### Pixel Art Prompt

The vision message includes:
- A text part: `"You are an expert pixel art critic for game developers. The developer asks: {question}. Provide visual feedback and improvement suggestions as markdown."`
- An image part: `{ type: "image_url", image_url: { url: "data:{mimeType};base64,{base64Data}" } }`

---

## Error Handling

| Scenario | Backend Behavior | Frontend Behavior |
|---|---|---|
| Empty code or question (Code Help) | N/A — frontend blocks | Show inline validation error, no request sent |
| No image or empty question (Pixel Art) | N/A — frontend blocks | Show inline validation error, no request sent |
| Image exceeds 10 MB | multer rejects with 413 | Display error in output area |
| OpenAI API error (4xx/5xx) | Return HTTP error + `{ error: message }` | Display error in output area, hide loading |
| OpenAI rate limit / timeout | Return HTTP 429 or 503 + `{ error: message }` | Display error in output area, hide loading |
| Unhandled server exception | Return HTTP 500 + `{ error: "An unexpected error occurred." }` | Display generic error in output area |
| Network failure (fetch throws) | N/A | Display "Network error. Please try again." |

---

## Security Considerations

- `OPENAI_API_KEY` is loaded exclusively via `dotenv` on the server; it is never sent to the frontend or included in any API response.
- `.env` is listed in `.gitignore`; only `.env.example` (with a placeholder value) is committed.
- Multer enforces a 10 MB file size limit to prevent resource exhaustion.
- User-supplied code and questions are passed directly to the OpenAI API as prompt content — no SQL or shell execution occurs, so injection risk is limited to prompt injection, which is inherent to LLM applications.

---

## File Structure

```
finalproject/
├── server.js              # Express server, route handlers
├── package.json           # Pinned dependencies
├── .env.example           # OPENAI_API_KEY=
├── .gitignore             # node_modules/, .env
├── README.md              # Setup and run instructions
├── REPORT.md              # Project report (4 sections)
├── public/
│   ├── index.html         # Single-page UI
│   ├── app.js             # Client-side JS
│   └── style.css          # Styles
└── eval/
    ├── run-eval.js        # Evaluation runner
    └── test-cases.js      # ≥10 labeled test cases
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Code Help inputs always produce a POST request

*For any* non-empty GDScript code string and non-empty question string, submitting the Code Help form SHALL result in exactly one HTTP POST request sent to `/api/code-help` containing both values in the JSON body.

**Validates: Requirements 2.2**

---

### Property 2: Invalid Code Help inputs are always rejected client-side

*For any* combination of inputs where the GDScript code is empty or whitespace-only, or the question is empty or whitespace-only, submitting the Code Help form SHALL display a validation error and SHALL NOT send any HTTP request to the backend.

**Validates: Requirements 2.3**

---

### Property 3: Code Help prompt always contains both code and question

*For any* non-empty code string and non-empty question string received by the backend, the prompt constructed and sent to the OpenAI API SHALL contain both the code string and the question string verbatim.

**Validates: Requirements 2.4**

---

### Property 4: Backend always wraps OpenAI response text in JSON

*For any* non-empty response text returned by the OpenAI API (mocked or real), the backend SHALL return a JSON object with a `result` field containing that exact text, with HTTP status 200.

**Validates: Requirements 2.5, 3.5**

---

### Property 5: Valid Pixel Art inputs always produce a multipart POST request

*For any* selected image file and non-empty question string, submitting the Pixel Art form SHALL result in exactly one HTTP POST multipart/form-data request sent to `/api/pixel-art` containing both the image and the question.

**Validates: Requirements 3.2**

---

### Property 6: Invalid Pixel Art inputs are always rejected client-side

*For any* combination of inputs where no image is selected or the question is empty or whitespace-only, submitting the Pixel Art form SHALL display a validation error and SHALL NOT send any HTTP request to the backend.

**Validates: Requirements 3.3**

---

### Property 7: Pixel Art backend always includes image and question in OpenAI call

*For any* uploaded image buffer and non-empty question string received by the backend, the OpenAI API call SHALL include the base64-encoded image data and the question string in the message payload.

**Validates: Requirements 3.4**

---

### Property 8: Markdown rendering round-trip preserves content

*For any* AI response string containing markdown, passing it through `marked.parse()` SHALL produce an HTML string that contains all the non-markup text content of the original string.

**Validates: Requirements 4.1**

---

### Property 9: OpenAI errors always propagate as non-2xx responses with error messages

*For any* error response from the OpenAI API (any error type or status code), the backend SHALL return an HTTP status code ≥ 400 and a JSON body with a non-empty `error` string field.

**Validates: Requirements 5.1**

---

### Property 10: Frontend always displays errors and hides loading state on HTTP errors

*For any* HTTP error response (status ≥ 400) received from the backend, the frontend SHALL display a non-empty human-readable error message in the response output area and SHALL hide the loading state indicator.

**Validates: Requirements 5.2**

---

### Property 11: Unhandled server exceptions always return HTTP 500

*For any* unhandled exception thrown during request processing, the Express error handler SHALL return HTTP status 500 and a JSON body with a non-empty `error` string field.

**Validates: Requirements 5.3**

---

### Property 12: Eval summary accurately counts pass and fail results

*For any* set of test case execution results, the eval script's summary output SHALL report a `passed` count and a `failed` count that together equal the total number of test cases, with each count accurately reflecting the actual outcomes.

**Validates: Requirements 8.4**
