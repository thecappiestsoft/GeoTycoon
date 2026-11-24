/*
 * economy.js — produkcja, konsumpcja, dochody, utrzymanie, niedobory,
 * ludność, zadowolenie i środowisko. Bez zależności od DOM.
 *
 * Funkcje zapisują komunikaty do raportu tury jako { key, params, tone },
 * żeby UI mogło je wyświetlić w aktualnym języku.
 */
(function (GT) {
  var U = GT.util, S = GT.state;

  function B() { return GT.DATA.balance; }

  function techMultiplier(state) {
    return 1 + state.resources.technology * B().techProductionBonus;
  }

  /** Bazowa wydajność budynku w regionie (geografia + technologia, bez wydarzeń). */
  function rawOutput(state, region, def) {
    var out = { food: 0, energy: 0, income: 0 };
    var tech = techMultiplier(state);
    Object.keys(def.produces || {}).forEach(function (k) {
      var p = def.produces[k];
      var v = p.base;
      (p.scale || []).forEach(function (attr) { v *= (region[attr] || 0) / 100; });
      if (k === "food") v *= 1 - (region.pollution / 100) * B().environment.pollutionFarmPenalty;
      out[k] = v * tech;
    });
    out.food = Math.round(out.food);
    out.energy = Math.round(out.energy);
    out.income = Math.round(out.income);
    return out;
  }

  /** Wydajność z modyfikatorami wydarzeń (powódź, susza, sztorm, regulacje...). */
  function effectiveOutput(state, region, def) {
    var out = rawOutput(state, region, def);
    var regionF = S.modifierFactor(state, "regionOutput", region.id);
    out.food *= regionF * S.modifierFactor(state, "farmOutput", region.id);
    out.energy *= regionF;
    out.income *= regionF;
    if (def.category === "trade") out.income *= S.modifierFactor(state, "tradeOutput", region.id);
    if (def.category === "industry") out.income *= S.modifierFactor(state, "industryIncome", region.id);
    return out;
  }

  /** Krok 2–3: produkcja budynków. */
  function calculateProduction(state) {
    var p = { food: 0, energy: 0, industryIncome: 0, otherIncome: 0, tech: 0, satisfaction: 0,
              env: 0, active: 0, byType: {} };
    state.regions.forEach(function (region) {
      region.buildings.forEach(function (b) {
        if (!S.isOperational(state, b)) return;
        var def = S.buildingDef(b.buildingTypeId);
        if (!def) return;
        p.active++;
        var o = effectiveOutput(state, region, def);
        p.food += o.food;
        p.energy += o.energy;
        if (def.category === "industry") p.industryIncome += o.income; else p.otherIncome += o.income;
        var t = def.perTurn || {};
        p.tech += t.technology || 0;
        p.satisfaction += t.satisfaction || 0;
        p.env += t.env || 0;
        p.byType[def.id] = (p.byType[def.id] || 0) + 1;
      });
    });
    p.food = Math.round(p.food);
    p.energy = Math.round(p.energy);
    return p;
  }

  /** Krok 4–5: konsumpcja żywności i energii. */
  function calculateConsumption(state) {
    var pop = state.resources.population;
    var energyUse = pop / 1000 * B().energyPerThousand;
    state.regions.forEach(function (region) {
      region.buildings.forEach(function (b) {
        if (!S.isOperational(state, b)) return;
        var def = S.buildingDef(b.buildingTypeId);
        if (def) energyUse += def.energyUse || 0;
      });
    });
    energyUse *= S.modifierFactor(state, "energyUse", null);
    return { food: Math.round(pop / 1000 * B().foodPerThousand), energy: Math.round(energyUse) };
  }

  /** Krok 6: podatki, utrzymanie i administracja. */
  function calculateMaintenance(state) {
    var upkeep = 0, n = 0;
    state.regions.forEach(function (region) {
      region.buildings.forEach(function (b) {
        n++;
        if (!S.isOperational(state, b)) return;
        var def = S.buildingDef(b.buildingTypeId);
        if (def) upkeep += def.maintenance;
      });
    });
    var admin = B().adminBaseCost + B().adminCostPerBuilding * n;
    var taxes = state.resources.population * B().taxPerCitizen *
      (B().taxSatisfactionFactor + state.resources.satisfaction / 100);
    return { upkeep: Math.round(upkeep), admin: Math.round(admin), taxes: Math.round(taxes) };
  }

  /**
   * Kroki 7–8: aktualizacja magazynów i obsługa niedoborów.
   * Magazyny nie są ujemne — brakująca ilość trafia do deficytu.
   */
  function settleResources(state, prod, cons, costs, report) {
    var r = state.resources;
    // Energia: przy niedoborze przemysł pracuje z ograniczoną wydajnością
    var energyAvailable = r.energy + prod.energy;
    var efficiency = 1;
    if (energyAvailable < cons.energy) {
      efficiency = cons.energy > 0 ? Math.max(0, energyAvailable) / cons.energy : 1;
      report.deficits.energy = cons.energy - energyAvailable;
      r.energy = 0;
    } else {
      r.energy = energyAvailable - cons.energy;
    }
    var industryIncome = Math.round(prod.industryIncome * efficiency);
    var income = industryIncome + Math.round(prod.otherIncome) + costs.taxes;
    var expenses = costs.upkeep + costs.admin;
    var net = income - expenses;
    r.budget += net;
    state.stats.lastNet = net;

    // Żywność
    var foodAvailable = r.food + prod.food;
    if (foodAvailable < cons.food) {
      report.deficits.food = cons.food - foodAvailable;
      r.food = 0;
    } else {
      r.food = foodAvailable - cons.food;
    }

    state.flags.energyShortage = report.deficits.energy > 0;
    state.flags.foodShortage = report.deficits.food > 0;
    state.flags.budgetCrisis = r.budget < 0;
    if (state.flags.energyShortage) state.stats.energyShortageTurns++;
    if (state.flags.foodShortage) state.stats.foodShortageTurns++;
    if (state.flags.budgetCrisis) state.stats.budgetCrisisTurns++;

    report.breakdown = {
      taxes: costs.taxes, industryIncome: industryIncome, otherIncome: Math.round(prod.otherIncome),
      upkeep: costs.upkeep, admin: costs.admin, net: net,
      foodProduced: prod.food, foodConsumed: cons.food,
      energyProduced: prod.energy, energyConsumed: cons.energy,
      efficiency: Math.round(efficiency * 100)
    };

    var m = report.messages;
    if (prod.food > 0) m.push({ key: "msg.foodProduced", params: { n: prod.food }, tone: "good" });
    m.push({ key: "msg.foodConsumed", params: { n: cons.food }, tone: "neutral" });
    if (prod.energy > 0) m.push({ key: "msg.energyProduced", params: { n: prod.energy }, tone: "good" });
    if (cons.energy > 0) m.push({ key: "msg.energyConsumed", params: { n: cons.energy }, tone: "neutral" });
    m.push({ key: "msg.taxes", params: { n: costs.taxes }, tone: "good" });
    if (prod.industryIncome > 0) m.push({ key: "msg.industryIncome", params: { n: industryIncome }, tone: "good" });
    if (prod.otherIncome > 0) m.push({ key: "msg.tradeIncome", params: { n: Math.round(prod.otherIncome) }, tone: "good" });
    m.push({ key: "msg.upkeep", params: { n: costs.upkeep + costs.admin }, tone: "neutral" });
    if (report.deficits.food > 0) m.push({ key: "msg.foodShortage", params: { n: report.deficits.food }, tone: "bad" });
    if (report.deficits.energy > 0) m.push({ key: "msg.energyShortage", params: { n: report.deficits.energy, pct: Math.round(efficiency * 100) }, tone: "bad" });
    if (state.flags.budgetCrisis) m.push({ key: "msg.budgetCrisis", params: {}, tone: "bad" });
  }

  /** Krok 9a: ludność. */
  function updatePopulation(state, report) {
    var b = B(), r = state.resources;
    var rate = b.baseGrowthRate + (r.satisfaction - 50) * b.growthSatisfactionFactor;
    if (state.flags.foodShortage) rate -= b.foodShortageGrowthPenalty;
    rate = U.clamp(rate, b.minGrowthRate, b.maxGrowthRate);
    var delta = Math.round(r.population * rate);
    r.population = Math.max(0, r.population + delta);
    if (delta > 0) report.messages.push({ key: "msg.popGrowth", params: { n: delta }, tone: "good" });
    else if (delta < 0) report.messages.push({ key: "msg.popDecline", params: { n: -delta }, tone: "bad" });
  }

  /** Krok 9b: zadowolenie (0–100). */
  function updateSatisfaction(state, prod, report) {
    var s = B().satisfaction, r = state.resources, d = 0;
    if (state.flags.foodShortage) d += s.foodShortage;
    if (state.flags.energyShortage) d += s.energyShortage;
    if (state.flags.budgetCrisis) d += s.budgetCrisis;
    if (r.environment < s.lowEnvironmentThreshold) {
      d += s.lowEnvironment;
      report.messages.push({ key: "msg.envHurtsMood", params: {}, tone: "bad" });
    } else if (r.environment >= s.highEnvironmentThreshold) d += s.highEnvironment;
    if (!state.flags.foodShortage && r.food >= report.breakdown.foodConsumed * 2 && report.breakdown.foodConsumed > 0) d += s.foodSurplus;
    if (r.satisfaction > s.expectationThreshold) d += s.expectationDrift;
    d += prod.satisfaction;
    if (prod.satisfaction > 0) report.messages.push({ key: "msg.servicesMood", params: { n: prod.satisfaction }, tone: "good" });
    r.satisfaction = U.clamp(Math.round(r.satisfaction + d), 0, 100);
  }

  /** Krok 9c: środowisko (0–100), zanieczyszczenie regionów i technologia. */
  function updateEnvironment(state, prod, report) {
    var e = B().environment, r = state.resources;
    var d = prod.env + e.naturalRecovery + S.modifierDelta(state, "envPerTurn");
    state.regions.forEach(function (region) {
      var p = -e.regionPollutionDecay;
      region.buildings.forEach(function (b) {
        if (!S.isOperational(state, b)) return;
        var def = S.buildingDef(b.buildingTypeId);
        if (def && def.perTurn && def.perTurn.pollution) p += def.perTurn.pollution;
      });
      region.pollution = U.clamp(Math.round(region.pollution + p), 0, 100);
      if (region.pollution >= e.highPollutionThreshold) d += e.highPollutionPenalty;
    });
    var before = r.environment;
    r.environment = U.clamp(Math.round(r.environment + d), 0, 100);
    if (r.environment < before) report.messages.push({ key: "msg.envWorse", params: { n: before - r.environment }, tone: "bad" });
    else if (r.environment > before) report.messages.push({ key: "msg.envBetter", params: { n: r.environment - before }, tone: "good" });
    if (prod.tech > 0) {
      r.technology = U.clamp(r.technology + prod.tech, 0, 100);
      report.messages.push({ key: "msg.techUp", params: { n: prod.tech }, tone: "good" });
    }
  }

  /** Zaokrąglenia i zabezpieczenie przed NaN/Infinity oraz złymi zakresami. */
  function sanitize(state) {
    var r = state.resources;
    r.budget = U.safeInt(r.budget, 0);
    r.food = Math.max(0, U.safeInt(r.food, 0));
    r.energy = Math.max(0, U.safeInt(r.energy, 0));
    r.population = Math.max(0, U.safeInt(r.population, 0));
    ["satisfaction", "environment", "technology"].forEach(function (k) { r[k] = U.clamp(U.safeInt(r[k], 0), 0, 100); });
  }

  GT.economy = {
    techMultiplier: techMultiplier,
    rawOutput: rawOutput,
    effectiveOutput: effectiveOutput,
    calculateProduction: calculateProduction,
    calculateConsumption: calculateConsumption,
    calculateMaintenance: calculateMaintenance,
    settleResources: settleResources,
    updatePopulation: updatePopulation,
    updateSatisfaction: updateSatisfaction,
    updateEnvironment: updateEnvironment,
    sanitize: sanitize
  };
})(window.GT = window.GT || {});
