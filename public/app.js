// ─── Tab Switching ───────────────────────────────────────────────────────────

const tabCodeHelp   = document.getElementById('tab-code-help');
const tabPixelArt   = document.getElementById('tab-pixel-art');
const tabBrainstorm = document.getElementById('tab-brainstorm');
const panelCodeHelp   = document.getElementById('panel-code-help');
const panelPixelArt   = document.getElementById('panel-pixel-art');
const panelBrainstorm = document.getElementById('panel-brainstorm');

/**
 * Activate a tab and show its corresponding panel.
 * @param {'code-help'|'pixel-art'|'brainstorm'} tabName
 */
function switchTab(tabName) {
  // Update aria-selected and active class on all three tab buttons
  tabCodeHelp.classList.toggle('active', tabName === 'code-help');
  tabCodeHelp.setAttribute('aria-selected', String(tabName === 'code-help'));

  tabPixelArt.classList.toggle('active', tabName === 'pixel-art');
  tabPixelArt.setAttribute('aria-selected', String(tabName === 'pixel-art'));

  tabBrainstorm.classList.toggle('active', tabName === 'brainstorm');
  tabBrainstorm.setAttribute('aria-selected', String(tabName === 'brainstorm'));

  // Toggle visibility of all three panels
  panelCodeHelp.style.display   = tabName === 'code-help'   ? 'block' : 'none';
  panelPixelArt.style.display   = tabName === 'pixel-art'   ? 'block' : 'none';
  panelBrainstorm.style.display = tabName === 'brainstorm'  ? 'block' : 'none';

  // When switching to brainstorm, reset to the default sub-mode
  if (tabName === 'brainstorm') {
    switchBrainstormMode('class-designer');
  }
}

// Attach click listeners to tab buttons
tabCodeHelp.addEventListener('click', () => switchTab('code-help'));
tabPixelArt.addEventListener('click', () => switchTab('pixel-art'));
tabBrainstorm.addEventListener('click', () => switchTab('brainstorm'));

// Enforce default state on page load: Code Help tab active
switchTab('code-help');

// ─── Brainstorm Sub-Mode Switching ───────────────────────────────────────────

let activeBrainstormMode = 'class-designer';

const brainstormClassForm = document.getElementById('brainstorm-class-form');
const brainstormGameForm  = document.getElementById('brainstorm-game-form');
const brainstormModeSelect = document.getElementById('brainstorm-mode');

/**
 * Show the correct sub-form for the given brainstorm mode and update state.
 * Does NOT clear textarea values.
 * @param {'class-designer'|'game-idea-flesher'} mode
 */
function switchBrainstormMode(mode) {
  activeBrainstormMode = mode;

  if (mode === 'class-designer') {
    brainstormClassForm.style.display = 'block';
    brainstormGameForm.style.display  = 'none';
  } else {
    brainstormClassForm.style.display = 'none';
    brainstormGameForm.style.display  = 'block';
  }
}

// Attach change listener to the mode selector
brainstormModeSelect.addEventListener('change', () => {
  switchBrainstormMode(brainstormModeSelect.value);
});

// ─── Shared UI Helpers ───────────────────────────────────────────────────────

const loadingEl       = document.getElementById('loading');
const responseOutput  = document.getElementById('response-output');

/**
 * Show or hide the loading indicator and toggle the submit button state.
 * @param {boolean} isLoading
 * @param {HTMLButtonElement} submitBtn
 */
