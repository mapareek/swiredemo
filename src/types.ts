export enum Screen {
  STORE_SELECTOR = "STORE_SELECTOR",
  ACTION_HUB = "ACTION_HUB",
  HUNT_WORKFLOW = "HUNT_WORKFLOW",
  EXECUTE_PICOS = "EXECUTE_PICOS",
  OPTIMIZE_DISPLAY = "OPTIMIZE_DISPLAY",
  BEFORE_PHOTO = "BEFORE_PHOTO",
  AFTER_PHOTO = "AFTER_PHOTO",
  REMOVAL_SURVEY = "REMOVAL_SURVEY",
  SUMMARY = "SUMMARY"
}

export type FlowType = "EXECUTE_PICOS" | "OPTIMIZE_DISPLAY" | "HUNT_SPACE";

export interface StoreInfo {
  id: string;
  routeId: string;
  distributor: string;
  retailer: string;
  storeName: string;
  segment: string;
  address: string;
  manager: {
    name: string;
    avatar: string;
    phone: string;
  };
  picosBoxes: PicOSActivityBox[];
}

export interface HuntConstraints {
  category: "Sparkling" | "Still" | "Energy" | "Water";
  location: "Lobby Front" | "Front Endcap" | "Aisle Cooler" | "Checkout Lane";
  priority: "Volume" | "Margin" | "Velocity";
}

export type OptimizeDisplayType = "Cooler" | "Display" | "Shipper" | "Rack";

export interface PicOSConstraints {
  directiveId: string; // "OnAd-1" to "OnAd-6"
  location: string;
  poiType: string;
  totalFacingTarget: number;
  items: PicOSExecutionItem[];
  overrides: PicOSOverride[];
  coolerSize?: "1-Door" | "2-Door" | "3-Door";
  shelves?: number;
  focus?: "Brand Coke Focus" | "Zero Sugar Focus" | "Flavor Variety";
}

export type PicOSRecommendationSource = "backend" | "recommended" | "nextBest";
export type PicOSOverrideType = "location" | "poiType" | "sku" | "facings";

export interface PicOSExecutionItem {
  id: string;
  sku: string;
  targetFacings: number;
  minFacings: number;
  source: PicOSRecommendationSource;
  priority: "High" | "Medium" | "Low";
  replacedFrom?: string;
  liftPct?: number;
  opportunityUnits?: number;
}

export interface PicOSOverride {
  type: PicOSOverrideType;
  label: string;
  previousValue: string;
  nextBestValue: string;
  reason: string;
}

export interface RemovalSurveyItem {
  product: string;
  casesRemoved: number;
}

export interface RemovalSurveyResult {
  removedItems: boolean;
  items: RemovalSurveyItem[];
}

export interface OnAdDirective {
  id: string;
  code: string;
  name: string;
  execute: boolean;
  onAd: string;
  timing: string;
  location: string;
  details: string;
  casesNeeded: string;
  pages: string;
  skus: { name: string; minFacings: number; priority: "High" | "Medium" | "Low"; share: number }[];
  mode?: "Execute" | "Sell";
  displayType?: string;
  locationCategory?: string;
  sourceFile?: string;
  sourceImage?: string;
  support?: string;
  confidencePct?: number;
  lockedSkus?: string[];
  optimizationCandidates?: PicOSOptimizationCandidate[];
  sourceBox?: string;
  stackRank?: number;
  bestLiftPct?: number;
}

export interface PicOSOptimizationCandidate {
  id: string;
  sku: string;
  packSize: string;
  displayType: string;
  location: string;
  locationGuidance: string;
  facings: number;
  predictedCurrent: number;
  predictedIdeal: number;
  opportunityUnits: number;
  liftPct: number;
  rank: number;
  matchScore: number;
  isTypeValid: boolean;
  sublocTier: string;
  sourceFile: string;
}

export interface PicOSActivityBox {
  box: string;
  coreBox: string;
  mode: "Execute" | "Sell";
  activity: string;
  onAd: string;
  confidencePct: number;
  support: string;
  window: string;
  displayType: string;
  location: string;
  locationGuidance: string;
  packSizeStatus: string;
  packSizesStated: string;
  skuStatus: string;
  skusStated: string;
  executionDetail: string;
  verificationScale: string;
  sourcePages: string;
  sourceImage?: string;
  optimizationNote: string;
  sourceFile: string;
  optimizationCandidates?: PicOSOptimizationCandidate[];
}

