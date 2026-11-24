/*
 * state.js — tworzenie stanu gry (GameState) ze scenariusza i funkcje odczytu.
 * Scenariusz jest szablonem: GameState zawiera głęboką kopię danych.
 * Brak zależności od DOM.
 */
(function (GT) {
  var U = GT.util;
  var SCHEMA_VERSION = 1;
  var REGION_NUMERIC = ["fertility", "waterAvailability", "sunlight", "windPotential", "mineralRichness",
    "terrainDifficulty", "tourismPotential", "urbanization", "pollution"];
  var RESOURCE_KEYS = ["budget", "food", "energy", "population", "satisfaction", "environment", "technology"];

  function scenarioById(id) {
    return GT.DATA.scenarios.filter(function (s) { return s.id === id; })[0] || null;
  }

  function buildingDef(id) {
    return GT.DATA.buildings.filter(function (b) { return b.id === id; })[0] || null;
  }

  function eventDef(id) {
    return GT.DATA.events.filter(function (e) { return e.id === id; })[0] || null;
  }

  function regionTemplate(id) {
    return GT.DATA.regions.filter(function (r) { return r.id === id; })[0] || null;
  }

  function buildRegion(tpl, mods) {
    var r = {
      id: tpl.id, col: tpl.col, row: tpl.row,
      terrainType: tpl.terrainType, climate: tpl.climate,
      coastal: !!tpl.coastal, river: !!tpl.river, forest: !!tpl.forest,
      irrigated: false, floodProtected: false, stormProtected: false, slopeProtected: false,
      buildings: []
    };
    REGION_NUMERIC.forEach(function (k) { r[k] = tpl[k]; });
    var all = (mods && mods.all) || {};
    Object.keys(all).forEach(function (k) { r[k] = (r[k] || 0) + all[k]; });
    var byId = (mods && mods.byId && mods.byId[tpl.id]) || null;
    if (byId) {
      if (byId.set) Object.keys(byId.set).forEach(function (k) { r[k] = byId.set[k]; });
      if (byId.delta) Object.keys(byId.delta).forEach(function (k) { r[k] = (r[k] || 0) + byId.delta[k]; });
    }
    REGION_NUMERIC.forEach(function (k) { r[k] = U.clamp(Math.round(r[k]), 0, 100); });
    return r;
  }

  /**
   * Tworzy nową grę. options: { maxTurns, lessonGoalId, seed }
   */
  function createGame(scenarioId, options) {
    options = options || {};
    var sc = scenarioById(scenarioId);
    if (!sc) return U.fail("UNKNOWN_SCENARIO");
    var seed = typeof options.seed === "number" ? options.seed >>> 0 : GT.random.newSeed();
    var now = new Date().toISOString();
    var lesson = GT.DATA.lessonGoals.filter(function (g) { return g.id === options.lessonGoalId; })[0];
    var state = {
      schemaVersion: SCHEMA_VERSION,
      gameId: "g" + seed.toString(36) + Date.now().toString(36),
      scenarioId: sc.id,
      lessonGoalId: lesson ? lesson.id : "none",
      turn: 1,
      maxTurns: options.maxTurns || 15,
      seed: seed,
      rngState: seed,
      resources: U.deepClone(sc.start),
      regions: GT.DATA.regions.map(function (tpl) { return buildRegion(tpl, sc.regionModifiers); }),
      modifiers: [],
      eventHistory: [],
      eventCooldowns: {},
      activeEvent: null,
      selectedRegionId: null,
      investmentsThisTurn: 0,
      flags: { energyShortage: false, foodShortage: false, budgetCrisis: false },
      stats: { foodShortageTurns: 0, energyShortageTurns: 0, budgetCrisisTurns: 0, resiliencePoints: 0,
               eventsHandled: 0, lastNet: 0, startPopulation: sc.start.population, buildingsBuilt: 0 },
      pendingMessages: [],
      lastReport: null,
      history: [],
      status: "playing",
      createdAt: now,
      updatedAt: now,
      nextBuildingId: 1
    };
    (sc.startBuildings || []).forEach(function (sb) {
      var reg = getRegion(state, sb.regionId);
      if (reg) reg.buildings.push(newBuilding(state, sb.buildingTypeId, reg.id, 0));
    });
    state.history.push(snapshot(state, 0));
    return U.ok(state);
  }

  function newBuilding(state, typeId, regionId, turn) {
    var id = "b" + state.nextBuildingId++;
    return { id: id, buildingTypeId: typeId, regionId: regionId, builtAtTurn: turn, level: 1, active: true };
  }

  function snapshot(state, turn) {
    var s = { turn: turn };
    RESOURCE_KEYS.forEach(function (k) { s[k] = state.resources[k]; });
    s.buildings = countBuildings(state);
    return s;
  }

  function getRegion(state, id) {
    for (var i = 0; i < state.regions.length; i++) if (state.regions[i].id === id) return state.regions[i];
    return null;
  }

  function countBuildings(state, filterFn) {
    var n = 0;
    state.regions.forEach(function (r) {
      r.buildings.forEach(function (b) { if (!filterFn || filterFn(b, r)) n++; });
    });
    return n;
  }

  /** Budynek działa od tury następującej po turze budowy. */
  function isOperational(state, b) {
    return b.active && b.builtAtTurn < state.turn;
  }

  /** Szacowana ludność regionu: populacja kraju rozdzielona proporcjonalnie do urbanizacji. */
  function regionPopulation(state, region) {
    var total = 0;
    state.regions.forEach(function (r) { total += Math.max(1, r.urbanization); });
    return Math.round(state.resources.population * Math.max(1, region.urbanization) / total);
  }

  function selectRegion(state, id) {
    if (id !== null && !getRegion(state, id)) return U.fail("UNKNOWN_REGION");
    state.selectedRegionId = id;
    return U.ok();
  }

  /** Iloczyn czynników modyfikatorów danego rodzaju (dla regionu lub globalnie). */
  function modifierFactor(state, kind, regionId) {
    var f = 1;
    state.modifiers.forEach(function (m) {
      if (m.kind !== kind || typeof m.factor !== "number") return;
      if (m.scope === "global" || m.regionId === regionId) f *= m.factor;
    });
    return f;
  }

  function modifierDelta(state, kind) {
    var d = 0;
    state.modifiers.forEach(function (m) { if (m.kind === kind && typeof m.delta === "number") d += m.delta; });
    return d;
  }

  GT.state = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    RESOURCE_KEYS: RESOURCE_KEYS,
    REGION_NUMERIC: REGION_NUMERIC,
    createGame: createGame,
    scenarioById: scenarioById,
    buildingDef: buildingDef,
    eventDef: eventDef,
    regionTemplate: regionTemplate,
    getRegion: getRegion,
    countBuildings: countBuildings,
    isOperational: isOperational,
    regionPopulation: regionPopulation,
    selectRegion: selectRegion,
    modifierFactor: modifierFactor,
    modifierDelta: modifierDelta,
    newBuilding: newBuilding,
    snapshot: snapshot
  };
})(window.GT = window.GT || {});
