# Godot Dev Assistant

An AI-powered web application for Godot game developers. It offers two modes:

- **Code Help** — paste GDScript code and ask a question to receive structured advice on game development patterns (state machines, animation trees, signals, scene composition, and more).
- **Pixel Art** — upload a pixel art image and ask a question to receive visual feedback and improvement suggestions.

Both modes are powered by GPT-4o and responses are rendered as formatted markdown.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

---

## Environment Setup

Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

Open `.env` and fill in your key:

```
OPENAI_API_KEY=your-api-key-here
```

> **Note:** Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## Starting the Server

```bash
node server.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running the Eval Script

The evaluation suite measures AI response quality against 10 labeled test cases. The server must be running before you execute the script.

```bash
node eval/run-eval.js
```

The script will print `PASS` or `FAIL` for each test case along with which keywords matched, then output a final summary line:

```
Passed: X / Total: Y | ASR: Z%
```

Pixel Art test cases that reference image files not present on disk are automatically skipped and excluded from the pass/fail counts.
