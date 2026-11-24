/*
 * dom.js — pomocnicze funkcje UI: tworzenie elementów, okna modalne, komunikaty (toast), dźwięki.
 */
(function (GT) {
  /** h("div", { class: "x", onclick: fn }, [dzieci | tekst]) */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    });
    append(el, children);
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
  }

  function svg(tag, attrs, children) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined) return;
      if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // ---------- Okna modalne ----------
  var modalStack = [];

  /**
   * Otwiera okno modalne. opts: { title, body (element), actions: [{label, primary, onClick, disabled}],
   *   dismissible (Escape/X zamyka), onClose, wide, className }
   */
  function openModal(opts) {
    var root = $("#modal-root");
    var prevFocus = document.activeElement;
    var titleId = "modal-title-" + Date.now();
    var dialog;
    function close() {
      var i = modalStack.indexOf(entry);
      if (i >= 0) modalStack.splice(i, 1);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (opts.onClose) opts.onClose();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
    }
    var actions = (opts.actions || []).map(function (a) {
      return h("button", {
        class: "btn " + (a.primary ? "btn-primary" : "btn-secondary"), type: "button", disabled: a.disabled,
        onclick: function () { if (a.onClick) { if (a.onClick(close) !== false && a.autoClose !== false) close(); } else close(); }
      }, a.label);
    });
    dialog = h("div", { class: "modal " + (opts.wide ? "modal-wide " : "") + (opts.className || ""), role: "dialog", "aria-modal": "true", "aria-labelledby": titleId }, [
      h("div", { class: "modal-head" }, [
        h("h2", { id: titleId, class: "modal-title" }, opts.title || ""),
        opts.dismissible !== false ? h("button", { class: "icon-btn modal-close", type: "button", "aria-label": GT.i18n.t("ui.close"), title: GT.i18n.t("ui.close"), onclick: close }, "✕") : null
      ]),
      h("div", { class: "modal-body" }, opts.body || null),
      actions.length ? h("div", { class: "modal-actions" }, actions) : null
    ]);
    var overlay = h("div", { class: "modal-overlay" }, dialog);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay && opts.dismissible !== false) close(); });
    var entry = { close: close, dismissible: opts.dismissible !== false, dialog: dialog };
    modalStack.push(entry);
    root.appendChild(overlay);
    var focusable = dialog.querySelector(".modal-body button:not([disabled]), .modal-actions .btn-primary:not([disabled]), .modal-actions button:not([disabled]), .modal-close");
    if (focusable) focusable.focus();
    return entry;
  }

  function closeTopModal() {
    var top = modalStack[modalStack.length - 1];
    if (top && top.dismissible) { top.close(); return true; }
    return false;
  }

  function closeAllModals() {
    while (modalStack.length) modalStack[modalStack.length - 1].close();
  }

  function hasModal() { return modalStack.length > 0; }

  // Pułapka focusu w modalu (Tab nie wychodzi poza okno)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (closeTopModal()) e.preventDefault(); return; }
    if (e.key !== "Tab" || !modalStack.length) return;
    var dlg = modalStack[modalStack.length - 1].dialog;
    var items = Array.prototype.slice.call(dlg.querySelectorAll("button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    else if (!dlg.contains(document.activeElement)) { first.focus(); e.preventDefault(); }
  });

  // ---------- Toast ----------
  function toast(text, tone) {
    var root = $("#toast-root");
    var el = h("div", { class: "toast toast-" + (tone || "neutral"), role: "status" }, [
      h("span", { class: "toast-icon", "aria-hidden": "true" }, tone === "bad" ? "⚠️" : tone === "good" ? "✅" : "ℹ️"),
      h("span", null, text)
    ]);
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    setTimeout(function () { el.classList.add("toast-hide"); }, 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3700);
  }

  // ---------- Dźwięki (WebAudio, bez plików — działa offline) ----------
  var audioCtx = null;
  var SOUNDS = {
    click: [[660, 0.05]], build: [[523, 0.08], [784, 0.12]], turn: [[392, 0.08], [523, 0.08], [659, 0.14]],
    event: [[330, 0.12], [262, 0.18]], error: [[200, 0.15]], end: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.25]]
  };
  function sound(name) {
    if (!GT.app || !GT.app.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      (SOUNDS[name] || SOUNDS.click).forEach(function (n) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + n[1]);
        t += n[1] * 0.9;
      });
    } catch (e) { /* brak audio */ }
  }

  GT.dom = { h: h, svg: svg, $: $, clear: clear, append: append, openModal: openModal, closeTopModal: closeTopModal, closeAllModals: closeAllModals, hasModal: hasModal, toast: toast, sound: sound };
})(window.GT = window.GT || {});
