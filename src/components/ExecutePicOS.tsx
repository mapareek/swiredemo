import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Database, Layers, Lock, MapPin, PackageCheck, RefreshCw } from "lucide-react";
import {
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
  onBackToHub: () => void;
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
  "Rack"
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
    let selectedLift = -Infinity;
    candidates.forEach((candidate, index) => {
      if (!predicate(candidate)) return;
      if (candidate.liftPct > selectedLift) {
        selectedIndex = index;
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
    .sort((a, b) => b.liftPct - a.liftPct || b.opportunityUnits - a.opportunityUnits)
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
    .sort((a, b) => b.liftPct - a.liftPct || b.opportunityUnits - a.opportunityUnits)
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
    if (existing && existing.liftPct >= metrics.liftPct) return;
    recommendationsByLocation.set(candidateLoc, {
      candidateIndex,
      location: candidateLoc,
      poiType: candidatePoi,
      liftPct: metrics.liftPct,
      opportunityUnits: metrics.opportunityUnits,
      isBackendConstrained: locationConstraints.length > 0 && candidateMatchesLocationConstraint(candidate, locationConstraints)
    });
  });

  return [...recommendationsByLocation.values()].sort((a, b) => b.liftPct - a.liftPct);
}

function directivesForStore(store: StoreInfo): OnAdDirective[] {
  const executeBoxes = store.picosBoxes;

  if (executeBoxes.length === 0) return ON_AD_DIRECTIVES;

  const rankedBoxes = [...executeBoxes].sort((a, b) => {
    const modeDelta = (a.mode === "Execute" ? 0 : 1) - (b.mode === "Execute" ? 0 : 1);
    if (modeDelta !== 0) return modeDelta;
    const aLockedSkus = a.skusStated !== "Not explicitly stated" ? splitSkus(a.skusStated, a.activity, a.packSizesStated) : [];
    const bLockedSkus = b.skusStated !== "Not explicitly stated" ? splitSkus(b.skusStated, b.activity, b.packSizesStated) : [];
    return bestLiftPctForSource(b, b.optimizationCandidates, backendSkuConstraints(bLockedSkus)) - bestLiftPctForSource(a, a.optimizationCandidates, backendSkuConstraints(aLockedSkus));
  });

  return rankedBoxes.map((box, boxIndex) => {
    const lockedSkus = box.skusStated !== "Not explicitly stated" ? splitSkus(box.skusStated, box.activity, box.packSizesStated) : [];
    const skuConstraints = backendSkuConstraints(lockedSkus);
    const baseCandidateIndex = initialCandidateIndexForSource(box, box.optimizationCandidates || [], skuConstraints);
    const topCandidate = box.optimizationCandidates?.[baseCandidateIndex] || box.optimizationCandidates?.[0];
    const backendLocation = box.locationGuidance !== "Not explicitly stated" ? box.locationGuidance : box.location;
    const stackRank = boxIndex + 1;

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
      pages: `${box.sourceFile} / ${box.sourcePages}`,
      mode: box.mode,
      displayType: topCandidate?.displayType || box.displayType,
      locationCategory: topCandidate?.location || box.location,
      sourceFile: box.sourceFile,
      sourceImage: box.sourceImage,
      support: box.support,
      confidencePct: box.confidencePct,
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
  const maxItems = skuConstraints.length > 0 ? Math.max(1, skuConstraints.length) : 4;
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
  const units = opportunityUnits === undefined ? "0.0 units" : `${opportunityUnits >= 0 ? "+" : ""}${opportunityUnits.toFixed(1)} units`;
  return `${lift} lift / ${units}`;
}

function candidateMetrics(candidate: PicOSOptimizationCandidate) {
  return {
    liftPct: candidate.liftPct,
    opportunityUnits: candidate.opportunityUnits,
    baselineUnits: candidate.predictedCurrent,
    idealUnits: candidate.predictedIdeal
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

export default function ExecutePicOS({ store, onBackToHub, onProceedToAfterPhoto }: ExecutePicOSProps) {
  const directives = useMemo(() => directivesForStore(store), [store]);
  const [directiveId, setDirectiveId] = useState(directives[0].id);
  const [candidateIndex, setCandidateIndex] = useState(() => initialCandidateIndexForSource(
    directives[0],
    directives[0].optimizationCandidates || [],
    backendSkuConstraints(directives[0].lockedSkus || directives[0].skus.map(sku => sku.name))
  ));
  const activeDirective = directives.find(d => d.id === directiveId) || directives[0];
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
      score: number;
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

      if (!existing || metrics.liftPct > existing.score || (
        metrics.liftPct === existing.score && metrics.opportunityUnits > existing.opportunityUnits
      )) {
        grouped.set(key, {
          candidateIndex: index,
          candidates: groupCandidates,
          score: metrics.liftPct,
          opportunityUnits: metrics.opportunityUnits
        });
      }
    });

    return [...grouped.values()]
      .sort((a, b) => b.score - a.score || b.opportunityUnits - a.opportunityUnits)[0]?.candidateIndex;
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
      .sort((a, b) => b.liftPct - a.liftPct || b.opportunityUnits - a.opportunityUnits)[0];

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
                Execute PicOS Recommendation
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
              {store.storeName} backend recommendation with editable next-best exceptions
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded">
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">1. Recommendation</span>
          <span className="text-slate-300">-&gt;</span>
          <span>2. After Photo</span>
          <span className="text-slate-300">-&gt;</span>
          <span>3. Removal Survey</span>
          <span className="text-slate-300">-&gt;</span>
          <span>4. Sync Summary</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[360px] bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              Backend PicOS Activities
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Select an activity. The execution plan is optimized from CSV lift candidates.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-50/40">
            {directives.map((directive) => {
              const isSelected = directiveId === directive.id;
              return (
                <button
                  key={directive.id}
                  onClick={() => resetForDirective(directive.id)}
                  className={`w-full p-2.5 rounded border transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-red-50/50 border-red-500 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
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
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100">
                        +{Math.round(directive.bestLiftPct || 0)}% lift
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono font-semibold shrink-0">
                      {directive.timing}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-tight ${isSelected ? "text-red-950" : "text-slate-800"}`}>
                    {directive.name}
                  </h4>
                </button>
              );
            })}
          </div>

        </aside>

        <main className="flex-1 bg-slate-100 flex flex-col p-4 overflow-y-auto min-w-0">
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
                    <img
                      src={activeDirective.sourceImage}
                      alt={`${activeDirective.name} PDF activity box`}
                      className="w-full h-[120px] object-contain bg-white"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 text-[10px] font-mono text-slate-600 min-w-[170px]">
                  <div className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1.5">
                    <div className="text-emerald-700 uppercase font-bold">Activity lift</div>
                    <div className="text-emerald-900 font-bold truncate">
                      +{currentActivityMetrics.aggregateLiftPct}% / +{currentActivityMetrics.totalOpportunityUnits.toFixed(1)} units
                    </div>
                  </div>
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
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1 rounded font-mono uppercase shrink-0">
                      {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                    </span>
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
                  <span className="inline-flex mt-2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-1 rounded font-mono uppercase">
                    {liftLabel(currentActivityMetrics.aggregateLiftPct, currentActivityMetrics.totalOpportunityUnits)}
                  </span>
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

          <section className="bg-white border border-slate-200 rounded shadow-xs mt-3 overflow-hidden flex flex-col shrink-0 max-h-[360px]">
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
                      {item.liftPct !== undefined && item.opportunityUnits !== undefined && (
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
                    <div className="text-lg font-black text-slate-950 font-mono leading-tight">{item.targetFacings}</div>
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

          <footer className="mt-3 pt-3 border-t border-slate-200 bg-slate-100 flex items-center justify-end gap-4 shrink-0">
            <button
              id="proceed-after-picos"
              onClick={() => onProceedToAfterPhoto(constraints)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold py-2 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
            >
              Confirm Plan & Capture After Photo <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
