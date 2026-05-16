# Design Document — Brainstorm Tab

## Overview

The Brainstorm Tab extends the existing Godot Dev Assistant single-page application with two AI-powered sub-modes: **Class Designer** and **Game Idea Flesher**. Both sub-modes follow the same request/response pattern already established by the Code Help and Pixel Art tabs: the user fills in a form, the frontend POSTs to a backend endpoint, the backend calls GPT-4o, and the markdown response is rendered via marked.js.

The design deliberately minimises deviation from the existing codebase. No new libraries, build tools, or frameworks are introduced. All new code is plain HTML, CSS, and vanilla JavaScript on the frontend, and plain Node.js/Express on the backend.

### Key Design Decisions

- **Shared response area**: The existing `#response-output` div and `#loading` indicator are reused for Brainstorm responses, consistent with how Code Help and Pixel Art share them.
- **Sub-mode selector as a `<select>` element**: A native `<select>` is the simplest, most accessible control for choosing between two named modes. No custom widget is needed.
- **Input preservation via DOM visibility toggle**: Sub-mode inputs are hidden with `display: none` rather than removed from the DOM, so user-typed text is preserved when switching modes.
- **Two separate backend endpoints**: `/api/class-designer` and `/api/game-idea-flesher` are kept separate to allow independent prompt tuning and to mirror the pattern of existing endpoints.

---

## Architecture

The feature fits entirely within the existing three-layer architecture:

```
Browser (index.html + app.js + style.css)
        │
        │  HTTP POST (JSON)
        ▼
Express server (server.js)
        │
        │  OpenAI Node SDK
        ▼
OpenAI GPT-4o API
```

No new layers, services, or data stores are introduced. The frontend communicates with the backend over the same origin; no CORS configuration is required.

### Request Flow

```
User fills form
      │
      ▼
Frontend validates input (non-empty, non-whitespace)
      │  fail → show inline error, stop
      │  pass ↓
      ▼
setLoadingState(true, submitBtn)
      │
      ▼
fetch POST /api/class-designer  OR  /api/game-idea-flesher
      │
      ▼
Backend validates body field (description / concept)
      │  missing/empty → HTTP 400 { error: "..." }
      │  valid ↓
      ▼
Backend builds GPT-4o prompt, calls OpenAI API
      │
      ▼
Backend returns HTTP 200 { result: string }
      │
      ▼
Frontend calls handleResponse(data)  →  marked.parse() → #response-output
      │
      ▼
setLoadingState(false, submitBtn)
```

Error paths (HTTP error, network failure, unhandled exception) follow the same `handleError()` path already used by the other tabs.

---

## Components and Interfaces

### Frontend Components

#### 1. Brainstorm Tab Button (`#tab-brainstorm`)

A `<button>` element added to the existing `.tab-nav` alongside `#tab-code-help` and `#tab-pixel-art`.

Attributes:
- `id="tab-brainstorm"`
- `class="tab-btn"`
- `role="tab"`
- `aria-selected="false"` (initial)
- `aria-controls="panel-brainstorm"`

#### 2. Brainstorm Tab Panel (`#panel-brainstorm`)

A `<section>` element with `role="tabpanel"` and `aria-labelledby="tab-brainstorm"`. Hidden on page load (`style="display: none;"`).

Contains:
- A `<select id="brainstorm-mode">` sub-mode selector with two `<option>` elements.
- The Class Designer sub-form (`#brainstorm-class-form`).
- The Game Idea Flesher sub-form (`#brainstorm-game-form`).

#### 3. Sub-Mode Selector (`#brainstorm-mode`)

A native `<select>` element with options:
- `value="class-designer"` — "Class Designer" (selected by default)
- `value="game-idea-flesher"` — "Game Idea Flesher"

A `change` event listener calls `switchBrainstormMode(select.value)`.

#### 4. Class Designer Sub-Form (`#brainstorm-class-form`)

Visible by default when the Brainstorm panel is active.

Elements:
- `<textarea id="class-description">` — multi-line plain-language class description.
- `<div id="class-designer-error" class="error-message" role="alert" aria-live="polite">` — inline validation error container.
- `<button id="submit-class-designer" class="submit-btn">` — submit button.