export const ON_AD_DIRECTIVES: OnAdDirective[] = [
  {
    id: "OnAd-1",
    code: "OnAd 1",
    name: "12pk 12oz Cans Feature",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/28",
    location: "Endcap or perimeter display. Includes Topo Chico Sabores 8pk on sidestack.",
    details: "Coke, Coke Zero, Diet Coke, and Sprite displayed at minimum.",
    casesNeeded: "Minimum display execution, approximately 20 cases.",
    pages: "Overview pages 1, 3, 5, 7",
    skus: [
      { name: "Coca-Cola Original 12pk", minFacings: 6, priority: "High", share: 35 },
      { name: "Coke Zero Sugar 12pk", minFacings: 5, priority: "High", share: 25 },
      { name: "Diet Coke Classic 12pk", minFacings: 4, priority: "High", share: 20 },
      { name: "Sprite Regular 12pk", minFacings: 3, priority: "Medium", share: 15 },
      { name: "Topo Chico Sabores 8pk", minFacings: 2, priority: "Medium", share: 5 }
    ]
  },
  {
    id: "OnAd-2",
    code: "OnAd 2",
    name: "Star Spangled 2ltr Event",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/28",
    location: "Perimeter or lobby display. Location varies by division.",
    details: "2ltr event with additional promotion using 20oz shippers.",
    casesNeeded: "Approximately 40 cases. Display should be present for all week.",
    pages: "Overview pages 1, 3, 5, 7; detail page 9",
    skus: [
      { name: "Coca-Cola Original 2L", minFacings: 8, priority: "High", share: 40 },
      { name: "Coke Zero Sugar 2L", minFacings: 6, priority: "High", share: 30 },
      { name: "Sprite Regular 2L", minFacings: 4, priority: "Medium", share: 15 },
      { name: "Diet Coke 2L", minFacings: 4, priority: "Medium", share: 15 }
    ]
  },
  {
    id: "OnAd-3",
    code: "OnAd 3",
    name: "Star Spangled 2ltr HQ Support",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/21",
    location: "Perimeter or lobby display.",
    details: "2ltr event with ad week 7/1 pricing and TPR support for 7/8 and 7/15.",
    casesNeeded: "Display executed for all weeks.",
    pages: "Overview pages 1, 3, 5; detail pages 7-8",
    skus: [
      { name: "Coca-Cola Original 2L", minFacings: 10, priority: "High", share: 45 },
      { name: "Coke Zero Sugar 2L", minFacings: 6, priority: "High", share: 25 },
      { name: "Diet Coke 2L", minFacings: 4, priority: "Medium", share: 15 },
      { name: "Sprite Regular 2L", minFacings: 4, priority: "Medium", share: 15 }
    ]
  },
  {
    id: "OnAd-4",
    code: "OnAd 4",
    name: "Star Spangled BASN Flash IV Event",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/21",
    location: "Perimeter or lobby display.",
    details: "Body Armor Flash IV Event. Ad week 7/1 and in-store TPR support for 7/8 and 7/15.",
    casesNeeded: "Display executed for all weeks.",
    pages: "Overview pages 1, 3, 5; detail pages 7-8 and 15",
    skus: [
      { name: "BodyArmor Flash IV Grape", minFacings: 6, priority: "High", share: 30 },
      { name: "BodyArmor Flash IV Strawberry", minFacings: 6, priority: "High", share: 30 },
      { name: "BodyArmor Flash IV Orange", minFacings: 4, priority: "Medium", share: 20 },
      { name: "BodyArmor Flash IV Tropical", minFacings: 4, priority: "Medium", share: 20 }
    ]
  },
  {
    id: "OnAd-5",
    code: "OnAd 5",
    name: "Star Spangled CSD 6pk Glass Event",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/21",
    location: "Perimeter or lobby display.",
    details: "CSD 6pk glass event with ad week minimum pricing.",
    casesNeeded: "Display executed for all weeks, approximately 4 cases.",
    pages: "Overview pages 1, 3, 5; detail page 15",
    skus: [
      { name: "Coca-Cola Glass 6pk", minFacings: 6, priority: "High", share: 40 },
      { name: "Sprite Glass 6pk", minFacings: 4, priority: "Medium", share: 30 },
      { name: "Fanta Orange Glass 6pk", minFacings: 4, priority: "Medium", share: 30 }
    ]
  },
  {
    id: "OnAd-6",
    code: "OnAd 6",
    name: "Star Spangled Coke 6pk .5ltr Event",
    execute: true,
    onAd: "Yes",
    timing: "7/1 - 7/21",
    location: "Perimeter or lobby display.",
    details: "Coke 6pk .5ltr with in-store promotion week 7/1 and 7/8-7/15 continuation.",
    casesNeeded: "Display executed for all weeks, approximately 56 cases.",
    pages: "Overview pages 1, 3, 5; detail pages 15-16",
    skus: [
      { name: "Coca-Cola Original 6pk .5L", minFacings: 14, priority: "High", share: 40 },
      { name: "Coke Zero Sugar 6pk .5L", minFacings: 10, priority: "High", share: 30 },
      { name: "Diet Coke Classic 6pk .5L", minFacings: 8, priority: "High", share: 20 },
      { name: "Sprite Regular 6pk .5L", minFacings: 6, priority: "Medium", share: 10 }
    ]
  }
];

