type RecordValue = Record<string, unknown>;

export type InsightType =
  | "ANOMALY"
  | "EMERGING_RISK"
  | "IMMINENT_RISK"
  | "PREDICTION"
  | "OPPORTUNITY"
  | "OPTIMIZATION"
  | "CHANGE"
  | "SPATIAL_ANOMALY"
  | "MARKET_SIGNAL"
  | "WEATHER_SIGNAL"
  | "CROP_SIGNAL"
  | "SOIL_SIGNAL"
  | "NO_ACTIONABLE_INSIGHT";

export type EvidenceRecord = {
  source: string;
  variable: string;
  value: string;
  timestamp?: string;
  geographicScope?: string;
};

export type FarmInsight = {
  id: string;
  type: InsightType;
  title: string;
  observation: string;
  rationale: string;
  consequence: string;
  recommendedDecision: string;
  decisionType: "irrigate" | "fertilize" | "spray" | "harvest" | "plant" | "access" | "monitor" | "other";
  decisionWindow: string;
  evidence: EvidenceRecord[];
  baseline?: { label: string; value: string; difference?: string };
  confidence: "high" | "medium" | "low";
  scores: { impact: number; probability: number; urgency: number; novelty: number; specificity: number; evidence: number; reversibility: number; confidence: number; total: number };
};

export type DataAvailability = Record<
  "location" | "crops" | "cropStage" | "currentWeather" | "forecast" | "weatherHistory" | "soil" | "vegetation" | "marketSignals" | "cropHealthSignals" | "irrigationHistory" | "inputApplications" | "fieldObservations",
  boolean
>;

export type FarmInsightReport = {
  generatedAt: string;
  availability: DataAvailability;
  currentState: Record<string, unknown>;
  baselines: Record<string, unknown>;
  insights: FarmInsight[];
  status: "ACTIONABLE_INSIGHTS" | "NO_ACTIONABLE_INSIGHT";
  limitations: string[];
};

export type FarmInsightInput = {
  weather?: unknown;
  forecast?: unknown;
  soil?: unknown;
  crops?: string[];
  cropStages?: unknown;
  weatherHistory?: unknown;
  vegetation?: unknown;
  marketSignals?: unknown;
  cropHealthSignals?: unknown;
  irrigationHistory?: unknown;
  inputApplications?: unknown;
  fieldObservations?: unknown;
  location?: string;
};

function object(value: unknown): RecordValue {
  return value && typeof value === "object" ? value as RecordValue : {};
}

function valueAt(value: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => object(current)[key], value);
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function average(values: number[]) {
  return values.length ? values.reduce((total, item) => total + item, 0) / values.length : null;
}

function rounded(value: number, precision = 1) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function weatherNow(weather: unknown) {
  const temp = numeric(valueAt(weather, ["current", "temp"]) ?? valueAt(weather, ["main", "temp"]) ?? valueAt(weather, ["temp"]));
  const humidity = numeric(valueAt(weather, ["current", "humidity"]) ?? valueAt(weather, ["main", "humidity"]) ?? valueAt(weather, ["humidity"]));
  const wind = numeric(valueAt(weather, ["current", "wind_speed"]) ?? valueAt(weather, ["wind", "speed"]) ?? valueAt(weather, ["wind_speed"]));
  return { temp, humidity, wind };
}

function historyValues(history: unknown, key: "temp" | "humidity" | "windSpeed") {
  return array(history)
    .map((entry) => numeric(object(entry)[key]))
    .filter((entry): entry is number => entry !== null)
    .slice(0, 30);
}

function forecastRain(forecast: unknown) {
  return array(forecast).reduce<number>((total, day) => {
    const amount = numeric(valueAt(day, ["rain"]) ?? valueAt(day, ["rain", "1h"]));
    return total + (amount ?? 0);
  }, 0);
}

function cropStage(crops: string[], stages: unknown) {
  const source = object(stages);
  return crops.map((crop) => ({ crop, stage: String(object(source[crop]).stage ?? "not recorded"), plantedAt: String(object(source[crop]).plantedAt ?? "") || null }));
}

function soilValues(soilInput: unknown) {
  const soil = object(soilInput);
  return { pH: numeric(soil.pH ?? soil.ph), sand: numeric(soil.sand), clay: numeric(soil.clay) };
}

function score(input: Omit<FarmInsight["scores"], "total">) {
  const total = Math.round((input.impact * 0.2 + input.probability * 0.14 + input.urgency * 0.16 + input.novelty * 0.16 + input.specificity * 0.12 + input.evidence * 0.12 + input.reversibility * 0.05 + input.confidence * 0.05) * 10) / 10;
  return { ...input, total };
}

