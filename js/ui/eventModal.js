/*
 * eventModal.js — okno decyzji dla aktywnego wydarzenia, panel wydarzeń i dziennik.
 */
(function (GT) {
  var D = GT.dom, h = D.h, t = GT.i18n.t, tx = GT.i18n.tx, num = GT.i18n.num;

  function regionName(id) {
    var tpl = id ? GT.state.regionTemplate(id) : null;
    return tpl ? tx(tpl.name) : t("ui.wholeCountry");
  }

  function eventText(def, regionId) {
    return tx(def.desc).replace(/\{region\}/g, regionName(regionId));
  }

  function choiceLabel(eventId, choiceId) {
    var def = GT.state.eventDef(eventId);
    var c = def && def.choices.filter(function (x) { return x.id === choiceId; })[0];
    return c ? tx(c.label) : choiceId;
  }

  function open(state, actions) {
    var ev = state.activeEvent;
    if (!ev) return;
    var def = GT.state.eventDef(ev.eventId);
    if (!def) return;
    GT.dom.sound("event");
    var body = h("div", { class: "event-body" }, [
      h("div", { class: "event-hero tone-" + def.tone }, [
        h("span", { class: "event-icon", "aria-hidden": "true" }, def.icon),
        h("div", null, [
          h("p", { class: "event-meta" }, t("event.meta", { year: ev.turn, region: regionName(ev.regionId) })),
          h("p", { class: "event-desc" }, eventText(def, ev.regionId))
        ])
      ]),
      h("div", { class: "edu-note" }, [h("strong", null, [h("span", { "aria-hidden": "true" }, "💡 "), t("event.why")]), h("p", null, tx(def.note))]),
      h("h3", { class: "choices-title" }, t("event.choose")),
      h("div", { class: "choices" }, def.choices.map(function (c, i) {
        var avail = GT.events.choiceAvailability(state, c);
        return h("button", { class: "choice", type: "button", disabled: !avail.ok, "data-choice": c.id,
          onclick: function () { modal.close(); actions.resolveEvent(c.id); } }, [
          h("span", { class: "choice-letter", "aria-hidden": "true" }, String.fromCharCode(65 + i)),
          h("span", { class: "choice-main" }, [
            h("strong", null, tx(c.label)),
            h("span", { class: "choice-desc" }, tx(c.desc)),
            !avail.ok ? h("span", { class: "reason" }, "⛔ " + GT.buildingPanel.errorText(avail)) : null
          ]),
          h("span", { class: "choice-cost" + (c.cost ? "" : " free") }, c.cost ? num(c.cost) + " Geo$" : t("event.free"))
        ]);
      }))
    ]);
    var modal = D.openModal({ title: tx(def.title), body: body, className: "event-modal", wide: true });
  }

  function renderPanel(container, state, actions) {
    D.clear(container);
    var ev = state.activeEvent;
    container.appendChild(h("h3", null, t("event.panelTitle")));
    if (ev) {
      var def = GT.state.eventDef(ev.eventId);
      container.appendChild(h("div", { class: "event-card tone-" + def.tone }, [
        h("div", { class: "event-card-head" }, [
          h("span", { class: "event-icon-sm", "aria-hidden": "true" }, def.icon),
          h("div", null, [h("strong", null, tx(def.title)), h("div", { class: "small muted" }, regionName(ev.regionId))])
        ]),
        h("button", { class: "btn btn-warning btn-block", type: "button", onclick: function () { open(state, actions); } }, t("event.decide"))
      ]));
    } else {
      container.appendChild(h("p", { class: "muted small" }, t("event.none")));
    }
    var log = state.eventHistory.slice().reverse().slice(0, 12);
    container.appendChild(h("h4", { class: "log-title" }, t("event.log")));
    if (!log.length) container.appendChild(h("p", { class: "muted small" }, t("event.logEmpty")));
    else container.appendChild(h("ul", { class: "event-log" }, log.map(function (e) {
      var def = GT.state.eventDef(e.eventId);
      return h("li", null, [
        h("span", { class: "log-year" }, t("ui.yearShort", { n: e.turn })),
        h("span", { "aria-hidden": "true" }, def ? def.icon + " " : ""),
        h("span", null, (def ? tx(def.title) : e.eventId) + (e.regionId ? " — " + regionName(e.regionId) : "") +
          (e.choiceId ? " → " + choiceLabel(e.eventId, e.choiceId) : " → " + t("event.pending")))
      ]);
    })));
  }

  GT.eventModal = { open: open, renderPanel: renderPanel, regionName: regionName, choiceLabel: choiceLabel };
})(window.GT = window.GT || {});
