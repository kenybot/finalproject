# Requirements Document

## Introduction

Godot Dev Assistant is a web application that helps Godot game developers through two AI-powered modes. The Code Help mode accepts GDScript code and a developer question, then returns structured advice on game development patterns such as state machines and animation trees. The Pixel Art mode accepts an uploaded pixel art image and a question, then returns visual feedback and improvement suggestions. The application uses a vanilla HTML/CSS/JS frontend, a Node.js/Express backend, and GPT-4o for multimodal AI responses rendered as markdown.

## Glossary

- **App**: The Godot Dev Assistant web application as a whole.
- **Frontend**: The vanilla HTML/CSS/JS single-page interface served to the user's browser.
- **Backend**: The Node.js/Express server that handles API requests and communicates with the OpenAI API.
- **Code Help Tab**: The UI tab where users submit GDScript code and a question to receive game development pattern advice.
- **Pixel Art Tab**: The UI tab where users upload a pixel art image and a question to receive visual feedback.
- **GDScript Input**: The text area in the Code Help Tab where users paste GDScript code.
- **Question Input**: The text field where users type their question in either tab.
- **Image Upload**: The file input in the Pixel Art Tab where users select a pixel art image.
- **AI Response**: The GPT-4o-generated text returned by the Backend and displayed in the Frontend.
- **Markdown Renderer**: The marked.js library loaded via CDN that converts AI Response text to rendered HTML.
- **OpenAI API**: The external GPT-4o API endpoint called by the Backend.
- **OPENAI_API_KEY**: The secret API key stored server-side in a `.env` file used to authenticate requests to the OpenAI API.
- **Eval Script**: The automated evaluation script in the `eval/` directory that measures AI response quality against labeled test cases.
- **Loading State**: The visual indicator shown in the Frontend while the Backend is awaiting a response from the OpenAI API.

---

## Requirements

### Requirement 1: Tab-Based Navigation

**User Story:** As a Godot developer, I want two clearly separated tabs in the UI, so that I can switch between Code Help and Pixel Art modes without confusion.

#### Acceptance Criteria

1. THE Frontend SHALL render two tabs labeled "Code Help" and "Pixel Art" on initial page load.
2. WHEN a user clicks the "Code Help" tab, THE Frontend SHALL display the GDScript Input, Question Input, and a submit button, and SHALL hide the Pixel Art Tab controls.
3. WHEN a user clicks the "Pixel Art" tab, THE Frontend SHALL display the Image Upload, Question Input, and a submit button, and SHALL hide the Code Help Tab controls.
4. THE Frontend SHALL default to displaying the "Code Help" tab on initial page load.

---

### Requirement 2: Code Help Submission

**User Story:** As a Godot developer, I want to paste GDScript code and ask a question, so that I receive structured advice on game development patterns.

#### Acceptance Criteria

1. THE Frontend SHALL provide a multi-line GDScript Input text area and a single-line Question Input field within the Code Help Tab.
2. WHEN a user submits the Code Help form with a non-empty GDScript Input and a non-empty Question Input, THE Frontend SHALL send an HTTP POST request to the Backend containing the GDScript code and the question.
3. IF a user submits the Code Help form with an empty GDScript Input or an empty Question Input, THEN THE Frontend SHALL display an inline validation error message and SHALL NOT send a request to the Backend.
4. WHEN the Backend receives a Code Help request, THE Backend SHALL construct a prompt combining the GDScript code and the question and SHALL send the prompt to the OpenAI API using the GPT-4o model.
5. WHEN the OpenAI API returns a response to a Code Help request, THE Backend SHALL return the AI Response text to the Frontend as a JSON payload.

---

### Requirement 3: Pixel Art Submission

**User Story:** As a Godot developer, I want to upload a pixel art image and ask a question, so that I receive visual feedback and improvement suggestions.

#### Acceptance Criteria

1. THE Frontend SHALL provide an Image Upload file input and a single-line Question Input field within the Pixel Art Tab.
2. WHEN a user submits the Pixel Art form with a selected image file and a non-empty Question Input, THE Frontend SHALL send an HTTP POST multipart/form-data request to the Backend containing the image and the question.
3. IF a user submits the Pixel Art form with no image selected or an empty Question Input, THEN THE Frontend SHALL display an inline validation error message and SHALL NOT send a request to the Backend.
4. WHEN the Backend receives a Pixel Art request, THE Backend SHALL use multer to parse the uploaded image and SHALL send the image data and question to the OpenAI API using the GPT-4o multimodal model.
5. WHEN the OpenAI API returns a response to a Pixel Art request, THE Backend SHALL return the AI Response text to the Frontend as a JSON payload.
6. THE Backend SHALL accept image uploads with a maximum file size of 10 MB.