function insight(input: Omit<FarmInsight, "scores"> & { score: Omit<FarmInsight["scores"], "total"> }) {
  return { ...input, scores: score(input.score) };
}

function sourceTitle(item: unknown) {
  const source = object(item);
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const publisher = typeof source.source === "string" ? source.source.trim() : "";
  return title ? title + (publisher ? " (" + publisher + ")" : "") : "";
}

function vegetationNumbers(vegetation: unknown) {
  return array(vegetation)
    .map((entry) => ({ ndvi: numeric(object(entry).ndvi), collectedAt: typeof object(entry).collectedAt === "string" ? object(entry).collectedAt as string : undefined }))
    .filter((entry): entry is { ndvi: number; collectedAt: string | undefined } => entry.ndvi !== null)
    .slice(0, 2);
}

export function runFarmInsightEngine(input: FarmInsightInput): FarmInsightReport {
  const crops = Array.isArray(input.crops) ? input.crops.filter((crop): crop is string => typeof crop === "string" && Boolean(crop)) : [];
  const now = weatherNow(input.weather);
  const history = array(input.weatherHistory);
  const forecast = Array.isArray(input.forecast) ? input.forecast : array(valueAt(input.weather, ["daily"]));
  const rainMm = forecastRain(forecast);
  const soil = soilValues(input.soil);
  const stages = cropStage(crops, input.cropStages);
  const vegetation = vegetationNumbers(input.vegetation);
  const market = array(input.marketSignals).map(sourceTitle).filter(Boolean);
  const cropHealth = array(input.cropHealthSignals).map(sourceTitle).filter(Boolean);
  const availability: DataAvailability = {
    location: Boolean(input.location),
    crops: crops.length > 0,
    cropStage: stages.some((stage) => stage.stage !== "not recorded"),
    currentWeather: now.temp !== null || now.humidity !== null || now.wind !== null,
    forecast: forecast.length > 0,
    weatherHistory: history.length >= 4,
    soil: soil.pH !== null || soil.sand !== null || soil.clay !== null,
    vegetation: vegetation.length > 0,
    marketSignals: market.length > 0,
    cropHealthSignals: cropHealth.length > 0,
    irrigationHistory: array(input.irrigationHistory).length > 0,
    inputApplications: array(input.inputApplications).length > 0,
    fieldObservations: array(input.fieldObservations).length > 0,
  };
  const baselines: Record<string, unknown> = {};
  const insights: FarmInsight[] = [];
  const tempHistory = historyValues(history, "temp");
  const humidityHistory = historyValues(history, "humidity");

  if (now.temp !== null && tempHistory.length >= 4) {
    const baseline = average(tempHistory);
    const difference = baseline === null ? null : now.temp - baseline;
    if (baseline !== null && difference !== null && Math.abs(difference) >= 3) {
      baselines.temperature = { sampleSize: tempHistory.length, meanC: rounded(baseline), currentC: rounded(now.temp), differenceC: rounded(difference) };
      insights.push(insight({
        id: "temperature-change",
        type: "ANOMALY",
        title: "Temperature is " + rounded(Math.abs(difference)) + "°C " + (difference > 0 ? "above" : "below") + " your recent farm baseline",
        observation: "Current temperature is " + rounded(now.temp) + "°C; the mean of " + tempHistory.length + " recorded farm observations is " + rounded(baseline) + "°C.",
        rationale: "This is a measured change from this farm's recent conditions, not a regional assumption.",
        consequence: "A temperature-sensitive operation should be timed against this change rather than treated as a normal day.",
        recommendedDecision: "Use the current temperature shift when timing any planned temperature-sensitive field operation.",
        decisionType: "other",
        decisionWindow: "Today, while this temperature departure persists.",
        evidence: [{ source: "Pangolin weather history", variable: "temperature", value: rounded(now.temp) + "°C current versus " + rounded(baseline) + "°C recent mean", geographicScope: input.location }],
        baseline: { label: "Recent farm weather baseline", value: rounded(baseline) + "°C across " + tempHistory.length + " observations", difference: (difference > 0 ? "+" : "") + rounded(difference) + "°C" },
        confidence: "medium",
        score: { impact: 55, probability: 80, urgency: 55, novelty: 74, specificity: 82, evidence: 76, reversibility: 60, confidence: 70 },
      }));
    }
  }

  if (now.humidity !== null && humidityHistory.length >= 4) {
    const baseline = average(humidityHistory);
    const difference = baseline === null ? null : now.humidity - baseline;
    if (baseline !== null && difference !== null && Math.abs(difference) >= 15) {
      baselines.humidity = { sampleSize: humidityHistory.length, meanPct: rounded(baseline), currentPct: rounded(now.humidity), differencePct: rounded(difference) };
      insights.push(insight({
        id: "humidity-change",
        type: "CHANGE",
        title: "Humidity has shifted " + rounded(Math.abs(difference)) + " percentage points from your recent baseline",
        observation: "Current humidity is " + rounded(now.humidity) + "% versus a " + rounded(baseline) + "% mean across " + humidityHistory.length + " recorded observations.",
        rationale: "The system detected a material farm-local change; it does not diagnose a pest or disease from humidity alone.",
        consequence: "Any work whose timing depends on dry foliage or air movement may need a different window.",
        recommendedDecision: "Re-time only planned weather-sensitive work; do not treat this change as a crop-health diagnosis.",
        decisionType: "other",
        decisionWindow: "Today and the next weather update.",
        evidence: [{ source: "Pangolin weather history", variable: "relative humidity", value: rounded(now.humidity) + "% current versus " + rounded(baseline) + "% recent mean", geographicScope: input.location }],
        baseline: { label: "Recent farm humidity baseline", value: rounded(baseline) + "% across " + humidityHistory.length + " observations", difference: (difference > 0 ? "+" : "") + rounded(difference) + " percentage points" },
        confidence: "medium",
        score: { impact: 48, probability: 80, urgency: 55, novelty: 72, specificity: 80, evidence: 75, reversibility: 65, confidence: 70 },
      }));
    }
  }

  if (rainMm >= 20 && soil.clay !== null && soil.clay >= 35) {
    insights.push(insight({
      id: "forecast-rain-clay",
      type: "EMERGING_RISK",
      title: rounded(rainMm) + " mm of forecast rain meets a clay-heavy soil constraint",
      observation: rounded(rainMm) + " mm is forecast in the available window and the SoilHive estimate reports " + rounded(soil.clay) + "% clay.",
      rationale: "Rainfall and slow-draining texture converge; this is a forecast-based risk, not a report of waterlogging.",
      consequence: "A planned field-access or input-application decision may become harder to reverse after the rain begins.",
      recommendedDecision: "Complete only time-critical access-dependent work before the forecast window; defer non-essential soil-disturbing work until conditions can be reassessed.",
      decisionType: "access",
      decisionWindow: "Before the forecast rainfall window.",
      evidence: [
        { source: "Weather forecast", variable: "forecast rainfall", value: rounded(rainMm) + " mm", geographicScope: input.location },
        { source: "SoilHive", variable: "clay content", value: rounded(soil.clay) + "%", geographicScope: input.location },
      ],
      confidence: "medium",
      score: { impact: 75, probability: 68, urgency: 78, novelty: 84, specificity: 84, evidence: 84, reversibility: 76, confidence: 72 },
    }));
  }

  if (rainMm >= 15 && soil.sand !== null && soil.sand >= 60) {
    insights.push(insight({
      id: "forecast-rain-sand",
      type: "OPPORTUNITY",
      title: "Forecast rainfall can cover part of the next moisture decision on sandy soil",
      observation: rounded(rainMm) + " mm is forecast and SoilHive estimates " + rounded(soil.sand) + "% sand.",
      rationale: "Sandy texture makes stored water less predictable, while forecast rainfall changes the near-term water decision.",
      consequence: "Irrigating before the forecast may duplicate water if the forecast arrives; waiting too long after a missed forecast could still expose the crop to a fast-drying profile.",
      recommendedDecision: "Delay a planned irrigation decision until the forecast window passes, then reassess with a field moisture observation rather than assuming the rain arrived.",
      decisionType: "irrigate",
      decisionWindow: "After the forecast window, or sooner if the forecast fails and field moisture is observed to be low.",
      evidence: [
        { source: "Weather forecast", variable: "forecast rainfall", value: rounded(rainMm) + " mm", geographicScope: input.location },
        { source: "SoilHive", variable: "sand content", value: rounded(soil.sand) + "%", geographicScope: input.location },
      ],
      confidence: "medium",
      score: { impact: 66, probability: 65, urgency: 76, novelty: 80, specificity: 83, evidence: 84, reversibility: 68, confidence: 70 },
    }));
  }

  if (now.wind !== null && now.wind >= 7) {
    insights.push(insight({
      id: "wind-spray-window",
      type: "WEATHER_SIGNAL",
      title: "Current wind is outside a precision spray window",
      observation: "Current wind speed is " + rounded(now.wind) + " m/s.",
      rationale: "This is a directly measured application-timing signal; it does not assert that treatment is required.",
      consequence: "If an application is already planned, high wind can reduce placement precision and increase off-target drift.",
      recommendedDecision: "Delay any planned foliar spray until wind speed drops and reassess the application window.",
      decisionType: "spray",
      decisionWindow: "Do not spray while the reported wind condition persists.",
      evidence: [{ source: "Current weather", variable: "wind speed", value: rounded(now.wind) + " m/s", geographicScope: input.location }],
      confidence: "high",
      score: { impact: 70, probability: 88, urgency: 80, novelty: 70, specificity: 78, evidence: 90, reversibility: 80, confidence: 88 },
    }));
  }

  if (vegetation.length >= 2) {
    const latest = vegetation[0];
    const previous = vegetation[1];
    const difference = latest.ndvi - previous.ndvi;
    if (Math.abs(difference) >= 0.12) {
      insights.push(insight({
        id: "vegetation-change",
        type: "CROP_SIGNAL",
        title: "Vegetation index changed by " + rounded(Math.abs(difference), 2) + " at the saved farm point",
        observation: "The latest Sentinel sample is " + rounded(latest.ndvi, 2) + " versus " + rounded(previous.ndvi, 2) + " in the prior sample.",
        rationale: "This is a point-sample change around the saved farm coordinate, not a whole-field diagnosis.",
        consequence: "The change is worth correlating with a dated farmer observation before an input or treatment decision is made.",
        recommendedDecision: "Record a focused field observation at the farm-point area before changing inputs or treatment.",
        decisionType: "monitor",
        decisionWindow: "Within the next field visit.",
        evidence: [{ source: "Sentinel-2", variable: "NDVI farm-point sample", value: rounded(latest.ndvi, 2) + " versus " + rounded(previous.ndvi, 2), geographicScope: "farm-point sample" }],
        baseline: { label: "Prior Sentinel farm-point sample", value: String(rounded(previous.ndvi, 2)), difference: (difference > 0 ? "+" : "") + String(rounded(difference, 2)) },
        confidence: "low",
        score: { impact: 65, probability: 60, urgency: 55, novelty: 88, specificity: 68, evidence: 68, reversibility: 66, confidence: 52 },
      }));
    }
  }

  if (cropHealth.length > 0) {
    insights.push(insight({
      id: "crop-health-signal",
      type: "CROP_SIGNAL",
      title: "A recent crop-health report may be relevant to your location or crops",
      observation: cropHealth[0],
      rationale: "This is a source-linked local information signal, not confirmation that the issue is present on this farm.",
      consequence: "A verified local report can affect which crop-health question is worth resolving before committing to treatment.",
      recommendedDecision: "Open the cited report and compare its location and crop to your farm before changing a crop-protection plan.",
      decisionType: "monitor",
      decisionWindow: "Before the next crop-protection purchase or application.",
      evidence: [{ source: "Targeted crop-health news search", variable: "recent headline", value: cropHealth[0], geographicScope: input.location }],
      confidence: "low",
      score: { impact: 60, probability: 40, urgency: 52, novelty: 70, specificity: 55, evidence: 45, reversibility: 66, confidence: 42 },
    }));
  }

  if (market.length > 0 && stages.some((stage) => /matur|harvest|fruit/i.test(stage.stage))) {
    insights.push(insight({
      id: "market-signal",
      type: "MARKET_SIGNAL",
      title: "A market report may affect a crop approaching harvest",
      observation: market[0],
      rationale: "The report is a source-linked signal only; no price level or trend is inferred from a headline.",
      consequence: "The report may be worth verifying before a harvest-timing, sale, or storage decision.",
      recommendedDecision: "Verify the cited market report with your intended buyer or market before altering harvest or sale timing.",
      decisionType: "harvest",
      decisionWindow: "Before the next harvest or sale commitment.",
      evidence: [{ source: "Targeted market news search", variable: "recent headline", value: market[0], geographicScope: input.location }],
      confidence: "low",
      score: { impact: 62, probability: 40, urgency: 50, novelty: 68, specificity: 62, evidence: 45, reversibility: 65, confidence: 42 },
    }));
  }

  const ranked = insights.sort((left, right) => right.scores.total - left.scores.total).slice(0, 3);
  const limitations = [
    !availability.weatherHistory && "A recent farm weather baseline is not available yet.",
    !availability.vegetation && "No verified satellite vegetation observation is available yet.",
    !availability.irrigationHistory && "No irrigation history is recorded.",
    !availability.inputApplications && "No fertilizer or crop-protection application history is recorded.",
    !availability.fieldObservations && "No farmer field observation is recorded.",
    !availability.marketSignals && "No current market signal was found.",
    !availability.cropHealthSignals && "No current crop-health signal was found.",
  ].filter((item): item is string => Boolean(item));
  return {
    generatedAt: new Date().toISOString(),
    availability,
    currentState: { weather: now, forecastRainMm: rainMm || null, soil, crops: stages },
    baselines,
    insights: ranked,
    status: ranked.length ? "ACTIONABLE_INSIGHTS" : "NO_ACTIONABLE_INSIGHT",
    limitations,
  };
}
