/*
 * mapView.js — interaktywna mapa SVG: regiony (klik / klawiatura), ikony budynków,
 * oznaczenia wydarzeń i zanieczyszczenia, podpowiedź po najechaniu lub fokusie.
 */
(function (GT) {
  var D = GT.dom, G = GT.mapGeometry, t = GT.i18n.t, tx = GT.i18n.tx;

  var TERRAIN_ICON = { lowland: "🌾", mountains: "⛰️", coastal: "🏖️", desert: "🏜️", forest: "🌲", riverValley: "🏞️" };
  var KEY_ATTRS = [
    ["fertility", "🌱"], ["waterAvailability", "💧"], ["sunlight", "☀️"], ["windPotential", "🌬️"],
    ["mineralRichness", "💎"], ["tourismPotential", "📸"]
  ];

  function topAttribute(region) {
    var best = KEY_ATTRS[0];
    KEY_ATTRS.forEach(function (a) { if (region[a[0]] > region[best[0]]) best = a; });
    return { attr: best[0], icon: best[1], value: region[best[0]] };
  }

  function regionLabel(state, region) {
    var tpl = GT.state.regionTemplate(region.id);
    return tx(tpl.name);
  }

  function render(container, state, onSelect) {
    var focusedId = document.activeElement && document.activeElement.getAttribute
      ? document.activeElement.getAttribute("data-region") : null;
    D.clear(container);
    var svg = D.svg("svg", { viewBox: G.VIEWBOX, class: "map-svg", role: "group",
      "aria-label": t("map.aria") });

    var defs = D.svg("defs", null, [
      D.svg("pattern", { id: "hatch", width: 10, height: 10, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" },
        D.svg("line", { x1: 0, y1: 0, x2: 0, y2: 10, class: "hatch-line" })),
      D.svg("pattern", { id: "waves", width: 60, height: 24, patternUnits: "userSpaceOnUse" },
        D.svg("path", { d: "M0 12 Q15 4 30 12 T60 12", class: "wave-line" })),
      D.svg("filter", { id: "shadow", x: "-10%", y: "-10%", width: "120%", height: "120%" },
        D.svg("feDropShadow", { dx: 0, dy: 3, stdDeviation: 4, "flood-opacity": 0.25 }))
    ]);
    svg.appendChild(defs);

    // Morze i tło
    svg.appendChild(D.svg("rect", { x: 0, y: 0, width: G.WIDTH, height: G.HEIGHT, class: "map-sea" }));
    svg.appendChild(D.svg("rect", { x: 0, y: 0, width: G.WIDTH, height: G.HEIGHT, fill: "url(#waves)", class: "map-waves" }));
    svg.appendChild(D.svg("text", { x: 40, y: 600, class: "sea-label", transform: "rotate(-90 40 600)" }, t("map.sea")));
    svg.appendChild(D.svg("path", { d: G.countryPath(), class: "map-country", filter: "url(#shadow)" }));

    var regionsLayer = D.svg("g", { class: "regions-layer" });
    var labelsLayer = D.svg("g", { class: "labels-layer", "aria-hidden": "true" });
    var ev = state.activeEvent;

    state.regions.forEach(function (region) {
      var name = regionLabel(state, region);
      var top = topAttribute(region);
      var selected = state.selectedRegionId === region.id;
      var hasEvent = ev && ev.regionId === region.id;
      var modifiers = state.modifiers.filter(function (m) { return m.regionId === region.id; });
      var aria = name + ", " + t("terrain." + region.terrainType) + ", " +
        t("ui.buildingsCount", { n: region.buildings.length, max: GT.DATA.balance.maxBuildingsPerRegion }) +
        (hasEvent ? ", " + t("map.eventHere") : "");
      var g = D.svg("g", {
        class: "region terrain-" + region.terrainType + (selected ? " selected" : "") + (hasEvent ? " has-event" : ""),
        tabindex: 0, role: "button", "aria-pressed": selected ? "true" : "false", "aria-label": aria, "data-region": region.id
      });
      var d = G.regionPath(region.col, region.row);
      g.appendChild(D.svg("path", { d: d, class: "region-shape" }));
      if (region.pollution >= GT.DATA.balance.environment.highPollutionThreshold)
        g.appendChild(D.svg("path", { d: d, class: "region-pollution", fill: "url(#hatch)" }));
      g.addEventListener("click", function () { onSelect(region.id); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(region.id); }
      });
      g.addEventListener("mouseenter", function (e) { showTip(container, region, name, top, e); });
      g.addEventListener("mousemove", function (e) { moveTip(container, e); });
      g.addEventListener("mouseleave", function () { hideTip(container); });
      g.addEventListener("focus", function () { showTip(container, region, name, top, null, g); });
      g.addEventListener("blur", function () { hideTip(container); });
      regionsLayer.appendChild(g);

      // Etykiety
      var c = G.centroid(region.col, region.row);
      labelsLayer.appendChild(D.svg("text", { x: c[0], y: c[1] - 28, class: "region-icon" }, TERRAIN_ICON[region.terrainType] || "📍"));
      labelsLayer.appendChild(D.svg("text", { x: c[0], y: c[1] + 2, class: "region-name" + (selected ? " selected" : "") }, name));
      var icons = region.buildings.map(function (b) {
        var def = GT.state.buildingDef(b.buildingTypeId);
        return def ? def.icon : "";
      }).join(" ");
      var slots = GT.DATA.balance.maxBuildingsPerRegion - region.buildings.length;
      var slotText = icons + (slots > 0 ? (icons ? " " : "") + new Array(slots + 1).join("▫") : "");
      labelsLayer.appendChild(D.svg("text", { x: c[0], y: c[1] + 32, class: "region-buildings" }, slotText));
      if (hasEvent) {
        var evDef = GT.state.eventDef(ev.eventId);
        labelsLayer.appendChild(D.svg("g", { class: "event-marker" }, [
          D.svg("circle", { cx: c[0] + 70, cy: c[1] - 40, r: 20 }),
          D.svg("text", { x: c[0] + 70, y: c[1] - 33 }, evDef ? evDef.icon : "⚠️")
        ]));
      } else if (modifiers.length) {
        var mDef = GT.state.eventDef(modifiers[0].eventId);
        labelsLayer.appendChild(D.svg("text", { x: c[0] + 70, y: c[1] - 33, class: "modifier-marker" }, mDef ? mDef.icon : "⚠️"));
      }
    });

    svg.appendChild(regionsLayer);
    svg.appendChild(D.svg("path", { d: G.riverPath(), class: "map-river" }));
    svg.appendChild(labelsLayer);

    // Róża wiatrów
    svg.appendChild(D.svg("g", { class: "compass", transform: "translate(955 620)", "aria-hidden": "true" }, [
      D.svg("path", { d: "M0,-26 L8,0 L0,-6 L-8,0 Z" }),
      D.svg("text", { x: 0, y: -32 }, "N")
    ]));

    container.appendChild(svg);
    container.appendChild(D.h("div", { class: "map-tip", role: "tooltip", hidden: true }));
    if (focusedId) {
      var el = container.querySelector('[data-region="' + focusedId + '"]');
      if (el) el.focus();
    }
  }

  function showTip(container, region, name, top, e, el) {
    var tip = container.querySelector(".map-tip");
    if (!tip) return;
    D.clear(tip);
    tip.appendChild(D.h("strong", null, name));
    tip.appendChild(D.h("span", null, top.icon + " " + t("attr." + top.attr) + ": " + top.value));
    tip.hidden = false;
    if (e) moveTip(container, e);
    else if (el) {
      // Pozycja z rzeczywistego prostokąta regionu (działa także przy przechyleniu mapy 3D)
      var rect = container.getBoundingClientRect(), r = el.getBoundingClientRect();
      tip.style.left = Math.max(4, Math.min(rect.width - 230, r.left - rect.left + r.width / 2 - 60)) + "px";
      tip.style.top = Math.max(4, r.top - rect.top - 10) + "px";
    }
  }
  function moveTip(container, e) {
    var tip = container.querySelector(".map-tip");
    if (!tip) return;
    var rect = container.getBoundingClientRect();
    var x = e.clientX - rect.left + 16, y = e.clientY - rect.top + 16;
    if (x + 220 > rect.width) x = e.clientX - rect.left - 220;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip(container) {
    var tip = container.querySelector(".map-tip");
    if (tip) tip.hidden = true;
  }

  GT.mapView = { render: render, TERRAIN_ICON: TERRAIN_ICON };
})(window.GT = window.GT || {});
