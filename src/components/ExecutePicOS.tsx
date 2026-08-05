import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleMinus, Database, Layers, Lock, MapPin, Minus, PackageCheck, Plus, RefreshCw } from "lucide-react";
import {
  ActivityOutcome,
  ON_AD_DIRECTIVES,
  PicOSConstraints,
  PicOSActivityBox,
  PicOSExecutionItem,
  PicOSOverride,
  PicOSOverrideType,
  PicOSRecommendationSource,
  StoreInfo,
  OnAdDirective,
  PicOSOptimizationCandidate
} from "../types";

interface ExecutePicOSProps {
  store: StoreInfo;
  activityOutcomes?: Record<string, ActivityOutcome>;
  lastActivityOutcomeId?: string | null;
  onBackToHub: () => void;
  onUndoActivityOutcome?: (directiveId: string) => void;
  onProceedToAfterPhoto: (constraints: PicOSConstraints) => void;
}

const substituteSkus = [
  "Coke Zero Sugar 20oz",
  "Coca-Cola Original 20oz",
  "Sprite Zero Sugar 12pk",
  "Diet Coke 12pk",
  "Fanta Orange 12pk",
  "Smartwater 1L",
  "Topo Chico Sabores 8pk"
];

const fallbackLocations = [
  "Front Lobby",
  "End Cap",
  "Aisle",
  "Checkout",
  "Food Service",
  "Cooler",
  "Dump Bin",
  "Pharmacy"
];

const fallbackPoiTypes = [
  "Cooler",
  "Display",
  "Shipper",
  "Rack",
  "Shelf"
];

type LocationConstraint = {
  label: string;
  keys: string[];
};

type BackendSkuConstraint = {
  label: string;
  brand: string;
  packTokens: string[];
};

type LocationRecommendation = {
  candidateIndex: number;
  location: string;
  poiType: string;
  liftPct: number;
  opportunityUnits: number;
  isBackendConstrained: boolean;
};

const reasonByType: Record<PicOSOverrideType, string> = {
  location: "Store space unavailable",
  poiType: "Fixture mismatch",
  sku: "Product unavailable",
  facings: "Physical capacity constraint"
};

function parsePreferredLocation(location: string) {
  const firstSentence = location.split(".")[0];
  const firstOption = firstSentence.split(" or ")[0];
  return firstOption.trim() || "Not stated";
}

function inferPoiType(location: string) {
  const value = location.toLowerCase();
  if (value.includes("lobby")) return "Lobby Stack";
  if (value.includes("cooler")) return "Cooler Door";
  if (value.includes("checkout")) return "Checkout Rack";
  if (value.includes("sidestack")) return "Sidestack";
  if (value.includes("perimeter")) return "Perimeter Stack";
  return "Endcap Display";
}

function formatPackTokens(packSizesStated: string) {
  if (!packSizesStated || packSizesStated === "Not explicitly stated") return [];
  return [...new Set(packSizesStated
    .split(";")
    .map(pack => canonicalPackToken(pack))
    .filter(Boolean))];
}

function displayPackToken(pack: string) {
  const displayByPack: Record<string, string> = {
    "2l": "2L",
    "1.25l": "1.25L",
    "1l": "1L",
    "500ml": "500ml",
    "700ml": "700ml",
    "mini-can": "Mini Can"
  };
  return displayByPack[pack] || pack.toUpperCase();
}

function displayBrandName(sku: string) {
  const brand = brandKey(sku);
  const displayByBrand: Record<string, string> = {
    coke: "COKE",
    "coke-zero": "COKE ZERO SUGAR",
    "diet-coke": "DIET COKE",
    "cherry-coke": "CHERRY COKE",
    "coca-cola-spiced": "COCA-COLA SPICED",
    "coca-cola-orange-cream": "COCA-COLA ORANGE CREAM",
    sprite: "SPRITE",
    fanta: "FANTA",
    powerade: "POWERADE",
    bodyarmor: "BODYARMOR",
    smartwater: "SMARTWATER",
    dasani: "DASANI",
    "topo-chico": "TOPO CHICO",
    "vitamin-water": "VITAMIN WATER",
    "gold-peak": "GOLD PEAK",
    "core-power": "CORE POWER",
    fairlife: "FAIRLIFE",
    monster: "MONSTER",
    "dr-pepper": "DR PEPPER",
    "sprite-tea": "SPRITE + TEA",
    "diet-sprite-zero": "DIET SPRITE ZERO",
    "sprite-chill": "SPRITE CHILL",
    "sprite-winter-spiced": "SPRITE WINTER SPICED"
  };
  return displayByBrand[brand] || sku.trim().replace(/\s+/g, " ").toUpperCase();
}

function aliasesForSku(sku: string) {
  const brand = brandKey(sku);
  const aliasesByBrand: Record<string, string[]> = {
    coke: ["coke", "coca-cola", "coca cola"],
    "coke-zero": ["coke zero", "zero sugar"],
    "diet-coke": ["diet coke"],
    sprite: ["sprite"],
    fanta: ["fanta"],
    powerade: ["powerade"],
    bodyarmor: ["bodyarmor", "body armor"],
    smartwater: ["smartwater", "smart water", "sw"],
    "vitamin-water": ["vitamin water", "vitaminwater", "vw"],
    "gold-peak": ["gold peak", "gp"],
    "core-power": ["core power"],
    fairlife: ["fairlife"],
    monster: ["monster"],
    "dr-pepper": ["dr pepper"]
  };
  return aliasesByBrand[brand] || [sku.toLowerCase()];
}

function contextPackTokensForSku(sku: string, packSizesStated: string, context = "") {
  const fallbackTokens = formatPackTokens(packSizesStated);
  const text = context.toLowerCase();
  if (!text || !fallbackTokens.length) return fallbackTokens;

  const skuAliases = aliasesForSku(sku);
  const packPattern = "\\d+(?:\\.\\d+)?\\s*(?:oz|l|ltr|ml|pk|pack|ct)";
  const boundedPackPattern = `(?<![\\d.])(${packPattern})(?![a-z0-9])`;
  const matchedPacks = new Set<string>();

  skuAliases.forEach(alias => {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let resolvedFromShortAlias = false;
    if (alias.length <= 2) {
      const productListText = text.match(/\bad:\s*(.*?)\bretail:/i)?.[1] || text;
      productListText.split(/[,;\n]/).forEach(segment => {
        if (new RegExp(`\\b${escapedAlias}\\b`, "i").test(segment)) {
          const segmentPacks = packKeys(segment);
          if (segmentPacks.size) resolvedFromShortAlias = true;
          segmentPacks.forEach(pack => matchedPacks.add(pack));
        }
      });
    }
    if (resolvedFromShortAlias) return;
    const beforeAlias = new RegExp(`${boundedPackPattern}[^.;,\\n]{0,18}\\b${escapedAlias}\\b`, "gi");
    const afterAlias = new RegExp(`\\b${escapedAlias}\\b[^.;,\\n]{0,18}${boundedPackPattern}`, "gi");
    for (const match of text.matchAll(beforeAlias)) matchedPacks.add(canonicalPackToken(match[1]));
    for (const match of text.matchAll(afterAlias)) matchedPacks.add(canonicalPackToken(match[1]));
  });

  return matchedPacks.size ? [...matchedPacks] : fallbackTokens;
}

function formatSkuName(sku: string, packSizesStated: string, context = "") {
  const packTokens = contextPackTokensForSku(sku, packSizesStated, context);
  const normalizedSku = displayBrandName(sku);
  if (!packTokens.length) return normalizedSku;

  const skuLower = normalizedSku.toLowerCase();
  const missingPackTokens = packTokens
    .map(pack => displayPackToken(pack))
    .filter(pack => !skuLower.includes(pack.toLowerCase()));
  return [normalizedSku, ...missingPackTokens].join(" ");
}

function splitSkus(skusStated: string, activity: string, packSizesStated = "") {
  if (skusStated && skusStated !== "Not explicitly stated") {
    return skusStated
      .split(";")
      .map(sku => formatSkuName(sku, packSizesStated, activity))
      .filter(Boolean);
  }
  return [activity.replace(/^(OnAd|Sell Sheet|Sheet)\s*\d+\s*/i, "").slice(0, 44) || "Backend SKU mix"];
}

