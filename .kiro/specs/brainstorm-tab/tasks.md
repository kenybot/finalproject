# Implementation Plan: Brainstorm Tab

## Overview

Add a Brainstorm tab to the Godot Dev Assistant with two sub-modes — Class Designer and Game Idea Flesher — following the same form → POST → GPT-4o → markdown-render pattern used by the existing Code Help and Pixel Art tabs. Changes span `server.js`, `public/index.html`, `public/app.js`, `public/style.css`, and a new property-based test file.

## Tasks

- [x] 1. Add backend endpoints to server.js
  - [x] 1.1 Implement `POST /api/class-designer` endpoint
    - Validate that `req.body.description` is present and non-empty; return HTTP 400 `{ error: "description is required" }` if not
    - Build the GPT-4o prompt instructing the model to act as a Godot architecture expert and include the `description` value verbatim
    - Call `openai.chat.completions.create` with model `gpt-4o` and return HTTP 200 `{ result: string }` on success
    - Catch OpenAI errors and return the matching HTTP status (or 500) with `{ error: err.message }`
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 7.1, 7.3_

  - [x] 1.2 Implement `POST /api/game-idea-flesher` endpoint
    - Validate that `req.body.concept` is present and non-empty; return HTTP 400 `{ error: "concept is required" }` if not
    - Build the GPT-4o prompt instructing the model to act as a Godot game design consultant and include the `concept` value verbatim; instruct the model to return exactly four sections: Mind Map, UML Diagram, Gameplay Loop, Suggestions
    - Call `openai.chat.completions.create` with model `gpt-4o` and return HTTP 200 `{ result: string }` on success
    - Catch OpenAI errors and return the matching HTTP status (or 500) with `{ error: err.message }`
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 7.2, 7.4_

  - [ ]* 1.3 Write property tests for backend input validation and error propagation
    - **Property 10: HTTP 400 for missing or empty input fields**
    - **Validates: Requirements 7.1, 7.2**
    - **Property 11: OpenAI error status propagated**
    - **Validates: Requirements 3.7, 4.7**
    - **Property 12: Unhandled exceptions → HTTP 500 with non-empty error**
    - **Validates: Requirements 6.3**

  - [ ]* 1.4 Write property tests for verbatim prompt inclusion
    - **Property 6: Backend includes user input verbatim in the Class Designer prompt**
    - **Validates: Requirements 3.4**
    - **Property 7: Backend includes user input verbatim in the Game Idea Flesher prompt**
    - **Validates: Requirements 4.4**

