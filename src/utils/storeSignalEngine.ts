import {
  HuntConstraints,
  IMAGES,
  OptimizeConstraints,
  PicOSActivityBox,
  PicOSOptimizationCandidate,
  RecommendationResult,
  StoreInfo
} from "../types";

export interface StoreSignalSkuRec {
  sku: string;
  beforeShare: number;
  afterShare: number;
  lift: number;
  locked: boolean;
  salesDelta: number;
  facings: number;
  packSize: string;
  location: string;
  displayType: string;
  sourceBox: string;
  currentFacings: number;
  action: "Keep" | "Add" | "Increase" | "Reduce";
}

export interface StoreSignalOptimizeResult {
  skus: StoreSignalSkuRec[];
  beforeScore: number;
  afterScore: number;
  liftPercent: number;
  explanation: string;
  displayType: string;
  currentProducts: string[];
}

type CandidateWithBox = PicOSOptimizationCandidate & {
  box: PicOSActivityBox;
};

const DEFAULT_CURRENT_PRODUCTS = ["COKE 20OZ", "SPRITE 20OZ", "SMARTWATER 1L"];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function displayTypeForFocus(focus: OptimizeConstraints["focus"]) {
  if (focus === "Low Sugar") return "Cooler";
  if (focus === "Maximize Margin") return "Display";
  return "Shipper";
}

function categoryMatches(candidate: PicOSOptimizationCandidate, category: HuntConstraints["category"]) {
  const sku = normalize(candidate.sku);
  if (category === "Sparkling") return /coke|cola|sprite|fanta|dr pepper/.test(sku);
  if (category === "Energy") return /monster|reign/.test(sku);
  if (category === "Water") return /water|dasani|smartwater/.test(sku);
  return /gold peak|tea|vitamin|bodyarmor|powerade|fairlife|core power|smartwater|dasani/.test(sku);
}

function objectiveScore(candidate: PicOSOptimizationCandidate, objective: HuntConstraints["priority"] | OptimizeConstraints["focus"]) {
  if (objective === "Margin" || objective === "Maximize Margin") {
    return candidate.liftPct * 1.15 + candidate.opportunityUnits * 0.55 + (candidate.isTypeValid ? 8 : 0);
  }
  if (objective === "Velocity" || objective === "Fastest Velocity") {
    return candidate.opportunityUnits * 1.4 + candidate.liftPct * 0.75 + candidate.facings * 1.5;
  }
  if (objective === "Low Sugar") {
    const zeroBonus = /zero|diet|water|smartwater|dasani/i.test(candidate.sku) ? 25 : 0;
    return candidate.liftPct + candidate.opportunityUnits * 0.8 + zeroBonus;
  }
  return candidate.opportunityUnits + candidate.liftPct * 0.9;
}

function channelFitScore(store: StoreInfo, candidate: PicOSOptimizationCandidate) {
  const channel = normalize(`${store.segment} ${store.retailer}`);
  const location = normalize(`${candidate.location} ${candidate.locationGuidance}`);
  const displayType = normalize(candidate.displayType);
  if (channel.includes("convenience") && /cooler|checkout|queue|food/.test(`${location} ${displayType}`)) return 18;
  if (channel.includes("drug") && /front|checkout|endcap|aisle/.test(`${location} ${displayType}`)) return 14;
  if (channel.includes("large") && /lobby|endcap|shipper|display|aisle/.test(`${location} ${displayType}`)) return 14;
  return 6;
}

function locationMatches(candidate: PicOSOptimizationCandidate, location: HuntConstraints["location"]) {
  const text = normalize(`${candidate.location} ${candidate.locationGuidance}`);
  if (location === "Lobby Front") return /lobby|front|entrance/.test(text);
  if (location === "Front Endcap") return /endcap|end cap|front|checkout/.test(text);
  if (location === "Aisle Cooler") return /aisle|cooler|cold vault/.test(text);
  return /checkout|register|queue|front/.test(text);
}

