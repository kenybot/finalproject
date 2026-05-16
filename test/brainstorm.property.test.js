// Feature: brainstorm-tab
//
// Property-based tests for the Brainstorm Tab feature.
// Uses fast-check for property generation and node:test as the test runner.
// Each property block is tagged with its property number and text from the design document.

const fc = require('fast-check');
const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

// ---------------------------------------------------------------------------
// Property 1: Input text is preserved across sub-mode switches
// ---------------------------------------------------------------------------
// For any text entered in the Class Description Input or the Game Concept Input,
// switching to the other sub-mode and switching back SHALL leave the original
// text unchanged in the input field.
// Validates: Requirements 2.2, 2.3
//
// **Validates: Requirements 2.2, 2.3**
describe('Property 1: Input text is preserved across sub-mode switches', () => {
  const { JSDOM } = require('jsdom');

  /**
   * Build a minimal DOM that mirrors the elements switchBrainstormMode() touches,
   * then wire up the same logic from app.js so we can call it in Node.
   */
  function createBrainstormDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html>
        <body>
          <div id="brainstorm-class-form" style="display:block;">
            <textarea id="class-description"></textarea>
          </div>
          <div id="brainstorm-game-form" style="display:none;">
            <textarea id="game-concept"></textarea>
          </div>
        </body>
      </html>`);

    const { document } = dom.window;

    const brainstormClassForm = document.getElementById('brainstorm-class-form');
    const brainstormGameForm  = document.getElementById('brainstorm-game-form');

    // Replicate switchBrainstormMode() from app.js exactly
    function switchBrainstormMode(mode) {
      if (mode === 'class-designer') {
        brainstormClassForm.style.display = 'block';
        brainstormGameForm.style.display  = 'none';
      } else {
        brainstormClassForm.style.display = 'none';
        brainstormGameForm.style.display  = 'block';
      }
    }

    return { document, switchBrainstormMode };
  }

  it('class-description value is preserved after switching away and back', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          const { document, switchBrainstormMode } = createBrainstormDOM();
          const classTextarea = document.getElementById('class-description');

          // Set the value in the class-designer textarea
          classTextarea.value = text;

          // Switch away to game-idea-flesher, then back to class-designer
          switchBrainstormMode('game-idea-flesher');
          switchBrainstormMode('class-designer');

          // The value must be unchanged
          assert.strictEqual(
            classTextarea.value,
            text,
            `Expected class-description to be ${JSON.stringify(text)} but got ${JSON.stringify(classTextarea.value)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('game-concept value is preserved after switching away and back', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          const { document, switchBrainstormMode } = createBrainstormDOM();
          const gameTextarea = document.getElementById('game-concept');

          // Set the value in the game-idea-flesher textarea
          gameTextarea.value = text;

          // Switch away to class-designer, then back to game-idea-flesher
          switchBrainstormMode('class-designer');
          switchBrainstormMode('game-idea-flesher');

          // The value must be unchanged
          assert.strictEqual(
            gameTextarea.value,
            text,
            `Expected game-concept to be ${JSON.stringify(text)} but got ${JSON.stringify(gameTextarea.value)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Whitespace-only input is always rejected (Class Designer)
// ---------------------------------------------------------------------------
// For any string composed entirely of whitespace characters, submitting the
// Class Designer form SHALL display an inline validation error and SHALL NOT
// send any HTTP request to the backend.
// Validates: Requirements 3.3
//
// **Validates: Requirements 3.3**
describe('Property 2: Whitespace-only input is always rejected (Class Designer)', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  function createAppDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    // Stub marked so app.js doesn't throw at load time
    window.marked = { parse: (s) => `<p>${s}</p>` };

    // Track fetch calls with a counter
    let fetchCallCount = 0;
    window.fetch = async () => {
      fetchCallCount++;
      return { ok: true, json: async () => ({ result: '' }) };
    };

    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    return {
      window,
      getFetchCallCount: () => fetchCallCount,
      resetFetchCallCount: () => { fetchCallCount = 0; },
    };
  }

  it('for any whitespace-only input, shows an error and does not call fetch', async () => {
    // fc.stringOf is not available in fast-check v4; use fc.array + map instead
    const whitespaceArb = fc.array(
      fc.constantFrom(' ', '\t', '\n', '\r'),
      { minLength: 1 }
    ).map(chars => chars.join(''));

    await fc.assert(
      fc.asyncProperty(
        whitespaceArb,
        async (whitespaceInput) => {
          const { window, getFetchCallCount, resetFetchCallCount } = createAppDOM();
          resetFetchCallCount();

          const classDescriptionInput = window.document.getElementById('class-description');
          const classDesignerError = window.document.getElementById('class-designer-error');

          classDescriptionInput.value = whitespaceInput;

          await window.submitClassDesigner();

          assert.ok(
            classDesignerError.textContent.length > 0,
            `Expected #class-designer-error to be non-empty for whitespace input ${JSON.stringify(whitespaceInput)}`
          );
          assert.strictEqual(
            getFetchCallCount(),
            0,
            `Expected fetch NOT to be called for whitespace input ${JSON.stringify(whitespaceInput)}, but it was called ${getFetchCallCount()} time(s)`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Whitespace-only input is always rejected (Game Idea Flesher)
// ---------------------------------------------------------------------------
// For any string composed entirely of whitespace characters, submitting the
// Game Idea Flesher form SHALL display an inline validation error and SHALL NOT
// send any HTTP request to the backend.
// Validates: Requirements 4.3
//
// **Validates: Requirements 4.3**
describe('Property 3: Whitespace-only input is always rejected (Game Idea Flesher)', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  function createAppDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    window.marked = { parse: (s) => `<p>${s}</p>` };

    let fetchCallCount = 0;
    window.fetch = async () => {
      fetchCallCount++;
      return { ok: true, json: async () => ({ result: '' }) };
    };

    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    return {
      window,
      getFetchCallCount: () => fetchCallCount,
      resetFetchCallCount: () => { fetchCallCount = 0; },
    };
  }

  it('for any whitespace-only input, shows an error and does not call fetch', async () => {
    // fc.stringOf is not available in fast-check v4; use fc.array + map instead
    const whitespaceArb = fc.array(
      fc.constantFrom(' ', '\t', '\n', '\r'),
      { minLength: 1 }
    ).map(chars => chars.join(''));

    await fc.assert(
      fc.asyncProperty(
        whitespaceArb,
        async (whitespaceInput) => {
          const { window, getFetchCallCount, resetFetchCallCount } = createAppDOM();
          resetFetchCallCount();

          const gameConceptInput = window.document.getElementById('game-concept');
          const gameIdeaFlesherError = window.document.getElementById('game-idea-flesher-error');

          gameConceptInput.value = whitespaceInput;

          await window.submitGameIdeaFlesher();

          assert.ok(
            gameIdeaFlesherError.textContent.length > 0,
            `Expected #game-idea-flesher-error to be non-empty for whitespace input ${JSON.stringify(whitespaceInput)}`
          );
          assert.strictEqual(
            getFetchCallCount(),
            0,
            `Expected fetch NOT to be called for whitespace input ${JSON.stringify(whitespaceInput)}, but it was called ${getFetchCallCount()} time(s)`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Submitted description is always trimmed before sending
// ---------------------------------------------------------------------------
// For any non-empty Class Description Input value (including values with
// leading and/or trailing whitespace), the JSON body POSTed to
// /api/class-designer SHALL contain the trimmed version of that value in the
// `description` field.
// Validates: Requirements 3.2
//
// **Validates: Requirements 3.2**
describe('Property 4: Submitted description is always trimmed before sending', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  function createAppDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    window.marked = { parse: (s) => `<p>${s}</p>` };

    // Capture the request body sent to fetch
    let capturedBody = null;
    window.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ result: 'mock' }) };
    };

    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    return {
      window,
      getCapturedBody: () => capturedBody,
    };
  }

  it('for any non-empty input with surrounding whitespace, the POSTed description equals input.trim()', async () => {
    // Generate strings that contain at least one non-whitespace character so
    // paddedInput.trim() is never empty (which would trigger validation rejection).
    const nonEmptyAfterTrimArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        nonEmptyAfterTrimArb,
        async (text) => {
          const paddedInput = ' ' + text + ' ';
          const { window, getCapturedBody } = createAppDOM();

          const classDescriptionInput = window.document.getElementById('class-description');
          classDescriptionInput.value = paddedInput;

          await window.submitClassDesigner();

          const body = getCapturedBody();
          assert.ok(
            body !== null,
            `Expected fetch to be called for input ${JSON.stringify(paddedInput)}`
          );
          assert.strictEqual(
            body.description,
            paddedInput.trim(),
            `Expected body.description to be ${JSON.stringify(paddedInput.trim())} but got ${JSON.stringify(body.description)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Submitted concept is always trimmed before sending
// ---------------------------------------------------------------------------
// For any non-empty Game Concept Input value (including values with leading
// and/or trailing whitespace), the JSON body POSTed to /api/game-idea-flesher
// SHALL contain the trimmed version of that value in the `concept` field.
// Validates: Requirements 4.2
//
// **Validates: Requirements 4.2**
describe('Property 5: Submitted concept is always trimmed before sending', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  function createAppDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    window.marked = { parse: (s) => `<p>${s}</p>` };

    // Capture the request body sent to fetch
    let capturedBody = null;
    window.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ result: 'mock' }) };
    };

    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    return {
      window,
      getCapturedBody: () => capturedBody,
    };
  }

  it('for any non-empty input with surrounding whitespace, the POSTed concept equals input.trim()', async () => {
    // Generate strings that contain at least one non-whitespace character so
    // paddedInput.trim() is never empty (which would trigger validation rejection).
    const nonEmptyAfterTrimArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        nonEmptyAfterTrimArb,
        async (text) => {
          const paddedInput = ' ' + text + ' ';
          const { window, getCapturedBody } = createAppDOM();

          const gameConceptInput = window.document.getElementById('game-concept');
          gameConceptInput.value = paddedInput;

          await window.submitGameIdeaFlesher();

          const body = getCapturedBody();
          assert.ok(
            body !== null,
            `Expected fetch to be called for input ${JSON.stringify(paddedInput)}`
          );
          assert.strictEqual(
            body.concept,
            paddedInput.trim(),
            `Expected body.concept to be ${JSON.stringify(paddedInput.trim())} but got ${JSON.stringify(body.concept)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Backend includes user input verbatim in the Class Designer prompt
// ---------------------------------------------------------------------------
// For any non-empty `description` string sent to /api/class-designer, the
// prompt constructed and sent to the OpenAI API SHALL contain that exact
// `description` string as a substring.
// Validates: Requirements 3.4
describe('Property 6: Backend includes user input verbatim in the Class Designer prompt', () => {
  // **Validates: Requirements 3.4**
  let app;
  let openai;
  let originalCreate;

  before(async () => {
    // Load the app fresh; clear require cache so we get a clean module
    delete require.cache[require.resolve('../server.js')];
    const server = require('../server.js');
    app = server.app;
    openai = server.openai;
    originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
  });

  afterEach(() => {
    // Restore the original method after each test iteration
    openai.chat.completions.create = originalCreate;
  });

  it('for any non-empty description, the prompt sent to OpenAI contains it verbatim', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (description) => {
          let capturedMessages = null;

          // Mock openai.chat.completions.create to capture the messages array
          openai.chat.completions.create = async (params) => {
            capturedMessages = params.messages;
            return {
              choices: [{ message: { content: 'mock response' } }],
            };
          };

          const response = await supertest(app)
            .post('/api/class-designer')
            .send({ description })
            .set('Content-Type', 'application/json');

          // The endpoint should have called OpenAI (status 200)
          assert.equal(response.status, 200, `Expected 200 but got ${response.status}`);
          assert.ok(capturedMessages, 'OpenAI was not called');

          // The prompt is in the first message's content
          const prompt = capturedMessages[0].content;
          assert.ok(
            typeof prompt === 'string' && prompt.includes(description),
            `Prompt does not contain the description verbatim.\nDescription: ${JSON.stringify(description)}\nPrompt: ${JSON.stringify(prompt)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Backend includes user input verbatim in the Game Idea Flesher prompt
// ---------------------------------------------------------------------------
// For any non-empty `concept` string sent to /api/game-idea-flesher, the
// prompt constructed and sent to the OpenAI API SHALL contain that exact
// `concept` string as a substring.
// Validates: Requirements 4.4
describe('Property 7: Backend includes user input verbatim in the Game Idea Flesher prompt', () => {
  // **Validates: Requirements 4.4**
  let app;
  let openai;
  let originalCreate;

  before(async () => {
    // Reuse the cached module (server.js was already loaded above)
    const server = require('../server.js');
    app = server.app;
    openai = server.openai;
    originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
  });

  afterEach(() => {
    openai.chat.completions.create = originalCreate;
  });

  it('for any non-empty concept, the prompt sent to OpenAI contains it verbatim', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (concept) => {
          let capturedMessages = null;

          // Mock openai.chat.completions.create to capture the messages array
          openai.chat.completions.create = async (params) => {
            capturedMessages = params.messages;
            return {
              choices: [{ message: { content: 'mock response' } }],
            };
          };

          const response = await supertest(app)
            .post('/api/game-idea-flesher')
            .send({ concept })
            .set('Content-Type', 'application/json');

          // The endpoint should have called OpenAI (status 200)
          assert.equal(response.status, 200, `Expected 200 but got ${response.status}`);
          assert.ok(capturedMessages, 'OpenAI was not called');

          // The prompt is in the first message's content
          const prompt = capturedMessages[0].content;
          assert.ok(
            typeof prompt === 'string' && prompt.includes(concept),
            `Prompt does not contain the concept verbatim.\nConcept: ${JSON.stringify(concept)}\nPrompt: ${JSON.stringify(prompt)}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Successful AI response is rendered via marked.parse()
// ---------------------------------------------------------------------------
// For any markdown string returned as the `result` field of a successful
// backend response, the HTML injected into #response-output SHALL equal the
// output of marked.parse() applied to that string.
// Validates: Requirements 5.1
//
// **Validates: Requirements 5.1**
describe('Property 8: Successful AI response is rendered via marked.parse()', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  /**
   * Build a minimal DOM that mirrors all elements app.js touches at load time,
   * inject a mock `marked` global, then evaluate app.js in that window context.
   * Returns { window, markedCalls } where markedCalls records every argument
   * passed to the mock marked.parse().
   */
  function createAppDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    // Track calls to marked.parse
    const markedCalls = [];
    window.marked = {
      parse: (input) => {
        const result = `<p>${input}</p>`;
        markedCalls.push({ input, result });
        return result;
      },
    };

    // Stub fetch so app.js doesn't throw at load time
    window.fetch = async () => ({
      ok: true,
      json: async () => ({ result: '' }),
    });

    // Evaluate app.js in the window context
    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    return { window, dom, markedCalls };
  }

  it('for any result string, #response-output.innerHTML equals marked.parse(result)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (mockResult) => {
          const { window, markedCalls } = createAppDOM();
          const responseOutput = window.document.getElementById('response-output');

          // Call handleResponse as app.js defines it
          window.handleResponse({ result: mockResult });

          // The last call to marked.parse should have received mockResult
          const lastCall = markedCalls[markedCalls.length - 1];
          assert.ok(lastCall, 'marked.parse was not called');
          assert.strictEqual(
            lastCall.input,
            mockResult,
            `marked.parse was called with ${JSON.stringify(lastCall.input)} instead of ${JSON.stringify(mockResult)}`
          );

          // innerHTML should equal the DOM-normalized form of what marked.parse returned.
          // Browsers normalize HTML when setting innerHTML (e.g. '>' becomes '&gt;'),
          // so we compare by setting a reference element to the same value and reading back.
          const refEl = window.document.createElement('div');
          refEl.innerHTML = lastCall.result;
          assert.strictEqual(
            responseOutput.innerHTML,
            refEl.innerHTML,
            `#response-output.innerHTML does not match the DOM-normalized marked.parse() output`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Loading state is always cleared after a response
// ---------------------------------------------------------------------------
// For any backend response (success, HTTP error, or network failure) to a
// Brainstorm Tab request, the loading indicator SHALL be hidden and the active
// sub-mode's submit button SHALL be re-enabled after the response is processed.
// Validates: Requirements 5.3, 5.2, 4.8
//
// **Validates: Requirements 5.3, 5.2, 4.8**
describe('Property 9: Loading state is always cleared after a response', () => {
  const { JSDOM } = require('jsdom');
  const fs = require('fs');
  const path = require('path');

  /**
   * Build a full app DOM with a controllable fetch mock.
   * Returns { window, dom, setFetchBehaviour } where setFetchBehaviour lets
   * each test iteration configure what fetch returns.
   */
  function createAppDOMWithFetch() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <html><body>
        <button id="tab-code-help"></button>
        <button id="tab-pixel-art"></button>
        <button id="tab-brainstorm"></button>
        <section id="panel-code-help" style="display:block;"></section>
        <section id="panel-pixel-art" style="display:none;"></section>
        <section id="panel-brainstorm" style="display:none;"></section>
        <select id="brainstorm-mode">
          <option value="class-designer" selected>Class Designer</option>
          <option value="game-idea-flesher">Game Idea Flesher</option>
        </select>
        <div id="brainstorm-class-form" style="display:block;">
          <textarea id="class-description"></textarea>
          <div id="class-designer-error"></div>
          <button id="submit-class-designer"></button>
        </div>
        <div id="brainstorm-game-form" style="display:none;">
          <textarea id="game-concept"></textarea>
          <div id="game-idea-flesher-error"></div>
          <button id="submit-game-idea-flesher"></button>
        </div>
        <div id="loading" style="display:none;"></div>
        <div id="response-output"></div>
        <form id="form-code-help">
          <textarea id="code-input"></textarea>
          <input id="code-question" />
          <div id="code-help-error"></div>
          <button id="submit-code-help"></button>
        </form>
        <form id="form-pixel-art">
          <input type="file" id="image-input" />
          <input id="pixel-question" />
          <div id="pixel-art-error"></div>
          <button id="submit-pixel-art"></button>
        </form>
      </body></html>`,
      { runScripts: 'dangerously', resources: 'usable' }
    );

    const { window } = dom;

    // Stub marked so app.js doesn't throw
    window.marked = { parse: (s) => `<p>${s}</p>` };

    // Mutable fetch behaviour — tests set this before each call
    let fetchBehaviour = 'success';
    window.fetch = async () => {
      if (fetchBehaviour === 'success') {
        return {
          ok: true,
          json: async () => ({ result: 'mock response' }),
        };
      } else if (fetchBehaviour === 'http-error') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'server error' }),
        };
      } else {
        // network-error: fetch() throws
        throw new Error('Network error. Please try again.');
      }
    };

    // Evaluate app.js in the window context
    const appCode = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'app.js'),
      'utf8'
    );
    dom.window.eval(appCode);

    function setFetchBehaviour(behaviour) {
      fetchBehaviour = behaviour;
    }

    return { window, dom, setFetchBehaviour };
  }

  it('loading is hidden and submit-class-designer is re-enabled after any response type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('success'),
          fc.constant('http-error'),
          fc.constant('network-error')
        ),
        async (responseType) => {
          const { window, setFetchBehaviour } = createAppDOMWithFetch();
          const loadingEl = window.document.getElementById('loading');
          const submitBtn = window.document.getElementById('submit-class-designer');
          const classDescriptionInput = window.document.getElementById('class-description');

          // Set a valid non-empty description so validation passes
          classDescriptionInput.value = 'A valid class description';

          // Configure fetch to simulate the desired response type
          setFetchBehaviour(responseType);

          // Simulate loading being shown (as submitClassDesigner() would do)
          loadingEl.style.display = 'flex';
          submitBtn.disabled = true;

          // Call submitClassDesigner() and wait for it to complete
          await window.submitClassDesigner();

          // After the response, loading must be hidden and button re-enabled
          assert.strictEqual(
            loadingEl.style.display,
            'none',
            `Expected #loading to be hidden after '${responseType}' response, but display was '${loadingEl.style.display}'`
          );
          assert.strictEqual(
            submitBtn.disabled,
            false,
            `Expected submit-class-designer to be enabled after '${responseType}' response`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('loading is hidden and submit-game-idea-flesher is re-enabled after any response type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('success'),
          fc.constant('http-error'),
          fc.constant('network-error')
        ),
        async (responseType) => {
          const { window, setFetchBehaviour } = createAppDOMWithFetch();
          const loadingEl = window.document.getElementById('loading');
          const submitBtn = window.document.getElementById('submit-game-idea-flesher');
          const gameConceptInput = window.document.getElementById('game-concept');

          // Set a valid non-empty concept so validation passes
          gameConceptInput.value = 'A valid game concept';

          // Configure fetch to simulate the desired response type
          setFetchBehaviour(responseType);

          // Simulate loading being shown
          loadingEl.style.display = 'flex';
          submitBtn.disabled = true;

          // Call submitGameIdeaFlesher() and wait for it to complete
          await window.submitGameIdeaFlesher();

          // After the response, loading must be hidden and button re-enabled
          assert.strictEqual(
            loadingEl.style.display,
            'none',
            `Expected #loading to be hidden after '${responseType}' response, but display was '${loadingEl.style.display}'`
          );
          assert.strictEqual(
            submitBtn.disabled,
            false,
            `Expected submit-game-idea-flesher to be enabled after '${responseType}' response`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Backend returns HTTP 400 for missing or empty input fields
// ---------------------------------------------------------------------------
// For any POST request to /api/class-designer with an absent or empty
// `description` field, the backend SHALL return HTTP 400 with
// { error: "description is required" }. Likewise, for any POST request to
// /api/game-idea-flesher with an absent or empty `concept` field, the backend
// SHALL return HTTP 400 with { error: "concept is required" }.
// Validates: Requirements 7.1, 7.2
//
// **Validates: Requirements 7.1, 7.2**
describe('Property 10: Backend returns HTTP 400 for missing or empty input fields', () => {
  const supertest = require('supertest');
  const { app } = require('../server');
  const request = supertest(app);

  it('returns HTTP 400 for missing/empty description on /api/class-designer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant(undefined), fc.constant(''), fc.constant(null)),
        async (badDescription) => {
          const body = badDescription === undefined ? {} : { description: badDescription };
          const res = await request
            .post('/api/class-designer')
            .send(body)
            .set('Content-Type', 'application/json');

          assert.strictEqual(res.status, 400);
          assert.strictEqual(typeof res.body.error, 'string');
          assert.strictEqual(res.body.error, 'description is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns HTTP 400 for missing/empty concept on /api/game-idea-flesher', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant(undefined), fc.constant(''), fc.constant(null)),
        async (badConcept) => {
          const body = badConcept === undefined ? {} : { concept: badConcept };
          const res = await request
            .post('/api/game-idea-flesher')
            .send(body)
            .set('Content-Type', 'application/json');

          assert.strictEqual(res.status, 400);
          assert.strictEqual(typeof res.body.error, 'string');
          assert.strictEqual(res.body.error, 'concept is required');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Backend propagates OpenAI error status and returns a non-empty error string
// ---------------------------------------------------------------------------
// For any error returned by the OpenAI API (with any HTTP status code), the
// backend SHALL respond with that same status code (or 500 if unavailable) and
// a JSON body containing a non-empty `error` string.
// Validates: Requirements 3.7, 4.7
//
// **Validates: Requirements 3.7, 4.7**
describe('Property 11: Backend propagates OpenAI error status and returns a non-empty error string', () => {
  const supertest = require('supertest');
  const serverModule = require('../server');
  const { app, openai } = serverModule;
  const request = supertest(app);

  it('propagates OpenAI error status for /api/class-designer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (errorStatus) => {
          const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
          const mockError = new Error('OpenAI API error');
          mockError.status = errorStatus;
          openai.chat.completions.create = async () => { throw mockError; };

          try {
            const res = await request
              .post('/api/class-designer')
              .send({ description: 'a valid description' })
              .set('Content-Type', 'application/json');

            assert.strictEqual(res.status, errorStatus);
            assert.strictEqual(typeof res.body.error, 'string');
            assert.ok(res.body.error.length > 0, 'error string should be non-empty');
          } finally {
            openai.chat.completions.create = originalCreate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propagates OpenAI error status for /api/game-idea-flesher', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (errorStatus) => {
          const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
          const mockError = new Error('OpenAI API error');
          mockError.status = errorStatus;
          openai.chat.completions.create = async () => { throw mockError; };

          try {
            const res = await request
              .post('/api/game-idea-flesher')
              .send({ concept: 'a valid concept' })
              .set('Content-Type', 'application/json');

            assert.strictEqual(res.status, errorStatus);
            assert.strictEqual(typeof res.body.error, 'string');
            assert.ok(res.body.error.length > 0, 'error string should be non-empty');
          } finally {
            openai.chat.completions.create = originalCreate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Unhandled backend exceptions always produce HTTP 500 with a non-empty error
// ---------------------------------------------------------------------------
// For any unhandled exception thrown during processing of a
// /api/class-designer or /api/game-idea-flesher request, the backend SHALL
// return HTTP 500 and a JSON body with a non-empty `error` string field.
// Validates: Requirements 6.3
//
// **Validates: Requirements 6.3**
describe('Property 12: Unhandled backend exceptions always produce HTTP 500 with a non-empty error', () => {
  const supertest = require('supertest');
  const serverModule = require('../server');
  const { app, openai } = serverModule;
  const request = supertest(app);

  it('returns HTTP 500 for unhandled exceptions in /api/class-designer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (errorMessage) => {
          const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
          // Throw a plain Error with no .status property to simulate an unhandled exception
          openai.chat.completions.create = async () => {
            const err = new Error(errorMessage);
            // Explicitly no .status so the catch block uses 500
            throw err;
          };

          try {
            const res = await request
              .post('/api/class-designer')
              .send({ description: 'a valid description' })
              .set('Content-Type', 'application/json');

            assert.strictEqual(res.status, 500);
            assert.strictEqual(typeof res.body.error, 'string');
            assert.ok(res.body.error.length > 0, 'error string should be non-empty');
          } finally {
            openai.chat.completions.create = originalCreate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns HTTP 500 for unhandled exceptions in /api/game-idea-flesher', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (errorMessage) => {
          const originalCreate = openai.chat.completions.create.bind(openai.chat.completions);
          openai.chat.completions.create = async () => {
            const err = new Error(errorMessage);
            throw err;
          };

          try {
            const res = await request
              .post('/api/game-idea-flesher')
              .send({ concept: 'a valid concept' })
              .set('Content-Type', 'application/json');

            assert.strictEqual(res.status, 500);
            assert.strictEqual(typeof res.body.error, 'string');
            assert.ok(res.body.error.length > 0, 'error string should be non-empty');
          } finally {
            openai.chat.completions.create = originalCreate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
