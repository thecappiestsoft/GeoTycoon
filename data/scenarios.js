/*
 * GeoTycoon — scenariusze i cele lekcji.
 *
 * regionModifiers.all   — zmiany (delta) dla wszystkich regionów
 * regionModifiers.byId  — nadpisania / delty dla konkretnych regionów ({ set: {...}, delta: {...} })
 * startBuildings        — budynki obecne od startu
 * eventWeights          — mnożniki wag wydarzeń
 * goals (typy): score {min} | resource {key, min} | dimension {key, min}
 *               | maxShortageTurns {kind, max} | buildingCount {building, min}
 */
(function (GT) {
  GT.DATA = GT.DATA || {};
  GT.DATA.scenarios = [
    {
      id: "greenValley", icon: "🌳",
      name: { pl: "Zielona Dolina", en: "Green Valley" },
      desc: { pl: "Żyzne niziny, rzeka i mały budżet. Zbuduj stabilne państwo, nie pogarszając środowiska.",
              en: "Fertile lowlands, a river and a small budget. Build a stable state without harming the environment." },
      difficulty: 1,
      start: { budget: 5000, food: 100, energy: 50, population: 10000, satisfaction: 70, environment: 85, technology: 10 },
      regionModifiers: { all: {}, byId: {} },
      startBuildings: [],
      eventWeights: { drought: 0.6, storm: 0.8 },
      goals: [{ type: "score", min: 70 }, { type: "resource", key: "environment", min: 60 }]
    },
    {
      id: "desertRepublic", icon: "🏜️",
      name: { pl: "Pustynna Republika", en: "Desert Republic" },
      desc: { pl: "Mało wody, dużo słońca i surowców. Zapewnij żywność i energię przy ograniczonych zasobach wody.",
              en: "Little water, plenty of sun and minerals. Secure food and energy with limited water." },
      difficulty: 3,
      start: { budget: 6000, food: 90, energy: 40, population: 9000, satisfaction: 65, environment: 80, technology: 12 },
      regionModifiers: {
        all: { waterAvailability: -20, sunlight: 12, mineralRichness: 12, fertility: -10 },
        byId: {
          r03: { set: { terrainType: "desert", climate: "arid" } },
          r10: { set: { terrainType: "desert", climate: "arid" }, delta: { fertility: -15 } },
          r09: { set: { climate: "arid" } },
          r02: { set: { terrainType: "lowland", forest: false }, delta: { fertility: 5 } }
        }
      },
      startBuildings: [],
      eventWeights: { drought: 2.2, forestFire: 1.5, flood: 0.4 },
      goals: [{ type: "score", min: 60 }, { type: "maxShortageTurns", kind: "food", max: 2 }]
    },
    {
      id: "coastalState", icon: "⚓",
      name: { pl: "Nadmorskie Państwo", en: "Coastal State" },
      desc: { pl: "Port, handel i ryzyko sztormów. Rozwijaj handel i odporność infrastruktury.",
              en: "A port, trade and storm risk. Grow trade and make infrastructure resilient." },
      difficulty: 2,
      start: { budget: 4500, food: 100, energy: 50, population: 11000, satisfaction: 70, environment: 80, technology: 10 },
      regionModifiers: {
        all: {},
        byId: {
          r01: { delta: { tourismPotential: 10 } },
          r05: { delta: { urbanization: 10 } },
          r09: { delta: { tourismPotential: 5 } }
        }
      },
      startBuildings: [{ regionId: "r05", buildingTypeId: "port" }],
      eventWeights: { storm: 2.5, flood: 1.2 },
      goals: [{ type: "score", min: 65 }, { type: "dimension", key: "resilience", min: 60 }, { type: "buildingCount", building: "port", min: 2 }]
    }
  ];

  // Dodatkowe cele wybierane przez nauczyciela (tryb lekcyjny)
  GT.DATA.lessonGoals = [
    { id: "none", goals: [] },
    { id: "sat80env60", goals: [{ type: "resource", key: "satisfaction", min: 80 }, { type: "resource", key: "environment", min: 60 }] },
    { id: "env75", goals: [{ type: "resource", key: "environment", min: 75 }] },
    { id: "tech40", goals: [{ type: "resource", key: "technology", min: 40 }] },
    { id: "noFoodShortage", goals: [{ type: "maxShortageTurns", kind: "food", max: 0 }] }
  ];

  GT.DATA.gameLengths = [15, 10];
})(window.GT = window.GT || {});
