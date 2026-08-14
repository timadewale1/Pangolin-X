type UnknownRecord = Record<string, unknown>;
const number = (value: unknown) => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; };
const read = (source: unknown, path: string[]) => path.reduce<unknown>((value, key) => value && typeof value === "object" ? (value as UnknownRecord)[key] : undefined, source);

export type IntelligenceSignal = { observation: string; interpretation: string; confidence: "high" | "medium" | "low"; evidence: string[] };

/** Uses only supplied observations; absent measurements remain explicitly absent. */
export function buildFarmIntelligence(input: { weather?: unknown; forecast?: unknown; soil?: unknown; soilSummary?: unknown; cropStages?: unknown; weatherHistory?: unknown; irrigationHistory?: unknown; inputApplications?: unknown; fieldObservations?: unknown; vegetationIndices?: unknown; marketSignals?: unknown }) {
  const currentTemp = number(read(input.weather, ["current", "temp"]) ?? read(input.weather, ["main", "temp"]));
  const humidity = number(read(input.weather, ["current", "humidity"]) ?? read(input.weather, ["main", "humidity"]));
  const wind = number(read(input.weather, ["current", "wind_speed"]) ?? read(input.weather, ["wind", "speed"]));
  const forecast = Array.isArray(input.forecast) ? input.forecast : Array.isArray(read(input.weather, ["daily"])) ? read(input.weather, ["daily"]) as unknown[] : [];
  const rainMm = forecast.reduce<number>((total, day) => total + (number(read(day, ["rain"])) ?? number(read(day, ["rain", "1h"])) ?? 0), 0);
  const warmHumid = currentTemp !== null && humidity !== null && currentTemp >= 22 && currentTemp <= 33 && humidity >= 78;
  const signals: IntelligenceSignal[] = [];
  if (rainMm > 0) signals.push({ observation: `${Math.round(rainMm)} mm forecast across the available forecast window`, interpretation: "Forecast rainfall may change the irrigation, access, and input-application decision window.", confidence: "medium", evidence: ["forecast rainfall"] });
  if (warmHumid) signals.push({ observation: `Current temperature ${currentTemp}°C and humidity ${humidity}%`, interpretation: "Warm, humid conditions can shorten leaf-drying time and raise disease-conducive conditions; this is a risk signal, not a confirmed disease.", confidence: "medium", evidence: ["current temperature", "current humidity"] });
  if (wind !== null && wind >= 7) signals.push({ observation: `Wind ${wind} m/s`, interpretation: "Wind may reduce safe spraying precision and increase drift risk.", confidence: "high", evidence: ["current wind"] });
  const soil = input.soil && typeof input.soil === "object" ? input.soil as UnknownRecord : {};
  const pH = number(soil.pH ?? soil.ph); const sand = number(soil.sand); const clay = number(soil.clay);
  if (pH !== null) signals.push({ observation: `Soil pH ${pH}`, interpretation: pH < 5.5 ? "Acidic soil can constrain nutrient availability; treat this as a planning signal unless a field test confirms it." : pH > 7.8 ? "Alkaline soil can constrain some nutrient availability; treat this as a planning signal unless a field test confirms it." : "pH is within a broadly workable range; no pH-driven urgent change is indicated from this estimate alone.", confidence: "medium", evidence: ["SoilHive pH estimate"] });
  if (sand !== null && clay !== null) signals.push({ observation: `Estimated texture: sand ${sand}%, clay ${clay}%`, interpretation: sand >= 60 ? "Fast drainage is more likely, so rainfall and irrigation should be reassessed sooner after dry weather." : clay >= 35 ? "Slower drainage is more likely, so heavy-rain and field-access decisions deserve extra attention." : "Texture does not indicate an extreme drainage constraint from this estimate alone.", confidence: "medium", evidence: ["SoilHive texture estimate"] });
  return {
    current: { tempC: currentTemp, humidityPct: humidity, windMs: wind },
    forecast: { rainMm: rainMm || null, days: forecast.length || null },
    soil: { pH, sand, clay, summary: typeof input.soilSummary === "string" ? input.soilSummary : null },
    cropStages: input.cropStages ?? {},
    signals,
    dataCoverage: {
      currentWeather: currentTemp !== null || humidity !== null,
      forecast: forecast.length > 0,
      soil: pH !== null || sand !== null || clay !== null,
      weatherHistory: Boolean(input.weatherHistory),
      irrigationHistory: Boolean(input.irrigationHistory),
      inputApplications: Boolean(input.inputApplications),
      fieldObservations: Boolean(input.fieldObservations),
      vegetationIndices: Boolean(input.vegetationIndices),
      marketSignals: Boolean(input.marketSignals),
    },
  };
}

export function advisoryQualityPrompt() {
  return `INTELLIGENCE STANDARD: give only information a knowledgeable farmer would not reliably infer unaided. For each recommendation use Observation → Interpretation → Consequence → Decision → When. Never turn a baseline rule (inspect, drain, water, fertilize, watch pests) into advice unless an explicit supplied signal makes it relevant. Do not invent rainfall totals, disease/pest presence, soil tests, market prices, field zones, historical baselines, satellite results, or thresholds. Rank only 1–3 highest-value decisions by urgency, likely impact, probability, reversibility, and data confidence. If there is no material, data-backed anomaly or decision, return the noNovelInsight outcome instead of generic advice. Use numbers only when in the supplied evidence. Distinguish observed facts, strong inferences, and predictions.`;
}
export function highValueAdvisoryStandard() {
  return `HIGH-VALUE ADVISORY STANDARD (mandatory):
1. Answer the central question: what does the supplied data reveal that this individual farmer could not reasonably know from normal field observation?
2. Use every relevant supplied farm signal: location, crop, variety, planting date/age/stage, soil, weather, forecast, activity history, observations, vegetation, market or local-risk evidence. Missing data is unavailable, never inferred.
3. Interpret rather than repeat data. Every priority follows Observation -> Interpretation -> Consequence -> Decision -> When.
4. Compare past, present and near future only when a historical series or forecast is supplied. Detect change/anomaly only against an explicit supplied baseline. Give predictions only as labelled, evidence-supported predictions.
5. Correlate sources when they jointly support a decision. Never claim pest/disease presence, a field zone, satellite finding, price movement, soil test, rainfall total, threshold, or historical anomaly unless it appears in the supplied context.
6. Return only the 1-3 decisions with the strongest urgency, likely impact, probability, reversibility and confidence. Quantify only supplied reliable values.
7. Treat the farmer as knowledgeable: no baseline farming lessons, vague monitor/ensure/consider language, or generic checklists unless a specific data signal makes them necessary.
8. Use confidence as high/medium/low: observed facts differ from inference and forecast prediction. State no material data-backed change when there is no novel insight; do not manufacture advice.
9. Before returning, reject any item that is not farmer-specific, data-backed, decision-oriented, time-aware where relevant, and more valuable than general agricultural knowledge.`;
}
