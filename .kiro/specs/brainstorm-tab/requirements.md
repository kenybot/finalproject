# Requirements Document

## Introduction

The Brainstorm tab is a new mode added to the existing Godot Dev Assistant web application. It provides two AI-powered sub-modes to help Godot developers think through design problems before writing code. The Class Designer sub-mode accepts a plain-language description of a class and returns a professional GDScript class scaffold with suggested name, properties, methods, signals, and a code template. The Game Idea Flesher sub-mode accepts a plain-language game concept and returns a structured brainstorm document including a mind map, UML-style entity diagrams, a gameplay loop description, and actionable recommendations for making the game feasible to implement in Godot. Both sub-modes follow the same form-input → POST to backend → GPT-4o → markdown response pattern used by the existing Code Help and Pixel Art tabs.

## Glossary

- **App**: The Godot Dev Assistant web application as a whole.
- **Frontend**: The vanilla HTML/CSS/JS single-page interface served to the user's browser.
- **Backend**: The Node.js/Express server that handles API requests and communicates with the OpenAI API.
- **Brainstorm Tab**: The new UI tab added to the App that contains the Class Designer and Game Idea Flesher sub-modes.
- **Sub-Mode Selector**: The UI control within the Brainstorm Tab that lets the user switch between Class Designer and Game Idea Flesher.
- **Class Designer**: The sub-mode where the user describes a class in plain language and receives a GDScript class scaffold.
- **Game Idea Flesher**: The sub-mode where the user describes a game concept and receives a structured brainstorm document.
- **Class Description Input**: The text area in the Class Designer sub-mode where the user types a plain-language class description.
- **Game Concept Input**: The text area in the Game Idea Flesher sub-mode where the user types a plain-language game concept.
- **Class Scaffold**: The AI-generated GDScript output containing a suggested class name, properties, methods, signals, and a code template.
- **Brainstorm Document**: The AI-generated output for the Game Idea Flesher containing a mind map, UML-style diagrams, a gameplay loop description, and recommendations.
- **Mind Map**: A text-based, markdown-formatted hierarchical outline of the game concept's themes, mechanics, and entities.
- **UML Diagram**: A text-based representation of class or entity relationships formatted as a markdown code block.
- **Gameplay Loop**: A written description of the core repeating cycle of player actions and game responses.
- **AI Response**: The GPT-4o-generated text returned by the Backend and displayed in the Frontend.
- **Markdown Renderer**: The marked.js library loaded via CDN that converts AI Response text to rendered HTML.
- **OpenAI API**: The external GPT-4o API endpoint called by the Backend.

---

## Requirements

### Requirement 1: Brainstorm Tab Navigation

**User Story:** As a Godot developer, I want a Brainstorm tab alongside the existing Code Help and Pixel Art tabs, so that I can access brainstorming tools without leaving the app.

#### Acceptance Criteria

1. WHEN the page loads, THE Frontend SHALL render a third tab button labeled "Brainstorm" in the tab navigation bar alongside the existing "Code Help" and "Pixel Art" tab buttons, with `role="tab"`, `aria-selected="false"`, and `aria-controls="panel-brainstorm"` attributes set.
2. WHEN a user clicks the "Brainstorm" tab button, THE Frontend SHALL set `aria-selected="true"` on the Brainstorm tab button, set `aria-selected="false"` on all other tab buttons, display the Brainstorm Tab panel, and hide the Code Help and Pixel Art panels.
3. WHEN a user clicks the "Code Help" or "Pixel Art" tab button while the Brainstorm Tab is active, THE Frontend SHALL set `aria-selected="false"` on the Brainstorm tab button, hide the Brainstorm Tab panel, and display the selected tab's panel.
4. WHEN the page loads, THE Frontend SHALL display the "Code Help" tab as the active tab with `aria-selected="true"` and SHALL leave the Brainstorm Tab panel hidden.

---

### Requirement 2: Sub-Mode Selection