function setLoadingState(isLoading, submitBtn) {
  if (isLoading) {
    loadingEl.style.display = 'flex';
    submitBtn.disabled = true;
  } else {
    loadingEl.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// ─── Response / Error Handlers ───────────────────────────────────────────────

/**
 * Render a successful AI response into the output area using marked.js.
 * @param {{ result: string }} data
 */
function handleResponse(data) {
  const markdown = data.result ?? '';
  responseOutput.innerHTML = marked.parse(markdown);
}

/**
 * Display a human-readable error in the output area and hide the loading indicator.
 * @param {Error|string} err
 */
function handleError(err) {
  const message = (err && err.message) ? err.message : String(err);
  const span = document.createElement('span');
  span.className = 'error-text';
  span.textContent = message;
  responseOutput.innerHTML = '';
  responseOutput.appendChild(span);
  loadingEl.style.display = 'none';
}

// ─── Code Help — Multi-Turn Conversation ─────────────────────────────────────

const formCodeHelp        = document.getElementById('form-code-help');
const codeInput           = document.getElementById('code-input');
const codeQuestion        = document.getElementById('code-question');
const submitCodeHelpBtn   = document.getElementById('submit-code-help');
const codeHelpError       = document.getElementById('code-help-error');
const codeHelpInitial     = document.getElementById('code-help-initial');
const codeHelpConversation = document.getElementById('code-help-conversation');
const conversationThread  = document.getElementById('conversation-thread');
const followUpInput       = document.getElementById('follow-up-input');
const submitFollowUpBtn   = document.getElementById('submit-follow-up');
const followUpError       = document.getElementById('follow-up-error');
const newConversationBtn  = document.getElementById('new-conversation-btn');

/**
 * The running message history for the current Code Help conversation.
 * Each entry is { role: 'user'|'assistant', content: string }.
 * Populated by the server's response and sent back on each follow-up.
 * @type {Array<{role: string, content: string}>}
 */
let codeHelpMessages = [];

/**
 * Append a message bubble to the conversation thread.
 * @param {'user'|'assistant'} role
 * @param {string} content  Markdown string for assistant, plain text for user
 */
function appendMessageBubble(role, content) {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble message-${role}`;

  if (role === 'assistant') {
    bubble.innerHTML = marked.parse(content);
  } else {
    // User messages are plain text — escape to prevent XSS
    const p = document.createElement('p');
    p.textContent = content;
    bubble.appendChild(p);
  }

  conversationThread.appendChild(bubble);
  // Scroll the thread to the latest message
  conversationThread.scrollTop = conversationThread.scrollHeight;
}

/**
 * Switch the Code Help panel from the initial form view to the conversation view.
 */
function showConversationView() {
  codeHelpInitial.style.display = 'none';
  codeHelpConversation.style.display = 'block';
  // Hide the shared response output — conversation thread takes over for Code Help
  responseOutput.style.display = 'none';
}

/**
 * Reset the Code Help panel back to the initial form view.
 */
function resetConversation() {
  codeHelpMessages = [];
  conversationThread.innerHTML = '';
  codeHelpInitial.style.display = 'block';
  codeHelpConversation.style.display = 'none';
  responseOutput.style.display = '';
  followUpInput.value = '';
  followUpError.textContent = '';
  codeHelpError.textContent = '';
}

/**
 * First turn: validate, POST { code, question }, show conversation view.
 */
async function submitCodeHelp() {
  const code     = codeInput.value.trim();
  const question = codeQuestion.value.trim();

  codeHelpError.textContent = '';

  if (!code || !question) {
    codeHelpError.textContent = 'Please fill in both the GDScript code and your question before submitting.';
    return;
  }

  setLoadingState(true, submitCodeHelpBtn);

  try {
    const response = await fetch('/api/code-help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, question }),
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) { /* ignore */ }
      handleError(new Error(errorMessage));
      return;
    }

    const data = await response.json();

    // Store the returned message history for follow-up turns
    codeHelpMessages = data.messages;

    // Switch to conversation view and render the first exchange
    showConversationView();
    appendMessageBubble('user', `**Code:** \`\`\`gdscript\n${code}\n\`\`\`\n\n**Question:** ${question}`);
    appendMessageBubble('assistant', data.result);

  } catch (networkErr) {
    handleError(new Error('Network error. Please try again.'));
  } finally {
    setLoadingState(false, submitCodeHelpBtn);
  }
}

/**
 * Follow-up turn: POST { messages, followUp }, append new exchange to thread.
 */
async function submitFollowUp() {
  const followUp = followUpInput.value.trim();

  followUpError.textContent = '';

  if (!followUp) {
    followUpError.textContent = 'Please enter a follow-up question.';
    return;
  }

  setLoadingState(true, submitFollowUpBtn);
  followUpInput.value = '';

  try {
    const response = await fetch('/api/code-help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: codeHelpMessages, followUp }),
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) { /* ignore */ }
      followUpError.textContent = errorMessage;
      return;
    }

    const data = await response.json();

    // Update stored history with the new exchange
    codeHelpMessages = data.messages;

    appendMessageBubble('user', followUp);
    appendMessageBubble('assistant', data.result);

  } catch (networkErr) {
    followUpError.textContent = 'Network error. Please try again.';
  } finally {
    setLoadingState(false, submitFollowUpBtn);
  }
}

// Attach listeners
formCodeHelp.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCodeHelp();
});

submitFollowUpBtn.addEventListener('click', submitFollowUp);

followUpInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitFollowUp();
  }
});

newConversationBtn.addEventListener('click', resetConversation);

// ─── Pixel Art Form Validation & Submission ──────────────────────────────────

const formPixelArt   = document.getElementById('form-pixel-art');
const imageInput     = document.getElementById('image-input');
const pixelQuestion  = document.getElementById('pixel-question');
const submitPixelArt = document.getElementById('submit-pixel-art');
const pixelArtError  = document.getElementById('pixel-art-error');
// loadingEl is already declared in the Shared UI Helpers section above

