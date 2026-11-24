/*
 * gameLoop.js — zakończenie tury w ustalonej kolejności (spec. rozdz. 14.1).
 * Zwraca raport tury (różnice zasobów + komunikaty) — UI tylko go wyświetla.
 */
(function (GT) {
  var U = GT.util, S = GT.state, E = GT.economy;

  function endTurn(state, opts) {
    opts = opts || {};
    if (state.status !== "playing") return U.fail("GAME_OVER");
    if (state.activeEvent) return U.fail("EVENT_PENDING");

    var before = U.deepClone(state.resources);
    var processedTurn = state.turn;
    var report = { turn: processedTurn, deltas: {}, messages: [], deficits: { food: 0, energy: 0 }, event: null, breakdown: null };

    // Decyzje z poprzednich wydarzeń — widoczne w podsumowaniu
    report.messages = report.messages.concat(state.pendingMessages);
    state.pendingMessages = [];

    // Budynki zbudowane w tej turze zaczną działać po jej zakończeniu
    var newlyBuilt = S.countBuildings(state, function (b) { return b.builtAtTurn === processedTurn; });

    // 2–3. produkcja z modyfikatorami geograficznymi i wydarzeń
    var prod = E.calculateProduction(state);
    // 4–5. konsumpcja
    var cons = E.calculateConsumption(state);
    // 6. dochody i koszty
    var costs = E.calculateMaintenance(state);
    // 7–8. magazyny i niedobory
    E.settleResources(state, prod, cons, costs, report);
    // 9. ludność, zadowolenie, środowisko
    E.updatePopulation(state, report);
    E.updateSatisfaction(state, prod, report);
    E.updateEnvironment(state, prod, report);
    E.sanitize(state);
    if (newlyBuilt > 0) report.messages.push({ key: "msg.newBuildings", params: { n: newlyBuilt }, tone: "good" });

    // 1. zwiększ numer tury (nowe budynki działają od następnej tury)
    state.turn += 1;
    state.investmentsThisTurn = 0;
    GT.events.tickModifiers(state, report);

    // 10. wydarzenie (najwyżej jedno na turę) — nie losujemy po ostatniej turze
    if (state.turn <= state.maxTurns) GT.events.maybeTriggerEvent(state, report, opts.forceEventId || null);
    E.sanitize(state);

    // 11. stan, log, historia
    S.RESOURCE_KEYS.forEach(function (k) { report.deltas[k] = state.resources[k] - before[k]; });
    state.history.push(S.snapshot(state, processedTurn));
    state.lastReport = report;
    state.updatedAt = new Date().toISOString();

    // 12. koniec gry
    if (state.turn > state.maxTurns) finishGame(state);
    return U.ok(report);
  }

  function finishGame(state) {
    state.status = "finished";
    state.activeEvent = null;
    state.finalScore = GT.scoring.computeScore(state);
    return state.finalScore;
  }

  /**
   * Prognoza zmian na koniec bieżącej tury (bez wydarzeń) — dla podpowiedzi w UI.
   * Działa na kopii stanu, więc niczego nie zmienia.
   */
  function forecast(state) {
    var s = U.deepClone(state);
    var report = { messages: [], deficits: { food: 0, energy: 0 } };
    var prod = E.calculateProduction(s), cons = E.calculateConsumption(s), costs = E.calculateMaintenance(s);
    E.settleResources(s, prod, cons, costs, report);
    var out = {};
    S.RESOURCE_KEYS.forEach(function (k) { out[k] = s.resources[k] - state.resources[k]; });
    out.foodShortage = report.deficits.food > 0;
    out.energyShortage = report.deficits.energy > 0;
    out.budgetCrisis = s.resources.budget < 0;
    return out;
  }

  GT.gameLoop = { endTurn: endTurn, finishGame: finishGame, forecast: forecast };
})(window.GT = window.GT || {});