**User Story:** As a Godot developer, I want to choose between Class Designer and Game Idea Flesher within the Brainstorm tab, so that I can use the tool that matches my current need.

#### Acceptance Criteria

1. THE Brainstorm Tab SHALL contain a Sub-Mode Selector with two options: "Class Designer" (pre-selected by default) and "Game Idea Flesher".
2. WHEN a user selects "Class Designer" in the Sub-Mode Selector, THE Frontend SHALL display the Class Description Input and its submit button, SHALL hide the Game Concept Input and its submit button, and SHALL preserve any text already entered in the Class Description Input.
3. WHEN a user selects "Game Idea Flesher" in the Sub-Mode Selector, THE Frontend SHALL display the Game Concept Input and its submit button, SHALL hide the Class Description Input and its submit button, and SHALL preserve any text already entered in the Game Concept Input.
4. WHEN the Brainstorm Tab becomes visible (user clicks the Brainstorm tab button), THE Frontend SHALL display the "Class Designer" sub-mode as the active sub-mode, showing the Class Description Input and hiding the Game Concept Input.

---

### Requirement 3: Class Designer Submission

**User Story:** As a Godot developer, I want to describe a class in plain language and receive a professional GDScript class scaffold, so that I can start coding with a solid structure.

#### Acceptance Criteria

1. THE Frontend SHALL provide a multi-line Class Description Input text area within the Class Designer sub-mode.
2. WHEN a user submits the Class Designer form with a non-empty, non-whitespace-only Class Description Input, THE Frontend SHALL send an HTTP POST request to `/api/class-designer` with a JSON body containing the `description` field set to the trimmed input value.
3. IF a user submits the Class Designer form with an empty or whitespace-only Class Description Input, THEN THE Frontend SHALL display an inline validation error message in the Class Designer error container and SHALL NOT send any HTTP request to the Backend.
4. WHEN the Backend receives a POST request at `/api/class-designer`, THE Backend SHALL construct a prompt that instructs GPT-4o to act as a Godot architecture expert and SHALL include the value of the `description` field verbatim in the prompt.
5. WHEN the Backend receives a POST request at `/api/class-designer`, THE Backend SHALL instruct GPT-4o to return a Class Scaffold formatted as markdown containing: a suggested class name, a list of properties with GDScript types and descriptions, a list of methods with signatures and descriptions, a list of signals with descriptions, and a complete GDScript code template.
6. WHEN the OpenAI API returns a response to a Class Designer request, THE Backend SHALL return HTTP 200 with a JSON body `{ result: string }` where `result` contains the AI Response text.
7. IF the OpenAI API returns an error for a Class Designer request, THEN THE Backend SHALL return an HTTP status code matching the OpenAI error status (or 500 if unavailable) and a JSON body `{ error: string }` with a non-empty error message.

---

### Requirement 4: Game Idea Flesher Submission

**User Story:** As a Godot developer, I want to describe a game concept in plain language and receive a structured brainstorm document, so that I can plan my game before writing any code.

#### Acceptance Criteria

1. THE Frontend SHALL provide a multi-line Game Concept Input text area within the Game Idea Flesher sub-mode, accepting up to 10,000 characters.
2. WHEN a user submits the Game Idea Flesher form with a non-empty, non-whitespace-only Game Concept Input, THE Frontend SHALL send an HTTP POST request to `/api/game-idea-flesher` with a JSON body containing the `concept` field set to the trimmed input value.
3. IF a user submits the Game Idea Flesher form with an empty or whitespace-only Game Concept Input, THEN THE Frontend SHALL display an inline validation error message in the Game Idea Flesher error container and SHALL NOT send any HTTP request to the Backend.
4. WHEN the Backend receives a POST request at `/api/game-idea-flesher`, THE Backend SHALL construct a prompt that instructs GPT-4o to act as a Godot game design consultant and SHALL include the value of the `concept` field verbatim in the prompt.
5. WHEN the Backend receives a POST request at `/api/game-idea-flesher`, THE Backend SHALL instruct GPT-4o to return a Brainstorm Document formatted as markdown containing exactly four sections: a Mind Map section, a UML Diagram section, a Gameplay Loop section, and a Suggestions section with recommendations for making the game feasible to implement in Godot.
6. WHEN the OpenAI API returns a response to a Game Idea Flesher request, THE Backend SHALL return HTTP 200 with a JSON body `{ result: string }` where `result` contains the AI Response text.
7. IF the OpenAI API returns an error for a Game Idea Flesher request, THEN THE Backend SHALL return an HTTP status code matching the OpenAI error status (or 500 if unavailable) and a JSON body `{ error: string }` with a non-empty error message.
8. WHILE the Frontend is awaiting a Game Idea Flesher response, THE Frontend SHALL display the shared Loading State indicator and SHALL disable the Game Idea Flesher submit button.

