import { DisplayOpportunity, IMAGES, PicOSActivityBox, PicOSOptimizationCandidate, StoreInfo } from "../types";

export type BottlerRow = {
  bottlerId: string;
  bottlerName: string;
};

export type AccountManagerRow = {
  amId: string;
  bottlerId: string;
  amName: string;
};

export type StoreRow = {
  storeId: string;
  bottlerId: string;
  amId: string;
  storeName: string;
  customer: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  channel: string;
  retailerGroup: string;
};

export type PicOSActivityRow = {
  activityId: string;
  storeId: string;
  activityName: string;
  mode: "Execute" | "Sell";
  displayType: string;
  location: string;
  timingWindow: string;
  status: string;
};

export type BuildListItemRow = {
  buildListItemId: string;
  activityId: string;
  sku: string;
  packSize: string;
  facings: number;
  shelfRank: number;
};

export type ActivityImageRow = {
  imageId: string;
  activityId: string;
  imageType: "source" | "recommendation" | "planogram" | string;
  url: string;
  sourceLabel: string;
};

export type ExecutionOutcomeRow = {
  outcomeId: string;
  activityId: string;
  storeId: string;
  executed: boolean;
  reason?: string;
  recordedAt: string;
};

export type DisplayOpportunityRow = {
  displayOpportunityId: string;
  storeId: string;
  location: string;
  displayType: string;
  coveredByPicos: boolean;
  totalOpportunityUnits: number;
  bestLiftPct: number;
  status: string;
};

export type DisplayPackRecommendationRow = {
  displayPackRecId: string;
  displayOpportunityId: string;
  sku: string;
  packSize: string;
  facings: number;
  liftPct: number;
  opportunityUnits: number;
  shelfRank: number;
};

export type DisplayOutcomeRow = {
  displayOutcomeId: string;
  displayOpportunityId: string;
  storeId: string;
  confirmedAt: string;
};

export type RelationshipRows = {
  bottlers: BottlerRow[];
  accountManagers: AccountManagerRow[];
  stores: StoreRow[];
  picosActivities: PicOSActivityRow[];
  buildListItems: BuildListItemRow[];
  activityImages: ActivityImageRow[];
  executionOutcomes: ExecutionOutcomeRow[];
  displayOpportunities: DisplayOpportunityRow[];
  displayPackRecommendations: DisplayPackRecommendationRow[];
  displayOutcomes: DisplayOutcomeRow[];
};

function byId<T, K extends string>(rows: T[], getKey: (row: T) => K) {
  return new Map(rows.map(row => [getKey(row), row]));
}