---

### Requirement 4: AI Response Display

**User Story:** As a Godot developer, I want AI responses rendered as formatted markdown with syntax highlighting, so that code examples and structured advice are easy to read.

#### Acceptance Criteria

1. WHEN the Frontend receives an AI Response from the Backend, THE Markdown Renderer SHALL convert the AI Response text to HTML and THE Frontend SHALL display the rendered HTML in the response output area.
2. THE Frontend SHALL load marked.js via CDN to perform markdown-to-HTML conversion.
3. WHEN the Frontend is awaiting a Backend response, THE Frontend SHALL display a Loading State indicator and SHALL disable the active tab's submit button.
4. WHEN the Backend returns an AI Response, THE Frontend SHALL hide the Loading State indicator and SHALL re-enable the submit button.

---

### Requirement 5: Error Handling

**User Story:** As a Godot developer, I want clear error messages when something goes wrong, so that I understand what happened and can take corrective action.

#### Acceptance Criteria

1. IF the Backend receives an error response from the OpenAI API, THEN THE Backend SHALL return an HTTP error status code and a descriptive error message to the Frontend.
2. IF the Frontend receives an HTTP error response from the Backend, THEN THE Frontend SHALL display a human-readable error message in the response output area and SHALL hide the Loading State indicator.
3. IF the Backend encounters an unhandled exception during request processing, THEN THE Backend SHALL return an HTTP 500 status code and a generic error message to the Frontend.

---

### Requirement 6: Backend API Endpoints

**User Story:** As a developer, I want well-defined backend API endpoints, so that the frontend and backend are cleanly decoupled.

#### Acceptance Criteria

1. THE Backend SHALL expose a POST endpoint at `/api/code-help` that accepts a JSON body with `code` and `question` string fields.
2. THE Backend SHALL expose a POST endpoint at `/api/pixel-art` that accepts a multipart/form-data body with an `image` file field and a `question` string field.
3. THE Backend SHALL read the OPENAI_API_KEY exclusively from the server-side environment using dotenv and SHALL NOT expose the key to the Frontend.
4. THE Backend SHALL serve the Frontend static files from a `public/` directory.

---

### Requirement 7: Project Configuration and Dependencies

**User Story:** As a developer, I want all dependencies pinned and a clear environment setup, so that the project builds and runs consistently.

#### Acceptance Criteria

1. THE App SHALL include a `package.json` file with all Node.js dependencies specified at exact pinned version numbers.
2. THE App SHALL include a `.env.example` file containing only the `OPENAI_API_KEY` variable with an empty or placeholder value.
3. THE App SHALL NOT commit a `.env` file containing real credentials to version control.
4. THE App SHALL include a `README.md` file with instructions for installing dependencies, configuring the `.env` file, and starting the server.

---

### Requirement 8: Evaluation Suite

**User Story:** As a developer, I want an automated evaluation suite, so that I can measure and verify the quality of AI responses against known test cases.

#### Acceptance Criteria

1. THE App SHALL include an `eval/` directory containing an evaluation script and a set of labeled test cases.
2. THE Eval Script SHALL include a minimum of 10 labeled test cases covering both Code Help and Pixel Art scenarios.
3. WHEN the Eval Script is executed, THE Eval Script SHALL send each test case input to the Backend and SHALL compare the AI Response against the expected label criteria.
4. WHEN the Eval Script completes execution, THE Eval Script SHALL output a summary report indicating the number of test cases passed and failed.

---

### Requirement 9: Project Report

**User Story:** As a developer, I want a structured project report, so that reviewers can understand the design decisions, iterations, and AI usage.

#### Acceptance Criteria

1. THE App SHALL include a `REPORT.md` file containing exactly four sections: "What & Why", "Iterations", "Code Walkthrough", and "AI Disclosure & Safety".
2. THE "Iterations" section of REPORT.md SHALL document a minimum of three distinct versions or design iterations of the App.
3. THE "AI Disclosure & Safety" section of REPORT.md SHALL describe how the OPENAI_API_KEY is protected and how user inputs are handled.
