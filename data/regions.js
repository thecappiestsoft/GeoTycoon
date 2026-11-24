/*
 * GeoTycoon — 12 regionów fikcyjnego państwa (szablon; scenariusze mogą je modyfikować).
 * col/row = położenie na siatce mapy (4 kolumny × 3 wiersze, zachód → wschód, północ → południe).
 * Teksty w obiektach { pl, en }.
 */
(function (GT) {
  GT.DATA = GT.DATA || {};
  GT.DATA.regions = [
    {
      id: "r01", col: 0, row: 0,
      name: { pl: "Zatoka Północna", en: "Northern Bay" },
      desc: { pl: "Wietrzne wybrzeże z zatoką i plażami. Dobre miejsce na port i farmy wiatrowe.",
              en: "A windy coast with a bay and beaches. A good place for a port and wind farms." },
      terrainType: "coastal", climate: "temperate",
      fertility: 55, waterAvailability: 75, sunlight: 45, windPotential: 85, mineralRichness: 30,
      terrainDifficulty: 20, tourismPotential: 70, urbanization: 30,
      coastal: true, river: false, forest: false, pollution: 5
    },
    {
      id: "r02", col: 1, row: 0,
      name: { pl: "Puszcza Borealna", en: "Boreal Forest" },
      desc: { pl: "Rozległe lasy iglaste i jeziora. Bogactwo przyrody, ale ograniczenia ochrony środowiska.",
              en: "Vast coniferous forests and lakes. Rich nature, but environmental protection limits." },
      terrainType: "forest", climate: "cool",
      fertility: 45, waterAvailability: 80, sunlight: 35, windPotential: 50, mineralRichness: 40,
      terrainDifficulty: 40, tourismPotential: 65, urbanization: 10,
      coastal: false, river: false, forest: true, pollution: 2
    },
    {
      id: "r03", col: 2, row: 0,
      name: { pl: "Równina Wietrzna", en: "Windy Plain" },
      desc: { pl: "Otwarta równina z silnymi wiatrami i umiarkowanie żyznymi glebami.",
              en: "An open plain with strong winds and moderately fertile soils." },
      terrainType: "lowland", climate: "temperate",
      fertility: 60, waterAvailability: 60, sunlight: 50, windPotential: 90, mineralRichness: 35,
      terrainDifficulty: 25, tourismPotential: 30, urbanization: 20,
      coastal: false, river: false, forest: false, pollution: 3
    },
    {
      id: "r04", col: 3, row: 0,
      name: { pl: "Szczyty Granitowe", en: "Granite Peaks" },
      desc: { pl: "Wysokie góry bogate w minerały. Atrakcyjne turystycznie, ale budowa jest trudna.",
              en: "High mountains rich in minerals. Attractive for tourists, but construction is hard." },
      terrainType: "mountains", climate: "alpine",
      fertility: 20, waterAvailability: 70, sunlight: 55, windPotential: 70, mineralRichness: 80,
      terrainDifficulty: 85, tourismPotential: 85, urbanization: 8,
      coastal: false, river: false, forest: false, pollution: 2
    },
    {
      id: "r05", col: 0, row: 1,
      name: { pl: "Port Zachodni", en: "Western Harbour" },
      desc: { pl: "Ujście rzeki do morza i największe miasto kraju. Centrum handlu.",
              en: "The river mouth and the country's largest city. A trade hub." },
      terrainType: "coastal", climate: "temperate",
      fertility: 65, waterAvailability: 85, sunlight: 50, windPotential: 75, mineralRichness: 20,
      terrainDifficulty: 15, tourismPotential: 55, urbanization: 60,
      coastal: true, river: true, forest: false, pollution: 10
    },
    {
      id: "r06", col: 1, row: 1,
      name: { pl: "Dolina Srebrnej Rzeki", en: "Silver River Valley" },
      desc: { pl: "Szeroka dolina rzeczna z najżyźniejszymi madami w kraju. Ryzyko powodzi.",
              en: "A wide river valley with the most fertile alluvial soils in the country. Flood risk." },
      terrainType: "riverValley", climate: "temperate",
      fertility: 90, waterAvailability: 95, sunlight: 55, windPotential: 35, mineralRichness: 15,
      terrainDifficulty: 15, tourismPotential: 40, urbanization: 35,
      coastal: false, river: true, forest: false, pollution: 4
    },
    {
      id: "r07", col: 2, row: 1,
      name: { pl: "Równina Centralna", en: "Central Plain" },
      desc: { pl: "Płaski, dobrze skomunikowany środek kraju. Miasta, drogi i rolnictwo.",
              en: "The flat, well-connected heart of the country. Cities, roads and farming." },
      terrainType: "lowland", climate: "temperate",
      fertility: 75, waterAvailability: 65, sunlight: 60, windPotential: 45, mineralRichness: 30,
      terrainDifficulty: 10, tourismPotential: 25, urbanization: 55,
      coastal: false, river: true, forest: false, pollution: 8
    },
    {
      id: "r08", col: 3, row: 1,
      name: { pl: "Przełęcz Orla", en: "Eagle Pass" },
      desc: { pl: "Górska przełęcz, w której bierze początek Srebrna Rzeka. Duże spadki terenu.",
              en: "A mountain pass where the Silver River begins. Steep slopes." },
      terrainType: "mountains", climate: "alpine",
      fertility: 30, waterAvailability: 75, sunlight: 60, windPotential: 60, mineralRichness: 65,
      terrainDifficulty: 75, tourismPotential: 70, urbanization: 12,
      coastal: false, river: true, forest: false, pollution: 2
    },
    {
      id: "r09", col: 0, row: 2,
      name: { pl: "Złote Wybrzeże", en: "Golden Coast" },
      desc: { pl: "Słoneczne plaże i ciepły klimat. Raj dla turystów, ale wody słodkiej jest mniej.",
              en: "Sunny beaches and a warm climate. A tourist paradise, but fresh water is scarcer." },
      terrainType: "coastal", climate: "warm",
      fertility: 50, waterAvailability: 50, sunlight: 80, windPotential: 70, mineralRichness: 15,
      terrainDifficulty: 10, tourismPotential: 90, urbanization: 35,
      coastal: true, river: false, forest: false, pollution: 5
    },
    {
      id: "r10", col: 1, row: 2,
      name: { pl: "Żyzne Niziny", en: "Fertile Lowlands" },
      desc: { pl: "Czarnoziemy i łagodny klimat. Spichlerz kraju.",
              en: "Black soils and a mild climate. The country's breadbasket." },
      terrainType: "lowland", climate: "warm",
      fertility: 85, waterAvailability: 70, sunlight: 65, windPotential: 40, mineralRichness: 20,
      terrainDifficulty: 10, tourismPotential: 20, urbanization: 30,
      coastal: false, river: false, forest: false, pollution: 3
    },
    {
      id: "r11", col: 2, row: 2,
      name: { pl: "Step Południowy", en: "Southern Steppe" },
      desc: { pl: "Suchy step z małymi opadami. Dużo słońca i złóż, mało wody.",
              en: "A dry steppe with little rainfall. Plenty of sun and minerals, little water." },
      terrainType: "desert", climate: "arid",
      fertility: 35, waterAvailability: 30, sunlight: 85, windPotential: 65, mineralRichness: 50,
      terrainDifficulty: 20, tourismPotential: 25, urbanization: 15,
      coastal: false, river: false, forest: false, pollution: 2
    },
    {
      id: "r12", col: 3, row: 2,
      name: { pl: "Pustynia Czerwona", en: "Red Desert" },
      desc: { pl: "Gorąca pustynia. Ogromny potencjał energii słonecznej i surowców.",
              en: "A hot desert. Huge potential for solar energy and minerals." },
      terrainType: "desert", climate: "arid",
      fertility: 10, waterAvailability: 10, sunlight: 98, windPotential: 55, mineralRichness: 75,
      terrainDifficulty: 30, tourismPotential: 45, urbanization: 5,
      coastal: false, river: false, forest: false, pollution: 1
    }
  ];
})(window.GT = window.GT || {});