function brandKey(value: string) {
  const text = value.toLowerCase();
  if (/spiced/.test(text)) return "coca-cola-spiced";
  if (/orange\s+cream/.test(text)) return "coca-cola-orange-cream";
  if (/holiday\s+creamy\s+vanilla|creamy\s+vanilla/.test(text)) return "coca-cola-creamy-vanilla";
  if (/diet\s+coke/.test(text)) return "diet-coke";
  if (/cherry\s+coke/.test(text)) return "cherry-coke";
  if (/coke\s+zero|zero\s+sugar/.test(text)) return "coke-zero";
  if (/coca-cola|coke/.test(text)) return "coke";
  if (/diet\s+sprite\s+zero/.test(text)) return "diet-sprite-zero";
  if (/sprite\s*\+\s*tea/.test(text)) return "sprite-tea";
  if (/sprite\s+chill/.test(text)) return "sprite-chill";
  if (/sprite\s+winter/.test(text)) return "sprite-winter-spiced";
  if (/sprite\s+zero/.test(text)) return "sprite-zero";
  if (/sprite/.test(text)) return "sprite";
  if (/fanta/.test(text)) return "fanta";
  if (/powerade/.test(text)) return "powerade";
  if (/body\s?armor/.test(text)) return "bodyarmor";
  if (/smartwater|smart\s+water/.test(text)) return "smartwater";
  if (/dasani/.test(text)) return "dasani";
  if (/topo\s+chico/.test(text)) return "topo-chico";
  if (/vitamin\s*water/.test(text)) return "vitamin-water";
  if (/gold\s+peak/.test(text)) return "gold-peak";
  if (/core\s+power/.test(text)) return "core-power";
  if (/fairlife/.test(text)) return "fairlife";
  if (/monster/.test(text)) return "monster";
  if (/dr\s+pepper/.test(text)) return "dr-pepper";
  return text.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function packKeys(value: string) {
  const keys = new Set(
    (value.toLowerCase().match(/\b\d+(?:\.\d+)?\s*(?:oz|l|ltr|ml|pk|pack|ct)\b/g) || [])
      .map(pack => canonicalPackToken(pack))
  );
  if (/\bmini\s*can/.test(value.toLowerCase())) keys.add("mini-can");
  return keys;
}

function canonicalPackToken(value: string) {
  const token = value.trim().toLowerCase().replace(/\s+/g, "").replace("pack", "pk").replace("pks", "pk");
  const equivalents: Record<string, string> = {
    "67.6oz": "2l",
    "2ltr": "2l",
    "42.2oz": "1.25l",
    "33.8oz": "1l",
    "16.9oz": "500ml",
    "5l": "500ml",
    "0.5l": "500ml",
    ".5l": "500ml"
  };
  return equivalents[token] || token;
}

function backendSkuConstraints(skus: string[]) {
  return skus.map(sku => ({
    label: sku,
    brand: brandKey(sku),
    packTokens: [...packKeys(sku)]
  }));
}

function candidateMatchesBackendSku(candidate: PicOSOptimizationCandidate, constraints: BackendSkuConstraint[]) {
  if (constraints.length === 0) return true;
  const candidateBrand = brandKey(candidate.sku);
  const candidatePacks = packKeys(`${candidate.sku} ${candidate.packSize}`);

  return constraints.some(constraint => {
    const brandMatches = constraint.brand === candidateBrand;
    const packsMatch = constraint.packTokens.every(pack => candidatePacks.has(pack));
    return brandMatches && packsMatch;
  });
}

function skuIdentity(value: string) {
  return `${brandKey(value)}::${[...packKeys(value)].sort().join("|")}`;
}

function locationKeysForText(value: string) {
  const text = value.toLowerCase();
  const keys = new Set<string>();

  if (/entrance\s+lobby|front\s+lobby|lobby/.test(text)) keys.add("lobby");
  if (/beverage\s+aisle|aisle/.test(text)) keys.add("aisle");
  if (/perm(?:anent)?\s*end\s*cap|dest(?:ination)?\s*coke\s*end\s*cap|end\s*cap|endcap/.test(text)) keys.add("endcap");
  if (/checkout|front\s+register|register/.test(text)) keys.add("checkout");
  if (/cooler|cold\s+vault/.test(text)) keys.add("cooler");
  if (/perimeter/.test(text)) keys.add("perimeter");
  if (/food\s+service|chicken\s+warmer/.test(text)) keys.add("food-service");
  if (/dump\s+bin|barrel\s+bin|bunker/.test(text)) keys.add("dump-bin");
  if (/pharmacy/.test(text)) keys.add("pharmacy");
  if (/produce/.test(text)) keys.add("produce");
  if (/deli|bakery/.test(text)) keys.add("deli-bakery");
  if (/meat|seafood/.test(text)) keys.add("meat-seafood");
  if (/alcohol/.test(text)) keys.add("alcohol");
  if (/\bentrance\b/.test(text) && !/entrance\s+lobby/.test(text)) keys.add("entrance");

  return [...keys];
}

function labelForLocationPhrase(value: string) {
  const text = value.toLowerCase();
  if (/beverage\s+aisle/.test(text)) return "Beverage Aisle";
  if (/entrance\s+lobby|front\s+lobby|lobby/.test(text)) return "Lobby";
  if (/perm(?:anent)?\s*end\s*cap/.test(text)) return "Perm EndCap";
  if (/dest(?:ination)?\s*coke\s*end\s*cap/.test(text)) return "Dest Coke EndCap";
  if (/end\s*cap|endcap/.test(text)) return "Endcap";
  if (/checkout|front\s+register|register/.test(text)) return "Checkout";
  if (/cooler|cold\s+vault/.test(text)) return "Cooler";
  if (/perimeter/.test(text)) return "Perimeter";
  if (/food\s+service|chicken\s+warmer/.test(text)) return "Food Service";
  if (/dump\s+bin|barrel\s+bin|bunker/.test(text)) return "Dump Bin";
  if (/\bentrance\b/.test(text)) return "Entrance";
  return value.trim().replace(/\s+/g, " ");
}

function addLocationConstraint(constraints: LocationConstraint[], value: string) {
  const label = labelForLocationPhrase(value);
  const keys = locationKeysForText(value);
  if (!label || keys.length === 0) return;

  const existing = constraints.find(constraint => constraint.label === label);
  if (existing) {
    existing.keys = [...new Set([...existing.keys, ...keys])];
    return;
  }

  constraints.push({ label, keys });
}

function extractAllowedLocations(source: Pick<OnAdDirective, "location" | "details" | "name"> | PicOSActivityBox) {
  const locationText = "locationGuidance" in source ? source.locationGuidance : source.location;
  const detailText = "executionDetail" in source ? source.executionDetail : source.details;
  const activityText = "activity" in source ? source.activity : source.name;
  const constraints: LocationConstraint[] = [];

  const primaryText = [locationText, detailText].filter(text => text && text !== "Not explicitly stated" && text !== "Not stated").join(", ");
  const detailAfterExecute = detailText?.split(/execute:/i).slice(1).join(" Execute: ");
  const textToParse = detailAfterExecute || primaryText || activityText || "";

  textToParse
    .split(/[,;|/]+|\bor\b/i)
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => addLocationConstraint(constraints, part));

  if (constraints.length === 0 && primaryText) {
    addLocationConstraint(constraints, primaryText);
  }

  return constraints;
}

function candidateMatchesLocationConstraint(candidate: PicOSOptimizationCandidate, constraints: LocationConstraint[]) {
  if (constraints.length === 0) return true;
  const candidateKeys = locationKeysForText(`${candidate.locationGuidance} ${candidate.location}`);
  return constraints.some(constraint => constraint.keys.some(key => candidateKeys.includes(key)));
}

function initialCandidateIndexForSource(
  source: Pick<OnAdDirective, "location" | "details" | "name"> | PicOSActivityBox,
  candidates = [] as PicOSOptimizationCandidate[],
  skuConstraints = [] as BackendSkuConstraint[]
) {
  const constraints = extractAllowedLocations(source);
  const bestIndex = (predicate: (candidate: PicOSOptimizationCandidate) => boolean) => {
    let selectedIndex = -1;
    let selectedUnits = -Infinity;
    let selectedLift = -Infinity;
    candidates.forEach((candidate, index) => {
      if (!predicate(candidate)) return;
      if (candidate.opportunityUnits > selectedUnits || (
        candidate.opportunityUnits === selectedUnits && candidate.liftPct > selectedLift
      )) {
        selectedIndex = index;
        selectedUnits = candidate.opportunityUnits;
        selectedLift = candidate.liftPct;
      }
    });
    return selectedIndex;
  };

  const constrainedIndex = bestIndex(candidate =>
    candidateMatchesBackendSku(candidate, skuConstraints) && candidateMatchesLocationConstraint(candidate, constraints)
  );
  if (constrainedIndex >= 0) return constrainedIndex;

  const skuOnlyIndex = bestIndex(candidate => candidateMatchesBackendSku(candidate, skuConstraints));
  if (skuOnlyIndex >= 0) return skuOnlyIndex;

  const anyIndex = bestIndex(() => true);
  return anyIndex >= 0 ? anyIndex : 0;
}

function bestLiftPctForSource(
  source: Pick<OnAdDirective, "location" | "details" | "name"> | PicOSActivityBox,
  candidates = [] as PicOSOptimizationCandidate[],
  skuConstraints = [] as BackendSkuConstraint[]
) {
  const constraints = extractAllowedLocations(source);
  const eligibleCandidates = constraints.length
    ? candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints) && candidateMatchesLocationConstraint(candidate, constraints))
    : candidates;
  const skuEligibleCandidates = candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints));
  const rankedCandidates = eligibleCandidates.length ? eligibleCandidates : skuEligibleCandidates.length ? skuEligibleCandidates : candidates;
  return aggregateLiftPctForCandidates(rankedCandidates);
}

function bestLiftPct(candidates = [] as PicOSOptimizationCandidate[]) {
  return candidates.reduce((best, candidate) => Math.max(best, candidate.liftPct), 0);
}

