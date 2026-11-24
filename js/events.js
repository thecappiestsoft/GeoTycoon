/*
 * events.js — warunki wydarzeń, losowanie (z ziarnem), cooldown, decyzje i efekty.
 * Bez zależności od DOM.
 */
(function (GT) {
  var U = GT.util, S = GT.state;

  // ---------- Warunki ----------
  function checkCondition(state, cond, region) {
    switch (cond.type) {
      case "region":
        if (!region) return false;
        var v = region[cond.attr] || 0;
        if (typeof cond.min === "number" && v < cond.min) return false;
        if (typeof cond.max === "number" && v > cond.max) return false;
        return true;
      case "regionFlag":
        return !!region && !!region[cond.attr] === !!cond.value;
      case "regionHas":
        return !!region && region.buildings.some(function (b) { return b.buildingTypeId === cond.building; });
      case "regionBuildings":
        return !!region && region.buildings.length >= cond.min;
      case "resource":
        var rv = state.resources[cond.key];
        if (typeof cond.min === "number" && rv < cond.min) return false;
        if (typeof cond.max === "number" && rv > cond.max) return false;
        return true;
      case "stateFlag":
        return !!state.flags[cond.key];
      case "categoryCount":
        return S.countBuildings(state, function (b) {
          var d = S.buildingDef(b.buildingTypeId);
          return d && d.category === cond.category;
        }) >= cond.min;
      case "any":
        return (cond.of || []).some(function (c) { return checkCondition(state, c, region); });
      default:
        return false;
    }
  }

  function conditionsMet(state, def, region) {
    return (def.conditions || []).every(function (c) { return checkCondition(state, c, region); });
  }

  /** Regiony, w których wydarzenie może wystąpić (dla scope=region). */
  function eligibleRegions(state, def) {
    return state.regions.filter(function (r) { return conditionsMet(state, def, r); });
  }

  function isOnCooldown(state, def) {
    var until = state.eventCooldowns[def.id];
    return typeof until === "number" && state.turn < until;
  }

  /** Lista kandydatów { def, regions } spełniających warunki i bez cooldownu. */
  function candidates(state) {
    var sc = S.scenarioById(state.scenarioId);
    var weights = (sc && sc.eventWeights) || {};
    var list = [];
    GT.DATA.events.forEach(function (def) {
      if (isOnCooldown(state, def)) return;
      var regions = null;
      if (def.scope === "region") {
        regions = eligibleRegions(state, def);
        if (!regions.length) return;
      } else if (!conditionsMet(state, def, null)) return;
      var w = def.weight * (typeof weights[def.id] === "number" ? weights[def.id] : 1);
      if (w > 0) list.push({ def: def, regions: regions, weight: w });
    });
    return list;
  }

  /** Uruchamia wydarzenie: efekt początkowy + oczekiwanie na decyzję gracza. */
  function triggerEvent(state, def, regionId, report) {
    state.activeEvent = { eventId: def.id, regionId: regionId || null, turn: state.turn };
    state.eventCooldowns[def.id] = state.turn + (def.cooldown || 3);
    applyEffects(state, def.onTrigger || [], regionId, report);
    state.eventHistory.push({ turn: state.turn, eventId: def.id, regionId: regionId || null, choiceId: null });
    if (report) report.event = { eventId: def.id, regionId: regionId || null };
    return state.activeEvent;
  }

  /**
   * Krok 10: maksymalnie jedno wydarzenie na turę.
   * forceId — wymuszenie konkretnego wydarzenia (tryb debugowania / testy).
   */
  function maybeTriggerEvent(state, report, forceId) {
    if (state.activeEvent) return null;
    var cfg = GT.DATA.balance.events;
    if (forceId) {
      var fdef = S.eventDef(forceId);
      if (!fdef) return null;
      var regs = fdef.scope === "region" ? eligibleRegions(state, fdef) : null;
      if (fdef.scope === "region" && !regs.length) regs = state.regions.slice();
      var reg = regs ? regs[Math.floor(GT.random.next(state) * regs.length)] : null;
      return triggerEvent(state, fdef, reg ? reg.id : null, report);
    }
    if (state.turn < cfg.firstTurn) return null;
    if (GT.random.next(state) >= cfg.chancePerTurn) return null;
    var list = candidates(state);
    var pick = GT.random.weightedPick(state, list, function (c) { return c.weight; });
    if (!pick) return null;
    var region = null;
    if (pick.regions) region = pick.regions[Math.floor(GT.random.next(state) * pick.regions.length)];
    return triggerEvent(state, pick.def, region ? region.id : null, report);
  }

  // ---------- Efekty ----------
  function findModifier(state, tag, regionId) {
    return state.modifiers.filter(function (m) {
      return m.tag === tag && (m.scope === "global" || m.regionId === regionId);
    });
  }

  function applyEffects(state, effects, regionId, report) {
    var region = regionId ? S.getRegion(state, regionId) : null;
    effects.forEach(function (e) {
      switch (e.type) {
        case "res":
          state.resources[e.key] = (state.resources[e.key] || 0) + e.delta;
          break;
        case "resPct":
          state.resources[e.key] = Math.round(state.resources[e.key] * (1 + e.pct / 100));
          break;
        case "regionAttr":
          if (region) region[e.attr] = U.clamp(Math.round((region[e.attr] || 0) + e.delta), 0, 100);
          break;
        case "regionFlag":
          if (region) region[e.flag] = !!e.value;
          break;
        case "modifier":
          state.modifiers.push({
            tag: e.tag, kind: e.kind, factor: e.factor, delta: e.delta,
            turnsLeft: e.turns, scope: e.scope || "global",
            regionId: e.scope === "region" ? regionId : null,
            eventId: state.activeEvent ? state.activeEvent.eventId : null
          });
          break;
        case "removeModifier":
          state.modifiers = state.modifiers.filter(function (m) {
            return !(m.tag === e.tag && (m.scope === "global" || m.regionId === regionId));
          });
          break;
        case "setModifier":
          findModifier(state, e.tag, regionId).forEach(function (m) {
            if (typeof e.factor === "number") m.factor = e.factor;
            if (typeof e.turns === "number") m.turnsLeft = e.turns;
          });
          break;
        case "build":
          if (region) GT.buildings.build(state, region.id, e.building, { ignoreCost: true, ignoreTurnLimit: true });
          break;
      }
    });
    GT.economy.sanitize(state);
  }

  /** Czy wybór jest dostępny (budżet, możliwość budowy). */
  function choiceAvailability(state, choice) {
    var ev = state.activeEvent;
    if (choice.cost > state.resources.budget)
      return U.fail("NO_BUDGET", { cost: choice.cost, budget: state.resources.budget });
    if (choice.requires && choice.requires.buildable) {
      var chk = GT.buildings.canBuild(state, ev && ev.regionId, choice.requires.buildable,
        { ignoreCost: true, ignoreTurnLimit: true });
      if (!chk.ok) return chk;
    }
    return U.ok();
  }

  /** Gracz podejmuje decyzję dotyczącą aktywnego wydarzenia. */
  function resolveChoice(state, choiceId) {
    var ev = state.activeEvent;
    if (!ev) return U.fail("NO_ACTIVE_EVENT");
    var def = S.eventDef(ev.eventId);
    if (!def) { state.activeEvent = null; return U.fail("UNKNOWN_EVENT"); }
    var choice = def.choices.filter(function (c) { return c.id === choiceId; })[0];
    if (!choice) return U.fail("UNKNOWN_CHOICE");
    var avail = choiceAvailability(state, choice);
    if (!avail.ok) return avail;
    state.resources.budget -= choice.cost;
    applyEffects(state, choice.effects || [], ev.regionId, null);
    state.stats.resiliencePoints += choice.resilience || 0;
    state.stats.eventsHandled += 1;
    for (var i = state.eventHistory.length - 1; i >= 0; i--) {
      var h = state.eventHistory[i];
      if (h.eventId === ev.eventId && h.choiceId === null) { h.choiceId = choice.id; break; }
    }
    state.pendingMessages.push({ key: "msg.decision", params: { eventId: ev.eventId, choiceId: choice.id, regionId: ev.regionId }, tone: "neutral" });
    state.activeEvent = null;
    state.updatedAt = new Date().toISOString();
    return U.ok({ eventId: def.id, choiceId: choice.id });
  }

  /** Odliczanie czasu trwania modyfikatorów (po rozliczeniu produkcji). */
  function tickModifiers(state, report) {
    state.modifiers.forEach(function (m) { m.turnsLeft -= 1; });
    var expired = state.modifiers.filter(function (m) { return m.turnsLeft <= 0; });
    state.modifiers = state.modifiers.filter(function (m) { return m.turnsLeft > 0; });
    expired.forEach(function (m) {
      if (report) report.messages.push({ key: "msg.modifierEnded", params: { tag: m.tag, regionId: m.regionId }, tone: "good" });
    });
  }

  GT.events = {
    checkCondition: checkCondition,
    conditionsMet: conditionsMet,
    eligibleRegions: eligibleRegions,
    candidates: candidates,
    triggerEvent: triggerEvent,
    maybeTriggerEvent: maybeTriggerEvent,
    applyEffects: applyEffects,
    choiceAvailability: choiceAvailability,
    resolveChoice: resolveChoice,
    tickModifiers: tickModifiers
  };
})(window.GT = window.GT || {});