function displayMatches(candidate: PicOSOptimizationCandidate, displayType: string) {
  const candidateType = normalize(candidate.displayType);
  const targetType = normalize(displayType);
  if (!targetType) return true;
  if (targetType.includes("cooler")) return candidateType.includes("cooler");
  if (targetType.includes("shipper")) return candidateType.includes("shipper") || candidateType.includes("display");
  if (targetType.includes("rack")) return candidateType.includes("rack") || candidateType.includes("display");
  return candidateType.includes(targetType) || targetType.includes(candidateType) || candidateType.includes("display");
}

function candidateLocationLabel(candidate: PicOSOptimizationCandidate) {
  return candidate.locationGuidance || candidate.location || "Store";
}

function locationLabelMatches(candidate: PicOSOptimizationCandidate, selectedLocation = "") {
  if (!selectedLocation) return true;
  return normalize(candidateLocationLabel(candidate)) === normalize(selectedLocation);
}

function allCandidates(store: StoreInfo): CandidateWithBox[] {
  return store.picosBoxes.flatMap(box =>
    (box.optimizationCandidates || []).map(candidate => ({
      ...candidate,
      box
    }))
  );
}

function executeLocationSet(store: StoreInfo) {
  const locations = new Set<string>();
  store.picosBoxes
    .filter(box => box.mode === "Execute")
    .forEach(box => {
      const source = normalize(`${box.location} ${box.locationGuidance}`);
      if (source.includes("lobby")) locations.add("lobby");
      if (source.includes("aisle")) locations.add("aisle");
      if (source.includes("endcap") || source.includes("end cap")) locations.add("endcap");
      if (source.includes("cooler") || source.includes("cold vault")) locations.add("cooler");
      if (source.includes("checkout") || source.includes("register")) locations.add("checkout");
    });
  return locations;
}

function candidateLocationKey(candidate: PicOSOptimizationCandidate) {
  const source = normalize(`${candidate.location} ${candidate.locationGuidance}`);
  if (source.includes("lobby")) return "lobby";
  if (source.includes("aisle")) return "aisle";
  if (source.includes("endcap") || source.includes("end cap")) return "endcap";
  if (source.includes("cooler") || source.includes("cold vault")) return "cooler";
  if (source.includes("checkout") || source.includes("register")) return "checkout";
  return source.split(" ")[0] || "store";
}

function dedupeBySku(candidates: CandidateWithBox[], max: number) {
  const seen = new Set<string>();
  const result: CandidateWithBox[] = [];
  candidates.forEach(candidate => {
    const key = normalize(`${candidate.sku} ${candidate.packSize}`);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(candidate);
  });
  return result.slice(0, max);
}