function aggregateLiftPctForCandidates(candidates = [] as PicOSOptimizationCandidate[]) {
  const seen = new Set<string>();
  const selected = [...candidates]
    .sort((a, b) => b.opportunityUnits - a.opportunityUnits || b.liftPct - a.liftPct)
    .filter(candidate => {
      const key = skuIdentity(candidate.sku);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
  const totalOpportunity = selected.reduce((sum, candidate) => sum + candidate.opportunityUnits, 0);
  const totalBaseline = selected.reduce((sum, candidate) => sum + Math.max(candidate.predictedCurrent, 0), 0);
  return totalBaseline > 0 ? Math.round((totalOpportunity / totalBaseline) * 100) : bestLiftPct(selected);
}

function aggregateMetricsForCandidates(candidates = [] as PicOSOptimizationCandidate[]) {
  const seen = new Set<string>();
  const selected = [...candidates]
    .sort((a, b) => b.opportunityUnits - a.opportunityUnits || b.liftPct - a.liftPct)
    .filter(candidate => {
      const key = skuIdentity(candidate.sku);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
  const opportunityUnits = selected.reduce((sum, candidate) => sum + candidate.opportunityUnits, 0);
  const baselineUnits = selected.reduce((sum, candidate) => sum + Math.max(candidate.predictedCurrent, 0), 0);

  return {
    opportunityUnits: parseFloat(opportunityUnits.toFixed(1)),
    liftPct: baselineUnits > 0 ? Math.round((opportunityUnits / baselineUnits) * 100) : bestLiftPct(selected)
  };
}

function bestOpportunityUnitsForSource(
  source: Pick<OnAdDirective, "location" | "details" | "name"> | PicOSActivityBox,
  candidates = [] as PicOSOptimizationCandidate[],
  skuConstraints = [] as BackendSkuConstraint[]
) {
  const constraints = extractAllowedLocations(source);
  const eligibleCandidates = constraints.length
    ? candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints) && candidateMatchesLocationConstraint(candidate, constraints))
    : candidates;
  const skuEligibleCandidates = candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints));
  const rankedCandidates = eligibleCandidates.length ? eligibleCandidates : skuEligibleCandidates.length ? skuEligibleCandidates : candidates;
  return aggregateMetricsForCandidates(rankedCandidates).opportunityUnits;
}

function rankedLocationRecommendations(
  directive: OnAdDirective,
  skuConstraints: BackendSkuConstraint[],
  locationConstraints: LocationConstraint[],
  blockedLocations: string[] = [],
  blockedPoiTypes: string[] = []
) {
  const candidates = directive.optimizationCandidates || [];
  const constrainedCandidates = locationConstraints.length
    ? candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints) && candidateMatchesLocationConstraint(candidate, locationConstraints))
    : [];
  const skuCandidates = candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints));
  const rankedPool = constrainedCandidates.length ? constrainedCandidates : skuCandidates.length ? skuCandidates : candidates;
  const recommendationsByLocation = new Map<string, LocationRecommendation>();
  const blockedLocationSet = new Set(blockedLocations);
  const blockedPoiSet = new Set(blockedPoiTypes);

  rankedPool.forEach(candidate => {
    const candidateIndex = candidates.indexOf(candidate);
    const candidateLoc = candidateLocation(directive, candidate);
    const candidatePoi = candidatePoiType(directive, candidate);
    if (blockedLocationSet.has(candidateLoc) || blockedPoiSet.has(candidatePoi)) return;
    const sameExecutionCandidates = candidates.filter(option =>
      candidateLocation(directive, option) === candidateLoc &&
      candidatePoiType(directive, option) === candidatePoi &&
      candidateMatchesBackendSku(option, skuConstraints)
    );
    const metrics = aggregateMetricsForCandidates(sameExecutionCandidates.length ? sameExecutionCandidates : [candidate]);
    const existing = recommendationsByLocation.get(candidateLoc);
    if (existing && (
      existing.opportunityUnits > metrics.opportunityUnits ||
      (existing.opportunityUnits === metrics.opportunityUnits && existing.liftPct >= metrics.liftPct)
    )) return;
    recommendationsByLocation.set(candidateLoc, {
      candidateIndex,
      location: candidateLoc,
      poiType: candidatePoi,
      liftPct: metrics.liftPct,
      opportunityUnits: metrics.opportunityUnits,
      isBackendConstrained: locationConstraints.length > 0 && candidateMatchesLocationConstraint(candidate, locationConstraints)
    });
  });

  return [...recommendationsByLocation.values()].sort((a, b) =>
    b.opportunityUnits - a.opportunityUnits ||
    b.liftPct - a.liftPct
  );
}

function recommendationImagePath(storeId: string, activity: string, originalIndex: number) {
  const slug = activity
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "activity";
  return `/picos-recommendations/${storeId}/${String(originalIndex).padStart(2, "0")}-${slug}.png`;
}

export function directivesForStore(store: StoreInfo): OnAdDirective[] {
  const executeBoxes = store.picosBoxes;

  if (executeBoxes.length === 0) return ON_AD_DIRECTIVES;

  const rankedBoxes = [...executeBoxes].sort((a, b) => {
    const modeDelta = (a.mode === "Execute" ? 0 : 1) - (b.mode === "Execute" ? 0 : 1);
    if (modeDelta !== 0) return modeDelta;
    const aLockedSkus = a.skusStated !== "Not explicitly stated" ? splitSkus(a.skusStated, a.activity, a.packSizesStated) : [];
    const bLockedSkus = b.skusStated !== "Not explicitly stated" ? splitSkus(b.skusStated, b.activity, b.packSizesStated) : [];
    return bestOpportunityUnitsForSource(b, b.optimizationCandidates, backendSkuConstraints(bLockedSkus)) - bestOpportunityUnitsForSource(a, a.optimizationCandidates, backendSkuConstraints(aLockedSkus));
  });

  const directives: OnAdDirective[] = rankedBoxes.map((box, boxIndex) => {
    const lockedSkus = box.skusStated !== "Not explicitly stated" ? splitSkus(box.skusStated, box.activity, box.packSizesStated) : [];
    const skuConstraints = backendSkuConstraints(lockedSkus);
    const baseCandidateIndex = initialCandidateIndexForSource(box, box.optimizationCandidates || [], skuConstraints);
    const topCandidate = box.optimizationCandidates?.[baseCandidateIndex] || box.optimizationCandidates?.[0];
    const backendLocation = box.locationGuidance !== "Not explicitly stated" ? box.locationGuidance : box.location;
    const stackRank = boxIndex + 1;
    const originalActivityIndex = store.picosBoxes.indexOf(box) + 1;

    return {
      id: `${store.id}-execute-${boxIndex}`,
      code: String(stackRank),
      name: box.activity,
      execute: true,
      onAd: box.onAd,
      timing: box.window,
      location: backendLocation,
      details: box.executionDetail,
      casesNeeded: topCandidate
        ? `Facings: ${topCandidate.facings}; Current: ${topCandidate.predictedCurrent}; Ideal: ${topCandidate.predictedIdeal}; Unit lift: ${topCandidate.opportunityUnits}; Lift pct: ${topCandidate.liftPct}%`
        : box.verificationScale,
      pages: box.sourcePages || "",
      mode: box.mode,
      displayType: topCandidate?.displayType || box.displayType,
      locationCategory: topCandidate?.location || box.location,
      sourceFile: box.sourceFile,
      sourceImage: box.sourceImage,
      recommendationImage: recommendationImagePath(store.id, box.activity, originalActivityIndex),
      support: box.support,
      sourceBox: box.box,
      stackRank,
      bestLiftPct: bestLiftPctForSource(box, box.optimizationCandidates, skuConstraints),
      lockedSkus,
      optimizationCandidates: box.optimizationCandidates || [],
      skus: lockedSkus.map((name) => ({
        name,
        minFacings: 1,
        priority: "High" as const,
        share: 0
      }))
    };
  });

  if (store.id === "walmart-sc-5189") {
    const chickenWarmer = directives.find(directive => directive.name === "Execute: Walmart Chicken Warmer Fixture");
    if (chickenWarmer) {
      chickenWarmer.code = "2";
      chickenWarmer.stackRank = 2;
      chickenWarmer.details = "Execute the chicken warmer fixture with two visible shelves of 7.5oz 10-pack mini cans. The shelf image and build list show the 16 facings that fit directly on the fixture; remaining recommended mini-can SKUs are listed separately.";
      chickenWarmer.recommendationImage = "/picos-recommendations/walmart-sc-5189/01-execute-walmart-chicken-warmer-fixture.png";
      chickenWarmer.planogramItems = [
        { sku: "COCA-COLA OREO ZERO SUGAR 7.5OZ 10PK CAN", facings: 6 },
        { sku: "DIET COKE 7.5OZ 10PK CAN", facings: 6 },
        { sku: "CHERRY COKE 7.5OZ 10PK CAN", facings: 2 },
        { sku: "COCA-COLA ORANGE CREAM 7.5OZ 10PK CAN", facings: 2 }
      ];
      chickenWarmer.additionalItems = [
        { sku: "FRESCA GRAPEFRUIT 7.5OZ 10PK CAN", facings: 3 },
        { sku: "COCA-COLA ORANGE CREAM 7.5OZ 10PK CAN", facings: 2 },
        { sku: "SPRITE WINTER SPICED CRANBERRY 7.5OZ 10PK CAN", facings: 7 },
        { sku: "SPRITE 7.5OZ 10PK CAN", facings: 9 },
        { sku: "FANTA 7.5OZ 10PK CAN", facings: 4 },
        { sku: "DIET SPRITE ZERO 7.5OZ 10PK CAN", facings: 8 },
        { sku: "COKE 7.5OZ 10PK CAN", facings: 18 }
      ];
    }

    const baseEndcap = directives.find(directive => directive.name === "Execute: Walmart End Cap Displays -2L Update");
    if (baseEndcap) {
      const planogramDirective: OnAdDirective = {
        ...baseEndcap,
        id: `${store.id}-walmart-endcap-2l-planogram`,
        code: "1",
        stackRank: 1,
        name: "Walmart Endcap 2L Display Setup",
        details: "Set the main Walmart endcap as a five-shelf, 10-bottle-wide display ordered like the PDF brand flow: 2L block first by Coke family, Sprite, then flavors; keep Smartwater and 12pk support blocks separate.",
        sourceImage: undefined,
        recommendationImage: "/picos-recommendations/walmart-sc-5189/02-execute-walmart-end-cap-displays-2l-update.png",
        planogramImage: "/picos-boxes/walmart-endcap-2l-display-planogram.png",
        planogramItems: [
          { sku: "COKE 2L SINGLE BTL", facings: 6 },
          { sku: "COCA-COLA ZERO SUGAR 2L SINGLE BTL", facings: 5 },
          { sku: "COCA-COLA ZERO SUGAR 2L SINGLE BTL", facings: 1 },
          { sku: "DIET COKE CF 2L SINGLE BTL", facings: 4 },
          { sku: "CHERRY COKE ZERO 2L SINGLE BTL", facings: 3 },
          { sku: "SPRITE 2L SINGLE BTL", facings: 3 },
          { sku: "SPRITE 2L SINGLE BTL", facings: 3 },
          { sku: "FANTA 2L SINGLE BTL", facings: 2 },
          { sku: "SEAGRAM'S 2L SINGLE BTL", facings: 2 },
          { sku: "SMARTWATER 1L SINGLE BTL", facings: 5 },
          { sku: "COKE 12OZ 12PK CAN", facings: 7 },
          { sku: "COKE 12OZ 12PK CAN", facings: 1 },
          { sku: "COCA-COLA ZERO SUGAR 12OZ 12PK CAN", facings: 3 },
          { sku: "SPRITE 12OZ 12PK CAN", facings: 3 }
        ],
        additionalItems: [
          { sku: "SMARTWATER 1L SINGLE BTL", facings: 1 },
          { sku: "COKE 12OZ 12PK CAN", facings: 1 }
        ]
      };
      const insertIndex = directives.indexOf(baseEndcap);
      directives.splice(insertIndex, 1, planogramDirective);
    }
  }

  return directives.map((directive, index) => ({
    ...directive,
    code: directive.code || String(index + 1)
  }));
}

