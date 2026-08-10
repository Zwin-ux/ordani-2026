/**
 * TinyMe operator console v0
 * Live API client — no sample data, no fake metrics.
 */
(() => {
  "use strict";

  const STORAGE_BASE = "tinyme.console.apiBase";
  const STORAGE_KEY = "tinyme.console.apiKey";
  const STORAGE_SESSION = "tinyme.console.session";
  const STORAGE_DONE = "tinyme.onboarding.done";
  const DEFAULT_BASE = "http://localhost:8080";

  const $ = (id) => document.getElementById(id);

  const els = {
    configForm: $("config-form"),
    apiBase: $("api-base"),
    apiKey: $("api-key"),
    configSaved: $("config-saved"),
    healthBtn: $("health-btn"),
    healthStatus: $("health-status"),
    errorBanner: $("error-banner"),
    createForm: $("create-form"),
    createDest: $("create-dest"),
    createSlug: $("create-slug"),
    createDomain: $("create-domain"),
    createBtn: $("create-btn"),
    createMsg: $("create-msg"),
    refreshBtn: $("refresh-btn"),
    listMeta: $("list-meta"),
    linksBody: $("links-body"),
    detailEmpty: $("detail-empty"),
    detailBody: $("detail-body"),
    detailMeta: $("detail-meta"),
    detailShort: $("detail-short"),
    detailHostForm: $("detail-host-form"),
    factId: $("fact-id"),
    factClicks: $("fact-clicks"),
    factActive: $("fact-active"),
    destList: $("dest-list"),
    ruleList: $("rule-list"),
    swapForm: $("swap-form"),
    swapDestId: $("swap-dest-id"),
    swapUrl: $("swap-url"),
    swapBtn: $("swap-btn"),
    swapMsg: $("swap-msg"),
    analyticsMeta: $("analytics-meta"),
    statTotal: $("stat-total"),
    statHuman: $("stat-human"),
    statBot: $("stat-bot"),
    analyticsNote: $("analytics-note"),
    historyList: $("history-list"),
    historyMeta: $("history-meta"),
    historyMsg: $("history-msg"),
    historyRefreshBtn: $("history-refresh-btn"),
    rollbackBtn: $("rollback-btn"),
    deleteBtn: $("delete-btn"),
    deleteMsg: $("delete-msg"),
    addDestForm: $("add-dest-form"),
    addDestUrl: $("add-dest-url"),
    addDestBtn: $("add-dest-btn"),
    addDestMsg: $("add-dest-msg"),
    ruleForm: $("rule-form"),
    ruleType: $("rule-type"),
    rulePriority: $("rule-priority"),
    ruleMatch: $("rule-match"),
    ruleMatchHint: $("rule-match-hint"),
    ruleDest: $("rule-dest"),
    ruleBtn: $("rule-btn"),
    ruleMsg: $("rule-msg"),
  };

  let selectedId = null;
  let selectedLink = null;
  let primaryDestId = null;

  /* ---------- Config ---------- */

  function loadConfig() {
    const base = sessionStorage.getItem(STORAGE_BASE) || DEFAULT_BASE;
    const key = sessionStorage.getItem(STORAGE_KEY) || "";
    els.apiBase.value = base;
    els.apiKey.value = key;
    return { base: stripTrailingSlash(base), key };
  }

  function saveConfig() {
    const base = stripTrailingSlash(els.apiBase.value.trim() || DEFAULT_BASE);
    const key = els.apiKey.value.trim();
    sessionStorage.setItem(STORAGE_BASE, base);
    sessionStorage.setItem(STORAGE_KEY, key);
    els.apiBase.value = base;
    els.configSaved.textContent = "Saved to session storage.";
    setTimeout(() => {
      if (els.configSaved.textContent === "Saved to session storage.") {
        els.configSaved.textContent = "";
      }
    }, 2500);
    return { base, key };
  }

  function getSessionToken() {
    return (sessionStorage.getItem(STORAGE_SESSION) || "").trim();
  }

  function setSessionToken(token) {
    if (token) sessionStorage.setItem(STORAGE_SESSION, token);
    else sessionStorage.removeItem(STORAGE_SESSION);
  }

  function getBearer() {
    const key = (sessionStorage.getItem(STORAGE_KEY) ?? els.apiKey.value ?? "").trim();
    if (key) return key;
    return getSessionToken();
  }

  function getConfig() {
    return {
      base: stripTrailingSlash(
        (sessionStorage.getItem(STORAGE_BASE) || els.apiBase.value || DEFAULT_BASE).trim()
      ),
      key: getBearer(),
    };
  }

  function consumeOAuthReturn() {
    const params = new URLSearchParams(window.location.search);
    const st = params.get("st");
    const auth = params.get("auth");
    if (st) {
      setSessionToken(st);
      try {
        localStorage.setItem(STORAGE_DONE, "1");
      } catch {
        /* ignore */
      }
    }
    if (st || auth) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("st");
      clean.searchParams.delete("auth");
      clean.searchParams.delete("email");
      clean.searchParams.delete("reason");
      window.history.replaceState({}, "", clean.pathname + (clean.searchParams.toString() ? `?${clean.searchParams}` : ""));
    }
  }

  function stripTrailingSlash(s) {
    return s.replace(/\/+$/, "");
  }

  /* ---------- API ---------- */

  class ApiError extends Error {
    constructor(status, message, body) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }

  async function api(method, path, body) {
    const { base, key } = getConfig();
    if (!base) throw new ApiError(0, "Set an API base URL first.");

    const headers = { Accept: "application/json" };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const hint =
        err && err.name === "TypeError"
          ? "Network error — is the API running? Check base URL and CORS."
          : `Network error: ${err.message || err}`;
      throw new ApiError(0, hint);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!res.ok) {
      const msg = friendlyError(res.status, data);
      throw new ApiError(res.status, msg, data);
    }

    return data;
  }

  function friendlyError(status, data) {
    const serverMsg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" ? data : null);

    if (status === 401) {
      return serverMsg
        ? `401 Unauthorized — ${serverMsg}`
        : "401 Unauthorized — missing or invalid Authorization header. Save your API key.";
    }
    if (status === 403) {
      return serverMsg
        ? `403 Forbidden — ${serverMsg}`
        : "403 Forbidden — API key rejected.";
    }
    if (status === 404) {
      return serverMsg || "404 Not found.";
    }
    if (status === 409) {
      return serverMsg || "409 Conflict — slug may already exist.";
    }
    if (status >= 500) {
      return serverMsg || `Server error (${status}).`;
    }
    return serverMsg || `Request failed (${status}).`;
  }

  /* ---------- UI helpers ---------- */

  function showError(message) {
    if (!message) {
      els.errorBanner.hidden = true;
      els.errorBanner.textContent = "";
      return;
    }
    els.errorBanner.hidden = false;
    els.errorBanner.textContent = message;
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-ok", "is-err");
    if (text && kind === "ok") el.classList.add("is-ok");
    if (text && kind === "err") el.classList.add("is-err");
  }

  function clearMessages() {
    showError("");
    setMsg(els.createMsg, "");
    setMsg(els.swapMsg, "");
    setMsg(els.historyMsg, "");
    setMsg(els.deleteMsg, "");
    setMsg(els.addDestMsg, "");
    setMsg(els.ruleMsg, "");
  }

  function ruleCondition(type, matchRaw) {
    const parts = String(matchRaw || "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return null;
    switch (type) {
      case "device":
        return JSON.stringify({ devices: parts.map((p) => p.toLowerCase()) });
      case "country":
        return JSON.stringify({ countries: parts.map((p) => p.toUpperCase()) });
      case "referrer":
        return JSON.stringify({ referrers: parts });
      case "schedule": {
        const hours = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 23);
        if (!hours.length) return null;
        return JSON.stringify({ hours });
      }
      default:
        return null;
    }
  }

  function updateRuleMatchHint() {
    if (!els.ruleMatchHint || !els.ruleType) return;
    const t = els.ruleType.value;
    const hints = {
      device: "(mobile, desktop, tablet)",
      country: "(US, CA — comma ok)",
      referrer: "(substring in referrer)",
      schedule: "(UTC hours 0-23, e.g. 9 14)",
    };
    els.ruleMatchHint.textContent = hints[t] || "";
    if (els.ruleMatch) {
      els.ruleMatch.placeholder =
        t === "country" ? "US" : t === "schedule" ? "9" : t === "referrer" ? "instagram" : "mobile";
    }
  }

  function fillRuleDestSelect(destinations) {
    if (!els.ruleDest) return;
    const list = destinations || [];
    if (!list.length) {
      els.ruleDest.innerHTML = '<option value="">No destinations</option>';
      els.ruleDest.disabled = true;
      return;
    }
    els.ruleDest.disabled = false;
    els.ruleDest.innerHTML =
      '<option value="">Select destination…</option>' +
      list
        .map((d) => {
          const tag = d.is_primary ? " · primary" : "";
          const label = `${(d.url || "").slice(0, 48)}${(d.url || "").length > 48 ? "…" : ""}${tag}`;
          return `<option value="${escapeHtml(d.id)}">${escapeHtml(label)}</option>`;
        })
        .join("");
  }

  function resetAnalyticsStrip() {
    if (els.statTotal) els.statTotal.textContent = "—";
    if (els.statHuman) els.statHuman.textContent = "—";
    if (els.statBot) els.statBot.textContent = "—";
    if (els.analyticsMeta) els.analyticsMeta.textContent = "GET …/analytics";
    if (els.analyticsNote) els.analyticsNote.textContent = "Live summary · human vs bot · last 30 days series";
  }

  function resetHistoryPanel() {
    primaryDestId = null;
    if (els.historyList) els.historyList.innerHTML = "";
    if (els.historyMeta) els.historyMeta.textContent = "Primary destination changes";
    if (els.rollbackBtn) els.rollbackBtn.disabled = true;
    setMsg(els.historyMsg, "");
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(iso);
    }
  }

  function emptyListRow(title, body) {
    return `<tr class="op-empty-row"><td colspan="4"><div class="op-empty"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div></td></tr>`;
  }

  const DETAIL_EMPTY_HTML =
    '<p class="op-empty"><strong>Nothing selected</strong><span>Pick a row in Links to load destinations, rules, and the public short address from the live API.</span></p>';

  function setBusy(btn, busy, labelIdle) {
    if (!btn) return;
    btn.disabled = busy;
    if (busy) btn.dataset.prev = btn.textContent;
    else if (labelIdle) btn.textContent = labelIdle;
    else if (btn.dataset.prev) btn.textContent = btn.dataset.prev;
  }

  function shortAddress(domain, slug) {
    return `${domain}/${slug}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Health ---------- */

  async function runHealth() {
    clearMessages();
    els.healthStatus.textContent = "Checking…";
    els.healthStatus.className = "op-health mono is-pending";
    try {
      const { base } = getConfig();
      let res;
      try {
        res = await fetch(`${base}/health`, { method: "GET", headers: { Accept: "application/json" } });
      } catch {
        throw new ApiError(0, "Unreachable — check base URL and that the API is running.");
      }
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        els.healthStatus.textContent = `Unhealthy · HTTP ${res.status}`;
        els.healthStatus.className = "op-health mono is-bad";
        showError(`Health check failed: HTTP ${res.status}`);
        return;
      }
      const status = (data && (data.status || data.state)) || "ok";
      // Status is plain mono text — no green LED chrome (see CRAFT-NOTES).
      els.healthStatus.textContent = `Reachable · ${status}`;
      els.healthStatus.className = "op-health mono is-ok";
    } catch (err) {
      els.healthStatus.textContent = "Unreachable";
      els.healthStatus.className = "op-health mono is-bad";
      showError(err.message || String(err));
    }
  }

  /* ---------- Links list ---------- */

  async function loadLinks() {
    showError("");
    els.listMeta.textContent = "Loading…";
    try {
      const data = await api("GET", "/api/links?limit=100&offset=0");
      const links = (data && data.links) || [];
      els.listMeta.textContent = `${links.length} link${links.length === 1 ? "" : "s"}`;
      renderLinks(links);
      if (selectedId) {
        const still = links.find((l) => l.id === selectedId);
        if (!still) {
          selectedId = null;
          selectedLink = null;
          showDetailEmpty();
        }
      }
    } catch (err) {
      els.listMeta.textContent = "GET /api/links";
      els.linksBody.innerHTML = emptyListRow(
        "Could not load links",
        err.message || "Check API base URL, key, and that the service is running."
      );
      showError(err.message);
    }
  }

  function renderLinks(links) {
    if (!links.length) {
      els.linksBody.innerHTML = emptyListRow(
        "No links yet",
        "Create a link above. Destination is required; slug and domain are optional."
      );
      return;
    }

    els.linksBody.innerHTML = links
      .map((link) => {
        const active = link.is_active ? "yes" : "no";
        const sel = link.id === selectedId ? " is-selected" : "";
        return `<tr class="op-link-row${sel}" data-id="${escapeHtml(link.id)}" tabindex="0" role="button" aria-selected="${link.id === selectedId ? "true" : "false"}">
          <td class="mono">${escapeHtml(link.slug)}</td>
          <td class="mono">${escapeHtml(link.domain)}</td>
          <td class="mono">${Number(link.click_count) || 0}</td>
          <td class="mono op-active-${link.is_active ? "yes" : "no"}">${active}</td>
        </tr>`;
      })
      .join("");
  }

  /* ---------- Detail ---------- */

  function showDetailEmpty() {
    els.detailEmpty.hidden = false;
    els.detailBody.hidden = true;
    els.detailMeta.textContent = "Select a link";
    els.detailEmpty.innerHTML = DETAIL_EMPTY_HTML;
    resetAnalyticsStrip();
    resetHistoryPanel();
    setMsg(els.deleteMsg, "");
    if (els.deleteBtn) els.deleteBtn.disabled = true;
  }

  async function selectLink(id) {
    selectedId = id;
    showError("");
    setMsg(els.swapMsg, "");
    setMsg(els.historyMsg, "");
    setMsg(els.deleteMsg, "");
    resetAnalyticsStrip();
    resetHistoryPanel();
    els.detailMeta.textContent = "Loading…";
    els.detailEmpty.hidden = true;
    els.detailBody.hidden = false;
    if (els.deleteBtn) els.deleteBtn.disabled = false;

    // Highlight row
    els.linksBody.querySelectorAll(".op-link-row").forEach((row) => {
      const on = row.dataset.id === id;
      row.classList.toggle("is-selected", on);
      row.setAttribute("aria-selected", on ? "true" : "false");
    });

    try {
      const data = await api("GET", `/api/links/${encodeURIComponent(id)}`);
      const link = data.link || data;
      const destinations = data.destinations || [];
      const rules = data.rules || [];
      selectedLink = { link, destinations, rules };
      renderDetail(link, destinations, rules);
      // Parallel enrichers — detail stays usable if one fails
      void loadAnalytics(id);
      void loadHistory(primaryDestId);
    } catch (err) {
      showError(err.message);
      els.detailMeta.textContent = "Failed to load";
      els.detailBody.hidden = true;
      els.detailEmpty.hidden = false;
      els.detailEmpty.innerHTML = `<p class="op-empty"><strong>Could not load detail</strong><span>${escapeHtml(err.message)}</span></p>`;
    }
  }

  async function loadAnalytics(linkId) {
    if (!linkId || !els.statTotal) return;
    if (els.analyticsMeta) els.analyticsMeta.textContent = "Loading…";
    try {
      const data = await api("GET", `/api/links/${encodeURIComponent(linkId)}/analytics?days=30`);
      els.statTotal.textContent = String(Number(data.total_clicks) || 0);
      els.statHuman.textContent = String(Number(data.human_clicks) || 0);
      els.statBot.textContent = String(Number(data.bot_clicks) || 0);
      if (els.analyticsMeta) els.analyticsMeta.textContent = "GET …/analytics?days=30";
      const days = Array.isArray(data.clicks_by_day) ? data.clicks_by_day.length : 0;
      if (els.analyticsNote) {
        els.analyticsNote.textContent =
          days > 0
            ? `Live summary · ${days} day bucket${days === 1 ? "" : "s"} with traffic`
            : "Live summary · no day-series traffic yet";
      }
    } catch (err) {
      if (els.analyticsMeta) els.analyticsMeta.textContent = "Analytics failed";
      if (els.analyticsNote) els.analyticsNote.textContent = err.message || "Could not load analytics";
      els.statTotal.textContent = "—";
      els.statHuman.textContent = "—";
      els.statBot.textContent = "—";
    }
  }

  async function loadHistory(destId) {
    if (!els.historyList) return;
    if (!destId) {
      els.historyList.innerHTML = '<li class="op-muted">No primary destination — history unavailable.</li>';
      if (els.historyMeta) els.historyMeta.textContent = "No destination";
      if (els.rollbackBtn) els.rollbackBtn.disabled = true;
      return;
    }
    if (els.historyMeta) els.historyMeta.textContent = "Loading history…";
    if (els.rollbackBtn) els.rollbackBtn.disabled = true;
    try {
      const data = await api(
        "GET",
        `/api/links/${encodeURIComponent(selectedId)}/destinations/${encodeURIComponent(destId)}/history`
      );
      const history = (data && data.history) || (Array.isArray(data) ? data : []) || [];
      renderHistory(history, destId);
    } catch (err) {
      els.historyList.innerHTML = `<li class="op-muted">${escapeHtml(err.message || "History failed")}</li>`;
      if (els.historyMeta) els.historyMeta.textContent = "History failed";
      if (els.rollbackBtn) els.rollbackBtn.disabled = true;
    }
  }

  function renderHistory(history, destId) {
    const rows = Array.isArray(history) ? history : [];
    if (els.historyMeta) {
      els.historyMeta.textContent = `${rows.length} change${rows.length === 1 ? "" : "s"} · dest ${String(destId).slice(0, 8)}…`;
    }
    if (els.rollbackBtn) els.rollbackBtn.disabled = rows.length === 0;
    if (!rows.length) {
      els.historyList.innerHTML =
        '<li class="op-muted">No URL changes yet. Swap the primary destination to write history.</li>';
      return;
    }
    // Newest first if API returns oldest-first
    const ordered = [...rows].sort((a, b) => {
      const ta = new Date(a.changed_at || 0).getTime();
      const tb = new Date(b.changed_at || 0).getTime();
      return tb - ta;
    });
    els.historyList.innerHTML = ordered
      .map((h) => {
        return `<li>
          <time class="mono op-history-when">${escapeHtml(formatWhen(h.changed_at))}</time>
          <div class="op-history-urls">
            <span class="mono op-history-old">${escapeHtml(h.old_url || "—")}</span>
            <span class="op-history-arrow mono" aria-hidden="true">→</span>
            <span class="mono op-history-new">${escapeHtml(h.new_url || "—")}</span>
          </div>
        </li>`;
      })
      .join("");
  }

  function renderDetail(link, destinations, rules) {
    const short = shortAddress(link.domain, link.slug);
    els.detailMeta.textContent = `GET /api/links/${link.id.slice(0, 8)}…`;
    els.detailShort.textContent = short;
    els.detailHostForm.textContent = `${link.domain}/${link.slug}`;
    els.factId.textContent = link.id;
    els.factClicks.textContent = String(Number(link.click_count) || 0);
    els.factActive.textContent = link.is_active ? "yes" : "no";
    if (els.deleteBtn) {
      els.deleteBtn.disabled = !link.is_active;
      els.deleteBtn.textContent = link.is_active ? "Soft-delete link" : "Already inactive";
    }

    const primary = destinations.find((d) => d.is_primary) || destinations[0];
    primaryDestId = primary ? primary.id : null;
    els.swapDestId.value = primary ? primary.id : "";
    els.swapUrl.value = primary ? primary.url : "";
    els.swapBtn.disabled = !primary;
    setMsg(
      els.swapMsg,
      primary ? `Primary dest · ${primary.id.slice(0, 8)}…` : "No destination to patch."
    );

    if (!destinations.length) {
      els.destList.innerHTML =
        '<li class="op-muted">No destinations on this link. Create flow should attach a primary destination.</li>';
    } else {
      els.destList.innerHTML = destinations
        .map((d) => {
          const tag = d.is_primary ? '<span class="op-tag mono">primary</span>' : "";
          return `<li>
            <div class="op-dest-main">
              <span class="op-dest-url">${escapeHtml(d.url)}</span>
              ${tag}
            </div>
            <div class="op-dest-meta mono">
              <span>id ${escapeHtml(d.id.slice(0, 8))}…</span>
              <span>weight ${Number(d.weight) || 0}</span>
              <span>${d.is_active ? "active" : "inactive"}</span>
            </div>
          </li>`;
        })
        .join("");
    }

    fillRuleDestSelect(destinations);

    if (!rules.length) {
      els.ruleList.innerHTML =
        '<li class="op-muted">No rules. Primary destination is the fallback for every click.</li>';
    } else {
      const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      els.ruleList.innerHTML = sorted
        .map((r, i) => {
          let cond = r.condition;
          try {
            cond = JSON.stringify(JSON.parse(r.condition));
          } catch {
            /* keep raw */
          }
          return `<li class="op-rule-row" data-rule-id="${escapeHtml(r.id)}">
            <span class="op-rule-num mono">${String(i + 1).padStart(2, "0")}</span>
            <div class="op-rule-body">
              <div class="op-rule-type mono">${escapeHtml(r.type)} · priority ${Number(r.priority) || 0}</div>
              <div class="op-rule-cond mono">${escapeHtml(cond)}</div>
              <div class="op-rule-dest mono">→ dest ${escapeHtml((r.destination_id || "").slice(0, 8))}…</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm op-rule-del" data-rule-del="${escapeHtml(r.id)}" title="Delete rule">Delete</button>
          </li>`;
        })
        .join("");
    }
  }

  /* ---------- Create ---------- */

  async function createLink(ev) {
    ev.preventDefault();
    clearMessages();
    const destination = els.createDest.value.trim();
    if (!destination) {
      setMsg(els.createMsg, "Destination URL is required.", "err");
      return;
    }

    const body = { destination };
    const slug = els.createSlug.value.trim();
    const domain = els.createDomain.value.trim();
    if (slug) body.slug = slug;
    if (domain) body.domain = domain;

    setBusy(els.createBtn, true);
    els.createBtn.textContent = "Creating…";
    try {
      const data = await api("POST", "/api/links", body);
      const link = data.link || data;
      const short = link.domain && link.slug ? shortAddress(link.domain, link.slug) : "created";
      setMsg(els.createMsg, `Created ${short}`, "ok");
      els.createSlug.value = "";
      els.createDest.value = "";
      // keep domain for next create
      await loadLinks();
      if (link.id) await selectLink(link.id);
      try {
        window.TinyMeDomainLock?.maybeHaltAfterCreate?.(link);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setMsg(els.createMsg, err.message, "err");
      showError(err.message);
      try {
        if (window.TinyMeDomainLock?.isStaticDemoHost?.()) {
          window.TinyMeDomainLock.showHalt({
            message:
              "No live TinyMe API on this host. Static demo only — buy the domain and lock TinyMe for Ordani. Made by the 🐐.",
          });
        }
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(els.createBtn, false, "Create link");
    }
  }

  /* ---------- Swap ---------- */

  async function swapDestination(ev) {
    ev.preventDefault();
    clearMessages();
    if (!selectedId) {
      setMsg(els.swapMsg, "Select a link first.", "err");
      return;
    }
    const destId = els.swapDestId.value;
    const url = els.swapUrl.value.trim();
    if (!destId) {
      setMsg(els.swapMsg, "No primary destination id.", "err");
      return;
    }
    if (!url) {
      setMsg(els.swapMsg, "Enter a destination URL.", "err");
      return;
    }

    setBusy(els.swapBtn, true);
    els.swapBtn.textContent = "Patching…";
    try {
      await api(
        "PATCH",
        `/api/links/${encodeURIComponent(selectedId)}/destinations/${encodeURIComponent(destId)}`,
        { url }
      );
      setMsg(els.swapMsg, "Destination updated.", "ok");
      await selectLink(selectedId);
      await loadLinks();
    } catch (err) {
      setMsg(els.swapMsg, err.message, "err");
      showError(err.message);
    } finally {
      setBusy(els.swapBtn, false, "Patch destination");
    }
  }

  /* ---------- Rollback ---------- */

  async function rollbackLast() {
    clearMessages();
    if (!selectedId || !primaryDestId) {
      setMsg(els.historyMsg, "Select a link with a primary destination.", "err");
      return;
    }
    const ok = window.confirm(
      "Rollback primary destination to the previous URL?\n\nThis writes a new history entry with the restored URL."
    );
    if (!ok) return;

    setBusy(els.rollbackBtn, true);
    els.rollbackBtn.textContent = "Rolling back…";
    try {
      await api(
        "POST",
        `/api/links/${encodeURIComponent(selectedId)}/destinations/${encodeURIComponent(primaryDestId)}/rollback`
      );
      setMsg(els.historyMsg, "Rolled back to previous URL.", "ok");
      await selectLink(selectedId);
      await loadLinks();
    } catch (err) {
      setMsg(els.historyMsg, err.message, "err");
      showError(err.message);
    } finally {
      setBusy(els.rollbackBtn, false, "Rollback last");
    }
  }

  /* ---------- Destinations + rules ---------- */

  async function addDestination(ev) {
    ev.preventDefault();
    clearMessages();
    if (!selectedId) {
      setMsg(els.addDestMsg, "Select a link first.", "err");
      return;
    }
    const url = (els.addDestUrl?.value || "").trim();
    if (!url) {
      setMsg(els.addDestMsg, "URL required.", "err");
      return;
    }
    setBusy(els.addDestBtn, true);
    els.addDestBtn.textContent = "Adding…";
    try {
      await api("POST", `/api/links/${encodeURIComponent(selectedId)}/destinations`, { url });
      setMsg(els.addDestMsg, "Destination added.", "ok");
      if (els.addDestUrl) els.addDestUrl.value = "";
      await selectLink(selectedId);
    } catch (err) {
      setMsg(els.addDestMsg, err.message, "err");
      showError(err.message);
    } finally {
      setBusy(els.addDestBtn, false, "Add destination");
    }
  }

  async function addRule(ev) {
    ev.preventDefault();
    clearMessages();
    if (!selectedId) {
      setMsg(els.ruleMsg, "Select a link first.", "err");
      return;
    }
    const type = els.ruleType?.value || "device";
    const match = (els.ruleMatch?.value || "").trim();
    const destId = els.ruleDest?.value || "";
    const priority = Number(els.rulePriority?.value);
    if (!destId) {
      setMsg(els.ruleMsg, "Pick a destination.", "err");
      return;
    }
    const condition = ruleCondition(type, match);
    if (!condition) {
      setMsg(els.ruleMsg, "Invalid match for this rule type.", "err");
      return;
    }
    setBusy(els.ruleBtn, true);
    els.ruleBtn.textContent = "Adding…";
    try {
      await api("POST", `/api/links/${encodeURIComponent(selectedId)}/rules`, {
        type,
        condition,
        destination_id: destId,
        priority: Number.isFinite(priority) ? priority : 10,
      });
      setMsg(els.ruleMsg, "Rule added.", "ok");
      if (els.ruleMatch) els.ruleMatch.value = "";
      await selectLink(selectedId);
    } catch (err) {
      setMsg(els.ruleMsg, err.message, "err");
      showError(err.message);
    } finally {
      setBusy(els.ruleBtn, false, "Add rule");
    }
  }

  async function deleteRule(ruleId) {
    clearMessages();
    if (!selectedId || !ruleId) return;
    const ok = window.confirm("Delete this routing rule?");
    if (!ok) return;
    try {
      await api(
        "DELETE",
        `/api/links/${encodeURIComponent(selectedId)}/rules/${encodeURIComponent(ruleId)}`
      );
      setMsg(els.ruleMsg, "Rule deleted.", "ok");
      await selectLink(selectedId);
    } catch (err) {
      setMsg(els.ruleMsg, err.message, "err");
      showError(err.message);
    }
  }

  /* ---------- Soft-delete ---------- */

  async function softDeleteLink() {
    clearMessages();
    if (!selectedId) {
      setMsg(els.deleteMsg, "Select a link first.", "err");
      return;
    }
    const short =
      selectedLink && selectedLink.link
        ? shortAddress(selectedLink.link.domain, selectedLink.link.slug)
        : selectedId.slice(0, 8);
    const ok = window.confirm(
      `Soft-delete ${short}?\n\nThe public slug will stop redirecting. Events stay in the database.`
    );
    if (!ok) return;

    setBusy(els.deleteBtn, true);
    els.deleteBtn.textContent = "Deleting…";
    try {
      await api("DELETE", `/api/links/${encodeURIComponent(selectedId)}`);
      setMsg(els.deleteMsg, "Link deactivated.", "ok");
      const gone = selectedId;
      selectedId = null;
      selectedLink = null;
      await loadLinks();
      // If list still shows inactive rows, re-select to show state; else empty
      const row = els.linksBody.querySelector(`.op-link-row[data-id="${gone}"]`);
      if (row) {
        await selectLink(gone);
        setMsg(els.deleteMsg, "Link deactivated. Redirect is off.", "ok");
      } else {
        showDetailEmpty();
      }
    } catch (err) {
      setMsg(els.deleteMsg, err.message, "err");
      showError(err.message);
      setBusy(els.deleteBtn, false, "Soft-delete link");
    }
  }

  /* ---------- Events ---------- */

  function bind() {
    els.configForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      clearMessages();
      saveConfig();
      loadLinks();
    });

    els.healthBtn.addEventListener("click", () => runHealth());
    els.refreshBtn.addEventListener("click", () => loadLinks());
    els.createForm.addEventListener("submit", createLink);
    els.swapForm.addEventListener("submit", swapDestination);
    if (els.rollbackBtn) els.rollbackBtn.addEventListener("click", () => void rollbackLast());
    if (els.historyRefreshBtn) {
      els.historyRefreshBtn.addEventListener("click", () => void loadHistory(primaryDestId));
    }
    if (els.deleteBtn) els.deleteBtn.addEventListener("click", () => void softDeleteLink());
    if (els.addDestForm) els.addDestForm.addEventListener("submit", addDestination);
    if (els.ruleForm) els.ruleForm.addEventListener("submit", addRule);
    if (els.ruleType) {
      els.ruleType.addEventListener("change", updateRuleMatchHint);
      updateRuleMatchHint();
    }
    if (els.ruleList) {
      els.ruleList.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-rule-del]");
        if (btn && btn.dataset.ruleDel) void deleteRule(btn.dataset.ruleDel);
      });
    }

    els.linksBody.addEventListener("click", (ev) => {
      const row = ev.target.closest(".op-link-row");
      if (row && row.dataset.id) selectLink(row.dataset.id);
    });

    els.linksBody.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const row = ev.target.closest(".op-link-row");
      if (row && row.dataset.id) {
        ev.preventDefault();
        selectLink(row.dataset.id);
      }
    });
  }

  function shouldGateToOnboarding() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("skip") === "1") {
        try {
          localStorage.setItem(STORAGE_DONE, "1");
        } catch {
          /* private mode */
        }
        // Clean URL without reloading forever
        if (window.history && window.history.replaceState) {
          params.delete("skip");
          const q = params.toString();
          window.history.replaceState({}, "", `/console${q ? `?${q}` : ""}`);
        }
        return false;
      }
      if (localStorage.getItem(STORAGE_DONE) === "1") return false;
      const key = (sessionStorage.getItem(STORAGE_KEY) || "").trim();
      const session = (sessionStorage.getItem(STORAGE_SESSION) || "").trim();
      // Mid-session operators keep the console
      if (key || session) return false;
      return true;
    } catch {
      return false;
    }
  }

  function renderAuthChrome(user) {
    let el = document.getElementById("op-user-chip");
    if (!el) {
      const header = document.querySelector(".op-header-nav");
      if (!header) return;
      el = document.createElement("span");
      el.id = "op-user-chip";
      el.className = "op-user-chip mono";
      header.prepend(el);
    }
    if (user && user.email) {
      el.innerHTML = `${escapeHtml(user.email)} · <button type="button" class="op-logout" id="op-logout">Log out</button>`;
      const btn = document.getElementById("op-logout");
      if (btn) {
        btn.addEventListener("click", async () => {
          const { base } = getConfig();
          try {
            await fetch(`${base}/auth/logout`, {
              method: "POST",
              credentials: "include",
              headers: { Authorization: `Bearer ${getSessionToken()}` },
            });
          } catch {
            /* ignore */
          }
          setSessionToken("");
          sessionStorage.removeItem(STORAGE_KEY);
          window.location.href = "/onboarding";
        });
      }
    } else {
      const { base } = getConfig();
      el.innerHTML = `<a href="${escapeHtml(base)}/auth/google?next=${encodeURIComponent("/console")}">Google</a>`;
    }
  }

  async function initAuthUI() {
    consumeOAuthReturn();
    const { base, key } = getConfig();
    if (!getSessionToken() && !key) {
      renderAuthChrome(null);
      return;
    }
    try {
      const headers = { Accept: "application/json" };
      const bearer = getBearer();
      if (bearer) headers.Authorization = `Bearer ${bearer}`;
      const res = await fetch(`${base}/auth/me`, { headers, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          renderAuthChrome(data.user);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    renderAuthChrome(null);
  }

  function init() {
    if (shouldGateToOnboarding()) {
      window.location.replace("/onboarding?from=console");
      return;
    }
    loadConfig();
    bind();
    initAuthUI();
    // Auto-load if we have a base URL (always do — empty key is valid in local dev)
    loadLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