export function getStoreSignalHuntRecommendation(store: StoreInfo, constraints: HuntConstraints): RecommendationResult {
  const coveredLocations = executeLocationSet(store);
  const candidates = allCandidates(store)
    .filter(candidate => categoryMatches(candidate, constraints.category))
    .filter(candidate => locationMatches(candidate, constraints.location))
    .map(candidate => {
      const coveredPenalty = coveredLocations.has(candidateLocationKey(candidate)) ? 30 : 0;
      const netNewBonus = coveredPenalty ? 0 : 22;
      const score = objectiveScore(candidate, constraints.priority) + channelFitScore(store, candidate) + netNewBonus - coveredPenalty;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(row => row.candidate);

  const fallbackCandidates = allCandidates(store)
    .filter(candidate => categoryMatches(candidate, constraints.category))
    .sort((a, b) => objectiveScore(b, constraints.priority) - objectiveScore(a, constraints.priority));

  const selected = dedupeBySku(candidates.length ? candidates : fallbackCandidates, 4);

  if (!selected.length) {
    return {
      skus: [],
      totalCost: 0,
      expectedLift: 0,
      explanation: `No ${constraints.category} recommendation currently matches the ${constraints.location} target. Try another category or location signal.`,
      feasible: false
    };
  }

  const totalUnits = selected.reduce((sum, candidate) => sum + candidate.opportunityUnits, 0);
  const expectedLift = Math.round(selected.reduce((sum, candidate) => sum + candidate.liftPct, 0) / selected.length);
  const best = selected[0];

  return {
    skus: selected.map((candidate, index) => ({
      skuId: candidate.id,
      name: candidate.sku,
      pack: `${candidate.facings} facings / ${candidate.packSize}`,
      price: candidate.facings,
      expectedSales: Math.round(candidate.opportunityUnits),
      liftPercent: Math.round(candidate.liftPct),
      locked: index === 0,
      image: IMAGES.skuReference
    })),
    totalCost: parseFloat(totalUnits.toFixed(1)),
    expectedLift,
    explanation: `Net-new ${best.displayType} opportunity ranked from ${store.storeName} model signals. Best location: ${best.locationGuidance || best.location}; source activity: ${best.box.box}. Ranking uses lift, unit opportunity, target-location fit, display type, channel fit, and whether the location is already covered by backend picOS.`,
    feasible: true
  };
}

export function getStoreSignalOptimizeRecommendation(
  store: StoreInfo,
  constraints: OptimizeConstraints,
  currentProducts = DEFAULT_CURRENT_PRODUCTS
): StoreSignalOptimizeResult {
  const displayType = constraints.displayType || displayTypeForFocus(constraints.focus);
  const currentKeys = currentProducts.map(normalize);
  const currentFacings = constraints.currentFacings || {};
  const candidates = allCandidates(store)
    .filter(candidate => displayMatches(candidate, displayType))
    .filter(candidate => locationLabelMatches(candidate, constraints.location))
    .filter(candidate => candidate.liftPct > 0)
    .map(candidate => ({ candidate }))
    .sort((a, b) =>
      b.candidate.liftPct - a.candidate.liftPct ||
      b.candidate.opportunityUnits - a.candidate.opportunityUnits ||
      b.candidate.facings - a.candidate.facings
    );

  const recommendationLimit = Math.max(10, constraints.maxSkus || 10);
  const selected = dedupeBySku(candidates.map(row => row.candidate), recommendationLimit);
  const averageLift = selected.length
    ? Math.round(selected.reduce((sum, candidate) => sum + candidate.liftPct, 0) / selected.length)
    : 0;
  const totalUnits = selected.reduce((sum, candidate) => sum + candidate.opportunityUnits, 0);

  const skus = selected.map((candidate, index) => {
    const isCurrent = currentKeys.some(product => normalize(candidate.sku).includes(product) || product.includes(normalize(candidate.sku)));
    const isAnchor = index === 0 || normalize(candidate.sku).includes(normalize(constraints.brandFocus));
    const matchingCurrentProduct = currentProducts.find(product => normalize(candidate.sku).includes(normalize(product)) || normalize(product).includes(normalize(candidate.sku)));
    const currentFacingCount = matchingCurrentProduct ? currentFacings[matchingCurrentProduct] || 0 : 0;
    const action = !isCurrent
      ? "Add"
      : currentFacingCount < candidate.facings
        ? "Increase"
        : currentFacingCount > candidate.facings
          ? "Reduce"
          : "Keep";
    return {
      sku: candidate.sku,
      beforeShare: isCurrent ? Math.max(10, Math.round(candidate.predictedCurrent)) : 0,
      afterShare: Math.max(5, Math.round(candidate.predictedIdeal)),
      lift: Math.round(candidate.liftPct),
      locked: isAnchor,
      salesDelta: Math.round(candidate.opportunityUnits),
      facings: candidate.facings,
      packSize: candidate.packSize,
      location: candidate.locationGuidance || candidate.location,
      displayType: candidate.displayType,
      sourceBox: candidate.box.box,
      currentFacings: currentFacingCount,
      action
    } satisfies StoreSignalSkuRec;
  });

  const beforeScore = Math.max(35, Math.min(75, 52 + currentProducts.length * 3));
  const afterScore = Math.min(98, beforeScore + Math.round(averageLift * 0.35));

  return {
    skus,
    beforeScore,
    afterScore,
    liftPercent: averageLift,
    displayType,
    currentProducts,
    explanation: `Recommended products for a ${displayType}${constraints.location ? ` at ${constraints.location}` : ""} using ${store.storeName} recommendation candidates. Optional current display inputs (${currentProducts.join(", ") || "none selected"}) are used to mark keep/increase/add actions. Ranked by location match, display type, lift %, and unit opportunity. Expected incremental opportunity: +${totalUnits.toFixed(1)} units.`
  };
}