#### 5. Game Idea Flesher Sub-Form (`#brainstorm-game-form`)

Hidden by default; shown when "Game Idea Flesher" is selected.

Elements:
- `<textarea id="game-concept" maxlength="10000">` — multi-line game concept input.
- `<div id="game-idea-flesher-error" class="error-message" role="alert" aria-live="polite">` — inline validation error container.
- `<button id="submit-game-idea-flesher" class="submit-btn">` — submit button.

### Frontend Functions (app.js additions)

#### `switchTab(tabName)` — extended

The existing `switchTab` function is extended to handle `'brainstorm'` as a valid `tabName`, managing the `#tab-brainstorm` button and `#panel-brainstorm` panel alongside the existing two tabs.

#### `switchBrainstormMode(mode)`

Shows/hides the Class Designer and Game Idea Flesher sub-forms based on `mode` (`'class-designer'` or `'game-idea-flesher'`). Does not clear input values.

#### `submitClassDesigner()`

Validates `#class-description`, calls `setLoadingState`, POSTs to `/api/class-designer`, and delegates to `handleResponse` / `handleError`. Mirrors the structure of `submitCodeHelp()`.

#### `submitGameIdeaFlesher()`

Validates `#game-concept`, calls `setLoadingState`, POSTs to `/api/game-idea-flesher`, and delegates to `handleResponse` / `handleError`. Mirrors the structure of `submitCodeHelp()`.

### Backend Endpoints (server.js additions)

#### `POST /api/class-designer`

| Aspect | Detail |
|---|---|
| Request body | `{ description: string }` |
| Validation | Returns HTTP 400 `{ error: "description is required" }` if `description` is absent or empty string |
| Prompt role | System: Godot architecture expert |
| Model | `gpt-4o` |
| Success response | HTTP 200 `{ result: string }` |
| Error response | HTTP matching OpenAI status (or 500) `{ error: string }` |

#### `POST /api/game-idea-flesher`

| Aspect | Detail |
|---|---|
| Request body | `{ concept: string }` |
| Validation | Returns HTTP 400 `{ error: "concept is required" }` if `concept` is absent or empty string |
| Prompt role | System: Godot game design consultant |
| Model | `gpt-4o` |
| Success response | HTTP 200 `{ result: string }` |
| Error response | HTTP matching OpenAI status (or 500) `{ error: string }` |

---

## Data Models

No persistent data models are introduced. All state is transient (in-memory for the duration of a request/response cycle).

### Frontend State

| Variable | Type | Description |
|---|---|---|
| `activeBrainstormMode` | `'class-designer' \| 'game-idea-flesher'` | Tracks which sub-mode is currently visible; used to determine which submit button to re-enable after a response. |

### Backend Request Schemas

**Class Designer request body:**
```json
{
  "description": "string (required, non-empty)"
}
```

**Game Idea Flesher request body:**
```json
{
  "concept": "string (required, non-empty)"
}
```

### Backend Response Schemas

**Success (both endpoints):**
```json
{
  "result": "string (markdown-formatted AI response)"
}
```

**Error (both endpoints):**
```json
{
  "error": "string (non-empty human-readable message)"
}
```

### GPT-4o Prompt Structure

**Class Designer prompt:**
```
You are a Godot architecture expert.
The developer has described a class they want to create:

<description verbatim>

Return a GDScript class scaffold formatted as markdown containing:
- A suggested class name
- A list of properties with GDScript types and descriptions
- A list of methods with signatures and descriptions
- A list of signals with descriptions
- A complete GDScript code template
```

