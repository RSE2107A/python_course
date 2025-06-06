// ---------------------------------------------------
// pyodide-runner.js
// ---------------------------------------------------

// Keep a single global reference to Pyodide:
let pyodide = null;
let pyodideReady = false;

// As soon as this script loads, begin fetching Pyodide.
(async () => {
  try {
    pyodide = await loadPyodide();
    pyodideReady = true;
    console.log("✅ Pyodide is ready.");
    // Once Pyodide is ready, any block that was queued will be initialized:
    pendingIDs.forEach((id) => initializeRunner(id));
  } catch (err) {
    console.error("❌ Failed to load Pyodide:", err);
  }
})();

// Keep a list of block-IDs that called setup before Pyodide was ready:
const pendingIDs = [];

/**
 * initializeRunner(id)
 *
 * This does two things:
 *   1) Turns the “Loading…” button into “Run” and enables it.
 *   2) Attaches the click-handler so that clicking “Run” executes the code.
 */
function initializeRunner(id) {
  const textarea = document.getElementById(`code-${id}`);
  const button   = document.getElementById(`run-btn-${id}`);
  const output   = document.getElementById(`output-${id}`);

  if (!textarea || !button || !output) {
    console.warn(`Cannot find code-${id} or run-btn-${id} or output-${id}.`);
    return;
  }

  // Change button to “Run” and enable it:
  button.textContent = "Run";
  button.disabled = false;

  // Attach the click handler:
  button.addEventListener("click", async () => {
    // 1) Grab whatever the user typed
    const userCode = textarea.value;

    // 2) Wrap it so `print()` goes into a StringIO buffer
    const wrapped = `
import sys
import io
_output = io.StringIO()
sys.stdout = _output
try:
${userCode.split("\n").map((line) => "    " + line).join("\n")}
except Exception as e:
    print(e)
sys.stdout = sys.__stdout__
_output.getvalue()
    `;

    // 3) Run it and dump output (or error) into <pre>
    try {
      const result = await pyodide.runPythonAsync(wrapped);
      output.textContent = result;
    } catch (err) {
      output.textContent = err;
    }
  });
}

/**
 * setupPyodideRunner(id)
 *
 * Call this from your Markdown (inline <script>) for each block.
 * It will immediately:
 *   • Find the <button> and set it to “Loading…” + disabled
 *   • If Pyodide is already ready, call initializeRunner(id) right away.
 *   • Otherwise, queue the ID so that initializeRunner(id) runs once Pyodide finishes loading.
 */
function setupPyodideRunner(id) {
  const button = document.getElementById(`run-btn-${id}`);
  if (!button) {
    console.warn(`setupPyodideRunner: no element with id="run-btn-${id}".`);
    return;
  }
  // Disable button and show “Loading…” text immediately:
  button.textContent = "Loading…";
  button.disabled = true;

  if (pyodideReady) {
    // If Pyodide is already loaded, initialize immediately
    initializeRunner(id);
  } else {
    // Otherwise, wait until the async loader pushes us onto pendingIDs
    pendingIDs.push(id);
  }
}

