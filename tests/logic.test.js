/*
 * Testy logiki gry (bez przeglądarki i bez zależności).
 * Uruchomienie:  node tests/logic.test.js
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");

var ROOT = path.join(__dirname, "..");
var FILES = [
  "data/balance.js", "data/regions.js", "data/buildings.js", "data/events.js", "data/scenarios.js",
  "js/utils/validation.js", "js/utils/random.js",
  "js/state.js", "js/economy.js", "js/buildings.js", "js/events.js", "js/scoring.js", "js/gameLoop.js", "js/saveManager.js"
];

function loadGT() {
  var ctx = { console: console };
  ctx.window = ctx;
  vm.createContext(ctx);
  FILES.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); });
  var mem = {};
  ctx.GT.saveManager.setStorage({
    getItem: function (k) { return k in mem ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; }
  });
  ctx.GT._mem = mem;
  return ctx.GT;
}

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(loadGT()); passed++; console.log("  ✔ " + name); }
  catch (e) { failed++; console.log("  ✘ " + name + "\n    " + (e.stack || e)); }
}
function newGame(GT, sc, opts) {
  var r = GT.state.createGame(sc || "greenValley", Object.assign({ seed: 12345 }, opts || {}));
  assert.ok(r.ok);
  return r.data;
}
function resolveAny(GT, s) {
  if (!s.activeEvent) return;
  var def = GT.state.eventDef(s.activeEvent.eventId);
  var free = def.choices.filter(function (c) { return GT.events.choiceAvailability(s, c).ok; })[0];
  assert.ok(free, "brak dostępnego wyboru dla " + def.id);
  assert.ok(GT.events.resolveChoice(s, free.id).ok);
}

console.log("GeoTycoon — testy logiki");

test("Dane: 12 regionów, ≥6 budynków, ≥10 wydarzeń, 3 scenariusze, darmowa opcja w każdym evencie", function (GT) {
  assert.strictEqual(GT.DATA.regions.length, 12);
  assert.ok(GT.DATA.buildings.length >= 6);
  assert.ok(GT.DATA.events.length >= 10);
  assert.strictEqual(GT.DATA.scenarios.length, 3);
  GT.DATA.events.forEach(function (e) {
    assert.ok(e.choices.some(function (c) { return c.cost === 0 && !c.requires; }), e.id + " bez darmowej opcji");
    ["title", "desc", "note"].forEach(function (k) { assert.ok(e[k].pl && e[k].en, e.id + "." + k); });
  });
});

test("T-02 Nowa gra: stan startowy zgodny ze scenariuszem", function (GT) {
  var s = newGame(GT, "greenValley");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.resources)), { budget: 5000, food: 100, energy: 50, population: 10000, satisfaction: 70, environment: 85, technology: 10 });
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.maxTurns, 15);
  assert.strictEqual(s.regions.length, 12);
  var c = newGame(GT, "coastalState");
  assert.strictEqual(GT.state.getRegion(c, "r05").buildings[0].buildingTypeId, "port");
  var d = newGame(GT, "desertRepublic");
  assert.strictEqual(GT.state.getRegion(d, "r10").terrainType, "desert");
  // szablon nie jest mutowany
  assert.strictEqual(GT.DATA.regions[9].terrainType, "lowland");
});

test("T-04 Budowa farmy pobiera koszt i dodaje budynek", function (GT) {
  var s = newGame(GT);
  var r = GT.buildings.build(s, "r06", "farm");
  assert.ok(r.ok);
  assert.strictEqual(s.resources.budget, 4500);
  assert.strictEqual(GT.state.getRegion(s, "r06").buildings.length, 1);
});

test("T-05 Brak budżetu blokuje budowę z kodem NO_BUDGET", function (GT) {
  var s = newGame(GT);
  s.resources.budget = 100;
  var r = GT.buildings.build(s, "r06", "farm");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, "NO_BUDGET");
  assert.strictEqual(s.resources.budget, 100);
});

test("T-06 Port w regionie śródlądowym jest niedostępny (REQ_FLAG coastal)", function (GT) {
  var s = newGame(GT);
  var r = GT.buildings.canBuild(s, "r07", "port");
  assert.strictEqual(r.code, "REQ_FLAG");
  assert.strictEqual(r.params.attr, "coastal");
  assert.ok(GT.buildings.canBuild(s, "r01", "port").ok);
});

test("Limity: 3 budynki w regionie, 3 inwestycje na turę, wymagania hydro/farmy", function (GT) {
  var s = newGame(GT);
  s.resources.budget = 99999;
  assert.strictEqual(GT.buildings.canBuild(s, "r12", "farm").code, "REQ_NOT_DESERT");
  assert.strictEqual(GT.buildings.canBuild(s, "r07", "hydro").code, "REQ_ATTR");
  assert.ok(GT.buildings.canBuild(s, "r08", "hydro").ok);
  assert.ok(GT.buildings.build(s, "r06", "farm").ok);
  assert.ok(GT.buildings.build(s, "r06", "farm").ok);
  assert.strictEqual(GT.buildings.canBuild(s, "r06", "farm").code, "TYPE_LIMIT");
  assert.ok(GT.buildings.build(s, "r06", "solar").ok);
  assert.strictEqual(GT.buildings.canBuild(s, "r07", "farm").code, "TURN_LIMIT");
  s.investmentsThisTurn = 0;
  assert.strictEqual(GT.buildings.canBuild(s, "r06", "wind").code, "REGION_FULL");
});

test("T-07 Tura: produkcja od następnej tury, koszty i zasoby zgodnie z regułami", function (GT) {
  var s = newGame(GT);
  GT.buildings.build(s, "r06", "farm");
  var rep1 = GT.gameLoop.endTurn(s).data;
  assert.strictEqual(rep1.breakdown.foodProduced, 0, "farma nie produkuje w turze budowy");
  resolveAny(GT, s);
  var food = s.resources.food;
  var rep2 = GT.gameLoop.endTurn(s).data;
  assert.ok(rep2.breakdown.foodProduced > 20, "farma produkuje: " + rep2.breakdown.foodProduced);
  assert.strictEqual(s.turn, 3);
  assert.ok(Number.isInteger(s.resources.budget));
});

test("T-08 Niedobór żywności obniża zadowolenie", function (GT) {
  var s = newGame(GT);
  s.resources.food = 0;
  var sat = s.resources.satisfaction;
  var rep = GT.gameLoop.endTurn(s).data;
  assert.ok(rep.deficits.food > 0);
  assert.ok(s.flags.foodShortage);
  assert.ok(s.resources.satisfaction <= sat - 8, "satisfaction " + s.resources.satisfaction);
  assert.strictEqual(s.resources.food, 0);
});

test("Niedobór energii ogranicza dochód fabryk", function (GT) {
  var s = newGame(GT);
  s.resources.budget = 99999;
  GT.buildings.build(s, "r07", "factory");
  GT.buildings.build(s, "r05", "factory");
  s.turn = 2; s.resources.energy = 0;
  var rep = GT.gameLoop.endTurn(s).data;
  assert.ok(rep.deficits.energy > 0);
  assert.strictEqual(rep.breakdown.industryIncome, 0);
  assert.strictEqual(s.resources.energy, 0);
});

test("T-09 Wymuszony event: wybór stosuje efekty i koszt", function (GT) {
  var s = newGame(GT);
  GT.buildings.build(s, "r11", "solar");
  var rep = GT.gameLoop.endTurn(s, { forceEventId: "drought" }).data;
  assert.strictEqual(rep.event.eventId, "drought");
  assert.ok(s.activeEvent);
  assert.strictEqual(GT.gameLoop.endTurn(s).code, "EVENT_PENDING");
  var region = GT.state.getRegion(s, s.activeEvent.regionId);
  var water = region.waterAvailability, budget = s.resources.budget;
  assert.ok(GT.events.resolveChoice(s, "irrigate").ok);
  assert.strictEqual(s.resources.budget, budget - 2000);
  assert.strictEqual(region.irrigated, true);
  assert.strictEqual(region.waterAvailability, Math.min(100, water + 15));
  assert.strictEqual(s.modifiers.filter(function (m) { return m.tag === "drought"; }).length, 0);
  assert.strictEqual(s.activeEvent, null);
});

test("Warunki wydarzeń: powódź tylko przy rzece, sztorm tylko na wybrzeżu", function (GT) {
  var s = newGame(GT);
  var flood = GT.state.eventDef("flood"), storm = GT.state.eventDef("storm");
  GT.events.eligibleRegions(s, flood).forEach(function (r) { assert.ok(r.river); });
  GT.events.eligibleRegions(s, storm).forEach(function (r) { assert.ok(r.coastal); });
  GT.state.getRegion(s, "r06").floodProtected = true;
  assert.ok(!GT.events.eligibleRegions(s, flood).some(function (r) { return r.id === "r06"; }));
});

test("Cooldown i maks. 1 wydarzenie: ten sam event nie powtarza się od razu", function (GT) {
  var s = newGame(GT);
  GT.gameLoop.endTurn(s, { forceEventId: "economicGrowth" });
  resolveAny(GT, s);
  var ids = GT.events.candidates(s).map(function (c) { return c.def.id; });
  assert.ok(ids.indexOf("economicGrowth") === -1);
});

test("Determinizm: to samo ziarno + te same decyzje = ten sam przebieg", function (GT) {
  function run() {
    var G = loadGT(), s = newGame(G, "greenValley", { seed: 777 });
    for (var i = 0; i < 15 && s.status === "playing"; i++) { resolveAny(G, s); G.gameLoop.endTurn(s); }
    return JSON.stringify([s.resources, s.eventHistory]);
  }
  assert.strictEqual(run(), run());
});

test("T-10 Autosave i wczytanie po 'ponownym otwarciu'", function (GT) {
  var s = newGame(GT);
  GT.buildings.build(s, "r06", "farm");
  GT.gameLoop.endTurn(s);
  assert.ok(GT.saveManager.save(s).ok);
  var l = GT.saveManager.load();
  assert.ok(l.ok);
  assert.strictEqual(l.data.state.turn, 2);
  assert.strictEqual(GT.state.getRegion(l.data.state, "r06").buildings.length, 1);
  GT.gameLoop.endTurn(l.data.state);
  GT.saveManager.save(l.data.state);
  assert.ok(GT.saveManager.loadBackup().ok, "kopia zapasowa");
});

test("T-11 Uszkodzony zapis: komunikat zamiast crasha, zapis nie jest nadpisywany", function (GT) {
  GT._mem[GT.saveManager.SAVE_KEY] = "{to nie jest json";
  var st = GT.saveManager.saveStatus();
  assert.strictEqual(st.status, "corrupt");
  assert.strictEqual(st.error.code, "SAVE_CORRUPT");
  assert.strictEqual(GT._mem[GT.saveManager.SAVE_KEY], "{to nie jest json");
  var s = newGame(GT);
  s.resources.satisfaction = 500;
  GT._mem[GT.saveManager.SAVE_KEY] = GT.saveManager.exportJSON(s);
  assert.strictEqual(GT.saveManager.load().code, "SAVE_INVALID");
  var bad = newGame(GT); bad.regions[0].buildings.push({ id: "b9", buildingTypeId: "spaceport" });
  assert.strictEqual(GT.saveManager.importJSON(GT.saveManager.exportJSON(bad)).code, "SAVE_INVALID");
});

test("T-12 Koniec gry po maxTurns: wynik 0–100 i ocena", function (GT) {
  var s = newGame(GT, "greenValley", { maxTurns: 10 });
  s.turn = 10;
  GT.gameLoop.endTurn(s);
  assert.strictEqual(s.status, "finished");
  var sc = s.finalScore;
  assert.ok(sc.total >= 0 && sc.total <= 100);
  assert.ok(["crisis", "developing", "stable", "model"].indexOf(sc.rating) >= 0);
  assert.strictEqual(GT.gameLoop.endTurn(s).code, "GAME_OVER");
});

test("Pełne partie (wszystkie scenariusze, prosta strategia) bez NaN i z wartościami w zakresach", function (GT) {
  ["greenValley", "desertRepublic", "coastalState"].forEach(function (id) {
    var s = newGame(GT, id, { seed: 99 });
    var plan = [["r06", "farm"], ["r03", "wind"], ["r10", "farm"], ["r07", "factory"], ["r11", "solar"], ["r05", "port"], ["r07", "university"], ["r07", "treatment"], ["r09", "resort"], ["r08", "hydro"]];
    while (s.status === "playing") {
      resolveAny(GT, s);
      plan.forEach(function (p) { GT.buildings.build(s, p[0], p[1]); });
      var r = GT.gameLoop.endTurn(s);
      assert.ok(r.ok, r.code);
    }
    var res = s.resources;
    Object.keys(res).forEach(function (k) { assert.ok(Number.isFinite(res[k]), k + " NaN"); });
    ["satisfaction", "environment", "technology"].forEach(function (k) { assert.ok(res[k] >= 0 && res[k] <= 100); });
    console.log("      " + id + ": wynik " + s.finalScore.total + " (" + s.finalScore.rating + ") " + JSON.stringify(s.finalScore.dims) + " budżet " + res.budget + " ludność " + res.population);
  });
});

test("Tłumaczenia: PL i EN mają ten sam zestaw kluczy, dane mają teksty w obu językach", function () {
  var ctx = { console: console }; ctx.window = ctx; vm.createContext(ctx);
  ["data/regions.js", "data/buildings.js", "data/events.js", "data/scenarios.js", "js/i18n/pl.js", "js/i18n/en.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
  });
  var pl = Object.keys(ctx.GT.I18N.pl), en = Object.keys(ctx.GT.I18N.en);
  assert.deepStrictEqual(pl.filter(function (k) { return en.indexOf(k) < 0; }), [], "brak w EN");
  assert.deepStrictEqual(en.filter(function (k) { return pl.indexOf(k) < 0; }), [], "brak w PL");
  function both(o, where) { assert.ok(o && o.pl && o.en, "brak tłumaczenia: " + where); }
  ctx.GT.DATA.regions.forEach(function (r) { both(r.name, r.id); both(r.desc, r.id); });
  ctx.GT.DATA.buildings.forEach(function (b) { both(b.name, b.id); both(b.desc, b.id); both(b.edu, b.id); });
  ctx.GT.DATA.scenarios.forEach(function (sc) { both(sc.name, sc.id); both(sc.desc, sc.id); });
  ctx.GT.DATA.events.forEach(function (e) { e.choices.forEach(function (c) { both(c.label, e.id + "." + c.id); both(c.desc, e.id + "." + c.id); }); });
});

test("Wszystkie klucze t(\"...\") użyte w kodzie istnieją w słowniku", function () {
  var ctx = { console: console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/i18n/pl.js"), "utf8"), ctx);
  var dict = ctx.GT.I18N.pl, missing = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach(function (f) {
      var full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) return walk(full);
      if (!/\.js$/.test(f) || /i18n/.test(full)) return;
      var src = fs.readFileSync(full, "utf8"), re = /\bt\("([a-zA-Z0-9_.]+)"(?!\s*\+)/g, m;
      while ((m = re.exec(src))) if (!(m[1] in dict) && !/\.$/.test(m[1])) missing.push(m[1] + " (" + f + ")");
    });
  }
  walk(path.join(ROOT, "js"));
  assert.deepStrictEqual(missing, []);
});

console.log("\n" + passed + " zaliczonych, " + failed + " niezaliczonych");
process.exit(failed ? 1 : 0);
