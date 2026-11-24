/*
 * GeoTycoon — definicje wydarzeń (EventDefinition).
 *
 * scope: "region" (losowany region spełniający warunki) | "global"
 * conditions (typy):
 *   region       { attr, min?, max? }       — atrybut regionu
 *   regionFlag   { attr, value }            — flaga regionu (brak = false)
 *   regionHas    { building }               — region ma budynek danego typu
 *   regionBuildings { min }                 — region ma co najmniej N budynków
 *   resource     { key, min?, max? }        — zasób globalny
 *   stateFlag    { key }                    — flaga stanu (np. energyShortage z poprzedniej tury)
 *   categoryCount { category, min }         — liczba budynków danej kategorii w państwie
 *   any          { of: [warunki] }          — co najmniej jeden warunek
 * effects (typy):
 *   res { key, delta } | resPct { key, pct } | regionAttr { attr, delta } | regionFlag { flag, value }
 *   modifier { tag, kind, factor?, delta?, turns, scope } | removeModifier { tag } | setModifier { tag, factor?, turns? }
 *   build { building }
 * modifier.kind: farmOutput | regionOutput | tradeOutput | energyUse | industryIncome | energyCost | envPerTurn
 * choice.requires.buildable — wybór dostępny tylko, gdy w regionie można postawić budynek (bez kosztu)
 * choice.resilience — punkty odporności (wymiar „Odporność” w ocenie końcowej)
 * {region} w tekstach zastępowane jest nazwą regionu.
 */
