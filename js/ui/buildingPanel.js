/*
 * buildingPanel.js — karty budynków dla aktywnego regionu: koszt, efekt, wymagania,
 * utrzymanie i przycisk „Zbuduj” (z konkretnym powodem, gdy niedostępny).
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num;

  /** Tłumaczy wynik akcji { ok:false, code, params } na czytelny komunikat. */
  function errorText(res) {
    var p = Object.assign({}, res.params || {});
    if (p.attr) p.attrName = t("attr." + p.attr);
    if (typeof p.cost === "number") p.cost = num(p.cost);
    if (typeof p.budget === "number") p.budget = num(p.budget);
    if (typeof p.value === "number") p.value = num(p.value);
    if (typeof p.actual === "number") p.actual = num(p.actual);
    return GT.i18n.has("err." + res.code) ? t("err." + res.code, p) : t("err.generic", { code: res.code });
  }

  function requirementText(req) {
    switch (req.type) {
      case "attrMin": return t("req.attrMin", { attrName: t("attr." + req.attr), value: req.value });
      case "flag": return t("req.flag." + req.attr);
      case "notDesertOrIrrigated": return t("req.notDesert");
      case "regionPopMin": return t("req.pop", { value: num(req.value) });
      case "urbanOrPollution": return t("req.urbanOrPollution", { urbanization: req.urbanization, pollution: req.pollution });
      default: return req.type;
    }
  }

  function requirementMet(state, region, def, req) {
    return GT.buildings.unmetRequirements(state, region, { requirements: [req] }).length === 0;
  }

  /** Lista efektów jako krótkie „chipy”. */
  function effectChips(pv, perTurn) {
    var chips = [];
    function chip(icon, text, tone) { chips.push(h("span", { class: "chip chip-" + (tone || "neutral") }, [h("span", { "aria-hidden": "true" }, icon + " "), text])); }
    if (pv.food) chip("🍞", t("fx.food", { n: num(pv.food) }), "good");
    if (pv.energy) chip("⚡", t("fx.energy", { n: num(pv.energy) }), "good");
    if (pv.income) chip("💰", t("fx.income", { n: num(pv.income) }), "good");
    if (perTurn.technology) chip("🔬", t("fx.tech", { n: perTurn.technology }), "good");
    if (perTurn.satisfaction) chip("🙂", t("fx.satisfaction", { n: perTurn.satisfaction }), "good");
    if (perTurn.env > 0) chip("🌿", t("fx.envUp", { n: perTurn.env }), "good");
    if (perTurn.env < 0) chip("🌿", t("fx.envDown", { n: -perTurn.env }), "bad");
    if (pv.energyUse >= 5) chip("🔌", t("fx.energyUse", { n: pv.energyUse }), "bad");
    return chips;
  }

  function card(state, region, def, actions) {
    var pv = GT.buildings.preview(state, region.id, def.id);
    var check = GT.buildings.canBuild(state, region.id, def.id);
    var reason = check.ok ? null : errorText(check);
    var discounted = pv.cost < def.cost;
    var el = h("article", { class: "bcard" + (check.ok ? "" : " bcard-disabled"), "data-building": def.id }, [
      h("div", { class: "bcard-head" }, [
        h("span", { class: "bcard-icon", "aria-hidden": "true" }, def.icon),
        h("div", { class: "bcard-title" }, [
          h("h4", null, tx(def.name)),
          h("div", { class: "bcard-cost" }, [
            h("span", { class: discounted ? "cost-discount" : "" }, t("ui.cost", { n: num(pv.cost) })),
            discounted ? h("s", { class: "cost-old" }, num(def.cost)) : null,
            h("span", { class: "muted" }, " · " + t("ui.upkeep", { n: num(def.maintenance) }))
          ])
        ])
      ]),
      h("p", { class: "bcard-desc" }, tx(def.desc)),
      h("div", { class: "chips" }, effectChips(pv, def.perTurn || {})),
      h("ul", { class: "req-list", "aria-label": t("ui.requirements") }, (def.requirements || []).map(function (req) {
        var met = requirementMet(state, region, def, req);
        return h("li", { class: met ? "req-ok" : "req-bad" }, [h("span", { "aria-hidden": "true" }, met ? "✔ " : "✘ "), h("span", { class: "sr-only" }, met ? t("ui.met") + ": " : t("ui.notMet") + ": "), requirementText(req)]);
      })),
      h("details", { class: "edu" }, [h("summary", null, t("ui.why")), h("p", null, tx(def.edu))]),
      h("div", { class: "bcard-foot" }, [
        reason ? h("p", { class: "reason", role: "note" }, [h("span", { "aria-hidden": "true" }, "⛔ "), reason]) : null,
        h("button", { class: "btn btn-primary btn-build", type: "button", disabled: !check.ok,
          "aria-label": t("ui.buildNamed", { name: tx(def.name) }),
          onclick: function () { actions.build(region.id, def.id); } }, t("ui.build"))
      ])
    ]);
    return { el: el, ok: check.ok };
  }

  function render(container, state, region, actions) {
    var cards = GT.DATA.buildings.map(function (def) { return card(state, region, def, actions); });
    cards.sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0); });
    var avail = cards.filter(function (c) { return c.ok; }).length;
    container.appendChild(h("p", { class: "muted small" }, t("ui.buildHint", { n: avail, left: Math.max(0, GT.DATA.balance.maxInvestmentsPerTurn - state.investmentsThisTurn), max: GT.DATA.balance.maxInvestmentsPerTurn })));
    container.appendChild(h("div", { class: "bcards" }, cards.map(function (c) { return c.el; })));
  }

  GT.buildingPanel = { render: render, errorText: errorText, effectChips: effectChips };
})(window.GT = window.GT || {});