export interface OptimizeConstraints {
  focus: "Low Sugar" | "Maximize Margin" | "Fastest Velocity";
  maxSkus: number;
  brandFocus: "Coca-Cola" | "Sprite" | "Monster" | "Smartwater";
  displayType?: OptimizeDisplayType;
  location?: string;
  currentProducts?: string[];
  currentFacings?: Record<string, number>;
}

export interface RecommendedSKU {
  skuId: string;
  name: string;
  pack: string;
  price: number;
  expectedSales: number;
  liftPercent: number;
  locked: boolean;
  image: string;
}

export interface RecommendationResult {
  skus: RecommendedSKU[];
  totalCost: number;
  expectedLift: number;
  explanation: string;
  feasible: boolean;
}

export const IMAGES = {
  map: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1wAi-PxsfdhHXNpIszHX48NsRFBT2XzS4kKPDBfrPwkx1THh5lZrXgs_xi9TRqSKm-2o-wRgqofEB_LlCxb65AyBOuJ3XmdQy-oFjLx1PSpJJwUWAZmuTXV2JKQjrkgSQTfebHbL0bnlg8kkXAbC8HpCZOUECu5HX2UvOQSLTxGpnBTUA7i9A55xEHJc9uzKxdJtaOJXCx70B8JetUccq71O-F13c2hSwSkReQVd20b3ef_Kk9N8",
  beforeCooler: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkhTmpUIjSlukDEgrg9OQ3xLYZvWl6eiJ284O2u4mM2Jys22N_XUTeg6lNP5UC48LT00LGJVsKfpvy1gYpv2sJ358Z214rgbp5sD2HFo4trHtC9N2lT-a7XBHS89xkxmDsPLjoaKMRvZg6xQN031kw_zDwA31TQtRq3OO2Or_p7ti20S8D0233Nz4ElAgrgPMDLm1Sj9sdtxWZtmxovj8uZA4hBa5n-UsNJtdRRSOqJczq1YFg1rc",
  cameraBefore: "https://lh3.googleusercontent.com/aida-public/AB6AXuBBA-Ub5zLCcELTWWPA4BsTqmmsHInBhp-eEoaXMHD4k_WyhTDTUw3K4xK6az2OLOFF527U0LZ0prd6oBFNJFFNjSlb8KvCG0lxh8yBWgTdi1MXqRXJjkCkOvcmKHHCUBphzaEon0OXegTTtNaC8hzoxZlG0qboVYcrAUMUXHMxLieF8Nw3AJw4YNkl72ROFN-rvIRVcXtYXsaQ3QnvUD3gDWIn7BE_Xe8dCQUTiApuYBY94acKDX4",
  cameraAfter: "https://lh3.googleusercontent.com/aida-public/AB6AXuDbBt_29RRaumeJThlnndpuqiWRcbYOBjT_sbE9AucL8XJ3XYkLojqX4od2RGi6GujYhf7ZjNwtlr1_wU3LVXx9Af2eOh8H6OmmVnWyhAZpnPJgLDv5r3XwDTjfrbIhXSvyuSChZIaksIGjPhizhlxU4jacSgv05KkeCsRYJbqxIz8R7shoUYdQ1qGb3_o2_j2tnpLiDEXAV-k15Irm6q3stivyx3drtbNVQAar7tVWBZneYnINNeU",
  glassCoke: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGO3dmENVEGbumvKKng-WwHnHoC_rooFxLYnZD-O4G0qRHss_zL5jPCzqkjATELvM8C9nOm3YQTRgsYe7axVUtcdwQl1EZGZvUKtMEhhnPCHCDCMvJHuy3y4bTIOziTQHc4GLLnBZ4b7YVft8MUzWUz16UX3LRjJLiOveGjARm1xIKQV6PWLGOhgpB4cXlwCoCt448W3CGKOe4i5GATWT9mATHO61nlNHsABBBDJWYTpoXY4bETIk",
  snackBag: "https://lh3.googleusercontent.com/aida-public/AB6AXuCa4UGc_2VSALlC-3QSKj2ta2ceqr_5Bs7nx3pL1sYFWjg3XyfLj2m9YiFFDwdpd7e9XOqd0L9j7eHRhywWEf872R0oloEaVIpPN_vGbRu27oeuu2v0GlZEZiyFMk5faRpVWp5o1ADWicDBx2ngVzqT13OJBVce8MzWlVtX77mWB5lbd1GEkeAFoEONADXqz2UsM-0_4yS7IFdcWFglbGzSQcPnh0g9P_ufxBHBbiG97CpOjuAlv-4",
  avatarDoe: "https://lh3.googleusercontent.com/aida-public/AB6AXuAozRbuJmvIm7DTCBT5hADJGtY4F5i5OU2Alwms-D2WYqM-CwgX3xdD8ueqdhZGm7-nCtUcT0FqIwuipPVNaQnbh_hIJs-eGQjru_hiVzMR1Ni5G96LeAwHKOnsGv-LUrXb3cMJkH22ilx1Zso4i0iriaNEK5n719fWNGDBEHpgYTI-fkIJwCBFFzTPYbOoXxZvQqoXQ3hZQqvk8hR18Fa8vpJaoqOYskEgroUHFW0b4wNbU1PA3Tg",
  beforeThumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuBE6t3DsgIOzZ6tRq1YcJ38p9-oLOylp2O03V2gcfguWfqv-Gr-uX6qQCGTcDuG4Fc819HtmJEWKxauQFqt1L4a2aQ3iTsPoGEY7fzAMfrbiwphv-AyLeCb1HtnhW1rvsJZF5pdoguOlFVi8toE7skOrJV159ViVA5FfvOv08A5dAob04YTBNamMh4_N9AxB0b5pqSUByvdyJTkmXEYSLeLWN3VU9HdZaJRVNl4WVPVs63cscPbSLw",
  afterThumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdLPOgvx-FVMHqXFnnnU6DIdURKPG_UG-42Kjv7fU2oIjF4i6X1rmqUg6rkxmIbkdVq7p3pCIxMkkq38LP9_ySeJ-YejalsVZ3QDwdDbpelaB2vezq1ENTwB7ED74lJ15Abc5jMq3kvyrgV6RxgS7CxvQ-2IbWCnvjONgFGN8fx9EcNeddt1cLhbCx-5VC6MZyGZCtQ5fn9M3_-Jj18uPCTASafZJHu6KQLwelTouDh6yJmkrdSzY",
  storeManager: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcSHnanmiEp3_6PdCqCEAbOF_ywY_KwOhhC7QoZbSpL3XnCT4xO9DX5HP0LcyJy8UMJzL9hFrpnuUQuwX13SCQr6nBjshN5bRx63WVz_Iz_dnrpwkSbqp3SqvAPrLta_00D7PGEdpcpDhIvjDMLbJSUFanu5otQAmvSRtAsIUX4kODsrrUFgY9fGr1v0IIFhdLfamUc3jrzVLe4WnzE7CceRawFJISisJ5KtDeivG48cl2olmOTHE",
  altManager: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwWt3dTZtZhKCgymsBJ7G-KU7AAOaN_uTkFnOSKZukJ11uXN5i2lHmvPhGOSt6XPASU9U3MKEWECNXDVfK32f9sTzH_OYAt7jeDwPUW3ME2SaRV_r8GBEyzEBpwipwSA7jPPkTuJsdbxYEwwizJdOlEqDW9M2pbBFhRyWf1V26FszfF5uPxMxD4fzyw9k-aNt6Redm2vuZxCpOwyte9_yZIGVP-axr6IyNQQAP34Jgb-CLRJC7kkc",
  skuReference: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVyjNa76Yw5EYkbVSwxR7xp_eE_kvFLaTjNqXY77ZJcgK_U-1TgtzDnFTb9-VtMreD4WWtNu_OzlA6Xm44EAkmFJ0seDC6Oc0J_bafYHeoJ5f5IyFuf5w15gYnmeer0odQK_N_peMEcw5owYoGr2170qiS4kUT6DKa7RFIdSks64GbMt37G-2YCdkMZBjYIQl7Em83rfV32X2jKfo9CFIPuZDWZ5Ek7zVKEcgIfxk9Zj1LAQnu9tw",
  contextBeforeAfter: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDu__TKC0uXr2dYEFDhdYGeezs_0MPniSa4nEHBNIpRi15PqVgvXlyCCXiAKkeLTItFw4tKPFkqLNphGMvu6ae916t2rc26T6fk4c81kjfvAQb2Jlg-zCbIMh1f3ixhZnmAuAvj5JBQ18fETx2sMunbZ400UB5WM1JSqIICHTMa_br4HdtMD8grFNgUNoq6I1qZRYyPq7wFtzV4gIGxeQf6MnzGyEI3jbL-A3DQUoEKLa8z8_dw_o",
  viewfinder: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVrAukon13siI6qoF1SADz2Z3mPxcnxAoZOTCeNfV1JTTOGdl6dseqttr2A_uMSdRYz1vJ7ZD-9MZq-Vyj9nXs66WQUYpjcAc4MDJDfDImkNsKObVbW62sImBMMPcjkLyM1Z5xdzaNnf1onOHeZie8qjm8fG2Kn9QBz84tz7y-WpmjsaGnB4maajLiijWHFTxA8OXO5DRbvdWiIDXN9dCYz-B57rwgQLoau699Gu8BMSjUCJK0u80"
};