- [x] 2. Checkpoint — backend endpoints
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add Brainstorm tab HTML to index.html
  - [x] 3.1 Add the Brainstorm tab button to the tab navigation bar
    - Insert a `<button id="tab-brainstorm" class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-brainstorm">Brainstorm</button>` after the Pixel Art tab button
    - _Requirements: 1.1, 1.4_

  - [x] 3.2 Add the Brainstorm tab panel with sub-mode selector and both sub-forms
    - Insert `<section id="panel-brainstorm" class="tab-panel" role="tabpanel" aria-labelledby="tab-brainstorm" style="display: none;">` after the Pixel Art panel and before the loading indicator
    - Inside the panel add `<select id="brainstorm-mode">` with options `value="class-designer"` (selected) and `value="game-idea-flesher"`
    - Add `<div id="brainstorm-class-form">` containing `<textarea id="class-description">`, `<div id="class-designer-error" class="error-message" role="alert" aria-live="polite">`, and `<button id="submit-class-designer" class="submit-btn">`
    - Add `<div id="brainstorm-game-form" style="display: none;">` containing `<textarea id="game-concept" maxlength="10000">`, `<div id="game-idea-flesher-error" class="error-message" role="alert" aria-live="polite">`, and `<button id="submit-game-idea-flesher" class="submit-btn">`
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 4. Extend frontend JavaScript in app.js
  - [x] 4.1 Extend `switchTab()` to handle the `'brainstorm'` tab
    - Add `tabBrainstorm` and `panelBrainstorm` element references at the top of the file
    - Update `switchTab()` to set `aria-selected` and `classList` on all three tab buttons and toggle visibility of all three panels; when switching to `'brainstorm'`, call `switchBrainstormMode('class-designer')` to reset to the default sub-mode
    - Attach a click listener: `tabBrainstorm.addEventListener('click', () => switchTab('brainstorm'))`
    - _Requirements: 1.2, 1.3, 1.4, 2.4_

  - [x] 4.2 Implement `switchBrainstormMode(mode)`
    - Declare `let activeBrainstormMode = 'class-designer'` module-level variable
    - Show `#brainstorm-class-form` and hide `#brainstorm-game-form` when `mode === 'class-designer'`; do the reverse for `'game-idea-flesher'`; update `activeBrainstormMode`
    - Do NOT clear textarea values (preserve input across switches)
    - Attach a `change` listener on `#brainstorm-mode` that calls `switchBrainstormMode(select.value)`
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 4.3 Write property tests for sub-mode switching and input preservation
    - **Property 1: Input text is preserved across sub-mode switches**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 4.4 Implement `submitClassDesigner()`
    - Read and trim `#class-description`; if empty/whitespace-only, set `#class-designer-error` text and return without fetching
    - Call `setLoadingState(true, submitClassDesignerBtn)` and clear `responseOutput`
    - POST `{ description: trimmedValue }` as JSON to `/api/class-designer`
    - On HTTP error, extract `error` from JSON body (or fall back to status message) and call `handleError()`
    - On success, call `handleResponse(data)`
    - On network failure, call `handleError(new Error('Network error. Please try again.'))`
    - In `finally`, call `setLoadingState(false, submitClassDesignerBtn)`
    - Attach a `submit` listener on `#brainstorm-class-form`'s parent form (or a click listener on the button)
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 6.1, 6.2_

  - [ ]* 4.5 Write property tests for Class Designer frontend validation and submission
    - **Property 2: Whitespace-only input is always rejected (Class Designer)**
    - **Validates: Requirements 3.3**
    - **Property 4: Submitted description is always trimmed before sending**
    - **Validates: Requirements 3.2**

  - [x] 4.6 Implement `submitGameIdeaFlesher()`
    - Read and trim `#game-concept`; if empty/whitespace-only, set `#game-idea-flesher-error` text and return without fetching
    - Call `setLoadingState(true, submitGameIdeaFlesherBtn)` and clear `responseOutput`
    - POST `{ concept: trimmedValue }` as JSON to `/api/game-idea-flesher`
    - On HTTP error, extract `error` from JSON body (or fall back to status message) and call `handleError()`
    - On success, call `handleResponse(data)`
    - On network failure, call `handleError(new Error('Network error. Please try again.'))`
    - In `finally`, call `setLoadingState(false, submitGameIdeaFlesherBtn)`
    - Attach a `submit` listener on the game form (or a click listener on the button)
    - _Requirements: 4.1, 4.2, 4.3, 4.8, 5.1, 5.2, 5.3, 6.1, 6.2_

  - [ ]* 4.7 Write property tests for Game Idea Flesher frontend validation and submission
    - **Property 3: Whitespace-only input is always rejected (Game Idea Flesher)**
    - **Validates: Requirements 4.3**
    - **Property 5: Submitted concept is always trimmed before sending**
    - **Validates: Requirements 4.2**

  - [ ]* 4.8 Write property tests for shared response/loading behaviour
    - **Property 8: Successful AI response is rendered via marked.parse()**
    - **Validates: Requirements 5.1**
    - **Property 9: Loading state is always cleared after a response**
    - **Validates: Requirements 5.3, 5.2, 4.8**

