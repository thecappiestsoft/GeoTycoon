/*
 * regionPanel.js — panel szczegółów regionu: cechy geograficzne, budynki (sloty), modyfikatory
 * wydarzeń i lista budynków do zbudowania.
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num;

  var ATTRS = [
    ["fertility", "🌱"], ["waterAvailability", "💧"], ["sunlight", "☀️"], ["windPotential", "🌬️"],
    ["mineralRichness", "💎"], ["terrainDifficulty", "🧗"], ["tourismPotential", "📸"], ["urbanization", "🏙️"], ["pollution", "☁️"]
  ];

  function attrBar(region, a) {
    var v = region[a[0]];
    var bad = a[0] === "pollution" || a[0] === "terrainDifficulty";
    var level = v >= 66 ? "high" : v >= 33 ? "mid" : "low";
    return h("div", { class: "attr" }, [
      h("span", { class: "attr-label" }, [h("span", { "aria-hidden": "true" }, a[1] + " "), t("attr." + a[0])]),
      h("div", { class: "bar " + (bad ? "bar-inverse " : "") + "bar-" + level, role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v, "aria-label": t("attr." + a[0]) },
        h("div", { class: "bar-fill", style: "width:" + v + "%" })),
      h("span", { class: "attr-value" }, String(v))
    ]);
  }

  function modifierText(m) {
    var ev = GT.state.eventDef(m.eventId);
    var name = ev ? tx(ev.title) : m.tag;
    var effect = typeof m.factor === "number" ? t("mod." + m.kind, { pct: Math.round((1 - m.factor) * 100) }) : t("mod." + m.kind, { n: m.delta });
    return t("mod.line", { name: name, effect: effect, turns: m.turnsLeft });
  }

  function render(container, state, actions) {
    D.clear(container);
    var region = state.selectedRegionId ? GT.state.getRegion(state, state.selectedRegionId) : null;
    if (!region) {
      container.appendChild(h("div", { class: "empty-panel" }, [
        h("div", { class: "empty-icon", "aria-hidden": "true" }, "🗺️"),
        h("h3", null, t("region.noneTitle")),
        h("p", null, t("region.noneText"))
      ]));
      return;
    }
    var tpl = GT.state.regionTemplate(region.id);
    var B = GT.DATA.balance;

    var tags = [];
    function tag(icon, key) { tags.push(h("span", { class: "tag" }, [h("span", { "aria-hidden": "true" }, icon + " "), t(key)])); }
    if (region.coastal) tag("🌊", "tag.coastal");
    if (region.river) tag("〰️", "tag.river");
    if (region.forest) tag("🌲", "tag.forest");
    if (region.irrigated) tag("🚿", "tag.irrigated");
    if (region.floodProtected) tag("🛡️", "tag.floodProtected");
    if (region.stormProtected) tag("🛡️", "tag.stormProtected");
    if (region.slopeProtected) tag("🛡️", "tag.slopeProtected");

    var mods = state.modifiers.filter(function (m) { return m.regionId === region.id; });

    container.appendChild(h("header", { class: "region-head" }, [
      h("span", { class: "region-head-icon", "aria-hidden": "true" }, GT.mapView.TERRAIN_ICON[region.terrainType]),
      h("div", null, [
        h("h2", { id: "region-title" }, tx(tpl.name)),
        h("p", { class: "muted" }, t("terrain." + region.terrainType) + " · " + t("climate." + region.climate) + " · " +
          t("region.population", { n: num(GT.state.regionPopulation(state, region)) }))
      ]),
      h("button", { class: "icon-btn", type: "button", "aria-label": t("ui.closePanel"), title: t("ui.closePanel"), onclick: function () { actions.select(null); } }, "✕")
    ]));
    container.appendChild(h("p", { class: "region-desc" }, tx(tpl.desc)));
    if (tags.length) container.appendChild(h("div", { class: "tags" }, tags));
    if (mods.length) container.appendChild(h("div", { class: "notice notice-bad", role: "note" }, mods.map(function (m) {
      return h("div", null, [h("span", { "aria-hidden": "true" }, "⚠️ "), modifierText(m)]);
    })));

    container.appendChild(h("details", { class: "section", open: true }, [
      h("summary", null, h("h3", null, t("region.geography"))),
      h("div", { class: "attrs" }, ATTRS.map(function (a) { return attrBar(region, a); }))
    ]));

    // Budynki w regionie
    var slots = [];
    region.buildings.forEach(function (b) {
      var def = GT.state.buildingDef(b.buildingTypeId);
      var operational = GT.state.isOperational(state, b);
      var out = GT.economy.effectiveOutput(state, region, def);
      var outText = [out.food ? "🍞 " + Math.round(out.food) : "", out.energy ? "⚡ " + Math.round(out.energy) : "", out.income ? "💰 " + Math.round(out.income) : ""].filter(Boolean).join(" · ");
      slots.push(h("li", { class: "slot slot-filled" }, [
        h("span", { class: "slot-icon", "aria-hidden": "true" }, def.icon),
        h("div", { class: "slot-info" }, [
          h("strong", null, tx(def.name)),
          h("span", { class: "small " + (operational ? "ok-text" : "muted") }, operational
            ? t("region.working") + (outText ? " · " + outText : "")
            : "🚧 " + t("region.underConstruction"))
        ]),
        h("button", { class: "icon-btn danger", type: "button", title: t("ui.demolish"), "aria-label": t("ui.demolishNamed", { name: tx(def.name) }),
          disabled: state.status !== "playing", onclick: function () { actions.demolish(region.id, b.id); } }, "🗑️")
      ]));
    });
    for (var i = region.buildings.length; i < B.maxBuildingsPerRegion; i++)
      slots.push(h("li", { class: "slot slot-empty" }, [h("span", { class: "slot-icon", "aria-hidden": "true" }, "＋"), h("span", { class: "muted" }, t("region.emptySlot"))]));
    container.appendChild(h("section", { class: "section" }, [
      h("h3", null, t("region.buildings", { n: region.buildings.length, max: B.maxBuildingsPerRegion })),
      h("ul", { class: "slots" }, slots)
    ]));

    if (state.status === "playing") {
      var buildSection = h("section", { class: "section", "aria-labelledby": "build-title" }, [h("h3", { id: "build-title" }, t("region.build"))]);
      GT.buildingPanel.render(buildSection, state, region, actions);
      container.appendChild(buildSection);
    }
  }

  GT.regionPanel = { render: render };
})(window.GT = window.GT || {});
