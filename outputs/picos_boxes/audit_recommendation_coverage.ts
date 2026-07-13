import { PICOS_STORES } from "../../src/data/picosStores";

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

function packKeys(value: string) {
  const keys = new Set(
    (value.toLowerCase().match(/\b\d+(?:\.\d+)?\s*(?:oz|l|ltr|ml|pk|pack|ct)\b/g) || [])
      .map(pack => canonicalPackToken(pack))
  );
  if (/\bmini\s*can/.test(value.toLowerCase())) keys.add("mini-can");
  return keys;
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

function displayBrandName(sku: string) {
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
  return displayByBrand[brandKey(sku)] || sku.trim().replace(/\s+/g, " ").toUpperCase();
}

function formatPackTokens(packSizesStated: string) {
  if (!packSizesStated || packSizesStated === "Not explicitly stated") return [];
  return [...new Set(packSizesStated.split(";").map(pack => canonicalPackToken(pack)).filter(Boolean))];
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

function aliasesForSku(sku: string) {
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
  return aliasesByBrand[brandKey(sku)] || [sku.toLowerCase()];
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
  const skuLower = normalizedSku.toLowerCase();
  return [normalizedSku, ...packTokens.map(pack => displayPackToken(pack)).filter(pack => !skuLower.includes(pack.toLowerCase()))].join(" ");
}

function splitSkus(skusStated: string, activity: string, packSizesStated = "") {
  if (skusStated && skusStated !== "Not explicitly stated") {
    return skusStated.split(";").map(sku => formatSkuName(sku.trim(), packSizesStated, activity)).filter(Boolean);
  }
  return [activity.replace(/^(OnAd|Sell Sheet|Sheet)\s*\d+\s*/i, "").slice(0, 44) || "Backend SKU mix"];
}

function skuIdentity(value: string) {
  return `${brandKey(value)}::${[...packKeys(value)].sort().join("|")}`;
}

function constraintsFor(skus: string[]) {
  return skus.map(sku => ({
    label: sku,
    brand: brandKey(sku),
    packTokens: [...packKeys(sku)]
  }));
}

function candidateMatchesSku(candidate: any, sku: string) {
  const constraint = constraintsFor([sku])[0];
  const candidatePacks = packKeys(`${candidate.sku} ${candidate.packSize}`);
  return brandKey(candidate.sku) === constraint.brand && constraint.packTokens.every(pack => candidatePacks.has(pack));
}

function candidateMatchesAny(candidate: any, skus: string[]) {
  if (!skus.length) return true;
  return skus.some(sku => candidateMatchesSku(candidate, sku));
}

function candidateLocation(candidate: any) {
  return candidate?.locationGuidance || "Not stated";
}

function candidatePoi(candidate: any, box: any) {
  return candidate?.displayType || box.displayType || "Display";
}

function visibleCandidateSet(box: any, lockedSkus: string[]) {
  const candidates = box.optimizationCandidates || [];
  if (!candidates.length) return [];
  const eligible = candidates.filter((candidate: any) => candidateMatchesAny(candidate, lockedSkus));
  const candidatePool = eligible.length ? eligible : candidates;
  const active = candidatePool.reduce((best: any, candidate: any) => !best || candidate.liftPct > best.liftPct ? candidate : best, undefined);
  if (!active) return [];
  const sameExecution = candidates.filter((candidate: any) =>
    candidateLocation(candidate) === candidateLocation(active) &&
    candidatePoi(candidate, box) === candidatePoi(active, box) &&
    candidateMatchesAny(candidate, lockedSkus)
  );
  const ranked = sameExecution.length ? sameExecution : candidatePool;
  const maxItems = lockedSkus.length > 0 ? Math.max(1, lockedSkus.length) : 4;
  const seen = new Set<string>();
  return ranked.filter((candidate: any) => {
    const key = skuIdentity(candidate.sku);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxItems);
}

const gaps: any[] = [];
const summary = {
  totalActivities: 0,
  activitiesWithCandidates: 0,
  activitiesWithLockedSkus: 0,
  totalLockedSkus: 0,
  lockedWithAnyModelMatch: 0,
  lockedVisibleInBaseRecommendation: 0,
  lockedNoModelMatch: 0,
  lockedMatchedButNotVisibleInBase: 0,
  variableActivitiesWithoutCandidates: 0
};

for (const store of PICOS_STORES) {
  for (const box of store.picosBoxes) {
    summary.totalActivities += 1;
    const candidates = box.optimizationCandidates || [];
    if (candidates.length) summary.activitiesWithCandidates += 1;
    const lockedSkus = box.skusStated !== "Not explicitly stated" ? splitSkus(box.skusStated, box.activity, box.packSizesStated) : [];
    if (lockedSkus.length) summary.activitiesWithLockedSkus += 1;
    if (!lockedSkus.length && !candidates.length) summary.variableActivitiesWithoutCandidates += 1;
    const visibleCandidates = visibleCandidateSet(box, lockedSkus);
    const missingAnywhere: string[] = [];
    const matchedButNotVisible: string[] = [];

    for (const lockedSku of lockedSkus) {
      summary.totalLockedSkus += 1;
      const anyModelMatch = candidates.some((candidate: any) => candidateMatchesSku(candidate, lockedSku));
      const visibleMatch = visibleCandidates.some((candidate: any) => candidateMatchesSku(candidate, lockedSku));
      if (anyModelMatch) summary.lockedWithAnyModelMatch += 1;
      if (visibleMatch) summary.lockedVisibleInBaseRecommendation += 1;
      if (!anyModelMatch) {
        summary.lockedNoModelMatch += 1;
        missingAnywhere.push(lockedSku);
      } else if (!visibleMatch) {
        summary.lockedMatchedButNotVisibleInBase += 1;
        matchedButNotVisible.push(lockedSku);
      }
    }

    if (missingAnywhere.length || matchedButNotVisible.length || !candidates.length) {
      gaps.push({
        store: store.storeName,
        box: box.box,
        mode: box.mode,
        activity: box.activity,
        packSizesStated: box.packSizesStated,
        lockedSkus,
        candidateCount: candidates.length,
        missingAnywhere,
        matchedButNotVisible
      });
    }
  }
}

console.log(JSON.stringify({ summary, gaps }, null, 2));
