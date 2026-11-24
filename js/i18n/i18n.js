/*
 * i18n.js — prosty system tłumaczeń PL / EN.
 * Słowniki: js/i18n/pl.js, js/i18n/en.js (GT.I18N.pl / GT.I18N.en).
 * Teksty danych (regiony, budynki, wydarzenia) są w obiektach { pl, en } → GT.i18n.tx().
 * W HTML: data-i18n="klucz" (textContent), data-i18n-attr="aria-label:klucz;title:klucz2".
 */
(function (GT) {
  GT.I18N = GT.I18N || {};
  var SUPPORTED = ["pl", "en"];
  var lang = "pl";

  function lookup(dict, key) {
    if (!dict) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    return undefined;
  }

  /** Tłumaczy klucz; {param} zastępowane wartościami z params. */
  function t(key, params) {
    var s = lookup(GT.I18N[lang], key);
    if (s === undefined) s = lookup(GT.I18N.pl, key);
    if (s === undefined) return key;
    if (typeof s === "function") return s(params || {});
    return String(s).replace(/\{(\w+)\}/g, function (m, p) {
      return params && params[p] !== undefined ? params[p] : m;
    });
  }

  /** Tekst z obiektu danych { pl, en }. */
  function tx(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.pl || "";
  }

  function has(key) { return lookup(GT.I18N[lang], key) !== undefined || lookup(GT.I18N.pl, key) !== undefined; }

  function num(n) {
    if (typeof n !== "number" || !isFinite(n)) return "–";
    try { return n.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB"); } catch (e) { return String(n); }
  }

  function signed(n) {
    if (n > 0) return "+" + num(n);
    if (n < 0) return "−" + num(Math.abs(n));
    return "0";
  }

  function setLang(l) {
    if (SUPPORTED.indexOf(l) >= 0) lang = l;
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      applyStatic(document);
    }
  }

  function getLang() { return lang; }

  /** Tłumaczy statyczne elementy HTML oznaczone atrybutami data-i18n. */
  function applyStatic(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
  }

  GT.i18n = { SUPPORTED: SUPPORTED, t: t, tx: tx, has: has, num: num, signed: signed, setLang: setLang, getLang: getLang, applyStatic: applyStatic };
})(window.GT = window.GT || {});
