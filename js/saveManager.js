/*
 * saveManager.js — zapis/odczyt w localStorage, kopia zapasowa, walidacja, eksport/import JSON.
 * Klucz: geotycoon.save.v1 (+ .backup). Uszkodzony zapis nie jest nadpisywany automatycznie.
 */
(function (GT) {
  var U = GT.util;
  var SAVE_KEY = "geotycoon.save.v1";
  var BACKUP_KEY = "geotycoon.save.v1.backup";
  var SETTINGS_KEY = "geotycoon.settings";

  // Magazyn można podmienić w testach (np. obiekt w pamięci).
  var storage = null;
  function store() {
    if (storage) return storage;
    try { if (typeof localStorage !== "undefined") return localStorage; } catch (e) { /* brak dostępu */ }
    var mem = {};
    storage = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
    return storage;
  }
  function setStorage(s) { storage = s; }

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  /** Walidacja struktury GameState. Zwraca { ok } lub { ok:false, code, params }. */
  function validateState(s) {
    if (!U.isObj(s)) return U.fail("SAVE_INVALID", { field: "gameState" });
    if (s.schemaVersion !== GT.state.SCHEMA_VERSION)
      return U.fail("SAVE_VERSION", { version: s.schemaVersion });
    var required = ["gameId", "scenarioId", "turn", "maxTurns", "seed", "resources", "regions", "eventHistory", "status"];
    for (var i = 0; i < required.length; i++)
      if (s[required[i]] === undefined) return U.fail("SAVE_INVALID", { field: required[i] });
    if (!GT.state.scenarioById(s.scenarioId)) return U.fail("SAVE_INVALID", { field: "scenarioId" });
    if (!isNum(s.turn) || !isNum(s.maxTurns) || s.turn < 1 || s.turn > s.maxTurns + 1)
      return U.fail("SAVE_INVALID", { field: "turn" });
    if (s.status !== "playing" && s.status !== "finished") return U.fail("SAVE_INVALID", { field: "status" });
    var r = s.resources;
    if (!U.isObj(r)) return U.fail("SAVE_INVALID", { field: "resources" });
    var keys = GT.state.RESOURCE_KEYS;
    for (var k = 0; k < keys.length; k++) if (!isNum(r[keys[k]])) return U.fail("SAVE_INVALID", { field: "resources." + keys[k] });
    var ranged = ["satisfaction", "environment", "technology"];
    for (var j = 0; j < ranged.length; j++)
      if (r[ranged[j]] < 0 || r[ranged[j]] > 100) return U.fail("SAVE_INVALID", { field: "resources." + ranged[j] });
    if (r.food < 0 || r.energy < 0 || r.population < 0) return U.fail("SAVE_INVALID", { field: "resources" });
    if (!Array.isArray(s.regions) || s.regions.length !== GT.DATA.regions.length)
      return U.fail("SAVE_INVALID", { field: "regions" });
    for (var x = 0; x < s.regions.length; x++) {
      var reg = s.regions[x];
      if (!U.isObj(reg) || !GT.state.regionTemplate(reg.id) || !Array.isArray(reg.buildings))
        return U.fail("SAVE_INVALID", { field: "regions[" + x + "]" });
      var nums = GT.state.REGION_NUMERIC;
      for (var n = 0; n < nums.length; n++)
        if (!isNum(reg[nums[n]]) || reg[nums[n]] < 0 || reg[nums[n]] > 100)
          return U.fail("SAVE_INVALID", { field: reg.id + "." + nums[n] });
      for (var b = 0; b < reg.buildings.length; b++) {
        var bi = reg.buildings[b];
        if (!U.isObj(bi) || !GT.state.buildingDef(bi.buildingTypeId) || typeof bi.id !== "string")
          return U.fail("SAVE_INVALID", { field: reg.id + ".buildings" });
      }
    }
    if (s.activeEvent && !GT.state.eventDef(s.activeEvent.eventId)) return U.fail("SAVE_INVALID", { field: "activeEvent" });
    return U.ok();
  }

  /** Uzupełnia pola opcjonalne (zgodność wstecz w ramach schemaVersion 1). */
  function normalize(s) {
    s.modifiers = Array.isArray(s.modifiers) ? s.modifiers : [];
    s.eventCooldowns = U.isObj(s.eventCooldowns) ? s.eventCooldowns : {};
    s.flags = U.isObj(s.flags) ? s.flags : { energyShortage: false, foodShortage: false, budgetCrisis: false };
    s.stats = U.isObj(s.stats) ? s.stats : {};
    ["foodShortageTurns", "energyShortageTurns", "budgetCrisisTurns", "resiliencePoints", "eventsHandled", "lastNet", "buildingsBuilt"]
      .forEach(function (k) { if (!isNum(s.stats[k])) s.stats[k] = 0; });
    if (!isNum(s.stats.startPopulation)) s.stats.startPopulation = s.resources.population;
    s.pendingMessages = Array.isArray(s.pendingMessages) ? s.pendingMessages : [];
    s.history = Array.isArray(s.history) ? s.history : [];
    s.investmentsThisTurn = isNum(s.investmentsThisTurn) ? s.investmentsThisTurn : 0;
    s.rngState = isNum(s.rngState) ? s.rngState >>> 0 : s.seed >>> 0;
    s.lessonGoalId = s.lessonGoalId || "none";
    if (!isNum(s.nextBuildingId)) {
      var max = 0;
      s.regions.forEach(function (r) { r.buildings.forEach(function (b) { var n = parseInt(String(b.id).slice(1), 10); if (n > max) max = n; }); });
      s.nextBuildingId = max + 1;
    }
    return s;
  }

  function wrap(state) {
    return JSON.stringify({ schemaVersion: GT.state.SCHEMA_VERSION, timestamp: new Date().toISOString(), gameState: state });
  }

  /** Parsuje tekst zapisu i waliduje. */
  function parse(text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return U.fail("SAVE_CORRUPT"); }
    if (!U.isObj(obj) || !U.isObj(obj.gameState)) return U.fail("SAVE_CORRUPT");
    if (obj.schemaVersion !== GT.state.SCHEMA_VERSION) return U.fail("SAVE_VERSION", { version: obj.schemaVersion });
    var v = validateState(obj.gameState);
    if (!v.ok) return v;
    return U.ok({ state: normalize(obj.gameState), timestamp: obj.timestamp || null });
  }

  /** Autosave: poprzedni poprawny zapis trafia do kopii zapasowej. */
  function save(state) {
    try {
      var s = store();
      var prev = s.getItem(SAVE_KEY);
      if (prev && parse(prev).ok) s.setItem(BACKUP_KEY, prev);
      s.setItem(SAVE_KEY, wrap(state));
      return U.ok();
    } catch (e) {
      return U.fail("SAVE_FAILED");
    }
  }

  function load() {
    var raw;
    try { raw = store().getItem(SAVE_KEY); } catch (e) { return U.fail("SAVE_FAILED"); }
    if (!raw) return U.fail("NO_SAVE");
    return parse(raw);
  }

  function loadBackup() {
    var raw = store().getItem(BACKUP_KEY);
    if (!raw) return U.fail("NO_SAVE");
    return parse(raw);
  }

  /** Stan zapisu dla menu: none | valid | corrupt. */
  function saveStatus() {
    var res = load();
    if (res.ok) return { status: "valid", state: res.data.state, timestamp: res.data.timestamp };
    if (res.code === "NO_SAVE") return { status: "none" };
    return { status: "corrupt", error: res };
  }

  function clearSave() {
    store().removeItem(SAVE_KEY);
  }

  function exportJSON(state) { return wrap(state); }
  function importJSON(text) { return parse(text); }

  function loadSettings(defaults) {
    var out = U.deepClone(defaults);
    try {
      var raw = store().getItem(SETTINGS_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (U.isObj(obj)) Object.keys(defaults).forEach(function (k) {
          if (typeof obj[k] === typeof defaults[k]) out[k] = obj[k];
        });
      }
    } catch (e) { /* ustawienia domyślne */ }
    return out;
  }

  function saveSettings(settings) {
    try { store().setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignoruj */ }
  }

  GT.saveManager = {
    SAVE_KEY: SAVE_KEY, BACKUP_KEY: BACKUP_KEY,
    setStorage: setStorage, validateState: validateState, parse: parse,
    save: save, load: load, loadBackup: loadBackup, saveStatus: saveStatus, clearSave: clearSave,
    exportJSON: exportJSON, importJSON: importJSON, loadSettings: loadSettings, saveSettings: saveSettings
  };
})(window.GT = window.GT || {});
