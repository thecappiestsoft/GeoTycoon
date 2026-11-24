/*
 * GeoTycoon — definicje budynków (BuildingDefinition).
 *
 * produces.X = { base, scale: [atrybuty regionu] }  →  base × Π(atrybut/100)
 * category: food | energy | industry | trade | services | ecology
 * requirements (typy):
 *   attrMin      { attr, value }          — atrybut regionu ≥ value
 *   flag         { attr }                 — atrybut logiczny regionu = true
 *   notDesertOrIrrigated                  — teren niepustynny lub region nawodniony
 *   regionPopMin { value }                — szacowana ludność regionu ≥ value
 *   urbanOrPollution { urbanization, pollution } — urbanizacja ≥ X lub zanieczyszczenie ≥ Y
 * perTurn: stałe efekty co turę (env = środowisko globalne, pollution = zanieczyszczenie regionu,
 *          technology, satisfaction)
 */
(function (GT) {
  GT.DATA = GT.DATA || {};
  GT.DATA.buildings = [
    {
      id: "farm", icon: "🌾", category: "food",
      cost: 500, maintenance: 10, maxPerRegion: 2, energyUse: 1,
      requirements: [{ type: "notDesertOrIrrigated" }, { type: "attrMin", attr: "waterAvailability", value: 20 }],
      produces: { food: { base: 30, scale: ["fertility", "waterAvailability"] } },
      perTurn: {},
      name: { pl: "Farma", en: "Farm" },
      desc: { pl: "Produkuje żywność. Wydajność zależy od żyzności gleby i dostępu do wody.",
              en: "Produces food. Output depends on soil fertility and water access." },
      edu: { pl: "Rolnictwo zależy od żyzności gleby, dostępności wody i warunków klimatycznych.",
             en: "Farming depends on soil fertility, water availability and climate." }
    },
    {
      id: "mine", icon: "⛏️", category: "industry",
      cost: 800, maintenance: 25, maxPerRegion: 1, energyUse: 3,
      requirements: [{ type: "attrMin", attr: "mineralRichness", value: 35 }],
      produces: { income: { base: 200, scale: ["mineralRichness"] } },
      perTurn: { env: -2, pollution: 4 },
      name: { pl: "Kopalnia", en: "Mine" },
      desc: { pl: "Wydobywa surowce i przynosi dochód. Obniża jakość środowiska.",
              en: "Extracts raw materials and brings income. Lowers environmental quality." },
      edu: { pl: "Złoża surowców występują tam, gdzie sprzyja im budowa geologiczna — często w górach i na wyżynach.",
             en: "Mineral deposits form where geology allows — often in mountains and uplands." }
    },
    {
      id: "solar", icon: "☀️", category: "energy",
      cost: 900, maintenance: 15, maxPerRegion: 2, energyUse: 0,
      requirements: [{ type: "attrMin", attr: "sunlight", value: 30 }],
      produces: { energy: { base: 30, scale: ["sunlight"] } },
      perTurn: {},
      name: { pl: "Elektrownia słoneczna", en: "Solar plant" },
      desc: { pl: "Czysta energia ze słońca. Najlepsza w regionach o dużym nasłonecznieniu.",
              en: "Clean energy from the sun. Best in regions with lots of sunshine." },
      edu: { pl: "Nasłonecznienie zależy od szerokości geograficznej i zachmurzenia — pustynie mają go najwięcej.",
             en: "Sunshine depends on latitude and cloud cover — deserts get the most." }
    },
    {
      id: "wind", icon: "🌬️", category: "energy",
      cost: 1000, maintenance: 15, maxPerRegion: 2, energyUse: 0,
      requirements: [{ type: "attrMin", attr: "windPotential", value: 40 }],
      produces: { energy: { base: 32, scale: ["windPotential"] } },
      perTurn: {},
      name: { pl: "Farma wiatrowa", en: "Wind farm" },
      desc: { pl: "Turbiny wiatrowe. Najlepsze na wybrzeżu i otwartych równinach.",
              en: "Wind turbines. Best on coasts and open plains." },
      edu: { pl: "Wiatry są silniejsze nad morzem i na otwartych terenach, gdzie nic ich nie hamuje.",
             en: "Winds are stronger over the sea and in open areas where nothing slows them down." }
    },
    {
      id: "hydro", icon: "💧", category: "energy",
      cost: 1200, maintenance: 20, maxPerRegion: 1, energyUse: 0,
      requirements: [{ type: "flag", attr: "river" }, { type: "attrMin", attr: "terrainDifficulty", value: 30 }],
      produces: { energy: { base: 35, scale: [] } },
      perTurn: { env: -1 },
      name: { pl: "Elektrownia wodna", en: "Hydro plant" },
      desc: { pl: "Stabilne źródło energii. Wymaga rzeki i różnic wysokości terenu.",
              en: "A stable energy source. Needs a river and differences in elevation." },
      edu: { pl: "Energia wodna wymaga odpowiednich warunków hydrologicznych i różnic wysokości.",
             en: "Hydropower needs suitable hydrological conditions and differences in elevation." }
    },
    {
      id: "factory", icon: "🏭", category: "industry",
      cost: 1000, maintenance: 30, maxPerRegion: 2, energyUse: 15,
      requirements: [{ type: "attrMin", attr: "urbanization", value: 15 }],
      produces: { income: { base: 180, scale: [] } },
      perTurn: { env: -4, pollution: 6 },
      name: { pl: "Fabryka", en: "Factory" },
      desc: { pl: "Duży dochód, ale zużywa 15 energii i zanieczyszcza środowisko. Potrzebuje pracowników.",
              en: "High income, but uses 15 energy and pollutes. Needs workers." },
      edu: { pl: "Przemysł potrzebuje energii, transportu i pracowników. Może też powodować zanieczyszczenia.",
             en: "Industry needs energy, transport and workers. It can also cause pollution." }
    },
    {
      id: "port", icon: "⚓", category: "trade",
      cost: 1500, maintenance: 25, maxPerRegion: 1, energyUse: 2,
      requirements: [{ type: "flag", attr: "coastal" }],
      produces: { income: { base: 220, scale: [] } },
      perTurn: { env: -1, pollution: 2 },
      name: { pl: "Port", en: "Port" },
      desc: { pl: "Dochód z handlu morskiego. Tylko w regionach z dostępem do morza.",
              en: "Income from sea trade. Only in regions with sea access." },
      edu: { pl: "Dostęp do morza może ułatwiać handel i transport międzynarodowy.",
             en: "Sea access can make international trade and transport easier." }
    },
    {
      id: "university", icon: "🎓", category: "services",
      cost: 1300, maintenance: 30, maxPerRegion: 1, energyUse: 2,
      requirements: [{ type: "regionPopMin", value: 1200 }],
      produces: {},
      perTurn: { technology: 3, satisfaction: 2 },
      name: { pl: "Uniwersytet", en: "University" },
      desc: { pl: "Zwiększa technologię (+3) i zadowolenie (+2). Wymaga dużego miasta.",
              en: "Raises technology (+3) and satisfaction (+2). Needs a large city." },
      edu: { pl: "Uczelnie powstają w dużych miastach, gdzie jest wielu studentów i wykładowców.",
             en: "Universities grow in large cities with many students and lecturers." }
    },
    {
      id: "treatment", icon: "♻️", category: "ecology",
      cost: 700, maintenance: 20, maxPerRegion: 1, energyUse: 2,
      requirements: [{ type: "urbanOrPollution", urbanization: 25, pollution: 15 }],
      produces: {},
      perTurn: { env: 4, pollution: -8 },
      name: { pl: "Oczyszczalnia", en: "Treatment plant" },
      desc: { pl: "Poprawia środowisko (+4) i obniża zanieczyszczenie regionu.",
              en: "Improves the environment (+4) and lowers regional pollution." },
      edu: { pl: "Oczyszczanie ścieków chroni rzeki i wody podziemne przed zanieczyszczeniem.",
             en: "Wastewater treatment protects rivers and groundwater from pollution." }
    },
    {
      id: "resort", icon: "🏖️", category: "trade",
      cost: 1100, maintenance: 20, maxPerRegion: 1, energyUse: 2,
      requirements: [{ type: "attrMin", attr: "tourismPotential", value: 50 }],
      produces: { income: { base: 170, scale: ["tourismPotential"] } },
      perTurn: { env: -1, satisfaction: 1 },
      name: { pl: "Kurort", en: "Resort" },
      desc: { pl: "Dochód z turystyki. Wymaga atrakcyjnego krajobrazu (góry, plaże, lasy).",
              en: "Tourism income. Needs attractive scenery (mountains, beaches, forests)." },
      edu: { pl: "Turystów przyciągają walory przyrodnicze: góry, wybrzeża i lasy.",
             en: "Tourists are drawn by natural features: mountains, coasts and forests." }
    }
  ];
})(window.GT = window.GT || {});