/**
 * POST FormData (image + question) to /api/pixel-art.
 * Shows loading state while awaiting the response.
 * Calls handleResponse(data) on success or handleError(err) on failure.
 */
async function submitPixelArtFn() {
  const file     = imageInput.files[0];
  const question = pixelQuestion.value.trim();

  // ── Validation ──────────────────────────────────────────────────────────
  if (!file || !question) {
    pixelArtError.textContent = !file
      ? 'Please select an image file.'
      : 'Please enter a question.';
    return; // do not send request
  }

  // ── Clear error, show loading, disable submit ────────────────────────────
  pixelArtError.textContent = '';
  responseOutput.innerHTML = '';
  setLoadingState(true, submitPixelArt);

  // ── Build multipart payload ──────────────────────────────────────────────
  const formData = new FormData();
  formData.append('image', file);
  formData.append('question', question);

  // ── Fetch (do NOT set Content-Type — browser sets multipart boundary) ────
  try {
    const response = await fetch('/api/pixel-art', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) {
        // ignore JSON parse failure; use the default message
      }
      handleError(new Error(errorMessage));
    } else {
      const data = await response.json();
      handleResponse(data);
    }
  } catch (networkErr) {
    handleError(new Error('Network error. Please try again.'));
  } finally {
    setLoadingState(false, submitPixelArt);
  }
}

// Attach handler to the form's submit event
formPixelArt.addEventListener('submit', (event) => {
  event.preventDefault();
  submitPixelArtFn();
});

// ─── Game Idea Flesher Form ──────────────────────────────────────────────────

const gameConceptInput         = document.getElementById('game-concept');
const submitGameIdeaFlesherBtn = document.getElementById('submit-game-idea-flesher');
const gameIdeaFlesherError     = document.getElementById('game-idea-flesher-error');

/**
 * Validate, then POST { concept } to /api/game-idea-flesher.
 * Shows an inline error and returns early if the concept field is blank.
 */
async function submitGameIdeaFlesher() {
  const concept = gameConceptInput.value.trim();

  // Clear any previous inline error
  gameIdeaFlesherError.textContent = '';

  // Validate — concept must be non-empty
  if (!concept) {
    gameIdeaFlesherError.textContent = 'Please enter a game concept before submitting.';
    return;
  }

  // Show loading state and clear previous output
  setLoadingState(true, submitGameIdeaFlesherBtn);
  responseOutput.innerHTML = '';

  try {
    const response = await fetch('/api/game-idea-flesher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept }),
    });

    if (!response.ok) {
      // HTTP error — extract error message from JSON body if available
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) {
        // ignore JSON parse failure; use the default message
      }
      handleError(new Error(errorMessage));
    } else {
      const data = await response.json();
      handleResponse(data);
    }
  } catch (networkErr) {
    // fetch() threw — network failure
    handleError(new Error('Network error. Please try again.'));
  } finally {
    setLoadingState(false, submitGameIdeaFlesherBtn);
  }
}

// Attach click listener to the Game Idea Flesher submit button
submitGameIdeaFlesherBtn.addEventListener('click', submitGameIdeaFlesher);

// ─── Class Designer Form ─────────────────────────────────────────────────────

const classDescriptionInput  = document.getElementById('class-description');
const classDesignerError     = document.getElementById('class-designer-error');
const submitClassDesignerBtn = document.getElementById('submit-class-designer');

/**
 * Validate, then POST { description } to /api/class-designer.
 * Shows an inline error and returns early if the description is blank/whitespace.
 */
async function submitClassDesigner() {
  const trimmedValue = classDescriptionInput.value.trim();

  // Clear any previous inline error
  classDesignerError.textContent = '';

  // Validate — description must be non-empty after trimming
  if (!trimmedValue) {
    classDesignerError.textContent = 'Please enter a class description before submitting.';
    return;
  }

  // Show loading state and clear previous output
  setLoadingState(true, submitClassDesignerBtn);
  responseOutput.innerHTML = '';

  try {
    const response = await fetch('/api/class-designer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: trimmedValue }),
    });

    if (!response.ok) {
      // HTTP error — extract error message from JSON body if available
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) {
        // ignore JSON parse failure; use the default message
      }
      handleError(new Error(errorMessage));
    } else {
      const data = await response.json();
      handleResponse(data);
    }
  } catch (networkErr) {
    // fetch() threw — network failure
    handleError(new Error('Network error. Please try again.'));
  } finally {
    setLoadingState(false, submitClassDesignerBtn);
  }
}

// Attach click listener to the Class Designer submit button
submitClassDesignerBtn.addEventListener('click', submitClassDesigner);
