/*
 * summaryPanel.js — podsumowanie tury, ekran końcowy z oceną oraz statystyki (wykresy historii).
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num, signed = GT.i18n.signed;

  var RES = [
    ["budget", "💰"], ["food", "🍞"], ["energy", "⚡"], ["population", "👥"],
    ["satisfaction", "🙂"], ["environment", "🌿"], ["technology", "🔬"]
  ];

  /** Tekst komunikatu raportu w bieżącym języku. */
  function msgText(m) {
    var p = Object.assign({}, m.params || {});
    if (m.key === "msg.decision") {
      var def = GT.state.eventDef(p.eventId);
      p.event = def ? tx(def.title) : p.eventId;
      p.choice = GT.eventModal.choiceLabel(p.eventId, p.choiceId);
    }
    if (m.key === "msg.modifierEnded") {
      p.name = t("modTag." + p.tag);
      p.where = p.regionId ? " (" + GT.eventModal.regionName(p.regionId) + ")" : "";
    }
    Object.keys(p).forEach(function (k) { if (typeof p[k] === "number") p[k] = num(p[k]); });
    return t(m.key, p);
  }

  function deltaBadge(v) {
    var cls = v > 0 ? "delta-up" : v < 0 ? "delta-down" : "delta-zero";
    var arrow = v > 0 ? "▲ " : v < 0 ? "▼ " : "■ ";
    return h("span", { class: "delta " + cls }, [h("span", { "aria-hidden": "true" }, arrow), signed(v)]);
  }

  function openTurnSummary(state, report, onClose) {
    var toneIcon = { good: "✅", bad: "⚠️", neutral: "•" };
    var b = report.breakdown || {};
    var body = h("div", { class: "summary" }, [
      h("div", { class: "delta-grid" }, RES.map(function (r) {
        return h("div", { class: "delta-item" }, [
          h("span", { class: "delta-icon", "aria-hidden": "true" }, r[1]),
          h("span", { class: "delta-label" }, t("res." + r[0])),
          h("strong", { class: "delta-value" }, num(state.resources[r[0]])),
          deltaBadge(report.deltas[r[0]] || 0)
        ]);
      })),
      h("h3", null, t("summary.whatHappened")),
      h("ul", { class: "msg-list" }, report.messages.map(function (m) {
        return h("li", { class: "msg msg-" + (m.tone || "neutral") }, [h("span", { class: "msg-icon", "aria-hidden": "true" }, toneIcon[m.tone] || "•"), msgText(m)]);
      })),
      h("details", { class: "breakdown" }, [
        h("summary", null, t("summary.budgetDetails")),
        h("table", { class: "table" }, [
          h("tbody", null, [
            row(t("summary.taxes"), b.taxes), row(t("summary.industry"), b.industryIncome), row(t("summary.trade"), b.otherIncome),
            row(t("summary.upkeep"), -b.upkeep), row(t("summary.admin"), -b.admin),
            h("tr", { class: "total" }, [h("th", null, t("summary.net")), h("td", null, signed(b.net || 0) + " Geo$")])
          ])
        ])
      ]),
      report.event ? h("div", { class: "notice notice-warn" }, [h("span", { "aria-hidden": "true" }, "📣 "), t("summary.newEvent")]) : null
    ]);
    function row(label, v) { return h("tr", null, [h("th", null, label), h("td", null, signed(v || 0) + " Geo$")]); }
    D.openModal({
      title: t("summary.title", { n: report.turn }), body: body, wide: true, onClose: onClose,
      actions: [{ label: report.event ? t("summary.toEvent") : t("summary.continue"), primary: true }]
    });
  }

  // ---------- Wykresy historii (małe wielokrotności: jeden zasób = jeden wykres) ----------
  function lineChart(history, key, icon) {
    var Wd = 300, Ht = 120, padL = 44, padR = 10, padT = 10, padB = 22;
    var vals = history.map(function (s) { return s[key]; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (key === "satisfaction" || key === "environment" || key === "technology") { min = 0; max = 100; }
    if (min === max) { max = min + 1; }
    if (min > 0 && key !== "population") min = 0;
    var n = history.length;
    function x(i) { return padL + (n <= 1 ? 0 : i * (Wd - padL - padR) / (n - 1)); }
    function y(v) { return padT + (1 - (v - min) / (max - min)) * (Ht - padT - padB); }
    var d = vals.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); }).join("");
    var chart = D.svg("svg", { viewBox: "0 0 " + Wd + " " + Ht, class: "chart", role: "img", "aria-label": t("res." + key) });
    // siatka i osie
    [min, max].forEach(function (v) {
      chart.appendChild(D.svg("line", { x1: padL, x2: Wd - padR, y1: y(v), y2: y(v), class: "chart-grid" }));
      chart.appendChild(D.svg("text", { x: padL - 6, y: y(v) + 4, class: "chart-axis", "text-anchor": "end" }, compact(v)));
    });
    if (min < 0) chart.appendChild(D.svg("line", { x1: padL, x2: Wd - padR, y1: y(0), y2: y(0), class: "chart-zero" }));
    chart.appendChild(D.svg("text", { x: padL, y: Ht - 6, class: "chart-axis" }, t("ui.yearShort", { n: history[0].turn })));
    chart.appendChild(D.svg("text", { x: Wd - padR, y: Ht - 6, class: "chart-axis", "text-anchor": "end" }, t("ui.yearShort", { n: history[n - 1].turn })));
    chart.appendChild(D.svg("path", { d: d, class: "chart-line" }));
    var last = D.svg("circle", { cx: x(n - 1), cy: y(vals[n - 1]), r: 4, class: "chart-dot" });
    chart.appendChild(last);
    var cross = D.svg("line", { y1: padT, y2: Ht - padB, class: "chart-cross", visibility: "hidden" });
    var hover = D.svg("circle", { r: 5, class: "chart-dot chart-hover", visibility: "hidden" });
    chart.appendChild(cross); chart.appendChild(hover);
    var tip = h("div", { class: "chart-tip", hidden: true });
    var hit = D.svg("rect", { x: padL, y: 0, width: Wd - padL - padR, height: Ht, class: "chart-hit" });
    hit.addEventListener("mousemove", function (e) {
      var r = chart.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * Wd;
      var i = Math.round((px - padL) / ((Wd - padL - padR) / Math.max(1, n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      hover.setAttribute("cx", x(i)); hover.setAttribute("cy", y(vals[i])); hover.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.textContent = t("ui.yearShort", { n: history[i].turn }) + ": " + num(vals[i]);
      tip.style.left = (x(i) / Wd * 100) + "%";
    });
    hit.addEventListener("mouseleave", function () { cross.setAttribute("visibility", "hidden"); hover.setAttribute("visibility", "hidden"); tip.hidden = true; });
    chart.appendChild(hit);
    return h("figure", { class: "chart-card" }, [
      h("figcaption", null, [h("span", { "aria-hidden": "true" }, icon + " "), t("res." + key), h("strong", { class: "chart-now" }, num(vals[n - 1]))]),
      h("div", { class: "chart-wrap" }, [chart, tip])
    ]);
  }

  function compact(v) {
    if (Math.abs(v) >= 10000) return Math.round(v / 1000) + "k";
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    return String(Math.round(v));
  }

  function openStats(state) {
    var hist = state.history.length ? state.history : [GT.state.snapshot(state, 0)];
    var table = h("table", { class: "table table-compact" }, [
      h("thead", null, h("tr", null, [h("th", null, t("ui.year"))].concat(RES.map(function (r) { return h("th", null, t("res." + r[0])); })))),
      h("tbody", null, hist.map(function (s) {
        return h("tr", null, [h("td", null, s.turn === 0 ? t("ui.start") : String(s.turn))].concat(RES.map(function (r) { return h("td", null, num(s[r[0]])); })));
      }))
    ]);
    var st = state.stats;
    var body = h("div", null, [
      h("div", { class: "charts" }, RES.map(function (r) { return lineChart(hist, r[0], r[1]); })),
      h("div", { class: "stat-row" }, [
        statTile("🏗️", t("stats.buildings"), GT.state.countBuildings(state)),
        statTile("📣", t("stats.events"), st.eventsHandled),
        statTile("🍞", t("stats.foodShortages"), st.foodShortageTurns),
        statTile("⚡", t("stats.energyShortages"), st.energyShortageTurns),
        statTile("💸", t("stats.budgetCrises"), st.budgetCrisisTurns)
      ]),
      h("details", { class: "breakdown" }, [h("summary", null, t("stats.table")), h("div", { class: "table-scroll" }, table)])
    ]);
    D.openModal({ title: t("stats.title"), body: body, wide: true, actions: [{ label: t("ui.close"), primary: true }] });
  }

  function statTile(icon, label, value) {
    return h("div", { class: "stat-tile" }, [h("span", { class: "stat-icon", "aria-hidden": "true" }, icon), h("strong", null, num(value)), h("span", { class: "small muted" }, label)]);
  }

  function goalText(g) {
    var goal = g.goal;
    switch (goal.type) {
      case "score": return t("goal.score", { min: goal.min });
      case "resource": return t("goal.resource", { res: t("res." + goal.key), min: goal.min });
      case "dimension": return t("goal.dimension", { dim: t("dim." + goal.key), min: goal.min });
      case "maxShortageTurns": return t("goal.maxShortage." + goal.kind, { max: goal.max });
      case "buildingCount": return t("goal.buildingCount", { building: tx(GT.state.buildingDef(goal.building).name), min: goal.min });
      default: return goal.type;
    }
  }

  /** Ekran końcowy. */
  function renderEnd(container, state, actions) {
    D.clear(container);
    var sc = state.finalScore || GT.scoring.computeScore(state);
    var w = GT.DATA.balance.scoring.weights;
    var scen = GT.state.scenarioById(state.scenarioId);
    container.appendChild(h("div", { class: "end-wrap" }, [
      h("div", { class: "end-hero rating-" + sc.rating }, [
        h("p", { class: "muted" }, tx(scen.name) + " · " + t("end.years", { n: state.maxTurns })),
        h("div", { class: "score-ring", role: "img", "aria-label": t("end.scoreAria", { n: sc.total }) }, [
          h("span", { class: "score-num" }, String(sc.total)), h("span", { class: "score-max" }, "/100")
        ]),
        h("h2", { class: "rating" }, [h("span", { "aria-hidden": "true" }, t("ratingIcon." + sc.rating) + " "), t("rating." + sc.rating)]),
        h("p", null, t("ratingDesc." + sc.rating))
      ]),
      h("div", { class: "end-grid" }, [
        h("section", { class: "card" }, [
          h("h3", null, t("end.dimensions")),
          h("div", { class: "dims" }, GT.scoring.DIMENSIONS.map(function (k) {
            var v = sc.dims[k];
            return h("div", { class: "attr" }, [
              h("span", { class: "attr-label" }, t("dim." + k) + " (" + w[k] + "%)"),
              h("div", { class: "bar bar-" + (v >= 66 ? "high" : v >= 33 ? "mid" : "low"), role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v, "aria-label": t("dim." + k) }, h("div", { class: "bar-fill", style: "width:" + v + "%" })),
              h("span", { class: "attr-value" }, String(v))
            ]);
          }))
        ]),
        h("section", { class: "card" }, [
          h("h3", null, t("end.goals")),
          h("ul", { class: "goal-list" }, sc.goals.map(function (g) {
            return h("li", { class: g.met ? "req-ok" : "req-bad" }, [h("span", { "aria-hidden": "true" }, g.met ? "✔ " : "✘ "),
              h("span", { class: "sr-only" }, (g.met ? t("ui.met") : t("ui.notMet")) + ": "), goalText(g), h("span", { class: "muted" }, " (" + num(g.actual) + ")")]);
          })),
          h("h3", null, t("end.achievements")),
          h("ul", { class: "plain-list" }, sc.best.map(function (k) { return h("li", null, "🏆 " + t("dimGood." + k)); })),
          h("h3", null, t("end.problems")),
          h("ul", { class: "plain-list" }, sc.worst.map(function (k) { return h("li", null, "🔧 " + t("dimBad." + k)); }))
        ])
      ]),
      h("div", { class: "end-actions" }, [
        h("button", { class: "btn btn-primary btn-lg", type: "button", onclick: actions.playAgain }, t("end.playAgain")),
        h("button", { class: "btn btn-secondary btn-lg", type: "button", onclick: actions.toMenu }, t("end.toMenu")),
        h("button", { class: "btn btn-secondary btn-lg", type: "button", onclick: function () { openStats(state); } }, t("end.showStats"))
      ])
    ]));
  }

  GT.summaryPanel = { RES: RES, openTurnSummary: openTurnSummary, openStats: openStats, renderEnd: renderEnd, goalText: goalText, msgText: msgText };
})(window.GT = window.GT || {});