**Game Idea Flesher prompt:**
```
You are a Godot game design consultant.
The developer has described a game concept:

<concept verbatim>

Return a structured brainstorm document formatted as markdown with exactly four sections:
1. Mind Map — a hierarchical outline of themes, mechanics, and entities
2. UML Diagram — text-based entity/class relationships as a markdown code block
3. Gameplay Loop — a written description of the core repeating cycle
4. Suggestions — actionable recommendations for implementing this game in Godot
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Input text is preserved across sub-mode switches

*For any* text entered in the Class Description Input or the Game Concept Input, switching to the other sub-mode and switching back SHALL leave the original text unchanged in the input field.

**Validates: Requirements 2.2, 2.3**

---

### Property 2: Whitespace-only input is always rejected (Class Designer)

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, or any combination), submitting the Class Designer form SHALL display an inline validation error and SHALL NOT send any HTTP request to the backend.

**Validates: Requirements 3.3**

---

### Property 3: Whitespace-only input is always rejected (Game Idea Flesher)

*For any* string composed entirely of whitespace characters, submitting the Game Idea Flesher form SHALL display an inline validation error and SHALL NOT send any HTTP request to the backend.

**Validates: Requirements 4.3**

---

### Property 4: Submitted description is always trimmed before sending

*For any* non-empty Class Description Input value (including values with leading and/or trailing whitespace), the JSON body POSTed to `/api/class-designer` SHALL contain the trimmed version of that value in the `description` field.

**Validates: Requirements 3.2**

---

### Property 5: Submitted concept is always trimmed before sending

*For any* non-empty Game Concept Input value (including values with leading and/or trailing whitespace), the JSON body POSTed to `/api/game-idea-flesher` SHALL contain the trimmed version of that value in the `concept` field.

**Validates: Requirements 4.2**

---

### Property 6: Backend includes user input verbatim in the Class Designer prompt

*For any* non-empty `description` string sent to `/api/class-designer`, the prompt constructed and sent to the OpenAI API SHALL contain that exact `description` string as a substring.

**Validates: Requirements 3.4**

---

### Property 7: Backend includes user input verbatim in the Game Idea Flesher prompt

*For any* non-empty `concept` string sent to `/api/game-idea-flesher`, the prompt constructed and sent to the OpenAI API SHALL contain that exact `concept` string as a substring.

**Validates: Requirements 4.4**

---

### Property 8: Successful AI response is rendered via marked.parse()

*For any* markdown string returned as the `result` field of a successful backend response, the HTML injected into `#response-output` SHALL equal the output of `marked.parse()` applied to that string.

**Validates: Requirements 5.1**

---

### Property 9: Loading state is always cleared after a response

*For any* backend response (success, HTTP error, or network failure) to a Brainstorm Tab request, the loading indicator SHALL be hidden and the active sub-mode's submit button SHALL be re-enabled after the response is processed.

**Validates: Requirements 5.3, 5.2, 4.8**

---

### Property 10: Backend returns HTTP 400 for missing or empty input fields

*For any* POST request to `/api/class-designer` with an absent or empty `description` field, the backend SHALL return HTTP 400 with `{ error: "description is required" }`. Likewise, *for any* POST request to `/api/game-idea-flesher` with an absent or empty `concept` field, the backend SHALL return HTTP 400 with `{ error: "concept is required" }`.

**Validates: Requirements 7.1, 7.2**

---

### Property 11: Backend propagates OpenAI error status and returns a non-empty error string

*For any* error returned by the OpenAI API (with any HTTP status code), the backend SHALL respond with that same status code (or 500 if unavailable) and a JSON body containing a non-empty `error` string.

**Validates: Requirements 3.7, 4.7**

---

### Property 12: Unhandled backend exceptions always produce HTTP 500 with a non-empty error

*For any* unhandled exception thrown during processing of a `/api/class-designer` or `/api/game-idea-flesher` request, the backend SHALL return HTTP 500 and a JSON body with a non-empty `error` string field.

**Validates: Requirements 6.3**

---

## Error Handling

### Frontend Error Handling

| Scenario | Behaviour |
|---|---|
| Empty / whitespace-only input | Inline error shown in the sub-mode's error container; no HTTP request sent. |
| HTTP error response from backend | `handleError()` displays the `error` field from the JSON body (or a fallback message with the status code) in `#response-output`. |
| Network failure (`fetch` throws) | `handleError()` displays "Network error. Please try again." in `#response-output`. |
| Both cases above | Loading indicator hidden; active submit button re-enabled via `setLoadingState(false, btn)`. |

