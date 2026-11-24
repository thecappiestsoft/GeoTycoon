/*
 * screens.js — ekrany: menu główne, wybór scenariusza, instrukcja, ustawienia,
 * samouczek oraz okno trybu debugowania.
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num;

  // ---------- Menu główne ----------
  function renderMenu(container, app) {
    D.clear(container);
    var save = GT.saveManager.saveStatus();
    var canContinue = save.status === "valid" && save.state.status === "playing";
    var saveInfo = null;
    if (save.status === "valid") {
      var sc = GT.state.scenarioById(save.state.scenarioId);
      saveInfo = h("p", { class: "save-info" }, save.state.status === "playing"
        ? t("menu.saveInfo", { scenario: tx(sc.name), year: save.state.turn, max: save.state.maxTurns })
        : t("menu.saveFinished", { scenario: tx(sc.name) }));
    }
    var corrupt = null;
    if (save.status === "corrupt") {
      var backup = GT.saveManager.loadBackup();
      corrupt = h("div", { class: "notice notice-bad", role: "alert" }, [
        h("strong", null, "⚠️ " + t("menu.corruptTitle")),
        h("p", null, GT.buildingPanel.errorText(save.error)),
        h("div", { class: "row-btns" }, [
          backup.ok ? h("button", { class: "btn btn-secondary", type: "button", onclick: function () { app.loadState(backup.data.state); } }, t("menu.loadBackup")) : null,
          h("button", { class: "btn btn-secondary", type: "button", onclick: function () {
            D.openModal({ title: t("menu.deleteSaveTitle"), body: h("p", null, t("menu.deleteSaveText")),
              actions: [{ label: t("ui.cancel") }, { label: t("menu.deleteSave"), primary: true, onClick: function () { GT.saveManager.clearSave(); renderMenu(container, app); } }] });
          } }, t("menu.deleteSave"))
        ])
      ]);
    }
    container.appendChild(h("div", { class: "menu-wrap" }, [
      h("div", { class: "menu-hero" }, [
        h("div", { class: "logo", "aria-hidden": "true" }, "🌍"),
        h("h1", { class: "title" }, "GeoTycoon"),
        h("p", { class: "subtitle" }, t("menu.subtitle")),
        h("p", { class: "pitch" }, t("menu.pitch"))
      ]),
      corrupt,
      h("nav", { class: "menu-buttons", "aria-label": t("menu.aria") }, [
        h("button", { class: "btn btn-primary btn-lg", type: "button", onclick: function () { app.confirmNewGame(function () { app.startGame("greenValley", { maxTurns: 15 }); }); } }, [h("span", { "aria-hidden": "true" }, "▶ "), t("menu.newGame")]),
        h("button", { class: "btn btn-secondary btn-lg", type: "button", disabled: !canContinue, onclick: function () { app.loadState(save.state); } }, [h("span", { "aria-hidden": "true" }, "⏯ "), t("menu.continue")]),
        saveInfo,
        h("button", { class: "btn btn-secondary btn-lg", type: "button", onclick: function () { app.show("newgame"); } }, [h("span", { "aria-hidden": "true" }, "🗺️ "), t("menu.scenarios")]),
        h("button", { class: "btn btn-secondary btn-lg", type: "button", onclick: function () { app.show("howto"); } }, [h("span", { "aria-hidden": "true" }, "📖 "), t("menu.howto")]),
        h("button", { class: "btn btn-secondary btn-lg", type: "button", onclick: function () { app.show("settings"); } }, [h("span", { "aria-hidden": "true" }, "⚙️ "), t("menu.settings")])
      ])
    ]));
  }

  // ---------- Wybór scenariusza ----------
  function renderNewGame(container, app) {
    D.clear(container);
    var chosen = { scenario: "greenValley", maxTurns: 15, lesson: "none" };
    var cards = h("div", { class: "scenario-grid", role: "radiogroup", "aria-label": t("newgame.scenario") });
    function paintCards() {
      D.clear(cards);
      GT.DATA.scenarios.forEach(function (sc) {
        var sel = chosen.scenario === sc.id;
        var goals = sc.goals.map(function (g) { return GT.summaryPanel.goalText({ goal: g }); }).join(" · ");
        cards.appendChild(h("button", { class: "scenario-card" + (sel ? " selected" : ""), type: "button", role: "radio", "aria-checked": sel ? "true" : "false",
          onclick: function () { chosen.scenario = sc.id; paintCards(); cards.querySelector('[aria-checked="true"]').focus(); } }, [
          h("span", { class: "scenario-icon", "aria-hidden": "true" }, sc.icon),
          h("strong", { class: "scenario-name" }, tx(sc.name)),
          h("span", { class: "difficulty" }, t("newgame.difficulty") + ": " + new Array(sc.difficulty + 1).join("★") + new Array(4 - sc.difficulty).join("☆")),
          h("span", { class: "scenario-desc" }, tx(sc.desc)),
          h("span", { class: "scenario-start" }, "💰 " + num(sc.start.budget) + " · 👥 " + num(sc.start.population) + " · 🌿 " + sc.start.environment),
          h("span", { class: "scenario-goal" }, "🎯 " + goals)
        ]));
      });
    }
    paintCards();
    var lengthSel = h("select", { id: "opt-length", onchange: function (e) { chosen.maxTurns = parseInt(e.target.value, 10); } },
      GT.DATA.gameLengths.map(function (n) { return h("option", { value: n }, t("newgame.turns", { n: n })); }));
    var lessonSel = h("select", { id: "opt-lesson", onchange: function (e) { chosen.lesson = e.target.value; } },
      GT.DATA.lessonGoals.map(function (g) { return h("option", { value: g.id }, t("lesson." + g.id)); }));
    container.appendChild(h("div", { class: "page-wrap" }, [
      h("div", { class: "page-head" }, [
        h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.show("menu"); } }, "← " + t("ui.back")),
        h("h1", null, t("newgame.title"))
      ]),
      cards,
      h("div", { class: "options card" }, [
        h("div", { class: "field" }, [h("label", { for: "opt-length" }, t("newgame.length")), lengthSel]),
        h("div", { class: "field" }, [h("label", { for: "opt-lesson" }, t("newgame.lessonGoal")), lessonSel, h("span", { class: "small muted" }, t("newgame.lessonHint"))])
      ]),
      h("div", { class: "page-actions" }, [
        h("button", { class: "btn btn-primary btn-lg", type: "button", onclick: function () {
          app.confirmNewGame(function () { app.startGame(chosen.scenario, { maxTurns: chosen.maxTurns, lessonGoalId: chosen.lesson }); });
        } }, "▶ " + t("newgame.start"))
      ])
    ]));
  }

  // ---------- Instrukcja ----------
  function renderHowTo(container, app) {
    D.clear(container);
    var B = GT.DATA.balance;
    var resources = GT.summaryPanel.RES.map(function (r) {
      return h("li", null, [h("span", { "aria-hidden": "true" }, r[1] + " "), h("strong", null, t("res." + r[0])), " — " + t("howto.res." + r[0])]);
    });
    var bRows = GT.DATA.buildings.map(function (b) {
      return h("tr", null, [
        h("td", null, [h("span", { "aria-hidden": "true" }, b.icon + " "), tx(b.name)]),
        h("td", null, num(b.cost)), h("td", null, num(b.maintenance)),
        h("td", null, tx(b.desc))
      ]);
    });
    var dims = GT.scoring.DIMENSIONS.map(function (k) {
      return h("li", null, [h("strong", null, t("dim." + k) + " (" + B.scoring.weights[k] + "%)"), " — " + t("howto.dim." + k)]);
    });
    container.appendChild(h("div", { class: "page-wrap prose" }, [
      h("div", { class: "page-head" }, [
        h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.back(); } }, "← " + t("ui.back")),
        h("h1", null, t("howto.title"))
      ]),
      h("section", { class: "card" }, [h("h2", null, "🎯 " + t("howto.goalTitle")), h("p", null, t("howto.goal"))]),
      h("section", { class: "card" }, [h("h2", null, "🔁 " + t("howto.loopTitle")),
        h("ol", null, [1, 2, 3, 4, 5, 6].map(function (i) { return h("li", null, t("howto.loop" + i)); }))]),
      h("section", { class: "card" }, [h("h2", null, "📊 " + t("howto.resTitle")), h("ul", { class: "plain-list" }, resources)]),
      h("section", { class: "card" }, [h("h2", null, "🏗️ " + t("howto.buildTitle")),
        h("p", null, t("howto.buildRules", { max: B.maxBuildingsPerRegion, inv: B.maxInvestmentsPerTurn })),
        h("div", { class: "table-scroll" }, h("table", { class: "table" }, [
          h("thead", null, h("tr", null, [h("th", null, t("howto.colBuilding")), h("th", null, t("howto.colCost")), h("th", null, t("howto.colUpkeep")), h("th", null, t("howto.colEffect"))])),
          h("tbody", null, bRows)
        ]))]),
      h("section", { class: "card" }, [h("h2", null, "📣 " + t("howto.eventsTitle")), h("p", null, t("howto.events"))]),
      h("section", { class: "card" }, [h("h2", null, "🏆 " + t("howto.scoreTitle")), h("ul", { class: "plain-list" }, dims), h("p", null, t("howto.ratings"))]),
      h("section", { class: "card" }, [h("h2", null, "⌨️ " + t("howto.keysTitle")), h("ul", { class: "plain-list" }, [1, 2, 3, 4].map(function (i) { return h("li", null, t("howto.key" + i)); }))])
    ]));
  }

  // ---------- Ustawienia ----------
  function toggleRow(id, labelKey, hintKey, value, onChange) {
    return h("div", { class: "toggle-row" }, [
      h("div", null, [h("label", { for: id }, t(labelKey)), hintKey ? h("p", { class: "small muted" }, t(hintKey)) : null]),
      h("input", { type: "checkbox", id: id, class: "switch", checked: value, role: "switch", onchange: function (e) { onChange(e.target.checked); } })
    ]);
  }

  function renderSettings(container, app) {
    D.clear(container);
    var s = app.settings;
    var fileInput = h("input", { type: "file", accept: ".json,application/json", class: "sr-only", id: "import-file", onchange: function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { app.importSave(String(reader.result)); };
      reader.readAsText(f);
      e.target.value = "";
    } });
    container.appendChild(h("div", { class: "page-wrap" }, [
      h("div", { class: "page-head" }, [
        h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.back(); } }, "← " + t("ui.back")),
        h("h1", null, t("settings.title"))
      ]),
      h("section", { class: "card" }, [
        toggleRow("set-sound", "settings.sound", "settings.soundHint", s.sound, function (v) { app.updateSetting("sound", v); }),
        toggleRow("set-anim", "settings.animations", "settings.animationsHint", s.animations, function (v) { app.updateSetting("animations", v); }),
        toggleRow("set-tutorial", "settings.tutorial", "settings.tutorialHint", s.tutorial, function (v) { app.updateSetting("tutorial", v); }),
        toggleRow("set-debug", "settings.debug", "settings.debugHint", s.debug, function (v) { app.updateSetting("debug", v); })
      ]),
      h("section", { class: "card" }, [
        h("h2", null, t("settings.saveTitle")),
        h("p", { class: "small muted" }, t("settings.saveHint")),
        h("div", { class: "row-btns" }, [
          h("button", { class: "btn btn-secondary", type: "button", disabled: !app.state, onclick: function () { app.exportSave(); } }, "⬇ " + t("settings.export")),
          h("label", { class: "btn btn-secondary", for: "import-file", tabindex: 0, role: "button",
            onkeydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } } }, "⬆ " + t("settings.import")),
          fileInput,
          h("button", { class: "btn btn-danger", type: "button", onclick: function () {
            D.openModal({ title: t("settings.resetTitle"), body: h("p", null, t("settings.resetText")),
              actions: [{ label: t("ui.cancel") }, { label: t("settings.reset"), primary: true, onClick: function () { app.resetGame(); } }] });
          } }, "🗑 " + t("settings.reset"))
        ])
      ])
    ]));
  }

  // ---------- Samouczek ----------
  var TUTORIAL = [
    { key: "tut.1", done: function (s, app) { return app.tut.selectedFertile || hasAny(s, function (b) { return b.buildingTypeId === "farm"; }); } },
    { key: "tut.2", done: function (s) { return hasAny(s, function (b) { return b.buildingTypeId === "farm"; }); } },
    { key: "tut.3", done: function (s) { return hasAny(s, function (b) { return b.buildingTypeId === "farm" && GT.state.isOperational(s, b); }); } },
    { key: "tut.4", done: function (s) { return hasAny(s, function (b) { var d = GT.state.buildingDef(b.buildingTypeId); return d && d.category === "energy"; }); } },
    { key: "tut.5", done: function (s, app) { return app.tut.factorySkipped || hasAny(s, function (b) { return b.buildingTypeId === "factory"; }); } },
    { key: "tut.6", done: function (s) { return s.turn >= 2; } }
  ];
  function hasAny(s, fn) { return GT.state.countBuildings(s, fn) > 0; }

  function renderTutorial(container, app) {
    D.clear(container);
    var s = app.state;
    if (!s || !app.settings.tutorial || s.status !== "playing") { container.hidden = true; return; }
    var steps = TUTORIAL.map(function (st) { return { key: st.key, done: st.done(s, app) }; });
    var allDone = steps.every(function (x) { return x.done; });
    if (allDone && !app.tut.showDone) { container.hidden = true; return; }
    container.hidden = false;
    var current = steps.filter(function (x) { return !x.done; })[0];
    var doneCount = steps.filter(function (x) { return x.done; }).length;
    container.appendChild(h("div", { class: "tutorial-head" }, [
      h("span", { class: "tut-badge" }, [h("span", { "aria-hidden": "true" }, "🎓 "), t("tut.title") + " " + t("tut.progress", { n: doneCount, max: steps.length })]),
      h("span", { class: "tut-current" }, current ? t(current.key) : t("tut.allDone")),
      current && current.key === "tut.5" ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: function () { app.tut.factorySkipped = true; renderTutorial(container, app); } }, t("tut.skipFactory")) : null,
      h("button", { class: "btn btn-ghost btn-sm", type: "button", "aria-expanded": app.tut.expanded ? "true" : "false", "aria-controls": "tutorial-steps",
        onclick: function () { app.tut.expanded = !app.tut.expanded; renderTutorial(container, app); } }, (app.tut.expanded ? "▾ " : "▸ ") + t("tut.allSteps")),
      h("button", { class: "icon-btn", type: "button", "aria-label": t("tut.hide"), title: t("tut.hide"), onclick: function () { app.updateSetting("tutorial", false); } }, "✕")
    ]));
    if (app.tut.expanded) container.appendChild(h("ol", { class: "tutorial-steps", id: "tutorial-steps" }, steps.map(function (x) {
      return h("li", { class: x.done ? "done" : x === current ? "current" : "" }, [
        h("span", { class: "tut-check", "aria-hidden": "true" }, x.done ? "✔" : x === current ? "➜" : "○"),
        h("span", { class: "sr-only" }, x.done ? t("ui.met") + ": " : ""),
        t(x.key)
      ]);
    })));
  }

  // ---------- Debug ----------
  function openDebug(app) {
    var s = app.state;
    if (!s) return;
    var evSel = h("select", { id: "dbg-event", "aria-label": t("debug.event") }, GT.DATA.events.map(function (e) { return h("option", { value: e.id }, e.icon + " " + tx(e.title)); }));
    var body = h("div", { class: "debug" }, [
      h("div", { class: "row-btns" }, [
        h("button", { class: "btn btn-secondary btn-sm", type: "button", onclick: function () { s.resources.budget += 5000; app.afterAction(); } }, "+5000 Geo$"),
        h("button", { class: "btn btn-secondary btn-sm", type: "button", onclick: function () { s.resources.food = 0; app.afterAction(); } }, t("debug.zeroFood")),
        h("button", { class: "btn btn-secondary btn-sm", type: "button", onclick: function () { s.turn = s.maxTurns; app.afterAction(); } }, t("debug.lastTurn")),
        h("button", { class: "btn btn-secondary btn-sm", type: "button", onclick: function () { s.investmentsThisTurn = 0; app.afterAction(); } }, t("debug.resetLimit")),
        h("button", { class: "btn btn-danger btn-sm", type: "button", onclick: function () {
          try { localStorage.setItem(GT.saveManager.SAVE_KEY, "{uszkodzony"); } catch (e) { /* brak */ }
          D.toast(t("debug.corrupted"), "bad");
        } }, t("debug.corrupt"))
      ]),
      h("div", { class: "row-btns" }, [evSel, h("button", { class: "btn btn-warning btn-sm", type: "button", onclick: function () {
        if (s.activeEvent) { D.toast(t("err.EVENT_PENDING"), "bad"); return; }
        GT.events.maybeTriggerEvent(s, null, evSel.value);
        D.closeAllModals();
        app.afterAction();
        GT.eventModal.open(s, app.actions);
      } }, t("debug.force"))]),
      h("p", { class: "small muted" }, t("debug.seed", { seed: s.seed })),
      h("pre", { class: "state-json" }, JSON.stringify(s, null, 2))
    ]);
    D.openModal({ title: "🐞 " + t("debug.title"), body: body, wide: true });
  }

  GT.screens = { renderMenu: renderMenu, renderNewGame: renderNewGame, renderHowTo: renderHowTo, renderSettings: renderSettings, renderTutorial: renderTutorial, openDebug: openDebug };
})(window.GT = window.GT || {});
