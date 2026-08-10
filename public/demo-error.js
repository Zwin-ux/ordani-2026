/**
 * Full-screen red game-style demo interrupt.
 * Not an API console. Not a settings form.
 */
(() => {
  "use strict";

  const TITLE = "ERROR";
  const LINE = "THIS IS A DEMO TO SHOW AURA";

  function ensureDom() {
    let root = document.getElementById("tm-demo-error");
    if (root) return root;

    root = document.createElement("div");
    root.id = "tm-demo-error";
    root.className = "tm-demo-error";
    root.hidden = true;
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tm-demo-error-title");
    root.innerHTML = `
      <div class="tm-demo-error-frame">
        <p class="tm-demo-error-code mono" aria-hidden="true">// FATAL_INTERRUPT</p>
        <h2 id="tm-demo-error-title" class="tm-demo-error-title mono">${TITLE}</h2>
        <p class="tm-demo-error-line mono" id="tm-demo-error-line">${LINE}</p>
        <button type="button" class="tm-demo-error-ok mono" id="tm-demo-error-ok">OK</button>
      </div>
    `;
    document.body.appendChild(root);

    const close = () => {
      root.hidden = true;
      document.body.classList.remove("tm-demo-error-open");
    };

    root.querySelector("#tm-demo-error-ok")?.addEventListener("click", close);
    root.addEventListener("click", (ev) => {
      if (ev.target === root) close();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !root.hidden) close();
    });

    return root;
  }

  function showDemoError(opts = {}) {
    const root = ensureDom();
    const line = root.querySelector("#tm-demo-error-line");
    if (line) line.textContent = opts.line || LINE;
    const title = root.querySelector("#tm-demo-error-title");
    if (title && opts.title) title.textContent = opts.title;
    root.hidden = false;
    document.body.classList.add("tm-demo-error-open");
    window.setTimeout(() => root.querySelector("#tm-demo-error-ok")?.focus(), 40);
  }

  function closeDemoError() {
    const root = document.getElementById("tm-demo-error");
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("tm-demo-error-open");
  }

  window.TinyMeDemoError = { show: showDemoError, close: closeDemoError };
})();