- [x] 5. Checkpoint — frontend logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add CSS styles to style.css
  - [x] 6.1 Add styles for the Brainstorm tab panel and sub-mode selector
    - Add any layout styles needed for `#panel-brainstorm`, `#brainstorm-mode` (the `<select>`), and the sub-form containers `#brainstorm-class-form` / `#brainstorm-game-form`
    - Reuse existing `.tab-panel`, `.field-group`, `.submit-btn`, and `.error-message` classes where possible; only add new rules for elements that need them
    - _Requirements: 1.1, 2.1_

- [x] 7. Create property-based test file
  - [x] 7.1 Set up `test/brainstorm.property.test.js` with fast-check
    - Install `fast-check` as a dev dependency if not already present (`npm install --save-dev fast-check`)
    - Create `test/brainstorm.property.test.js`; import `fast-check` and any test runner utilities
    - Add a comment header: `// Feature: brainstorm-tab` and tag each property block with `// Property N: <property text>`
    - _Requirements: (test infrastructure)_

  - [x] 7.2 Implement property tests for backend validation (Properties 10, 11, 12)
    - Use `fc.oneof(fc.constant(undefined), fc.constant(''), fc.constant(null))` to generate missing/empty inputs; assert HTTP 400 with correct error string for both endpoints
    - Use `fc.integer({ min: 400, max: 599 })` to generate OpenAI error statuses; mock the OpenAI client to throw with that status; assert the response status matches and `error` is non-empty
    - Simulate unhandled exceptions; assert HTTP 500 and non-empty `error` string
    - _Requirements: 7.1, 7.2, 3.7, 4.7, 6.3_

  - [x] 7.3 Implement property tests for verbatim prompt inclusion (Properties 6, 7)
    - Use `fc.string({ minLength: 1 })` to generate description/concept strings; mock the OpenAI client to capture the prompt passed to it; assert the prompt contains the input as a substring
    - _Requirements: 3.4, 4.4_

  - [x] 7.4 Implement property tests for frontend validation and trimming (Properties 2, 3, 4, 5)
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` to generate whitespace-only strings; assert inline error is shown and `fetch` is not called
    - Use `fc.string()` with added leading/trailing whitespace; assert the POSTed body field equals `input.trim()`
    - _Requirements: 3.3, 4.3, 3.2, 4.2_

  - [x] 7.5 Implement property tests for sub-mode switching and input preservation (Property 1)
    - Use `fc.string()` to generate textarea content; simulate switching sub-modes away and back; assert `textarea.value` is unchanged
    - _Requirements: 2.2, 2.3_

  - [x] 7.6 Implement property tests for response rendering and loading state (Properties 8, 9)
    - Use `fc.string()` as a mock AI result; assert `#response-output.innerHTML === marked.parse(result)`
    - Use `fc.oneof(fc.constant('success'), fc.constant('http-error'), fc.constant('network-error'))` to simulate response types; assert loading is hidden and submit button is re-enabled after each
    - _Requirements: 5.1, 5.3, 5.2, 4.8_

- [x] 8. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- `fast-check` must be added as a dev dependency before running property tests (`npm install --save-dev fast-check`)
- The existing `handleResponse()`, `handleError()`, and `setLoadingState()` functions in `app.js` are reused without modification
- The existing global error handler in `server.js` already covers unhandled exceptions (Property 12); the new endpoints only need to follow the same `try/catch` pattern as `/api/code-help`
- Property tests for frontend behaviour require a DOM environment (JSDOM or similar); configure accordingly in the test file

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "3.1", "3.2", "7.1"] },
    { "id": 1, "tasks": ["1.3", "1.4", "4.1"] },
    { "id": 2, "tasks": ["4.2", "7.2", "7.3"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.6"] },
    { "id": 4, "tasks": ["4.5", "4.7", "4.8", "6.1", "7.4", "7.5"] },
    { "id": 5, "tasks": ["7.6"] }
  ]
}
```