function groupBy<T, K extends string>(rows: T[], getKey: (row: T) => K) {
  const groups = new Map<K, T[]>();
  rows.forEach(row => {
    const key = getKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return groups;
}

function buildCandidateFromDisplayPack(
  pack: DisplayPackRecommendationRow,
  opportunity: DisplayOpportunityRow
): PicOSOptimizationCandidate {
  return {
    id: pack.displayPackRecId,
    sku: pack.sku,
    packSize: pack.packSize,
    displayType: opportunity.displayType,
    location: opportunity.location,
    locationGuidance: opportunity.location,
    facings: Number(pack.facings) || 0,
    predictedCurrent: 0,
    predictedIdeal: Number(pack.opportunityUnits) || 0,
    opportunityUnits: Number(pack.opportunityUnits) || 0,
    liftPct: Number(pack.liftPct) || 0,
    rank: Number(pack.shelfRank) || 0,
    shelfRank: Number(pack.shelfRank) || 0,
    isTypeValid: true,
    sublocTier: "Display optimization"
  };
}

function buildCandidateFromBuildItem(
  item: BuildListItemRow,
  activity: PicOSActivityRow
): PicOSOptimizationCandidate {
  return {
    id: item.buildListItemId,
    sku: item.sku,
    packSize: item.packSize,
    displayType: activity.displayType,
    location: activity.location,
    locationGuidance: activity.location,
    facings: Number(item.facings) || 0,
    predictedCurrent: 0,
    predictedIdeal: 0,
    opportunityUnits: 0,
    liftPct: 0,
    rank: Number(item.shelfRank) || 0,
    shelfRank: Number(item.shelfRank) || 0,
    isTypeValid: true,
    sublocTier: "PicOS build list"
  };
}

function imageForActivity(images: ActivityImageRow[] = [], type: string) {
  return images.find(image => image.imageType === type)?.url;
}

export function buildStoresFromRelationshipRows(rows: RelationshipRows): StoreInfo[] {
  const bottlersById = byId(rows.bottlers, row => row.bottlerId);
  const accountManagersById = byId(rows.accountManagers, row => row.amId);
  const activitiesByStore = groupBy(rows.picosActivities, row => row.storeId);
  const buildItemsByActivity = groupBy(rows.buildListItems, row => row.activityId);
  const imagesByActivity = groupBy(rows.activityImages, row => row.activityId);
  const opportunitiesByStore = groupBy(rows.displayOpportunities, row => row.storeId);
  const packsByOpportunity = groupBy(rows.displayPackRecommendations, row => row.displayOpportunityId);
  const displayOutcomesByOpportunity = byId(rows.displayOutcomes, row => row.displayOpportunityId);

  return rows.stores.map(store => {
    const bottler = bottlersById.get(store.bottlerId);
    const accountManager = accountManagersById.get(store.amId);
    const picosBoxes: PicOSActivityBox[] = (activitiesByStore.get(store.storeId) || []).map((activity, index) => {
      const buildItems = [...(buildItemsByActivity.get(activity.activityId) || [])]
        .sort((a, b) => (Number(a.shelfRank) || 0) - (Number(b.shelfRank) || 0));
      const activityImages = imagesByActivity.get(activity.activityId) || [];
      const packSizes = [...new Set(buildItems.map(item => item.packSize).filter(Boolean))];
      const skus = [...new Set(buildItems.map(item => item.sku).filter(Boolean))];

      return {
        box: activity.activityId,
        coreBox: "Yes",
        mode: activity.mode,
        activity: activity.activityName,
        onAd: "Yes",
        support: activity.status,
        window: activity.timingWindow,
        displayType: activity.displayType,
        location: activity.location,
        locationGuidance: activity.location,
        packSizeStatus: packSizes.length ? "Explicit" : "Not explicitly stated",
        packSizesStated: packSizes.length ? packSizes.join("; ") : "Not explicitly stated",
        skuStatus: skus.length ? "Explicit" : "Not explicitly stated",
        skusStated: skus.length ? skus.join("; ") : "Not explicitly stated",
        executionDetail: `Build list has ${buildItems.length} pack${buildItems.length === 1 ? "" : "s"} ranked by shelfRank.`,
        verificationScale: "Confirm execution and capture timestamp.",
        sourceImage: imageForActivity(activityImages, "source"),
        optimizationNote: "Loaded from relational PicOS activity and build-list rows.",
        optimizationCandidates: buildItems.map(item => buildCandidateFromBuildItem(item, activity))
      };
    });

    const displayOpportunities: DisplayOpportunity[] = (opportunitiesByStore.get(store.storeId) || []).map(opportunity => {
      const packRecommendations = [...(packsByOpportunity.get(opportunity.displayOpportunityId) || [])]
        .map(pack => buildCandidateFromDisplayPack(pack, opportunity))
        .sort((a, b) => b.liftPct - a.liftPct || (a.shelfRank ?? a.rank) - (b.shelfRank ?? b.rank));
      const outcome = displayOutcomesByOpportunity.get(opportunity.displayOpportunityId);

      return {
        id: opportunity.displayOpportunityId,
        storeId: store.storeId,
        location: opportunity.location,
        displayType: opportunity.displayType,
        coveredByPicos: Boolean(opportunity.coveredByPicos),
        totalOpportunityUnits: Number(opportunity.totalOpportunityUnits) || 0,
        bestLiftPct: Number(opportunity.bestLiftPct) || 0,
        status: opportunity.status,
        packRecommendations,
        confirmedAt: outcome?.confirmedAt
      };
    });

    return {
      id: store.storeId,
      routeId: store.storeId,
      distributor: bottler?.bottlerName || store.bottlerId,
      retailer: store.customer,
      storeName: store.storeName,
      segment: store.channel,
      address: `${store.address}, ${store.city}, ${store.state} ${store.zip}`,
      manager: {
        name: accountManager?.amName || "Store Manager",
        avatar: IMAGES.storeManager
      },
      picosBoxes,
      displayOpportunities
    };
  });
}