The existing `handleError()` and `setLoadingState()` functions are reused without modification. The Brainstorm tab forms pass their own submit button reference to `setLoadingState`, consistent with how the other tabs work.

### Backend Error Handling

| Scenario | HTTP Status | Response Body |
|---|---|---|
| Missing / empty `description` | 400 | `{ error: "description is required" }` |
| Missing / empty `concept` | 400 | `{ error: "concept is required" }` |
| OpenAI API error | OpenAI status or 500 | `{ error: err.message }` |
| Unhandled exception | 500 | `{ error: "An unexpected error occurred." }` (caught by global error handler) |

The existing global error handler in `server.js` (`app.use((err, req, res, next) => ...)`) already handles unhandled exceptions and returns HTTP 500. The new endpoints follow the same `try/catch` pattern as `/api/code-help`.

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions. They are written using Node's built-in `node:test` runner (already available in the project's Node version) with no additional test framework dependency.

**Backend unit tests (`/api/class-designer` and `/api/game-idea-flesher`):**
- Returns HTTP 400 when `description` / `concept` is absent.
- Returns HTTP 400 when `description` / `concept` is an empty string.
- Returns HTTP 200 with `{ result }` when OpenAI mock returns a valid response.
- Returns the OpenAI error status and `{ error }` when the OpenAI mock throws.
- Returns HTTP 500 and `{ error }` when an unhandled exception is thrown.
- Prompt contains the required section instructions (Mind Map, UML Diagram, Gameplay Loop, Suggestions for game flesher; class name, properties, methods, signals, code template for class designer).

**Frontend unit tests (JSDOM or similar):**
- `switchTab('brainstorm')` sets correct `aria-selected` states and panel visibility.
- `switchBrainstormMode('game-idea-flesher')` shows game form, hides class form.
- `switchBrainstormMode('class-designer')` shows class form, hides game form.
- Submitting with empty input shows inline error and does not call `fetch`.
- Network error displays "Network error. Please try again."

### Property-Based Tests

Property-based tests use **fast-check** (a well-maintained JavaScript PBT library) to verify universal properties across generated inputs. Each test runs a minimum of **100 iterations**.

**Test file:** `test/brainstorm.property.test.js`

| Property | Generator | Assertion |
|---|---|---|
| Property 1: Input preserved across mode switches | `fc.string()` for textarea content | After switch away and back, `textarea.value === original` |
| Property 2 & 3: Whitespace-only input rejected | `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` | Error shown, `fetch` not called |
| Property 4 & 5: Input trimmed before POST | `fc.string()` with leading/trailing whitespace added | POSTed body field equals `input.trim()` |
| Property 6 & 7: User input included verbatim in prompt | `fc.string({ minLength: 1 })` for description/concept | Captured prompt string includes the input as a substring |
| Property 8: Markdown rendered via marked.parse() | `fc.string()` as mock AI result | `#response-output.innerHTML === marked.parse(result)` |
| Property 9: Loading state cleared after response | `fc.oneof(fc.constant('success'), fc.constant('http-error'), fc.constant('network-error'))` | After response, loading hidden and button enabled |
| Property 10: HTTP 400 for missing/empty fields | `fc.oneof(fc.constant(undefined), fc.constant(''), fc.constant(null))` | Response status 400, body has correct error string |
| Property 11: OpenAI error status propagated | `fc.integer({ min: 400, max: 599 })` for error status | Response status matches, error string non-empty |
| Property 12: Unhandled exceptions → HTTP 500 | Any thrown value | Response status 500, error string non-empty |

**Tag format for each property test:**
```js
// Feature: brainstorm-tab, Property N: <property text>
```

### Integration Tests

Integration tests verify the full request/response cycle against a running server with a mocked OpenAI client:
- POST `/api/class-designer` with a valid description returns HTTP 200 with a `result` string.
- POST `/api/game-idea-flesher` with a valid concept returns HTTP 200 with a `result` string.
- Both endpoints return HTTP 400 for missing fields (1–2 examples each).

These are run with `node:test` and `supertest` (already a common pattern for Express apps).
