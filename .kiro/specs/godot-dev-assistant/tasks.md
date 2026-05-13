# Implementation Plan: Godot Dev Assistant

## Overview

Build a single-page web application with a vanilla HTML/CSS/JS frontend and a Node.js/Express backend. The app exposes two AI-powered modes — Code Help (GDScript analysis) and Pixel Art (image feedback) — both powered by GPT-4o. Implementation proceeds from project scaffolding through backend routes, frontend interactivity, evaluation suite, and documentation.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize project structure and package.json
    - Create the directory layout: `public/`, `eval/`, root files
    - Create `package.json` with pinned exact versions for `express`, `openai`, `multer`, `dotenv`
    - Create `.gitignore` excluding `node_modules/` and `.env`
    - Create `.env.example` with `OPENAI_API_KEY=`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.2 Create the Express server entry point with middleware
    - Create `server.js` with `dotenv.config()`, `express.json()`, `express.static('public')`, and multer configured with 10 MB file size limit
    - Instantiate the OpenAI client using `process.env.OPENAI_API_KEY`
    - Add a global error-handler middleware that returns HTTP 500 with `{ error: "An unexpected error occurred." }`
    - _Requirements: 6.3, 6.4, 5.3, 7.1_

- [x] 2. Backend API — Code Help endpoint
  - [x] 2.1 Implement `POST /api/code-help` route
    - Read `req.body.code` and `req.body.question`
    - Construct the structured GDScript prompt (as specified in the design's Prompt Design section)
    - Call `openai.chat.completions.create` with `model: "gpt-4o"`
    - Return `{ result: responseText }` with HTTP 200
    - Return `{ error: message }` with appropriate HTTP status on OpenAI errors
    - _Requirements: 6.1, 2.4, 2.5, 5.1_

  - [ ]* 2.2 Write property test for Code Help prompt construction (Property 3)
    - **Property 3: Code Help prompt always contains both code and question**
    - Mock the OpenAI client; for any non-empty `code` and `question` strings, assert the constructed prompt passed to the API contains both strings verbatim
    - **Validates: Requirements 2.4**

  - [ ]* 2.3 Write property test for backend JSON wrapping (Property 4)
    - **Property 4: Backend always wraps OpenAI response text in JSON**
    - For any non-empty mock response text, assert the route returns `{ result: <text> }` with HTTP 200
    - **Validates: Requirements 2.5, 3.5**

  - [ ]* 2.4 Write property test for OpenAI error propagation (Property 9)
    - **Property 9: OpenAI errors always propagate as non-2xx responses with error messages**
    - For any simulated OpenAI error, assert the route returns HTTP ≥ 400 and `{ error: <non-empty string> }`
    - **Validates: Requirements 5.1**

  - [ ]* 2.5 Write property test for unhandled exception handler (Property 11)
    - **Property 11: Unhandled server exceptions always return HTTP 500**
    - Simulate a thrown exception inside a route; assert the global error handler returns HTTP 500 and `{ error: <non-empty string> }`
    - **Validates: Requirements 5.3**

- [x] 3. Backend API — Pixel Art endpoint
  - [x] 3.1 Implement `POST /api/pixel-art` route
    - Apply multer middleware to parse the multipart body; read `req.file.buffer` and `req.body.question`
    - Encode the image buffer as a base64 data URL using `req.file.mimetype`
    - Construct the vision message (text part + image_url part) as specified in the design
    - Call `openai.chat.completions.create` with `model: "gpt-4o"` and the vision message
    - Return `{ result: responseText }` with HTTP 200; return `{ error: message }` on errors
    - Multer's 10 MB limit should automatically return HTTP 413 on oversized uploads
    - _Requirements: 6.2, 3.4, 3.5, 3.6, 5.1_

  - [ ]* 3.2 Write property test for Pixel Art OpenAI call payload (Property 7)
    - **Property 7: Pixel Art backend always includes image and question in OpenAI call**
    - For any image buffer and non-empty question, assert the mocked OpenAI call receives both the base64 image data and the question string in the message payload
    - **Validates: Requirements 3.4**

- [x] 4. Checkpoint — Backend routes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend — HTML structure
  - [x] 5.1 Create `public/index.html` with tab navigation and panels
    - Add tab navigation bar with "Code Help" and "Pixel Art" buttons (default active: Code Help)
    - Add Code Help panel: `<textarea>` for GDScript, `<input>` for question, submit button, inline error container
    - Add Pixel Art panel: `<input type="file">` for image, `<input>` for question, submit button, inline error container
    - Add shared response output area (`<div id="response-output">`) and loading indicator (`<div id="loading">`)
    - Include marked.js CDN `<script>` tag and `<script src="app.js">` tag
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.2_

- [x] 6. Frontend — Client-side JavaScript
  - [x] 6.1 Implement tab switching logic in `public/app.js`
    - Toggle `active` class on tab buttons; show/hide Code Help and Pixel Art panels accordingly
    - Default to Code Help panel visible on page load
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 6.2 Implement Code Help form validation and submission
    - Validate that GDScript Input and Question Input are non-empty/non-whitespace before submission
    - Display inline validation error if either field is empty; do not send request
    - `submitCodeHelp()`: POST `{ code, question }` as JSON to `/api/code-help`
    - Show loading indicator and disable submit button while awaiting response
    - _Requirements: 2.2, 2.3, 4.3_

  - [ ]* 6.3 Write property test for Code Help client-side validation (Property 1 & 2)
    - **Property 1: Valid Code Help inputs always produce a POST request**
    - **Property 2: Invalid Code Help inputs are always rejected client-side**
    - Use a fetch mock; for any non-empty code + question, assert exactly one POST is sent; for any empty/whitespace code or question, assert no request is sent and an error is shown
    - **Validates: Requirements 2.2, 2.3**

  - [x] 6.4 Implement Pixel Art form validation and submission
    - Validate that an image file is selected and Question Input is non-empty/non-whitespace
    - Display inline validation error if either is missing; do not send request
    - `submitPixelArt()`: POST `FormData` (image + question) to `/api/pixel-art`
    - Show loading indicator and disable submit button while awaiting response
    - _Requirements: 3.2, 3.3, 4.3_

  - [ ]* 6.5 Write property test for Pixel Art client-side validation (Property 5 & 6)
    - **Property 5: Valid Pixel Art inputs always produce a multipart POST request**
    - **Property 6: Invalid Pixel Art inputs are always rejected client-side**
    - Use a fetch mock; for any selected file + non-empty question, assert exactly one multipart POST is sent; for missing file or empty question, assert no request is sent and an error is shown
    - **Validates: Requirements 3.2, 3.3**

  - [x] 6.8 Implement response rendering and error handling in `public/app.js`
    - `handleResponse(data)`: call `marked.parse(data.result)` and inject rendered HTML into `#response-output`
    - `handleError(err)`: display human-readable error text in `#response-output`; hide loading indicator
    - On HTTP error responses (status ≥ 400), extract `{ error }` from JSON and call `handleError`
    - On network failure (fetch throws), display "Network error. Please try again."
    - Hide loading indicator and re-enable submit button after any response or error
    - _Requirements: 4.1, 4.3, 4.4, 5.2_

  - [ ]* 6.6 Write property test for markdown rendering round-trip (Property 8)
    - **Property 8: Markdown rendering round-trip preserves content**
    - For any AI response string containing markdown, assert `marked.parse(str)` produces HTML that contains all non-markup text content from the original string
    - **Validates: Requirements 4.1**

  - [ ]* 6.7 Write property test for frontend error display (Property 10)
    - **Property 10: Frontend always displays errors and hides loading state on HTTP errors**
    - For any mocked HTTP error response (status ≥ 400), assert a non-empty error message appears in `#response-output` and the loading indicator is hidden
    - **Validates: Requirements 5.2**

- [x] 7. Frontend — Styling
  - [x] 7.1 Create `public/style.css`
    - Style tab navigation bar with active/inactive states
    - Style Code Help and Pixel Art panels, form inputs, and submit buttons
    - Style the response output area, loading spinner, and inline error messages
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Checkpoint — Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Evaluation suite
  - [x] 9.1 Create `eval/test-cases.js` with ≥10 labeled test cases
    - Define exactly the following 10 test cases (6 Code Help + 4 Pixel Art):
    - **Code Help test cases** (type: `'code-help'`):
      1. `code: "func move(): velocity.x = 50"`, `question: "Player movement feels slow"` — `mustContain: ["velocity", "acceleration", "speed", "sprint", "200", "example"]`
      2. `code: "func _ready(): connect(\"body_entered\", self, \"_on_body_entered\")"`, `question: "How do I connect movement with animation?"` — `mustContain: ["AnimationPlayer", "state", "animation_tree", "blend", "signal", "connect"]`
      3. `code: "var health = 100"`, `question: "How do I implement a health system with UI?"` — `mustContain: ["ProgressBar", "Label", "signal", "update", "HUD", "scene"]`
      4. `code: "func _process(delta): position.x += 1"`, `question: "How do I make smooth movement?"` — `mustContain: ["delta", "lerp", "velocity", "move_and_slide", "acceleration", "smooth"]`
      5. `code: "func jump(): velocity.y = -500"`, `question: "How do I add double jump?"` — `mustContain: ["jump_count", "is_on_floor", "condition", "counter", "reset", "example"]`
      6. `code: "extends KinematicBody2D"`, `question: "What is the best way to structure a player scene?"` — `mustContain: ["script", "node", "scene", "component", "state", "structure"]`
    - **Pixel Art test cases** (type: `'pixel-art'`, using placeholder image paths under `eval/images/`):
      7. `imagePath: "eval/images/character.png"`, `question: "My pixel art character looks flat and lacks depth"` — `mustContain: ["shading", "highlight", "shadow", "contrast", "light", "depth", "palette"]`
      8. `imagePath: "eval/images/tileset.png"`, `question: "How can I improve my tileset readability?"` — `mustContain: ["outline", "contrast", "color", "border", "tile", "readable", "edge"]`
      9. `imagePath: "eval/images/character.png"`, `question: "How do I make my sprite look more polished?"` — `mustContain: ["anti-alias", "dither", "outline", "detail", "pixel", "clean", "consistent"]`
      10. `imagePath: "eval/images/background.png"`, `question: "My background feels too busy, how do I simplify it?"` — `mustContain: ["palette", "reduce", "color", "simplify", "contrast", "foreground", "layer"]`
    - Each test case object shape: `{ type, input: { code?, imagePath?, question }, label: { mustContain: string[] } }`
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Implement `eval/run-eval.js` evaluation runner
    - Import test cases from `eval/test-cases.js`
    - For each test case, send the input to the running backend via HTTP (using `node-fetch` or the built-in `fetch`)
    - For Pixel Art cases, check whether the image file at `imagePath` exists before sending; if the file does not exist, print `"SKIPPED — image not found"` for that test and exclude it from pass/fail counts
    - For existing Pixel Art image files, read the file and send as multipart/form-data to `/api/pixel-art`
    - **Primary metric — Actionable Suggestion Rate (ASR)**:
      - A test PASSES if ≥ 3 of the `mustContain` keywords are found in the AI response (case-insensitive)
      - ASR = (number of tests where ≥ 3 mustContain keywords matched) / (total non-skipped tests)
      - Target: ASR ≥ 0.70
    - For each test, print: `PASS` or `FAIL`, and which `mustContain` keywords matched
    - Print final summary line: `"Passed: X / Total: Y | ASR: Z%"`
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 9.3 Write property test for eval summary accuracy (Property 12)
    - **Property 12: Eval summary accurately counts pass and fail results**
    - For any array of mock test results (pass/fail booleans), assert the summary's `passed` + `failed` counts equal the total number of test cases and each count accurately reflects the mock outcomes
    - **Validates: Requirements 8.4**

- [x] 10. Documentation
  - [x] 10.1 Create `README.md` with setup and run instructions
    - Include sections: prerequisites, installation (`npm install`), environment setup (copy `.env.example` to `.env`, add key), starting the server (`node server.js`), and running the eval script
    - _Requirements: 7.4_

  - [x] 10.2 Create `REPORT.md` with four required sections
    - Include exactly: "What & Why", "Iterations" (≥3 distinct versions documented), "Code Walkthrough", and "AI Disclosure & Safety"
    - "AI Disclosure & Safety" must describe how `OPENAI_API_KEY` is protected and how user inputs are handled
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- The backend never exposes `OPENAI_API_KEY` to the frontend — enforced by design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "5.1"] },
    { "id": 2, "tasks": ["2.1", "3.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "6.2", "6.4"] },
    { "id": 4, "tasks": ["6.3", "6.5", "6.8", "7.1"] },
    { "id": 5, "tasks": ["6.6", "6.7", "9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1", "10.2"] },
    { "id": 7, "tasks": ["9.3"] }
  ]
}
```
