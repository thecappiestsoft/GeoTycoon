/*
 * buildings.js — walidacja wymagań, budowa, rozbiórka i koszty budynków.
 * Każda akcja zwraca { ok, data } lub { ok:false, code, params }.
 */
(function (GT) {
  var U = GT.util, S = GT.state;

  function balance() { return GT.DATA.balance; }

  /** Lista niespełnionych wymagań geograficznych (pusta = OK). */
  function unmetRequirements(state, region, def) {
    var out = [];
    (def.requirements || []).forEach(function (req) {
      switch (req.type) {
        case "attrMin":
          if ((region[req.attr] || 0) < req.value)
            out.push({ code: "REQ_ATTR", params: { attr: req.attr, value: req.value, actual: region[req.attr] || 0 } });
          break;
        case "flag":
          if (!region[req.attr]) out.push({ code: "REQ_FLAG", params: { attr: req.attr } });
          break;
        case "notDesertOrIrrigated":
          if (region.terrainType === "desert" && !region.irrigated) out.push({ code: "REQ_NOT_DESERT", params: {} });
          break;
        case "regionPopMin":
          var pop = S.regionPopulation(state, region);
          if (pop < req.value) out.push({ code: "REQ_POP", params: { value: req.value, actual: pop } });
          break;
        case "urbanOrPollution":
          if (region.urbanization < req.urbanization && region.pollution < req.pollution)
            out.push({ code: "REQ_URBAN_OR_POLLUTION", params: { urbanization: req.urbanization, pollution: req.pollution } });
          break;
      }
    });
    return out;
  }

  /** Koszt budowy z uwzględnieniem modyfikatorów (np. dotacja na elektrownie). */
  function buildCost(state, def) {
    var cost = def.cost;
    if (def.category === "energy") cost *= S.modifierFactor(state, "energyCost", null);
    return Math.round(cost);
  }

  /**
   * Sprawdza, czy można zbudować. opts: { ignoreCost, ignoreTurnLimit, costOverride }
   */
  function canBuild(state, regionId, typeId, opts) {
    opts = opts || {};
    if (state.status !== "playing") return U.fail("GAME_OVER");
    var region = S.getRegion(state, regionId);
    if (!region) return U.fail("UNKNOWN_REGION");
    var def = S.buildingDef(typeId);
    if (!def) return U.fail("UNKNOWN_BUILDING");
    var B = balance();
    if (region.buildings.length >= B.maxBuildingsPerRegion)
      return U.fail("REGION_FULL", { max: B.maxBuildingsPerRegion });
    var sameType = region.buildings.filter(function (b) { return b.buildingTypeId === typeId; }).length;
    if (sameType >= def.maxPerRegion) return U.fail("TYPE_LIMIT", { max: def.maxPerRegion });
    var unmet = unmetRequirements(state, region, def);
    if (unmet.length) return U.fail(unmet[0].code, unmet[0].params);
    if (!opts.ignoreTurnLimit && state.investmentsThisTurn >= B.maxInvestmentsPerTurn)
      return U.fail("TURN_LIMIT", { max: B.maxInvestmentsPerTurn });
    var cost = typeof opts.costOverride === "number" ? opts.costOverride : buildCost(state, def);
    if (!opts.ignoreCost && state.resources.budget < cost)
      return U.fail("NO_BUDGET", { cost: cost, budget: state.resources.budget });
    return U.ok({ cost: cost });
  }

  /** Buduje budynek: pobiera koszt natychmiast; budynek działa od następnej tury. */
  function build(state, regionId, typeId, opts) {
    opts = opts || {};
    var check = canBuild(state, regionId, typeId, opts);
    if (!check.ok) return check;
    var region = S.getRegion(state, regionId);
    var cost = opts.ignoreCost ? 0 : check.data.cost;
    state.resources.budget -= cost;
    var b = S.newBuilding(state, typeId, regionId, state.turn);
    region.buildings.push(b);
    if (!opts.ignoreTurnLimit) state.investmentsThisTurn += 1;
    state.stats.buildingsBuilt += 1;
    state.updatedAt = new Date().toISOString();
    return U.ok({ building: b, cost: cost });
  }

  /** Rozbiórka — bez zwrotu kosztów. */
  function demolish(state, regionId, buildingId) {
    if (state.status !== "playing") return U.fail("GAME_OVER");
    var region = S.getRegion(state, regionId);
    if (!region) return U.fail("UNKNOWN_REGION");
    var idx = -1;
    region.buildings.forEach(function (b, i) { if (b.id === buildingId) idx = i; });
    if (idx < 0) return U.fail("UNKNOWN_BUILDING");
    var removed = region.buildings.splice(idx, 1)[0];
    return U.ok({ building: removed });
  }

  /** Podgląd efektu budynku w danym regionie (do kart w UI). */
  function preview(state, regionId, typeId) {
    var region = S.getRegion(state, regionId);
    var def = S.buildingDef(typeId);
    if (!region || !def) return null;
    var out = GT.economy.rawOutput(state, region, def);
    return {
      food: out.food, energy: out.energy, income: out.income,
      energyUse: def.energyUse || 0,
      maintenance: def.maintenance,
      perTurn: def.perTurn || {},
      cost: buildCost(state, def)
    };
  }

  GT.buildings = {
    unmetRequirements: unmetRequirements,
    buildCost: buildCost,
    canBuild: canBuild,
    build: build,
    demolish: demolish,
    preview: preview
  };
})(window.GT = window.GT || {});
