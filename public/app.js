// ─── Tab Switching ───────────────────────────────────────────────────────────

const tabCodeHelp  = document.getElementById('tab-code-help');
const tabPixelArt  = document.getElementById('tab-pixel-art');
const panelCodeHelp = document.getElementById('panel-code-help');
const panelPixelArt = document.getElementById('panel-pixel-art');

/**
 * Activate a tab and show its corresponding panel.
 * @param {'code-help'|'pixel-art'} tabName
 */
function switchTab(tabName) {
  if (tabName === 'code-help') {
    // Activate Code Help tab button
    tabCodeHelp.classList.add('active');
    tabCodeHelp.setAttribute('aria-selected', 'true');

    // Deactivate Pixel Art tab button
    tabPixelArt.classList.remove('active');
    tabPixelArt.setAttribute('aria-selected', 'false');

    // Show Code Help panel, hide Pixel Art panel
    panelCodeHelp.style.display = 'block';
    panelPixelArt.style.display = 'none';
  } else if (tabName === 'pixel-art') {
    // Activate Pixel Art tab button
    tabPixelArt.classList.add('active');
    tabPixelArt.setAttribute('aria-selected', 'true');

    // Deactivate Code Help tab button
    tabCodeHelp.classList.remove('active');
    tabCodeHelp.setAttribute('aria-selected', 'false');

    // Show Pixel Art panel, hide Code Help panel
    panelPixelArt.style.display = 'block';
    panelCodeHelp.style.display = 'none';
  }
}

// Attach click listeners to tab buttons
tabCodeHelp.addEventListener('click', () => switchTab('code-help'));
tabPixelArt.addEventListener('click', () => switchTab('pixel-art'));

// Enforce default state on page load: Code Help tab active
switchTab('code-help');

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

// ─── Code Help Form ──────────────────────────────────────────────────────────

const formCodeHelp    = document.getElementById('form-code-help');
const codeInput       = document.getElementById('code-input');
const codeQuestion    = document.getElementById('code-question');
const submitCodeHelpBtn = document.getElementById('submit-code-help');
const codeHelpError   = document.getElementById('code-help-error');

/**
 * Validate, then POST { code, question } to /api/code-help.
 * Shows an inline error and returns early if either field is blank.
 */
async function submitCodeHelp() {
  const code     = codeInput.value.trim();
  const question = codeQuestion.value.trim();

  // Clear any previous inline error
  codeHelpError.textContent = '';

  // Validate — both fields must be non-empty
  if (!code || !question) {
    codeHelpError.textContent = 'Please fill in both the GDScript code and your question before submitting.';
    return;
  }

  // Show loading state
  setLoadingState(true, submitCodeHelpBtn);
  responseOutput.textContent = '';

  try {
    const response = await fetch('/api/code-help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, question }),
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
    setLoadingState(false, submitCodeHelpBtn);
  }
}

// Attach submit listener to the Code Help form
formCodeHelp.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCodeHelp();
});

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
