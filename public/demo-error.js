/**
 * Full-screen red game-style demo interrupt.
 * Not an API console. Not a settings form.
 */
(() => {
  "use strict";

  const LINE =
    "THIS WAS A DEMO TO SHOW AURA AND I DONT WANT TO WASTE MY RAILWAY BACKEND SPACE";

  function ensureDom() {
    let root = document.getElementById("tm-demo-error");
    if (root) return root;

    root = document.createElement("div");
    root.id = "tm-demo-error";
    root.className = "tm-demo-error";
    root.hidden = true;
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tm-demo-error-line");
    root.innerHTML = `
      <div class="tm-demo-error-frame">
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
