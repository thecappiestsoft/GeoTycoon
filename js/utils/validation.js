/*
 * Pomocnicze funkcje walidacji i liczb.
 */
(function (GT) {
  function clamp(v, min, max) {
    if (typeof v !== "number" || !isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function safeInt(v, fallback) {
    if (typeof v !== "number" || !isFinite(v)) return fallback || 0;
    return Math.round(v);
  }

  function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function ok(data) {
    return { ok: true, data: data || null };
  }

  function fail(code, params) {
    return { ok: false, code: code, params: params || {} };
  }

  GT.util = { clamp: clamp, safeInt: safeInt, isObj: isObj, deepClone: deepClone, ok: ok, fail: fail };
})(window.GT = window.GT || {});