---

### Requirement 5: Brainstorm Response Display

**User Story:** As a Godot developer, I want Brainstorm tab responses rendered as formatted markdown, so that class scaffolds and brainstorm documents are easy to read.

1. WHEN the Frontend receives a successful AI Response from a Brainstorm Tab request, THE Frontend SHALL clear any previous content from the shared response output area, pass the `result` string through `marked.parse()`, and inject the resulting HTML into the shared response output area.
2. WHILE the Frontend is awaiting a Backend response following a Brainstorm Tab form submission, THE Frontend SHALL display the shared Loading State indicator and SHALL disable the active sub-mode's submit button.
3. WHEN the Backend returns an AI Response or an error response to a Brainstorm Tab request, THE Frontend SHALL hide the Loading State indicator and SHALL re-enable the active sub-mode's submit button.

---

### Requirement 6: Brainstorm Tab Error Handling

**User Story:** As a Godot developer, I want clear error messages when a Brainstorm tab request fails, so that I understand what went wrong and can try again.

#### Acceptance Criteria

1. IF the Backend returns an HTTP error response to a Class Designer or Game Idea Flesher request, THEN THE Frontend SHALL display the value of the `error` field from the JSON response body in the shared response output area (or a fallback message indicating failure and the HTTP status code if the body is not valid JSON or lacks an `error` field), SHALL hide the Loading State indicator, and SHALL re-enable the active sub-mode's submit button.
2. IF a network failure occurs during a Class Designer or Game Idea Flesher request, THEN THE Frontend SHALL display the message "Network error. Please try again." in the shared response output area, SHALL hide the Loading State indicator, and SHALL re-enable the active sub-mode's submit button.
3. IF the Backend encounters an unhandled exception while processing a Class Designer or Game Idea Flesher request, THEN THE Backend SHALL return an HTTP 500 status code and a JSON body with a non-empty `error` string field.

---

### Requirement 7: Backend API Endpoints for Brainstorm Tab

**User Story:** As a developer, I want well-defined backend endpoints for the Brainstorm tab, so that the frontend and backend remain cleanly decoupled.

#### Acceptance Criteria

1. THE Backend SHALL expose a POST endpoint at `/api/class-designer` that accepts a JSON body with a `description` string field; IF the `description` field is absent or empty, THEN THE Backend SHALL return HTTP 400 with `{ error: "description is required" }`.
2. THE Backend SHALL expose a POST endpoint at `/api/game-idea-flesher` that accepts a JSON body with a `concept` string field; IF the `concept` field is absent or empty, THEN THE Backend SHALL return HTTP 400 with `{ error: "concept is required" }`.
3. WHEN the Backend receives a request at `/api/class-designer` with a non-empty `description` field, THE Backend SHALL call the OpenAI API using the `gpt-4o` model and SHALL return a `{ result: string }` JSON response with HTTP status 200.
4. WHEN the Backend receives a request at `/api/game-idea-flesher` with a non-empty `concept` field, THE Backend SHALL call the OpenAI API using the `gpt-4o` model and SHALL return a `{ result: string }` JSON response with HTTP status 200.
