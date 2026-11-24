/*
 * main.js — kontroler aplikacji: ekrany, akcje gracza, autosave, ustawienia, motyw i język.
 * Logika gry jest w modułach js/*.js (bez DOM); tutaj tylko łączenie UI z logiką.
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num, signed = GT.i18n.signed;

  var DEFAULT_SETTINGS = { lang: "pl", theme: "", sound: true, animations: true, tutorial: true, debug: false };
  var SCREENS = ["menu", "newgame", "howto", "settings", "game", "end"];

  var app = {
    settings: null,
    state: null,
    screen: "menu",
    prevScreen: "menu",
    tut: { selectedFertile: false, factorySkipped: false, showDone: false },
    actions: {}
  };
  GT.app = app;

  // ---------- Ustawienia, motyw, język ----------
  function applyTheme() {
    var theme = app.settings.theme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var btn = D.$("#theme-toggle");
    var toDark = theme === "light";
    btn.setAttribute("aria-label", t(toDark ? "theme.toDark" : "theme.toLight"));
    btn.setAttribute("title", t(toDark ? "theme.toDark" : "theme.toLight"));
    btn.querySelector(".icon-moon").style.display = toDark ? "" : "none";
    btn.querySelector(".icon-sun").style.display = toDark ? "none" : "";
  }

  function applyLang() {
    GT.i18n.setLang(app.settings.lang);
    document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
      var on = b.getAttribute("data-lang") === app.settings.lang;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("active", on);
    });
    document.title = "GeoTycoon — " + t("app.tagline");
    applyTheme();
  }

  function applyMotion() {
    document.body.classList.toggle("no-anim", !app.settings.animations);
  }

  app.updateSetting = function (key, value) {
    app.settings[key] = value;
    GT.saveManager.saveSettings(app.settings);
    if (key === "animations") applyMotion();
    if (key === "tutorial" && value) app.tut.showDone = true;
    if (app.screen === "game") renderGame();
    if (app.screen === "settings") GT.screens.renderSettings(screenEl("settings"), app);
  };

  // ---------- Ekrany ----------
  function screenEl(name) { return D.$("#screen-" + name); }

  app.show = function (name) {
    if (name !== app.screen) app.prevScreen = app.screen;
    app.screen = name;
    D.closeAllModals();
    SCREENS.forEach(function (s) { screenEl(s).hidden = s !== name; });
    renderScreen();
    var main = D.$("#main");
    var heading = screenEl(name).querySelector("h1, h2");
    if (heading && name !== "game") { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    main.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  app.back = function () {
    var target = app.prevScreen && app.prevScreen !== "settings" ? app.prevScreen : "menu";
    if ((target === "game" || target === "end") && !app.state) target = "menu";
    app.show(target);
  };

  function renderScreen() {
    var el = screenEl(app.screen);
    switch (app.screen) {
      case "menu": GT.screens.renderMenu(el, app); break;
      case "newgame": GT.screens.renderNewGame(el, app); break;
      case "howto": GT.screens.renderHowTo(el, app); break;
      case "settings": GT.screens.renderSettings(el, app); break;
      case "game": buildGameSkeleton(); renderGame(); break;
      case "end": GT.summaryPanel.renderEnd(el, app.state, { playAgain: playAgain, toMenu: function () { app.show("menu"); } }); break;
    }
  }

  // ---------- Start / wczytanie gry ----------
  app.confirmNewGame = function (start) {
    var save = GT.saveManager.saveStatus();
    if (save.status === "valid" && save.state.status === "playing") {
      D.openModal({ title: t("menu.overwriteTitle"), body: h("p", null, t("menu.overwriteText")),
        actions: [{ label: t("ui.cancel") }, { label: t("menu.overwriteOk"), primary: true, onClick: function () { setTimeout(start, 0); } }] });
    } else start();
  };

  app.startGame = function (scenarioId, opts) {
    var res = GT.state.createGame(scenarioId, opts);
    if (!res.ok) { D.toast(GT.buildingPanel.errorText(res), "bad"); return; }
    app.state = res.data;
    app.tut = { selectedFertile: false, factorySkipped: false, showDone: false };
    GT.saveManager.save(app.state);
    app.show("game");
    D.sound("turn");
  };

  app.loadState = function (state) {
    app.state = state;
    app.tut = { selectedFertile: true, factorySkipped: false, showDone: false };
    GT.saveManager.save(state);
    app.show(state.status === "finished" ? "end" : "game");
    if (state.status === "playing" && state.activeEvent) GT.eventModal.open(state, app.actions);
  };

  function playAgain() {
    var s = app.state;
    app.startGame(s.scenarioId, { maxTurns: s.maxTurns, lessonGoalId: s.lessonGoalId });
  }

  app.resetGame = function () {
    GT.saveManager.clearSave();
    app.state = null;
    D.toast(t("settings.resetDone"), "good");
    app.show("menu");
  };

  app.exportSave = function () {
    if (!app.state) return;
    var blob = new Blob([GT.saveManager.exportJSON(app.state)], { type: "application/json" });
    var a = h("a", { href: URL.createObjectURL(blob), download: "geotycoon-" + app.state.scenarioId + "-" + t("ui.yearFile") + app.state.turn + ".json" });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    D.toast(t("settings.exported"), "good");
  };

  app.importSave = function (text) {
    var res = GT.saveManager.importJSON(text);
    if (!res.ok) { D.toast(t("settings.importFailed") + " " + GT.buildingPanel.errorText(res), "bad"); return; }
    D.toast(t("settings.imported"), "good");
    app.loadState(res.data.state);
  };

  function autosave() {
    if (!app.state) return;
    var r = GT.saveManager.save(app.state);
    if (!r.ok) D.toast(t("err.SAVE_FAILED"), "bad");
  }

  app.afterAction = function () {
    autosave();
    if (app.screen === "game") renderGame();
  };

  // ---------- Akcje gracza ----------
  app.actions.select = function (regionId) {
    var s = app.state;
    GT.state.selectRegion(s, regionId);
    if (regionId) {
      var r = GT.state.getRegion(s, regionId);
      if (r && r.fertility >= 70) app.tut.selectedFertile = true;
      D.sound("click");
    }
    renderGame();
    if (regionId && window.innerWidth < 900) {
      var panel = D.$("#region-panel");
      if (panel) panel.scrollIntoView({ behavior: app.settings.animations ? "smooth" : "auto", block: "start" });
    }
    if (regionId) {
      var title = D.$("#region-title");
      if (title && document.activeElement && !document.activeElement.getAttribute("data-region")) { title.setAttribute("tabindex", "-1"); title.focus(); }
    }
  };

  app.actions.build = function (regionId, typeId) {
    var s = app.state;
    var def = GT.state.buildingDef(typeId);
    var region = GT.state.getRegion(s, regionId);
    var cost = GT.buildings.buildCost(s, def);
    function doBuild() {
      var res = GT.buildings.build(s, regionId, typeId);
      if (!res.ok) { D.sound("error"); D.toast(GT.buildingPanel.errorText(res), "bad"); return; }
      D.sound("build");
      D.toast(t("toast.built", { name: tx(def.name), region: tx(GT.state.regionTemplate(regionId).name), cost: num(res.data.cost) }), "good");
      app.afterAction();
      var btn = document.querySelector("#region-panel .btn-build:not([disabled])") || D.$("#region-title");
      if (btn) btn.focus();
    }
    if (cost >= GT.DATA.balance.highCostConfirmThreshold) {
      var pv = GT.buildings.preview(s, regionId, typeId);
      D.openModal({
        title: t("confirm.buildTitle", { name: tx(def.name) }),
        body: h("div", null, [
          h("p", null, t("confirm.buildText", { name: tx(def.name), region: tx(GT.state.regionTemplate(regionId).name), cost: num(cost), budget: num(s.resources.budget - cost) })),
          h("div", { class: "chips" }, GT.buildingPanel.effectChips(pv, def.perTurn || {})),
          h("p", { class: "small muted" }, t("confirm.buildNote"))
        ]),
        actions: [{ label: t("ui.cancel") }, { label: t("ui.build") + " (" + num(cost) + " Geo$)", primary: true, onClick: function () { setTimeout(doBuild, 0); } }]
      });
    } else doBuild();
    void region;
  };

  app.actions.demolish = function (regionId, buildingId) {
    var s = app.state;
    var region = GT.state.getRegion(s, regionId);
    var b = region.buildings.filter(function (x) { return x.id === buildingId; })[0];
    var def = b && GT.state.buildingDef(b.buildingTypeId);
    if (!def) return;
    D.openModal({
      title: t("confirm.demolishTitle", { name: tx(def.name) }),
      body: h("p", null, t("confirm.demolishText")),
      actions: [{ label: t("ui.cancel") }, { label: t("ui.demolish"), primary: true, onClick: function () {
        var res = GT.buildings.demolish(s, regionId, buildingId);
        if (res.ok) { D.toast(t("toast.demolished", { name: tx(def.name) }), "neutral"); app.afterAction(); }
      } }]
    });
  };

  app.actions.resolveEvent = function (choiceId) {
    var s = app.state;
    var ev = s.activeEvent;
    var res = GT.events.resolveChoice(s, choiceId);
    if (!res.ok) { D.sound("error"); D.toast(GT.buildingPanel.errorText(res), "bad"); return; }
    D.sound("build");
    var def = GT.state.eventDef(ev.eventId);
    D.toast(t("toast.decision", { event: tx(def.title), choice: GT.eventModal.choiceLabel(ev.eventId, choiceId) }), "good");
    app.afterAction();
  };

  app.actions.endTurn = function () {
    var s = app.state;
    if (!s || s.status !== "playing") return;
    if (s.activeEvent) {
      D.toast(t("err.EVENT_PENDING"), "bad");
      GT.eventModal.open(s, app.actions);
      return;
    }
    var res = GT.gameLoop.endTurn(s);
    if (!res.ok) { D.toast(GT.buildingPanel.errorText(res), "bad"); return; }
    autosave();
    D.sound("turn");
    renderGame(true);
    GT.summaryPanel.openTurnSummary(s, res.data, function () {
      if (s.status === "finished") { D.sound("end"); app.show("end"); }
      else if (s.activeEvent) GT.eventModal.open(s, app.actions);
      else { var b = D.$("#btn-end-turn"); if (b) b.focus(); }
    });
  };

  // ---------- Ekran gry ----------
  function buildGameSkeleton() {
    var el = screenEl("game");
    if (el.getAttribute("data-built") === GT.i18n.getLang()) return;
    D.clear(el);
    el.appendChild(h("div", { class: "game" }, [
      h("div", { class: "topbar", id: "topbar", "aria-label": t("game.resourcesAria"), role: "region" }),
      h("div", { class: "game-main" }, [
        h("div", { class: "map-area" }, [
          h("div", { class: "goal-strip", id: "goal-strip" }),
          h("div", { class: "tutorial", id: "tutorial", role: "region", "aria-label": t("tut.title") }),
          h("div", { class: "map", id: "map" })
        ]),
        h("aside", { class: "side", "aria-label": t("game.sideAria") }, [
          h("div", { class: "panel region-panel", id: "region-panel", role: "region", "aria-live": "polite" }),
          h("div", { class: "panel events-panel", id: "events-panel", role: "region", "aria-label": t("event.panelTitle") })
        ])
      ]),
      h("div", { class: "bottombar", id: "bottombar" })
    ]));
    el.setAttribute("data-built", GT.i18n.getLang());
  }

  var lastValues = {};
  function renderTopbar(flash) {
    var s = app.state, bar = D.$("#topbar");
    D.clear(bar);
    var fc = GT.gameLoop.forecast(s);
    var rep = s.lastReport;
    bar.appendChild(h("div", { class: "year-box" }, [
      h("span", { class: "small muted" }, t("game.year")),
      h("strong", { class: "year-num" }, t("game.yearOf", { n: Math.min(s.turn, s.maxTurns), max: s.maxTurns })),
      h("div", { class: "year-progress", "aria-hidden": "true" }, h("div", { style: "width:" + Math.round((Math.min(s.turn, s.maxTurns) - 1) / s.maxTurns * 100) + "%" }))
    ]));
    GT.summaryPanel.RES.forEach(function (r) {
      var key = r[0], v = s.resources[key];
      var warn = (key === "food" && fc.foodShortage) || (key === "energy" && fc.energyShortage) || (key === "budget" && (fc.budgetCrisis || v < 0)) ||
        ((key === "satisfaction" || key === "environment") && v < 40);
      var forecastText = (key === "budget" || key === "food" || key === "energy") ? t("game.forecast", { n: signed(fc[key]) }) :
        (rep ? t("game.lastTurn", { n: signed(rep.deltas[key] || 0) }) : "");
      var changed = flash && lastValues[key] !== undefined && lastValues[key] !== v;
      lastValues[key] = v;
      bar.appendChild(h("div", { class: "res" + (warn ? " res-warn" : "") + (changed ? " res-flash" : ""), title: t("howto.res." + key) }, [
        h("span", { class: "res-icon", "aria-hidden": "true" }, r[1]),
        h("div", { class: "res-text" }, [
          h("span", { class: "res-label" }, t("res." + key)),
          h("strong", { class: "res-value", "data-res": key }, num(v) + (key === "satisfaction" || key === "environment" || key === "technology" ? "/100" : "")),
          forecastText ? h("span", { class: "res-forecast" }, forecastText) : null
        ]),
        warn ? h("span", { class: "res-alert", role: "img", "aria-label": t("game.warning") }, "⚠️") : null
      ]));
    });
  }

  function renderGoals() {
    var s = app.state, el = D.$("#goal-strip");
    D.clear(el);
    var sc = GT.state.scenarioById(s.scenarioId);
    var goals = GT.scoring.allGoals(s).map(function (g) { return GT.summaryPanel.goalText({ goal: g }); });
    el.appendChild(h("span", { class: "goal-scn" }, [h("span", { "aria-hidden": "true" }, sc.icon + " "), tx(sc.name)]));
    el.appendChild(h("span", { class: "goal-text" }, [h("span", { "aria-hidden": "true" }, "🎯 "), t("game.goal") + ": " + goals.join(" · ")]));
    el.appendChild(h("span", { class: "goal-inv small muted" }, t("game.investments", { n: s.investmentsThisTurn, max: GT.DATA.balance.maxInvestmentsPerTurn })));
  }

  function renderBottombar() {
    var s = app.state, el = D.$("#bottombar");
    D.clear(el);
    el.appendChild(h("div", { class: "bb-left" }, [
      h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.show("menu"); } }, [h("span", { "aria-hidden": "true" }, "🏠 "), t("game.menu")]),
      h("button", { class: "btn btn-ghost", type: "button", onclick: function () { autosave(); D.toast(t("toast.saved"), "good"); } }, [h("span", { "aria-hidden": "true" }, "💾 "), t("game.save")]),
      h("button", { class: "btn btn-ghost", type: "button", onclick: function () { GT.summaryPanel.openStats(s); } }, [h("span", { "aria-hidden": "true" }, "📈 "), t("game.stats")]),
      h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.show("howto"); } }, [h("span", { "aria-hidden": "true" }, "📖 "), t("game.help")]),
      h("button", { class: "btn btn-ghost", type: "button", onclick: function () { app.show("settings"); } }, [h("span", { "aria-hidden": "true" }, "⚙️ "), t("game.settings")]),
      app.settings.debug ? h("button", { class: "btn btn-ghost", type: "button", onclick: function () { GT.screens.openDebug(app); } }, [h("span", { "aria-hidden": "true" }, "🐞 "), "Debug"]) : null
    ]));
    el.appendChild(h("button", { class: "btn btn-primary btn-lg btn-end-turn" + (s.activeEvent ? " needs-decision" : ""), id: "btn-end-turn", type: "button",
      onclick: app.actions.endTurn }, s.activeEvent ? [h("span", { "aria-hidden": "true" }, "📣 "), t("game.decideFirst")] : [t("game.endTurn"), h("span", { "aria-hidden": "true" }, " ⏭")]));
  }

  function renderGame(flash) {
    var s = app.state;
    if (!s) { app.show("menu"); return; }
    // Po ostatniej turze ekran końcowy pokazujemy dopiero po zamknięciu podsumowania
    if (s.status === "finished" && !flash) { app.show("end"); return; }
    renderTopbar(flash);
    renderGoals();
    GT.mapView.render(D.$("#map"), s, app.actions.select);
    GT.regionPanel.render(D.$("#region-panel"), s, app.actions);
    GT.eventModal.renderPanel(D.$("#events-panel"), s, app.actions);
    GT.screens.renderTutorial(D.$("#tutorial"), app);
    renderBottombar();
  }
  app.renderGame = renderGame;

  // ---------- Inicjalizacja ----------
  function init() {
    app.settings = GT.saveManager.loadSettings(DEFAULT_SETTINGS);
    if (!app.settings.lang || GT.i18n.SUPPORTED.indexOf(app.settings.lang) < 0) app.settings.lang = "pl";
    applyLang();
    applyMotion();
    D.$("#app-version").textContent = "v" + GT.DATA.balance.appVersion;

    document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        app.settings.lang = b.getAttribute("data-lang");
        GT.saveManager.saveSettings(app.settings);
        D.closeAllModals();
        applyLang();
        renderScreen();
      });
    });
    D.$("#theme-toggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      app.settings.theme = cur === "dark" ? "light" : "dark";
      GT.saveManager.saveSettings(app.settings);
      applyTheme();
    });
    D.$("#brand").addEventListener("click", function () { app.show("menu"); });

    // Globalne skróty: Escape w grze zamyka panel regionu
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !D.hasModal() && app.screen === "game" && app.state && app.state.selectedRegionId) app.actions.select(null);
    });

    window.addEventListener("error", function (e) {
      if (window.console) console.error("GeoTycoon:", e.message);
    });

    app.show("menu");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.GT = window.GT || {});