(function (GT) {
  GT.DATA = GT.DATA || {};
  GT.DATA.events = [
    {
      id: "drought", icon: "☀️", scope: "region", weight: 10, cooldown: 4, tone: "bad",
      conditions: [{ type: "region", attr: "waterAvailability", max: 55 }],
      onTrigger: [
        { type: "modifier", tag: "drought", kind: "farmOutput", factor: 0.5, turns: 2, scope: "region" },
        { type: "res", key: "satisfaction", delta: -2 }
      ],
      title: { pl: "Susza", en: "Drought" },
      desc: { pl: "Opady w regionie {region} są znacznie niższe niż zwykle. Zbiory mogą spaść o połowę, a mieszkańcy potrzebują wody.",
              en: "Rainfall in {region} is far below normal. Harvests may halve and residents need water." },
      note: { pl: "Niedobór opadów wpływa na rolnictwo, dostęp do wody i gospodarkę. Najbardziej narażone są regiony suche, bez dużych rzek.",
              en: "A lack of rainfall affects farming, water supply and the economy. Dry regions without big rivers are most at risk." },
      choices: [
        { id: "irrigate", cost: 2000, resilience: 3,
          effects: [{ type: "removeModifier", tag: "drought" }, { type: "regionFlag", flag: "irrigated", value: true },
                    { type: "regionAttr", attr: "waterAvailability", delta: 15 }, { type: "res", key: "environment", delta: -2 }],
          label: { pl: "Zbuduj system nawadniania", en: "Build an irrigation system" },
          desc: { pl: "Usuwa skutki suszy, trwale +15 wody w regionie i pozwala uprawiać pustynię. Środowisko −2.",
                  en: "Removes the drought, +15 water in the region permanently and allows desert farming. Environment −2." } },
        { id: "import", cost: 1000, resilience: 1,
          effects: [{ type: "res", key: "food", delta: 40 }],
          label: { pl: "Importuj żywność", en: "Import food" },
          desc: { pl: "Dodaje 40 żywności. Susza trwa dalej.", en: "Adds 40 food. The drought continues." } },
        { id: "restrict", cost: 0, resilience: 0,
          effects: [{ type: "setModifier", tag: "drought", factor: 0.75 }, { type: "res", key: "satisfaction", delta: -5 }],
          label: { pl: "Ogranicz zużycie wody", en: "Restrict water use" },
          desc: { pl: "Straty plonów tylko −25%, ale zadowolenie −5.", en: "Crop losses only −25%, but satisfaction −5." } }
      ]
    },
    {
      id: "flood", icon: "🌊", scope: "region", weight: 9, cooldown: 4, tone: "bad",
      conditions: [{ type: "regionFlag", attr: "river", value: true }, { type: "regionFlag", attr: "floodProtected", value: false }],
      onTrigger: [
        { type: "modifier", tag: "flood", kind: "regionOutput", factor: 0.6, turns: 2, scope: "region" },
        { type: "res", key: "satisfaction", delta: -3 }
      ],
      title: { pl: "Powódź", en: "Flood" },
      desc: { pl: "Rzeka wystąpiła z brzegów w regionie {region}. Budynki produkują o 40% mniej.",
              en: "The river has burst its banks in {region}. Buildings produce 40% less." },
      note: { pl: "Doliny rzeczne mają żyzne gleby, ale po intensywnych opadach lub roztopach są narażone na powodzie.",
              en: "River valleys have fertile soils, but heavy rain or snowmelt makes them prone to flooding." },
      choices: [
        { id: "levees", cost: 1500, resilience: 3,
          effects: [{ type: "removeModifier", tag: "flood" }, { type: "regionFlag", flag: "floodProtected", value: true }],
          label: { pl: "Zbuduj wały przeciwpowodziowe", en: "Build flood levees" },
          desc: { pl: "Natychmiast przywraca produkcję i chroni region przed kolejnymi powodziami.",
                  en: "Restores output immediately and protects the region from future floods." } },
        { id: "evacuate", cost: 400, resilience: 1,
          effects: [{ type: "res", key: "satisfaction", delta: 4 }],
          label: { pl: "Przeprowadź ewakuację", en: "Evacuate residents" },
          desc: { pl: "Mieszkańcy są bezpieczni: zadowolenie +4. Produkcja nadal spada.",
                  en: "Residents are safe: satisfaction +4. Output still drops." } },
        { id: "rebuildLater", cost: 0, resilience: 0,
          effects: [{ type: "setModifier", tag: "flood", turns: 3 }, { type: "res", key: "satisfaction", delta: -3 }],
          label: { pl: "Odbuduj później", en: "Rebuild later" },
          desc: { pl: "Brak kosztów teraz, ale straty potrwają 3 tury. Zadowolenie −3.",
                  en: "No cost now, but losses last 3 turns. Satisfaction −3." } }
      ]
    },
    {
      id: "storm", icon: "⛈️", scope: "region", weight: 8, cooldown: 3, tone: "bad",
      conditions: [{ type: "regionFlag", attr: "coastal", value: true }, { type: "regionFlag", attr: "stormProtected", value: false }],
      onTrigger: [
        { type: "modifier", tag: "storm", kind: "tradeOutput", factor: 0.5, turns: 2, scope: "region" },
        { type: "res", key: "environment", delta: -1 }
      ],
      title: { pl: "Sztorm", en: "Storm" },
      desc: { pl: "Silny sztorm uderzył w wybrzeże regionu {region}. Dochody portu i turystyki spadają o połowę.",
              en: "A heavy storm has hit the coast of {region}. Port and tourism income is halved." },
      note: { pl: "Wybrzeża są narażone na sztormy i podtopienia; infrastruktura portowa wymaga zabezpieczeń.",
              en: "Coasts are exposed to storms and flooding; port infrastructure needs protection." },
      choices: [
        { id: "secure", cost: 1200, resilience: 3,
          effects: [{ type: "removeModifier", tag: "storm" }, { type: "regionFlag", flag: "stormProtected", value: true }],
          label: { pl: "Zabezpiecz port (falochron)", en: "Secure the port (breakwater)" },
          desc: { pl: "Usuwa straty i chroni region przed kolejnymi sztormami.",
                  en: "Removes losses and protects the region from future storms." } },
        { id: "repair", cost: 500, resilience: 1,
          effects: [{ type: "setModifier", tag: "storm", turns: 1 }],
          label: { pl: "Szybka naprawa", en: "Quick repair" },
          desc: { pl: "Straty potrwają tylko 1 turę.", en: "Losses last only 1 turn." } },
        { id: "nothing", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "satisfaction", delta: -3 }],
          label: { pl: "Nie rób nic", en: "Do nothing" },
          desc: { pl: "Straty przez 2 tury, zadowolenie −3.", en: "Losses for 2 turns, satisfaction −3." } }
      ]
    },
    {
      id: "resourceDiscovery", icon: "💎", scope: "region", weight: 6, cooldown: 5, tone: "good",
      conditions: [{ type: "region", attr: "mineralRichness", min: 50 }],
      onTrigger: [{ type: "regionAttr", attr: "mineralRichness", delta: 10 }],
      title: { pl: "Odkrycie złóż", en: "Mineral discovery" },
      desc: { pl: "Geolodzy odkryli nowe złoża w regionie {region} (bogactwo minerałów +10).",
              en: "Geologists found new deposits in {region} (mineral richness +10)." },
      note: { pl: "Złoża surowców są nierównomiernie rozmieszczone — zależą od budowy geologicznej terenu.",
              en: "Mineral deposits are unevenly distributed — they depend on the region's geology." },
      choices: [
        { id: "mine", cost: 400, resilience: 0, requires: { buildable: "mine" },
          effects: [{ type: "build", building: "mine" }],
          label: { pl: "Zbuduj kopalnię (dotacja)", en: "Build a mine (subsidised)" },
          desc: { pl: "Kopalnia za 400 Geo$ zamiast 800.", en: "A mine for 400 Geo$ instead of 800." } },
        { id: "protect", cost: 0, resilience: 1,
          effects: [{ type: "res", key: "environment", delta: 3 }, { type: "res", key: "satisfaction", delta: 1 }],
          label: { pl: "Chroń obszar", en: "Protect the area" },
          desc: { pl: "Środowisko +3, zadowolenie +1.", en: "Environment +3, satisfaction +1." } },
        { id: "license", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "budget", delta: 700 }, { type: "regionAttr", attr: "pollution", delta: 8 }, { type: "res", key: "environment", delta: -2 }],
          label: { pl: "Sprzedaj licencję wydobywczą", en: "Sell a mining licence" },
          desc: { pl: "Budżet +700, ale zanieczyszczenie regionu +8 i środowisko −2.",
                  en: "Budget +700, but regional pollution +8 and environment −2." } }
      ]
    },
    {
      id: "tourismBoom", icon: "📸", scope: "region", weight: 6, cooldown: 4, tone: "good",
      conditions: [{ type: "region", attr: "tourismPotential", min: 60 }],
      onTrigger: [{ type: "res", key: "budget", delta: 200 }],
      title: { pl: "Boom turystyczny", en: "Tourism boom" },
      desc: { pl: "Region {region} stał się modny wśród turystów! Wpłynęło 200 Geo$.",
              en: "{region} has become popular with tourists! 200 Geo$ came in." },
      note: { pl: "Turystyka rozwija się tam, gdzie są walory przyrodnicze, ale zbyt duży ruch może niszczyć przyrodę.",
              en: "Tourism grows where nature is attractive, but too many visitors can damage it." },
      choices: [
        { id: "resort", cost: 500, resilience: 0, requires: { buildable: "resort" },
          effects: [{ type: "build", building: "resort" }],
          label: { pl: "Zbuduj kurort (dotacja)", en: "Build a resort (subsidised)" },
          desc: { pl: "Kurort za 500 Geo$ zamiast 1100.", en: "A resort for 500 Geo$ instead of 1100." } },
        { id: "promote", cost: 300, resilience: 0,
          effects: [{ type: "res", key: "budget", delta: 900 }, { type: "res", key: "environment", delta: -2 }],
          label: { pl: "Kampania promocyjna", en: "Promotion campaign" },
          desc: { pl: "Budżet +900, środowisko −2.", en: "Budget +900, environment −2." } },
        { id: "limit", cost: 0, resilience: 1,
          effects: [{ type: "res", key: "environment", delta: 3 }, { type: "regionAttr", attr: "tourismPotential", delta: 5 }],
          label: { pl: "Ogranicz ruch turystyczny", en: "Limit tourist traffic" },
          desc: { pl: "Środowisko +3, potencjał turystyczny regionu +5.", en: "Environment +3, regional tourism potential +5." } }
      ]
    },
    {
      id: "energyCrisis", icon: "⚡", scope: "global", weight: 7, cooldown: 4, tone: "bad",
      conditions: [{ type: "any", of: [{ type: "stateFlag", key: "energyShortage" }, { type: "resource", key: "energy", max: 15 }, { type: "categoryCount", category: "industry", min: 3 }] }],
      onTrigger: [{ type: "res", key: "energy", delta: -15 }],
      title: { pl: "Kryzys energetyczny", en: "Energy crisis" },
      desc: { pl: "Zapotrzebowanie na prąd przewyższa możliwości sieci. Stracono 15 energii.",
              en: "Power demand exceeds the grid's capacity. 15 energy was lost." },
      note: { pl: "Gospodarka potrzebuje stabilnych źródeł energii. Różne źródła (słońce, wiatr, woda) zwiększają bezpieczeństwo.",
              en: "An economy needs stable energy. A mix of sources (sun, wind, water) improves security." },
      choices: [
        { id: "import", cost: 800, resilience: 1,
          effects: [{ type: "res", key: "energy", delta: 40 }],
          label: { pl: "Importuj energię", en: "Import energy" },
          desc: { pl: "Energia +40.", en: "Energy +40." } },
        { id: "saving", cost: 0, resilience: 1,
          effects: [{ type: "modifier", tag: "saving", kind: "energyUse", factor: 0.8, turns: 3, scope: "global" }, { type: "res", key: "satisfaction", delta: -3 }],
          label: { pl: "Kampania oszczędzania", en: "Saving campaign" },
          desc: { pl: "Zużycie energii −20% przez 3 tury, zadowolenie −3.", en: "Energy use −20% for 3 turns, satisfaction −3." } },
        { id: "subsidy", cost: 300, resilience: 2,
          effects: [{ type: "modifier", tag: "subsidy", kind: "energyCost", factor: 0.5, turns: 3, scope: "global" }],
          label: { pl: "Dotacja na nową elektrownię", en: "Subsidy for a new power plant" },
          desc: { pl: "Elektrownie tańsze o 50% przez 3 tury.", en: "Power plants 50% cheaper for 3 turns." } }
      ]
    },
    {
      id: "economicGrowth", icon: "📈", scope: "global", weight: 5, cooldown: 5, tone: "good",
      conditions: [],
      onTrigger: [],
      title: { pl: "Wzrost gospodarczy", en: "Economic growth" },
      desc: { pl: "Gospodarka rośnie szybciej niż oczekiwano. Jak wykorzystasz dodatkowe środki?",
              en: "The economy is growing faster than expected. How will you use the extra funds?" },
      note: { pl: "Dobra koniunktura to czas na inwestycje, które zwiększą odporność na przyszłe kryzysy.",
              en: "Good times are the moment to invest in resilience against future crises." },
      choices: [
        { id: "invest", cost: 0, resilience: 1,
          effects: [{ type: "res", key: "budget", delta: 600 }, { type: "res", key: "satisfaction", delta: 3 }],
          label: { pl: "Inwestuj w usługi publiczne", en: "Invest in public services" },
          desc: { pl: "Budżet +600, zadowolenie +3.", en: "Budget +600, satisfaction +3." } },
        { id: "save", cost: 0, resilience: 1,
          effects: [{ type: "res", key: "budget", delta: 1200 }],
          label: { pl: "Odłóż oszczędności", en: "Save the money" },
          desc: { pl: "Budżet +1200.", en: "Budget +1200." } },
        { id: "research", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "budget", delta: 300 }, { type: "res", key: "technology", delta: 5 }],
          label: { pl: "Finansuj badania", en: "Fund research" },
          desc: { pl: "Budżet +300, technologia +5.", en: "Budget +300, technology +5." } }
      ]
    },
    {
      id: "forestFire", icon: "🔥", scope: "region", weight: 7, cooldown: 4, tone: "bad",
      conditions: [{ type: "regionFlag", attr: "forest", value: true }, { type: "region", attr: "waterAvailability", max: 85 }],
      onTrigger: [{ type: "res", key: "environment", delta: -5 }, { type: "regionAttr", attr: "tourismPotential", delta: -10 }],
      title: { pl: "Pożar lasu", en: "Forest fire" },
      desc: { pl: "W regionie {region} wybuchł pożar lasu. Środowisko −5, potencjał turystyczny −10.",
              en: "A forest fire broke out in {region}. Environment −5, tourism potential −10." },
      note: { pl: "Susze i upały zwiększają ryzyko pożarów. Las pochłania CO₂ i chroni glebę przed erozją.",
              en: "Droughts and heat raise fire risk. Forests absorb CO₂ and protect soil from erosion." },
      choices: [
        { id: "extinguish", cost: 800, resilience: 2,
          effects: [{ type: "res", key: "environment", delta: 3 }],
          label: { pl: "Gaszenie z powietrza", en: "Aerial firefighting" },
          desc: { pl: "Środowisko +3 (część strat odrobiona).", en: "Environment +3 (some losses recovered)." } },
        { id: "reforest", cost: 1000, resilience: 1,
          effects: [{ type: "res", key: "environment", delta: 6 }, { type: "regionAttr", attr: "tourismPotential", delta: 10 }],
          label: { pl: "Program odbudowy lasu", en: "Reforestation programme" },
          desc: { pl: "Środowisko +6, potencjał turystyczny wraca.", en: "Environment +6, tourism potential restored." } },
        { id: "limitLogging", cost: 0, resilience: 1,
          effects: [{ type: "modifier", tag: "loggingLimit", kind: "envPerTurn", delta: 1, turns: 3, scope: "global" }, { type: "res", key: "satisfaction", delta: -2 }],
          label: { pl: "Ogranicz wycinkę", en: "Limit logging" },
          desc: { pl: "Środowisko +1 co turę przez 3 tury, zadowolenie −2.", en: "Environment +1 per turn for 3 turns, satisfaction −2." } }
      ]
    },
    {
      id: "immigration", icon: "🧳", scope: "global", weight: 5, cooldown: 4, tone: "neutral",
      conditions: [{ type: "resource", key: "satisfaction", min: 65 }],
      onTrigger: [{ type: "res", key: "population", delta: 600 }],
      title: { pl: "Migracja do kraju", en: "Immigration" },
      desc: { pl: "Wysokie zadowolenie przyciąga nowych mieszkańców. Przybyło 600 osób.",
              en: "High satisfaction attracts newcomers. 600 people arrived." },
      note: { pl: "Ludzie migrują tam, gdzie są miejsca pracy, usługi i dobre warunki życia (czynniki przyciągające).",
              en: "People migrate to places with jobs, services and good living conditions (pull factors)." },
      choices: [
        { id: "services", cost: 1000, resilience: 1,
          effects: [{ type: "res", key: "satisfaction", delta: 4 }],
          label: { pl: "Rozbuduj usługi", en: "Expand services" },
          desc: { pl: "Zadowolenie +4.", en: "Satisfaction +4." } },
        { id: "integration", cost: 600, resilience: 1,
          effects: [{ type: "res", key: "satisfaction", delta: 2 }, { type: "res", key: "technology", delta: 2 }],
          label: { pl: "Program integracji", en: "Integration programme" },
          desc: { pl: "Zadowolenie +2, technologia +2.", en: "Satisfaction +2, technology +2." } },
        { id: "restrict", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "population", delta: -300 }, { type: "res", key: "satisfaction", delta: -2 }],
          label: { pl: "Wprowadź ograniczenia", en: "Introduce restrictions" },
          desc: { pl: "Ludność −300, zadowolenie −2.", en: "Population −300, satisfaction −2." } }
      ]
    },
    {
      id: "emigration", icon: "🚶", scope: "global", weight: 8, cooldown: 3, tone: "bad",
      conditions: [{ type: "resource", key: "satisfaction", max: 45 }],
      onTrigger: [{ type: "resPct", key: "population", pct: -4 }],
      title: { pl: "Emigracja", en: "Emigration" },
      desc: { pl: "Niezadowoleni mieszkańcy wyjeżdżają z kraju. Ludność spadła o 4%.",
              en: "Unhappy residents are leaving the country. Population fell by 4%." },
      note: { pl: "Brak pracy, niedobory i złe warunki życia to czynniki wypychające, które powodują emigrację.",
              en: "Lack of jobs, shortages and poor living conditions are push factors that drive emigration." },
      choices: [
        { id: "services", cost: 1000, resilience: 2,
          effects: [{ type: "res", key: "satisfaction", delta: 6 }],
          label: { pl: "Popraw usługi publiczne", en: "Improve public services" },
          desc: { pl: "Zadowolenie +6.", en: "Satisfaction +6." } },
        { id: "jobs", cost: 700, resilience: 1,
          effects: [{ type: "res", key: "satisfaction", delta: 3 }, { type: "res", key: "population", delta: 200 }],
          label: { pl: "Program zatrudnienia", en: "Jobs programme" },
          desc: { pl: "Zadowolenie +3, część osób wraca (+200).", en: "Satisfaction +3, some people return (+200)." } },
        { id: "nothing", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "satisfaction", delta: -2 }],
          label: { pl: "Nie rób nic", en: "Do nothing" },
          desc: { pl: "Zadowolenie −2.", en: "Satisfaction −2." } }
      ]
    },
    {
      id: "pollutionAlert", icon: "☣️", scope: "region", weight: 9, cooldown: 3, tone: "bad",
      conditions: [{ type: "region", attr: "pollution", min: 30 }],
      onTrigger: [{ type: "res", key: "satisfaction", delta: -2 }],
      title: { pl: "Alarm ekologiczny", en: "Pollution alert" },
      desc: { pl: "Zanieczyszczenie w regionie {region} przekroczyło normy. Mieszkańcy protestują.",
              en: "Pollution in {region} has exceeded safe limits. Residents are protesting." },
      note: { pl: "Przemysł i wydobycie zanieczyszczają powietrze, wodę i glebę. Zanieczyszczenie obniża też plony.",
              en: "Industry and mining pollute air, water and soil. Pollution also lowers crop yields." },
      choices: [
        { id: "treatment", cost: 400, resilience: 2, requires: { buildable: "treatment" },
          effects: [{ type: "build", building: "treatment" }],
          label: { pl: "Zbuduj oczyszczalnię (dotacja)", en: "Build a treatment plant (subsidised)" },
          desc: { pl: "Oczyszczalnia za 400 Geo$ zamiast 700.", en: "A treatment plant for 400 Geo$ instead of 700." } },
        { id: "regulations", cost: 0, resilience: 1,
          effects: [{ type: "modifier", tag: "regulations", kind: "industryIncome", factor: 0.8, turns: 3, scope: "global" },
                    { type: "regionAttr", attr: "pollution", delta: -15 }, { type: "res", key: "environment", delta: 4 }],
          label: { pl: "Wprowadź regulacje", en: "Introduce regulations" },
          desc: { pl: "Zanieczyszczenie regionu −15, środowisko +4, ale dochód przemysłu −20% przez 3 tury.",
                  en: "Regional pollution −15, environment +4, but industry income −20% for 3 turns." } },
        { id: "ignore", cost: 0, resilience: -1,
          effects: [{ type: "res", key: "satisfaction", delta: -5 }, { type: "res", key: "environment", delta: -3 }],
          label: { pl: "Zignoruj problem", en: "Ignore the problem" },
          desc: { pl: "Zadowolenie −5, środowisko −3.", en: "Satisfaction −5, environment −3." } }
      ]
    },
    {
      id: "landslide", icon: "🪨", scope: "region", weight: 6, cooldown: 4, tone: "bad",
      conditions: [{ type: "region", attr: "terrainDifficulty", min: 60 }, { type: "regionBuildings", min: 1 }, { type: "regionFlag", attr: "slopeProtected", value: false }],
      onTrigger: [{ type: "modifier", tag: "landslide", kind: "regionOutput", factor: 0.5, turns: 2, scope: "region" }],
      title: { pl: "Osuwisko", en: "Landslide" },
      desc: { pl: "Ulewy wywołały osuwisko w regionie {region}. Budynki produkują o połowę mniej.",
              en: "Heavy rain triggered a landslide in {region}. Buildings produce half as much." },
      note: { pl: "Na stromych stokach ulewy i wylesianie zwiększają ryzyko osuwisk. Dlatego infrastruktura w górach jest droższa.",
              en: "On steep slopes, heavy rain and deforestation raise landslide risk. That is why mountain infrastructure costs more." },
      choices: [
        { id: "reinforce", cost: 1000, resilience: 3,
          effects: [{ type: "removeModifier", tag: "landslide" }, { type: "regionFlag", flag: "slopeProtected", value: true }],
          label: { pl: "Umocnij stoki", en: "Reinforce the slopes" },
          desc: { pl: "Usuwa straty i chroni region przed kolejnymi osuwiskami.", en: "Removes losses and protects the region from future landslides." } },
        { id: "repair", cost: 400, resilience: 1,
          effects: [{ type: "setModifier", tag: "landslide", turns: 1 }],
          label: { pl: "Usuń skutki", en: "Clear the damage" },
          desc: { pl: "Straty potrwają tylko 1 turę.", en: "Losses last only 1 turn." } },
        { id: "nothing", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "satisfaction", delta: -2 }],
          label: { pl: "Nie rób nic", en: "Do nothing" },
          desc: { pl: "Straty przez 2 tury, zadowolenie −2.", en: "Losses for 2 turns, satisfaction −2." } }
      ]
    },
    {
      id: "goodHarvest", icon: "🍎", scope: "region", weight: 6, cooldown: 4, tone: "good",
      conditions: [{ type: "regionHas", building: "farm" }, { type: "region", attr: "fertility", min: 60 }],
      onTrigger: [],
      title: { pl: "Rekordowe zbiory", en: "Record harvest" },
      desc: { pl: "Sprzyjająca pogoda dała rekordowe plony w regionie {region}.",
              en: "Favourable weather brought a record harvest in {region}." },
      note: { pl: "Żyzne gleby i odpowiednia ilość opadów w okresie wegetacji dają najwyższe plony.",
              en: "Fertile soils and enough rain during the growing season give the highest yields." },
      choices: [
        { id: "store", cost: 0, resilience: 1,
          effects: [{ type: "res", key: "food", delta: 40 }],
          label: { pl: "Zgromadź zapasy", en: "Store the surplus" },
          desc: { pl: "Żywność +40.", en: "Food +40." } },
        { id: "export", cost: 0, resilience: 0,
          effects: [{ type: "res", key: "budget", delta: 700 }],
          label: { pl: "Sprzedaj za granicę", en: "Export it" },
          desc: { pl: "Budżet +700.", en: "Budget +700." } }
      ]
    }
  ];
})(window.GT = window.GT || {});