function candidateLocation(directive: OnAdDirective, candidate: PicOSOptimizationCandidate | undefined) {
  return candidate?.locationGuidance || parsePreferredLocation(directive.location);
}

function candidatePoiType(directive: OnAdDirective, candidate: PicOSOptimizationCandidate | undefined) {
  return candidate?.displayType || directive.displayType || inferPoiType(directive.location);
}

function candidateSetForIndex(directive: OnAdDirective, candidateIndex: number) {
  const candidates = directive.optimizationCandidates || [];
  const activeCandidate = candidates[candidateIndex] || candidates[0];
  if (!activeCandidate) return [];

  const skuConstraints = backendSkuConstraints(directive.lockedSkus || directive.skus.map(sku => sku.name));
  const sameExecutionCandidates = candidates.filter(candidate => {
    const sameLocation = candidateLocation(directive, candidate) === candidateLocation(directive, activeCandidate);
    const sameDisplayType = candidatePoiType(directive, candidate) === candidatePoiType(directive, activeCandidate);
    return sameLocation && sameDisplayType && candidateMatchesBackendSku(candidate, skuConstraints);
  });
  const eligibleCandidates = sameExecutionCandidates.length
    ? sameExecutionCandidates
    : candidates.filter(candidate => candidateMatchesBackendSku(candidate, skuConstraints));
  const rankedCandidates = eligibleCandidates.length ? eligibleCandidates : [activeCandidate];
  const maxItems = Math.max(10, skuConstraints.length);
  const seen = new Set<string>();

  return rankedCandidates.filter(candidate => {
    const key = skuIdentity(candidate.sku);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxItems);
}

function candidateGroupKey(directive: OnAdDirective, candidate: PicOSOptimizationCandidate) {
  return `${candidateLocation(directive, candidate)}::${candidatePoiType(directive, candidate)}`;
}

function sortExecutionItems(items: PicOSExecutionItem[]) {
  return [...items].sort((a, b) => {
    const aUnits = a.opportunityUnits ?? -Infinity;
    const bUnits = b.opportunityUnits ?? -Infinity;
    if (bUnits !== aUnits) return bUnits - aUnits;
    const aLift = a.liftPct ?? -Infinity;
    const bLift = b.liftPct ?? -Infinity;
    if (bLift !== aLift) return bLift - aLift;
    return b.targetFacings - a.targetFacings;
  });
}

function buildItems(
  directiveId: string,
  directives: OnAdDirective[],
  candidateIndex = 0,
  sourceOverride?: PicOSRecommendationSource
): PicOSExecutionItem[] {
  const directive = directives.find(d => d.id === directiveId) || directives[0];
  if (directive.planogramItems?.length) {
    return directive.planogramItems.map((planogramItem, index) => {
      const matchingCandidate = (directive.optimizationCandidates || []).find(candidate =>
        skuIdentity(candidate.sku) === skuIdentity(planogramItem.sku)
      );

      return {
        id: `${directive.id}-planogram-${index}`,
        sku: planogramItem.sku,
        targetFacings: planogramItem.facings,
        minFacings: planogramItem.facings,
        source: "recommended" as PicOSRecommendationSource,
        priority: "Medium" as const,
        ...(matchingCandidate ? candidateMetricsAtFacings(matchingCandidate, planogramItem.facings) : {})
      };
    });
  }

  const candidates = candidateSetForIndex(directive, candidateIndex);
  const lockedItems: PicOSExecutionItem[] = (directive.lockedSkus || directive.skus.map(sku => sku.name)).map((sku, index) => ({
    id: `${directive.id}-${index}`,
    sku,
    targetFacings: 1,
    minFacings: 1,
    source: "backend" as PicOSRecommendationSource,
    priority: "High" as const
  }));

  if (!candidates.length) return lockedItems;

  const mergedLockedItems = lockedItems.map(item => {
    const matchingCandidate = candidates.find(candidate => skuIdentity(item.sku) === skuIdentity(candidate.sku));
    return matchingCandidate
      ? {
        ...item,
        targetFacings: matchingCandidate.facings,
        minFacings: matchingCandidate.facings,
        ...candidateMetrics(matchingCandidate)
      }
      : item;
  });
  const lockedIdentities = new Set(mergedLockedItems.map(item => skuIdentity(item.sku)));
  const optimizedItems: PicOSExecutionItem[] = candidates
    .filter(candidate => !lockedIdentities.has(skuIdentity(candidate.sku)))
    .map(candidate => ({
      id: `${directive.id}-optimized-${candidate.id}`,
      sku: candidate.sku,
      targetFacings: candidate.facings,
      minFacings: candidate.facings,
      source: sourceOverride || "recommended" as PicOSRecommendationSource,
      priority: "Medium" as const,
      ...candidateMetrics(candidate)
    }));

  return sortExecutionItems([...mergedLockedItems, ...optimizedItems]);
}

function sourceBadgeClasses(source: PicOSRecommendationSource) {
  if (source === "backend") return "bg-slate-900 text-white border-slate-900";
  if (source === "nextBest") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function sourceLabel(source: PicOSRecommendationSource) {
  if (source === "backend") return "Locked";
  if (source === "nextBest") return "Next best";
  return "Recommended";
}

function liftLabel(liftPct: number | undefined, opportunityUnits: number | undefined) {
  const lift = liftPct === undefined ? "0%" : `${liftPct >= 0 ? "+" : ""}${Math.round(liftPct)}%`;
  const units = opportunityUnits === undefined ? "0 units" : `${opportunityUnits >= 0 ? "+" : ""}${Math.round(opportunityUnits)} units`;
  return `${lift} lift / ${units}`;
}

function hasPositiveLift(liftPct: number | undefined) {
  return liftPct !== undefined && liftPct > 0;
}

function formatOutcomeTimestamp(value: string) {
  const recordedAt = new Date(value);
  if (Number.isNaN(recordedAt.getTime())) return "";

  const now = new Date();
  const isToday = recordedAt.toDateString() === now.toDateString();
  const dateLabel = isToday
    ? "today"
    : recordedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = recordedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return `${dateLabel}, ${timeLabel}`;
}

function outcomeReasonLabel(outcome: ActivityOutcome) {
  if (outcome.executed) return "";
  return outcome.reason === "Other" ? outcome.otherReason || "Other" : outcome.reason || "Not executed";
}

function outcomeFooterLabel(outcome: ActivityOutcome) {
  const timestamp = formatOutcomeTimestamp(outcome.recordedAt);
  if (outcome.executed) return `Executed ${timestamp}`;
  return `Not executed - ${outcomeReasonLabel(outcome)} - ${timestamp}`;
}

function candidateMetrics(candidate: PicOSOptimizationCandidate) {
  return {
    liftPct: candidate.liftPct,
    opportunityUnits: candidate.opportunityUnits,
    baselineUnits: candidate.predictedCurrent,
    idealUnits: candidate.predictedIdeal
  };
}

function candidateMetricsAtFacings(candidate: PicOSOptimizationCandidate, facings: number) {
  const ratio = candidate.facings > 0 ? facings / candidate.facings : 1;
  const opportunityUnits = parseFloat((candidate.opportunityUnits * ratio).toFixed(1));
  const baselineUnits = candidate.predictedCurrent;
  const idealUnits = parseFloat((baselineUnits + opportunityUnits).toFixed(1));
  const liftPct = baselineUnits > 0
    ? parseFloat(((opportunityUnits / baselineUnits) * 100).toFixed(1))
    : parseFloat((candidate.liftPct * ratio).toFixed(1));

  return {
    liftPct,
    opportunityUnits,
    baselineUnits,
    idealUnits
  };
}

function scaleItemMetrics(item: PicOSExecutionItem, nextFacings: number) {
  const ratio = item.targetFacings > 0 ? nextFacings / item.targetFacings : 1;
  const baselineUnits = item.baselineUnits;
  const opportunityUnits = item.opportunityUnits === undefined ? undefined : parseFloat((item.opportunityUnits * ratio).toFixed(1));
  const idealUnits = baselineUnits === undefined || opportunityUnits === undefined
    ? undefined
    : parseFloat((baselineUnits + opportunityUnits).toFixed(1));
  const liftPct = baselineUnits && opportunityUnits !== undefined
    ? parseFloat(((opportunityUnits / baselineUnits) * 100).toFixed(1))
    : item.liftPct === undefined ? undefined : parseFloat((item.liftPct * ratio).toFixed(1));

  return {
    opportunityUnits,
    baselineUnits,
    idealUnits,
    liftPct
  };
}

function scaleItemOpportunity(item: PicOSExecutionItem, ratio: number) {
  const opportunityUnits = item.opportunityUnits === undefined ? undefined : parseFloat((item.opportunityUnits * ratio).toFixed(1));
  const baselineUnits = item.baselineUnits;
  const idealUnits = baselineUnits === undefined || opportunityUnits === undefined
    ? undefined
    : parseFloat((baselineUnits + opportunityUnits).toFixed(1));
  const liftPct = baselineUnits && opportunityUnits !== undefined
    ? parseFloat(((opportunityUnits / baselineUnits) * 100).toFixed(1))
    : item.liftPct === undefined ? undefined : parseFloat((item.liftPct * ratio).toFixed(1));

  return {
    ...item,
    source: item.source === "backend" ? "nextBest" as PicOSRecommendationSource : item.source,
    opportunityUnits,
    baselineUnits,
    idealUnits,
    liftPct
  };
}

function activityMetrics(items: PicOSExecutionItem[]) {
  const totalOpportunityUnits = items.reduce((sum, item) => sum + (item.opportunityUnits || 0), 0);
  const totalBaselineUnits = items.reduce((sum, item) => {
    if (item.baselineUnits !== undefined) return sum + item.baselineUnits;
    if (item.opportunityUnits !== undefined && item.liftPct && item.liftPct > 0) {
      return sum + (item.opportunityUnits / (item.liftPct / 100));
    }
    return sum;
  }, 0);
  const aggregateLiftPct = totalBaselineUnits > 0 ? (totalOpportunityUnits / totalBaselineUnits) * 100 : 0;

  return {
    totalOpportunityUnits: parseFloat(totalOpportunityUnits.toFixed(1)),
    aggregateLiftPct: Math.round(aggregateLiftPct)
  };
}

export default function ExecutePicOS({
  store,
  activityOutcomes = {},
  lastActivityOutcomeId,
  onBackToHub,
  onUndoActivityOutcome,
  onProceedToAfterPhoto
}: ExecutePicOSProps) {
  const directives = useMemo(() => directivesForStore(store), [store]);
  const initialDirectiveId = lastActivityOutcomeId && directives.some(directive => directive.id === lastActivityOutcomeId)
    ? lastActivityOutcomeId
    : directives[0].id;
  const [directiveId, setDirectiveId] = useState(initialDirectiveId);
  const [candidateIndex, setCandidateIndex] = useState(() => initialCandidateIndexForSource(
    directives[0],
    directives[0].optimizationCandidates || [],
    backendSkuConstraints(directives[0].lockedSkus || directives[0].skus.map(sku => sku.name))
  ));
  const activeDirective = directives.find(d => d.id === directiveId) || directives[0];
  const activeActivityOutcome = activityOutcomes[activeDirective.id];
  const activeCandidate = activeDirective.optimizationCandidates?.[candidateIndex] || activeDirective.optimizationCandidates?.[0];
  const activeLocationConstraints = useMemo(() => extractAllowedLocations(activeDirective), [activeDirective]);
  const activeSkuConstraints = useMemo(
    () => backendSkuConstraints(activeDirective.lockedSkus || activeDirective.skus.map(sku => sku.name)),
    [activeDirective]
  );
  const [overrides, setOverrides] = useState<PicOSOverride[]>([]);
  const [blockedLocations, setBlockedLocations] = useState<string[]>([]);
  const [blockedPoiTypes, setBlockedPoiTypes] = useState<string[]>([]);
  const locationRecommendations = useMemo(
    () => rankedLocationRecommendations(activeDirective, activeSkuConstraints, activeLocationConstraints, blockedLocations, blockedPoiTypes),
    [activeDirective, activeSkuConstraints, activeLocationConstraints, blockedLocations, blockedPoiTypes]
  );

  const initialLocation = useMemo(() => candidateLocation(activeDirective, activeCandidate), [activeDirective, activeCandidate]);
  const initialPoiType = useMemo(() => candidatePoiType(activeDirective, activeCandidate), [activeDirective, activeCandidate]);

  const [location, setLocation] = useState(initialLocation);
  const [poiType, setPoiType] = useState(initialPoiType);
  const currentLocationRecommendation = locationRecommendations.find(option => option.location === location);
  const nextLocationRecommendations = locationRecommendations.filter(option => option.location !== location).slice(0, 3);
  const [items, setItems] = useState<PicOSExecutionItem[]>(() => {
    const baseCandidateIndex = initialCandidateIndexForSource(
      directives[0],
      directives[0].optimizationCandidates || [],
      backendSkuConstraints(directives[0].lockedSkus || directives[0].skus.map(sku => sku.name))
    );
    return buildItems(directives[0].id, directives, baseCandidateIndex);
  });

  const totalFacings = items.reduce((sum, item) => sum + item.targetFacings, 0);
  const currentActivityMetrics = activityMetrics(items);
  const recommendationVisual = activeDirective.planogramImage || activeDirective.recommendationImage || activeDirective.sourceImage;
  const canShowActivityImage = store.id === "walmart-sc-5189" && (
    activeDirective.id === "walmart-sc-5189-walmart-endcap-2l-planogram" ||
    activeDirective.name === "Execute: Walmart Chicken Warmer Fixture"
  );
  const isPlanogramActivity = Boolean(recommendationVisual);
  const planogramShelves = useMemo(() => {
    const planogramItems = activeDirective.planogramItems || [];
    if (planogramItems.length === 0) {
      const sectionSize = 3;
      const genericSections = [];
      for (let index = 0; index < items.length; index += sectionSize) {
        genericSections.push({
          label: `Shelf ${genericSections.length + 1}`,
          items: items.slice(index, index + sectionSize).map(item => ({
            sku: item.sku,
            facings: item.targetFacings
          }))
        });
      }
      return genericSections;
    }

    const shelfSizes = activeDirective.id === "walmart-sc-5189-walmart-endcap-2l-planogram"
      ? [2, 4, 4, 1, 3]
      : activeDirective.name === "Execute: Walmart Chicken Warmer Fixture"
        ? [2, 2]
        : [2, 3, 1, 2, 1, 1];
    let cursor = 0;
    return shelfSizes
      .map((size, index) => {
        const shelfItems = planogramItems.slice(cursor, cursor + size);
        cursor += size;
        return {
          label: `Shelf ${index + 1}`,
          items: shelfItems
        };
      })
      .filter(shelf => shelf.items.length > 0);
  }, [activeDirective, items]);
  const additionalBuildItems = useMemo(() => {
    if (activeDirective.additionalItems?.length) return activeDirective.additionalItems;

    const buildIdentities = new Set(items.map(item => skuIdentity(item.sku)));
    const seen = new Set<string>();
    return (activeDirective.optimizationCandidates || [])
      .filter(candidate => {
        const key = skuIdentity(candidate.sku);
        if (buildIdentities.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.opportunityUnits - a.opportunityUnits || b.liftPct - a.liftPct)
      .slice(0, 3)
      .map(candidate => ({
        sku: candidate.sku,
        facings: candidate.facings
      }));
  }, [activeDirective, items]);

  const resetForDirective = (nextDirectiveId: string) => {
    const nextDirective = directives.find(d => d.id === nextDirectiveId) || directives[0];
    const baseCandidateIndex = initialCandidateIndexForSource(
      nextDirective,
      nextDirective.optimizationCandidates || [],
      backendSkuConstraints(nextDirective.lockedSkus || nextDirective.skus.map(sku => sku.name))
    );
    const nextCandidate = nextDirective.optimizationCandidates?.[baseCandidateIndex] || nextDirective.optimizationCandidates?.[0];
    setDirectiveId(nextDirectiveId);
    setCandidateIndex(baseCandidateIndex);
    setLocation(candidateLocation(nextDirective, nextCandidate));
    setPoiType(candidatePoiType(nextDirective, nextCandidate));
    setItems(buildItems(nextDirectiveId, directives, baseCandidateIndex));
    setOverrides([]);
    setBlockedLocations([]);
    setBlockedPoiTypes([]);
  };

  const handleResetActivity = () => {
    resetForDirective(activeDirective.id);
  };

  const applyCandidate = (nextCandidateIndex: number) => {
    const nextCandidate = activeDirective.optimizationCandidates?.[nextCandidateIndex] || activeCandidate;
    setCandidateIndex(nextCandidateIndex);
    setLocation(candidateLocation(activeDirective, nextCandidate));
    setPoiType(candidatePoiType(activeDirective, nextCandidate));
    setItems(buildItems(activeDirective.id, directives, nextCandidateIndex, "nextBest"));
  };

  useEffect(() => {
    resetForDirective(directives[0].id);
  }, [directives]);

  const recordOverride = (override: PicOSOverride) => {
    setOverrides(prev => [override, ...prev].slice(0, 6));
  };

  const candidateMatchesCurrentExecution = (candidate: PicOSOptimizationCandidate) =>
    candidateLocation(activeDirective, candidate) === location &&
    candidatePoiType(activeDirective, candidate) === poiType;

  const candidateToExecutionItem = (
    candidate: PicOSOptimizationCandidate,
    currentItem: PicOSExecutionItem,
    source: PicOSRecommendationSource = "nextBest"
  ): PicOSExecutionItem => ({
    ...currentItem,
    id: `${activeDirective.id}-override-${candidate.id}`,
    sku: candidate.sku,
    targetFacings: candidate.facings,
    minFacings: candidate.facings,
    source,
    priority: currentItem.source === "backend" ? "High" : currentItem.priority,
    replacedFrom: currentItem.sku,
    ...candidateMetrics(candidate)
  });

  const findNextCandidateIndex = (predicate: (candidate: PicOSOptimizationCandidate) => boolean) => {
    const candidates = activeDirective.optimizationCandidates || [];
    if (!candidates.length) return undefined;
    const rankedAfterCurrent = [
      ...candidates.slice(candidateIndex + 1).map((_candidate, offset) => candidateIndex + 1 + offset),
      ...candidates.slice(0, candidateIndex).map((_candidate, offset) => offset)
    ];
    return rankedAfterCurrent.find(index => predicate(candidates[index]));
  };

  const bestCandidateIndexForExecution = ({
    nextBlockedLocations = blockedLocations,
    nextBlockedPoiTypes = blockedPoiTypes,
    requireDifferentLocation = false,
    requireDifferentPoiType = false,
    useBackendLocationConstraints = true,
    useSkuConstraints = true
  }: {
    nextBlockedLocations?: string[];
    nextBlockedPoiTypes?: string[];
    requireDifferentLocation?: boolean;
    requireDifferentPoiType?: boolean;
    useBackendLocationConstraints?: boolean;
    useSkuConstraints?: boolean;
  }) => {
    const candidates = activeDirective.optimizationCandidates || [];
    if (!candidates.length) return undefined;

    const blockedLocationSet = new Set(nextBlockedLocations);
    const blockedPoiSet = new Set(nextBlockedPoiTypes);
    const grouped = new Map<string, {
      candidateIndex: number;
      candidates: PicOSOptimizationCandidate[];
      scoreUnits: number;
      scoreLift: number;
      opportunityUnits: number;
    }>();

    candidates.forEach((candidate, index) => {
      const candidateLoc = candidateLocation(activeDirective, candidate);
      const candidatePoi = candidatePoiType(activeDirective, candidate);
      if (blockedLocationSet.has(candidateLoc) || blockedPoiSet.has(candidatePoi)) return;
      if (requireDifferentLocation && candidateLoc === location) return;
      if (requireDifferentPoiType && candidatePoi === poiType) return;
      if (useSkuConstraints && !candidateMatchesBackendSku(candidate, activeSkuConstraints)) return;
      if (
        useBackendLocationConstraints &&
        activeLocationConstraints.length > 0 &&
        !candidateMatchesLocationConstraint(candidate, activeLocationConstraints)
      ) return;

      const key = candidateGroupKey(activeDirective, candidate);
      const existing = grouped.get(key);
      const groupCandidates = candidates.filter(option =>
        candidateGroupKey(activeDirective, option) === key &&
        (!useSkuConstraints || candidateMatchesBackendSku(option, activeSkuConstraints))
      );
      const metrics = aggregateMetricsForCandidates(groupCandidates.length ? groupCandidates : [candidate]);

      if (!existing || metrics.opportunityUnits > existing.scoreUnits || (
        metrics.opportunityUnits === existing.scoreUnits && metrics.liftPct > existing.scoreLift
      )) {
        grouped.set(key, {
          candidateIndex: index,
          candidates: groupCandidates,
          scoreUnits: metrics.opportunityUnits,
          scoreLift: metrics.liftPct,
          opportunityUnits: metrics.opportunityUnits
        });
      }
    });

    return [...grouped.values()]
      .sort((a, b) => b.scoreUnits - a.scoreUnits || b.scoreLift - a.scoreLift)[0]?.candidateIndex;
  };

  const handleCantDoLocation = () => {
    const nextBlockedLocations = [...new Set([...blockedLocations, location])];
    setBlockedLocations(nextBlockedLocations);

    const nextIndex =
      bestCandidateIndexForExecution({
        nextBlockedLocations,
        requireDifferentLocation: true,
        useBackendLocationConstraints: true,
        useSkuConstraints: true
      }) ??
      bestCandidateIndexForExecution({
        nextBlockedLocations,
        requireDifferentLocation: true,
        useBackendLocationConstraints: false,
        useSkuConstraints: true
      }) ??
      bestCandidateIndexForExecution({
        nextBlockedLocations,
        requireDifferentLocation: true,
      useBackendLocationConstraints: false,
      useSkuConstraints: false
    }) ??
      candidateIndex;
    if (nextIndex === candidateIndex) {
      const fallbackLocation = fallbackLocations.find(option => option !== location && !nextBlockedLocations.includes(option));
      if (!fallbackLocation) return;
      recordOverride({
        type: "location",
        label: "Ideal location",
        previousValue: location,
        nextBestValue: fallbackLocation,
        reason: reasonByType.location
      });
      setLocation(fallbackLocation);
      setItems(prev => sortExecutionItems(prev.map(item => scaleItemOpportunity(item, 0.85))));
      return;
    }

    const nextCandidate = activeDirective.optimizationCandidates?.[nextIndex];
    const nextBest = candidateLocation(activeDirective, nextCandidate);
    recordOverride({
      type: "location",
      label: "Ideal location",
      previousValue: location,
      nextBestValue: nextBest,
      reason: reasonByType.location
    });
    applyCandidate(nextIndex);
  };

  const handleCantDoPoiType = () => {
    const nextBlockedPoiTypes = [...new Set([...blockedPoiTypes, poiType])];
    setBlockedPoiTypes(nextBlockedPoiTypes);

    const nextIndex =
      bestCandidateIndexForExecution({
        nextBlockedPoiTypes,
        requireDifferentPoiType: true,
        useBackendLocationConstraints: true,
        useSkuConstraints: true
      }) ??
      bestCandidateIndexForExecution({
        nextBlockedPoiTypes,
        requireDifferentPoiType: true,
        useBackendLocationConstraints: false,
        useSkuConstraints: true
      }) ??
      bestCandidateIndexForExecution({
        nextBlockedPoiTypes,
        requireDifferentPoiType: true,
        useBackendLocationConstraints: false,
        useSkuConstraints: false
      }) ??
      findNextCandidateIndex(candidate => candidatePoiType(activeDirective, candidate) !== poiType) ??
      candidateIndex;
    if (nextIndex === candidateIndex) {
      const fallbackPoiType = fallbackPoiTypes.find(option => option !== poiType && !nextBlockedPoiTypes.includes(option));
      if (!fallbackPoiType) return;
      recordOverride({
        type: "poiType",
        label: "POI type",
        previousValue: poiType,
        nextBestValue: fallbackPoiType,
        reason: reasonByType.poiType
      });
      setPoiType(fallbackPoiType);
      setItems(prev => sortExecutionItems(prev.map(item => scaleItemOpportunity(item, 0.85))));
      return;
    }

    const nextCandidate = activeDirective.optimizationCandidates?.[nextIndex];
    const nextBest = candidatePoiType(activeDirective, nextCandidate);
    recordOverride({
      type: "poiType",
      label: "POI type",
      previousValue: poiType,
      nextBestValue: nextBest,
      reason: reasonByType.poiType
    });
    applyCandidate(nextIndex);
  };

  const handleCantDoSku = (itemId: string) => {
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) return;

    const existingIdentities = new Set(items.filter(item => item.id !== itemId).map(item => skuIdentity(item.sku)));
    const currentIdentity = skuIdentity(currentItem.sku);
    const nextCandidate = (activeDirective.optimizationCandidates || [])
      .filter(candidate => candidateMatchesCurrentExecution(candidate))
      .filter(candidate => skuIdentity(candidate.sku) !== currentIdentity)
      .filter(candidate => !existingIdentities.has(skuIdentity(candidate.sku)))
      .sort((a, b) => b.opportunityUnits - a.opportunityUnits || b.liftPct - a.liftPct)[0];

    if (nextCandidate) {
      recordOverride({
        type: "sku",
        label: currentItem.source === "backend" ? "Locked SKU" : "Recommended SKU",
        previousValue: currentItem.sku,
        nextBestValue: nextCandidate.sku,
        reason: reasonByType.sku
      });
      setItems(prev => sortExecutionItems(prev.map(item => item.id === itemId ? candidateToExecutionItem(nextCandidate, item) : item)));
      return;
    }

    setItems(prev => sortExecutionItems(prev.map(item => {
      if (item.id !== itemId) return item;
      const nextBest = substituteSkus.find(sku => !prev.some(existing => existing.sku === sku)) || `${item.sku} alternate`;
      recordOverride({
        type: "sku",
        label: item.source === "backend" ? "Locked SKU" : "Recommended SKU",
        previousValue: item.sku,
        nextBestValue: nextBest,
        reason: reasonByType.sku
      });
      return {
        ...item,
        sku: nextBest,
        source: "nextBest",
        replacedFrom: item.sku,
        liftPct: 0,
        opportunityUnits: 0,
        baselineUnits: undefined,
        idealUnits: undefined
      };
    })));
  };

  const handleCantDoFacings = (itemId: string) => {
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) return;

    const currentIdentity = skuIdentity(currentItem.sku);
    const lowerFacingCandidate = (activeDirective.optimizationCandidates || [])
      .filter(candidate => candidateMatchesCurrentExecution(candidate))
      .filter(candidate => skuIdentity(candidate.sku) === currentIdentity)
      .filter(candidate => candidate.facings < currentItem.targetFacings)
      .sort((a, b) => b.facings - a.facings || b.liftPct - a.liftPct)[0];
    const alternateFacingCandidate = (activeDirective.optimizationCandidates || [])
      .filter(candidate => candidateMatchesCurrentExecution(candidate))
      .filter(candidate => skuIdentity(candidate.sku) === currentIdentity)
      .filter(candidate => candidate.facings !== currentItem.targetFacings)
      .sort((a, b) => Math.abs(a.facings - currentItem.targetFacings) - Math.abs(b.facings - currentItem.targetFacings))[0];
    const nextCandidate = lowerFacingCandidate || alternateFacingCandidate;

    if (nextCandidate) {
      recordOverride({
        type: "facings",
        label: `${currentItem.sku} facings`,
        previousValue: `${currentItem.targetFacings} facings`,
        nextBestValue: `${nextCandidate.facings} facings`,
        reason: reasonByType.facings
      });
      setItems(prev => sortExecutionItems(prev.map(item => item.id === itemId ? {
        ...item,
        targetFacings: nextCandidate.facings,
        minFacings: nextCandidate.facings,
        source: item.source === "backend" ? "nextBest" : item.source,
        ...candidateMetrics(nextCandidate)
      } : item)));
      return;
    }

    setItems(prev => sortExecutionItems(prev.map(item => {
      if (item.id !== itemId) return item;
      const nextFacingCount = Math.max(1, item.targetFacings - 1);
      recordOverride({
        type: "facings",
        label: `${item.sku} facings`,
        previousValue: `${item.targetFacings} facings`,
        nextBestValue: `${nextFacingCount} facings`,
        reason: reasonByType.facings
      });
      const scaledMetrics = scaleItemMetrics(item, nextFacingCount);
      return {
        ...item,
        targetFacings: nextFacingCount,
        source: item.source === "backend" ? "nextBest" : item.source,
        ...scaledMetrics
      };
    })));
  };

  const handleAdjustFacings = (itemId: string, delta: number) => {
    setItems(prev => sortExecutionItems(prev.map(item => {
      if (item.id !== itemId) return item;

      const nextFacings = Math.max(1, Math.min(99, item.targetFacings + delta));
      if (nextFacings === item.targetFacings) return item;

      const matchingCandidate = (activeDirective.optimizationCandidates || [])
        .filter(candidate => candidateMatchesCurrentExecution(candidate))
        .find(candidate => skuIdentity(candidate.sku) === skuIdentity(item.sku) && candidate.facings === nextFacings);
      const nextMetrics = matchingCandidate ? candidateMetrics(matchingCandidate) : scaleItemMetrics(item, nextFacings);

      return {
        ...item,
        targetFacings: nextFacings,
        minFacings: Math.min(item.minFacings, nextFacings),
        ...nextMetrics
      };
    })));
  };

  const constraints: PicOSConstraints = {
    directiveId,
    location,
    poiType,
    totalFacingTarget: totalFacings,
    items,
    overrides
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-hidden select-none">
      <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shadow-xs shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToHub}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-5 w-[1px] bg-slate-200 shrink-0"></div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-sans font-extrabold text-slate-900 tracking-tight text-sm leading-none truncate">
                Execute New PicOS Activities
              </h1>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded">
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">1. Recommendation</span>
          <span className="text-slate-300">-&gt;</span>
          <span>2. Outcome</span>
          <span className="text-slate-300">-&gt;</span>
          <span>3. After Photo</span>
          <span className="text-slate-300">-&gt;</span>
          <span>4. Sync Summary</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[360px] bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              Activities for this store
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-50/40">
            {directives.map((directive) => {
              const isSelected = directiveId === directive.id;
              const outcome = activityOutcomes[directive.id];
              const timestamp = outcome ? formatOutcomeTimestamp(outcome.recordedAt) : "";
              const reason = outcome ? outcomeReasonLabel(outcome) : "";
              const listMetrics = aggregateMetricsForCandidates(directive.optimizationCandidates || []);
              return (
                <button
                  key={directive.id}
                  onClick={() => resetForDirective(directive.id)}
                  className={`w-full rounded border transition-all cursor-pointer text-left overflow-hidden ${
                    isSelected
                      ? "bg-red-50/50 border-red-500 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          isSelected ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          #{directive.stackRank || directive.code}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ${
                          directive.mode === "Execute"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {directive.mode}
                        </span>
                        {(hasPositiveLift(directive.bestLiftPct) || listMetrics.opportunityUnits > 0) && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase shrink-0 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-100">
                            +{Math.round(directive.bestLiftPct || listMetrics.liftPct || 0)}% / +{Math.round(listMetrics.opportunityUnits)} units
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono font-semibold shrink-0">
                        {directive.timing}
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold leading-tight ${isSelected ? "text-red-950" : "text-slate-800"}`}>
                      {directive.name}
                    </h4>
                  </div>
                  {outcome && (
                    <div className={`px-2.5 py-2 border-t flex items-center gap-1.5 text-[10px] font-bold ${
                      outcome.executed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-orange-700 border-amber-100"
                    }`}>
                      {outcome.executed ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <CircleMinus className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{outcome.executed ? "Executed" : "Not executed"}</span>
                      <span className={outcome.executed ? "text-emerald-500" : "text-orange-400"}>-</span>
                      <span className="font-medium truncate">{outcome.executed ? timestamp : reason}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </aside>

        <main className="flex-1 bg-white flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {isPlanogramActivity ? (
            <section className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 max-w-3xl">
                  <h2 className="text-xl font-black text-slate-950 leading-tight">
                    {activeDirective.name}
                  </h2>
                  <div className="text-[10px] text-slate-500 font-mono mt-4">Runs {activeDirective.timing}</div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {activeDirective.details}
                  </p>
                </div>
                <div className="text-left lg:text-right shrink-0">
                  {currentActivityMetrics.aggregateLiftPct > 0 && (
                    <div className="inline-flex text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1.5 rounded font-mono uppercase">
                      {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-2">Estimated July sales lift vs. no display</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-4 items-stretch">
                <div className="rounded-lg border border-slate-200 bg-white min-h-[520px] h-full flex flex-col p-4 lg:p-6">
                  <p className="text-[10px] text-slate-400 font-mono mb-3">
                    Example layout. Your shelf or display may look different.
                  </p>
                  <div className="flex-1 min-h-0 flex items-center justify-center">
                    {canShowActivityImage && (
                      <img
                        src={recommendationVisual}
                        alt={`${activeDirective.name} shelf setup`}
                        className="w-full max-w-[760px] max-h-[500px] object-contain bg-white"
                      />
                    )}
                  </div>
                </div>

                <aside className="self-stretch space-y-4 flex flex-col">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider">Ideal Location</h3>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="text-xl font-bold text-slate-950 leading-tight">{location}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 flex-1">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        Build List
                      </h3>
                      <span className="text-[10px] font-black text-slate-950 font-mono">{totalFacings} facings</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {planogramShelves.map(shelf => (
                        <div key={shelf.label} className="py-3">
                          <div className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-400 mb-2">
                            {shelf.label}
                          </div>
                          <div className="space-y-1.5">
                            {shelf.items.map(item => (
                              <div key={`${shelf.label}-${item.sku}`} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="font-semibold text-slate-800 leading-tight">{item.sku}</span>
                                <span className="font-black text-slate-950 font-mono shrink-0">{item.facings}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>

              {!!additionalBuildItems.length && (
                <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Additional SKUs to Add
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {additionalBuildItems.map(item => (
                      <div key={item.sku} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="font-bold text-xs text-slate-950">{item.sku}</div>
                        <div className="text-[10px] text-slate-500 font-mono shrink-0">
                          {item.facings} facings
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
          <>
          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-bold">
            Lift estimates compare the recommended execution against a no-activation baseline for this store and July projection period.
          </div>
          <section className="bg-white border border-slate-200 rounded p-4 shadow-xs shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  PicOS Activity Execution Details
                </span>
                <h2 className="text-sm font-black text-slate-950 mt-2 leading-tight">
                  {activeDirective.name}
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-normal">
                  {activeDirective.details}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:items-start gap-2 shrink-0">
                {activeDirective.sourceImage && (
                  <div className="w-full sm:w-[260px] rounded border border-slate-200 bg-slate-50 overflow-hidden">
                    {canShowActivityImage && (
                      <img
                        src={activeDirective.sourceImage}
                        alt={`${activeDirective.name} PDF activity box`}
                        className="w-full h-[120px] object-contain bg-white"
                      />
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 text-[10px] font-mono text-slate-600 min-w-[170px]">
                  {currentActivityMetrics.aggregateLiftPct > 0 && (
                    <div className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1.5">
                      <div className="text-emerald-700 uppercase font-bold">Activity lift</div>
                      <div className="text-emerald-900 font-bold truncate">
                        +{currentActivityMetrics.aggregateLiftPct}% / +{Math.round(currentActivityMetrics.totalOpportunityUnits)} units
                      </div>
                    </div>
                  )}
                  <div className="rounded border border-slate-150 bg-slate-50 px-2 py-1.5">
                  <div className="text-slate-400 uppercase font-bold">Window</div>
                  <div className="text-slate-800 font-bold truncate">{activeDirective.timing}</div>
                  </div>
                  <button
                    id="reset-picos-activity"
                    onClick={handleResetActivity}
                    className="border border-slate-300 hover:bg-white text-slate-800 font-bold text-[10px] uppercase tracking-wider font-mono px-2 py-2 rounded cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset activity
                  </button>
                </div>
              </div>
            </div>
          </section>

          {activeDirective.recommendationImage && (
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-3 shrink-0">
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                    <PackageCheck className="h-3.5 w-3.5 text-slate-400" />
                    Recommended Display
                  </h3>
                  <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded font-mono uppercase shrink-0">
                    {totalFacings} facings
                  </span>
                </div>
                <div className="min-h-[260px] max-h-[420px] p-4 flex items-center justify-center bg-white">
                  {canShowActivityImage && (
                    <img
                      src={activeDirective.recommendationImage}
                      alt={`${activeDirective.name} recommended display`}
                      className="w-full max-h-[380px] object-contain bg-white"
                    />
                  )}
                </div>
              </div>

              <aside className="bg-white border border-slate-200 rounded p-4 shadow-xs self-start">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Ideal Location
                    </span>
                    <div className="mt-2 text-lg font-black text-slate-950 leading-tight">{location}</div>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      POI Type
                    </span>
                    <div className="mt-2 text-lg font-black text-slate-950 leading-tight">{poiType}</div>
                  </div>
                  {currentActivityMetrics.aggregateLiftPct > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="inline-flex text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1.5 rounded font-mono uppercase">
                        {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2">Estimated sales lift vs. no display</div>
                    </div>
                  )}
                </div>
              </aside>
            </section>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Ideal Location
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-slate-950 truncate">{location}</h2>
                    {currentActivityMetrics.aggregateLiftPct > 0 && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1 rounded font-mono uppercase shrink-0">
                        {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  id="cant-do-location"
                  onClick={handleCantDoLocation}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-[10px] uppercase tracking-wider font-mono px-3 py-2 rounded cursor-pointer shrink-0"
                >
                  Can't do
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    POI Type
                  </span>
                  <h2 className="text-lg font-black text-slate-950 mt-2 truncate">{poiType}</h2>
                  {currentActivityMetrics.aggregateLiftPct > 0 && (
                    <span className="inline-flex mt-2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1 rounded font-mono uppercase">
                      {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                    </span>
                  )}
                </div>
                <button
                  id="cant-do-poi"
                  onClick={handleCantDoPoiType}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-[10px] uppercase tracking-wider font-mono px-3 py-2 rounded cursor-pointer shrink-0"
                >
                  Can't do
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col shrink-0 max-h-[360px]">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                  <PackageCheck className="h-3.5 w-3.5 text-slate-400" />
                  SKU and Facing Execution
                </h3>
              </div>
              <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded font-mono uppercase shrink-0">
                {totalFacings} total facings
              </span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto min-h-0">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 lg:grid-cols-[1fr_150px_220px] gap-3 p-3 items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-950 text-sm truncate">{item.sku}</h4>
                      {item.source === "backend" && (
                        <span className={`inline-flex items-center gap-1 border rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${sourceBadgeClasses(item.source)}`}>
                          <Lock className="h-2.5 w-2.5" />
                          {sourceLabel(item.source)}
                        </span>
                      )}
                      {hasPositiveLift(item.liftPct) && item.opportunityUnits !== undefined && (
                        <span className="inline-flex items-center border rounded px-2 py-1 text-[10px] font-bold uppercase font-mono bg-emerald-50 text-emerald-700 border-emerald-100">
                          {liftLabel(item.liftPct, item.opportunityUnits)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Priority: {item.priority}
                      {item.replacedFrom && <span> / Replaced: {item.replacedFrom}</span>}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Facings</div>
                    <div className="mt-1 inline-flex items-center rounded border border-slate-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.sku} facings`}
                        disabled={item.targetFacings <= 1}
                        onClick={() => handleAdjustFacings(item.id, -1)}
                        className="h-8 w-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-8 min-w-9 px-2 border-x border-slate-200 flex items-center justify-center text-lg font-black text-slate-950 font-mono leading-tight">
                        {item.targetFacings}
                      </div>
                      <button
                        type="button"
                        aria-label={`Increase ${item.sku} facings`}
                        disabled={item.targetFacings >= 99}
                        onClick={() => handleAdjustFacings(item.id, 1)}
                        className="h-8 w-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500">Min {item.minFacings}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 justify-end">
                    <button
                      id={`cant-do-sku-${item.id}`}
                      onClick={() => handleCantDoSku(item.id)}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-[10px] uppercase tracking-wider font-mono px-3 py-2 rounded cursor-pointer"
                    >
                      Can't do SKU
                    </button>
                    <button
                      id={`cant-do-facings-${item.id}`}
                      onClick={() => handleCantDoFacings(item.id)}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-[10px] uppercase tracking-wider font-mono px-3 py-2 rounded cursor-pointer"
                    >
                      Can't do facings
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </>
          )}

          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-4 flex items-center justify-between gap-4 shrink-0 shadow-[0_-4px_12px_rgba(15,23,42,0.04)]">
            <div className="min-w-0">
              {activeActivityOutcome && (
                <div className="bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-md shadow-lg border border-slate-800 flex items-center gap-3">
                  <span className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span>Outcome saved</span>
                </div>
              )}
            </div>

            {activeActivityOutcome ? (
              <div className="flex items-center justify-end gap-4 min-w-0">
                <div className={`flex items-center gap-2 text-sm font-black truncate ${
                  activeActivityOutcome.executed ? "text-emerald-700" : "text-orange-700"
                }`}>
                  {activeActivityOutcome.executed ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <CircleMinus className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{outcomeFooterLabel(activeActivityOutcome)}</span>
                </div>
                {onUndoActivityOutcome && (
                  <button
                    id="undo-last-picos-outcome"
                    onClick={() => onUndoActivityOutcome(activeActivityOutcome.directiveId)}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    Undo
                  </button>
                )}
              </div>
            ) : (
              <button
                id="proceed-after-picos"
                onClick={() => onProceedToAfterPhoto(constraints)}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold py-3 px-8 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
              >
                Record Outcome <ArrowRight className="h-4.5 w-4.5" />
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
