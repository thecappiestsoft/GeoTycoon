/*
 * GeoTycoon — plik balansu gry (konfiguracja liczb).
 * Wszystkie parametry ekonomii, punktacji i limitów są tutaj, a nie w logice/UI.
 * Dane są w plikach .js (a nie .json), aby gra działała po dwukliku index.html
 * (protokół file:// blokuje fetch() plików JSON). Struktura = czysty JSON.
 */
(function (GT) {
  GT.DATA = GT.DATA || {};
  GT.DATA.balance = {
    schemaVersion: 1,
    appVersion: "1.0.0",

    // --- Limity budowy ---
    maxBuildingsPerRegion: 3,
    maxInvestmentsPerTurn: 3,
    highCostConfirmThreshold: 1200,   // powyżej tego kosztu UI prosi o potwierdzenie

    // --- Ludność i podatki ---
    taxPerCitizen: 0.03,             // Geo$ / mieszkańca / turę (przy zadowoleniu 50)
    taxSatisfactionFactor: 0.5,      // podatki × (0.5 + satisfaction/100)
    adminBaseCost: 150,              // koszt administracji państwa / turę
    adminCostPerBuilding: 5,
    foodPerThousand: 2,              // konsumpcja żywności / 1000 mieszkańców
    energyPerThousand: 0.5,          // zużycie energii przez gospodarstwa domowe / 1000 mieszkańców
    baseGrowthRate: 0.01,            // 1% / turę
    growthSatisfactionFactor: 0.001, // + (satisfaction − 50) × 0.001
    foodShortageGrowthPenalty: 0.03,
    maxGrowthRate: 0.05,
    minGrowthRate: -0.05,

    // --- Technologia ---
    techProductionBonus: 0.005,      // produkcja × (1 + technology × 0.005)

    // --- Zadowolenie ---
    satisfaction: {
      foodShortage: -8,
      energyShortage: -4,
      budgetCrisis: -5,
      lowEnvironmentThreshold: 40,
      lowEnvironment: -3,
      highEnvironmentThreshold: 70,
      highEnvironment: 1,
      foodSurplus: 1,
      expectationThreshold: 60,      // powyżej tej wartości oczekiwania mieszkańców rosną
      expectationDrift: -1
    },

    // --- Środowisko ---
    environment: {
      naturalRecovery: 1,
      regionPollutionDecay: 1,
      highPollutionThreshold: 40,    // region z takim zanieczyszczeniem obniża środowisko
      highPollutionPenalty: -1,
      pollutionFarmPenalty: 0.5      // farma × (1 − pollution/100 × 0.5)
    },

    // --- Wydarzenia ---
    events: {
      firstTurn: 2,
      chancePerTurn: 0.6
    },

    // --- Punktacja końcowa ---
    scoring: {
      weights: { economy: 25, welfare: 25, infrastructure: 15, environment: 20, resilience: 15 },
      ratings: [
        { min: 80, id: "model" },
        { min: 60, id: "stable" },
        { min: 40, id: "developing" },
        { min: 0, id: "crisis" }
      ],
      economyBudgetTarget: 8000,
      economyIncomeTarget: 600,
      infrastructureBuildingsTarget: 16,
      populationGrowthTarget: 0.4
    }
  };
})(window.GT = window.GT || {});
