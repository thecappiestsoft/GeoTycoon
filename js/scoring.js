/*
 * scoring.js — ocena końcowa państwa w 5 wymiarach (0–100) i sprawdzanie celów scenariusza.
 */
(function (GT) {
  var U = GT.util, S = GT.state;
  var DIMENSIONS = ["economy", "welfare", "infrastructure", "environment", "resilience"];

  function ratio(v, target) { return U.clamp(v / target, 0, 1); }

  function dimensions(state) {
    var cfg = GT.DATA.balance.scoring, r = state.resources, st = state.stats;
    var turnsPlayed = Math.max(1, Math.min(state.turn - 1, state.maxTurns) || 1);

    var economy = ratio(r.budget, cfg.economyBudgetTarget) * 50 + ratio(st.lastNet, cfg.economyIncomeTarget) * 50;

    var growth = st.startPopulation > 0 ? r.population / st.startPopulation - 1 : 0;
    var welfare = r.satisfaction * 0.6 + (1 - U.clamp(st.foodShortageTurns / turnsPlayed, 0, 1)) * 25 +
      ratio(growth, cfg.populationGrowthTarget) * 15;

    var types = {}, total = 0, protections = 0, energyTypes = {};
    state.regions.forEach(function (reg) {
      ["irrigated", "floodProtected", "stormProtected", "slopeProtected"].forEach(function (f) { if (reg[f]) protections++; });
      reg.buildings.forEach(function (b) {
        total++;
        types[b.buildingTypeId] = true;
        var d = S.buildingDef(b.buildingTypeId);
        if (d && d.category === "energy") energyTypes[d.id] = true;
      });
    });
    var infrastructure = ratio(total, cfg.infrastructureBuildingsTarget) * 70 +
      ratio(Object.keys(types).length, GT.DATA.buildings.length) * 30;

    var avgPollution = state.regions.reduce(function (s, x) { return s + x.pollution; }, 0) / state.regions.length;
    var environment = r.environment * 0.8 + (100 - avgPollution) * 0.2;

    var crisisTurns = st.foodShortageTurns + st.energyShortageTurns + st.budgetCrisisTurns;
    var resilience = 45 + st.resiliencePoints * 4 + Object.keys(energyTypes).length * 5 + protections * 3 - crisisTurns * 6;

    var dims = { economy: economy, welfare: welfare, infrastructure: infrastructure, environment: environment, resilience: resilience };
    DIMENSIONS.forEach(function (k) { dims[k] = Math.round(U.clamp(dims[k], 0, 100)); });
    return dims;
  }

  function ratingFor(score) {
    var ratings = GT.DATA.balance.scoring.ratings;
    for (var i = 0; i < ratings.length; i++) if (score >= ratings[i].min) return ratings[i].id;
    return ratings[ratings.length - 1].id;
  }

  function evaluateGoal(state, goal, dims, total) {
    var actual, met;
    switch (goal.type) {
      case "score": actual = total; met = total >= goal.min; break;
      case "resource": actual = state.resources[goal.key]; met = actual >= goal.min; break;
      case "dimension": actual = dims[goal.key]; met = actual >= goal.min; break;
      case "maxShortageTurns":
        actual = state.stats[goal.kind + "ShortageTurns"] || 0; met = actual <= goal.max; break;
      case "buildingCount":
        actual = S.countBuildings(state, function (b) { return b.buildingTypeId === goal.building; });
        met = actual >= goal.min; break;
      default: actual = null; met = false;
    }
    return { goal: goal, actual: actual, met: met };
  }

  function allGoals(state) {
    var sc = S.scenarioById(state.scenarioId);
    var lesson = GT.DATA.lessonGoals.filter(function (g) { return g.id === state.lessonGoalId; })[0];
    return ((sc && sc.goals) || []).concat((lesson && lesson.goals) || []);
  }

  function computeScore(state) {
    var dims = dimensions(state);
    var w = GT.DATA.balance.scoring.weights, sumW = 0, total = 0;
    DIMENSIONS.forEach(function (k) { total += dims[k] * w[k]; sumW += w[k]; });
    total = Math.round(total / sumW);
    var sorted = DIMENSIONS.slice().sort(function (a, b) { return dims[b] - dims[a]; });
    return {
      dims: dims,
      total: total,
      rating: ratingFor(total),
      goals: allGoals(state).map(function (g) { return evaluateGoal(state, g, dims, total); }),
      best: sorted.slice(0, 2),
      worst: sorted.slice(-2).reverse()
    };
  }

  GT.scoring = { DIMENSIONS: DIMENSIONS, dimensions: dimensions, computeScore: computeScore, ratingFor: ratingFor, allGoals: allGoals, evaluateGoal: evaluateGoal };
})(window.GT = window.GT || {});
