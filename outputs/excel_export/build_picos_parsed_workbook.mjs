import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { PICOS_STORES } from "../../src/data/picosStores.ts";

const outputDir = path.resolve("outputs/excel_export");
const outputPath = path.join(outputDir, "picos_parsed_activity_recommendations.xlsx");

function safe(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return value;
  return value
    .replaceAll("â€¢", "-")
    .replaceAll("â€™", "'")
    .replaceAll("â€œ", '"')
    .replaceAll("â€", '"')
    .replaceAll("â€“", "-")
    .replaceAll("â€”", "-")
    .replaceAll("Â", "")
    .replace(/\s+/g, " ")
    .trim();
}

function sheetRange(sheet, rowCount, colCount) {
  return sheet.getRangeByIndexes(0, 0, rowCount, colCount);
}

function writeSheet(sheet, headers, rows) {
  const values = [headers, ...rows];
  sheet.getRangeByIndexes(0, 0, values.length, headers.length).values = values;
  const fullRange = sheetRange(sheet, values.length, headers.length);
  const headerRange = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  headerRange.format = {
    fill: "#111827",
    font: { bold: true, color: "#FFFFFF" },
  };
  fullRange.format.borders = {
    insideHorizontal: { style: "thin", color: "#E5E7EB" },
    top: { style: "thin", color: "#CBD5E1" },
    bottom: { style: "thin", color: "#CBD5E1" },
  };
  fullRange.format.wrapText = true;
  fullRange.format.autofitColumns();
  fullRange.format.autofitRows();
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  return fullRange;
}

await fs.mkdir(outputDir, { recursive: true });

const activityHeaders = [
  "Store ID",
  "Store Name",
  "Retailer",
  "Address",
  "Box",
  "Mode",
  "Core Box",
  "On Ad",
  "Confidence %",
  "Support",
  "Active Dates",
  "Activity Name",
  "Execution Detail",
  "Display Type",
  "Location",
  "Location Guidance",
  "Pack Size Status",
  "Pack Sizes Stated",
  "SKU Status",
  "SKUs Stated",
  "Verification Scale",
  "Source Pages",
  "Source Image",
  "Source File",
  "Optimization Note",
  "Candidate Count",
  "Best Lift %",
  "Best Unit Lift"
];

const candidateHeaders = [
  "Store ID",
  "Store Name",
  "Retailer",
  "Box",
  "Mode",
  "Activity Name",
  "Active Dates",
  "Candidate ID",
  "SKU",
  "Pack Size",
  "Display Type",
  "Location",
  "Location Guidance",
  "Facings",
  "Predicted Current",
  "Predicted Ideal",
  "Opportunity Units",
  "Lift %",
  "Rank",
  "Match Score",
  "Type Valid",
  "Sublocation Tier",
  "Recommendation Source File"
];

const gapHeaders = [
  "Store",
  "Box",
  "Activity",
  "Pack Sizes Stated",
  "Missing Anywhere",
  "Matched But Not Visible",
  "Candidate Count"
];

const activityRows = [];
const candidateRows = [];

for (const store of PICOS_STORES) {
  for (const box of store.picosBoxes || []) {
    const candidates = box.optimizationCandidates || [];
    const best = candidates.reduce((currentBest, candidate) => {
      if (!currentBest) return candidate;
      return candidate.liftPct > currentBest.liftPct ? candidate : currentBest;
    }, undefined);

    activityRows.push([
      safe(store.id),
      safe(store.storeName),
      safe(store.retailer),
      safe(store.address),
      safe(box.box),
      safe(box.mode),
      safe(box.coreBox),
      safe(box.onAd),
      safe(box.confidencePct) / 100,
      safe(box.support),
      safe(box.window),
      safe(box.activity),
      safe(box.executionDetail),
      safe(box.displayType),
      safe(box.location),
      safe(box.locationGuidance),
      safe(box.packSizeStatus),
      safe(box.packSizesStated),
      safe(box.skuStatus),
      safe(box.skusStated),
      safe(box.verificationScale),
      safe(box.sourcePages),
      safe(box.sourceImage),
      safe(box.sourceFile),
      safe(box.optimizationNote),
      candidates.length,
      best ? best.liftPct / 100 : "",
      best ? best.opportunityUnits : ""
    ]);

    for (const candidate of candidates) {
      candidateRows.push([
        safe(store.id),
        safe(store.storeName),
        safe(store.retailer),
        safe(box.box),
        safe(box.mode),
        safe(box.activity),
        safe(box.window),
        safe(candidate.id),
        safe(candidate.sku),
        safe(candidate.packSize),
        safe(candidate.displayType),
        safe(candidate.location),
        safe(candidate.locationGuidance),
        safe(candidate.facings),
        safe(candidate.predictedCurrent),
        safe(candidate.predictedIdeal),
        safe(candidate.opportunityUnits),
        safe(candidate.liftPct) / 100,
        safe(candidate.rank),
        safe(candidate.matchScore),
        safe(candidate.isTypeValid),
        safe(candidate.sublocTier),
        safe(candidate.sourceFile)
      ]);
    }
  }
}

let gapRows = [];
try {
  const auditRaw = await fs.readFile(path.resolve("outputs/picos_boxes/recommendation_coverage_audit.json"), "utf8");
  const audit = JSON.parse(auditRaw.replace(/^\uFEFF/, ""));
  gapRows = (audit.gaps || [])
    .filter(gap => (gap.missingAnywhere || []).length || (gap.matchedButNotVisible || []).length)
    .map(gap => [
      safe(gap.store),
      safe(gap.box),
      safe(gap.activity),
      safe(gap.packSizesStated),
      (gap.missingAnywhere || []).join("; "),
      (gap.matchedButNotVisible || []).join("; "),
      safe(gap.candidateCount)
    ]);
} catch {
  gapRows = [["Audit file unavailable", "", "", "", "", "", ""]];
}

const workbook = Workbook.create();
const activities = workbook.worksheets.add("Activity Boxes");
const candidates = workbook.worksheets.add("Recommendations");
const gaps = workbook.worksheets.add("Coverage Gaps");

writeSheet(activities, activityHeaders, activityRows);
writeSheet(candidates, candidateHeaders, candidateRows);
writeSheet(gaps, gapHeaders, gapRows);

activities.getRange("I:I").format.numberFormat = "0%";
activities.getRange("AA:AA").format.numberFormat = "0.0%";
candidates.getRange("R:R").format.numberFormat = "0.0%";

activities.tables.add(`A1:AB${activityRows.length + 1}`, true, "ActivityBoxesTable");
candidates.tables.add(`A1:W${candidateRows.length + 1}`, true, "RecommendationsTable");
gaps.tables.add(`A1:G${gapRows.length + 1}`, true, "CoverageGapsTable");

const overview = workbook.worksheets.add("Overview");
overview.getRange("A1:B8").values = [
  ["picOS Parsed Export", ""],
  ["Stores", PICOS_STORES.length],
  ["Activity Boxes", activityRows.length],
  ["Recommendation Candidates", candidateRows.length],
  ["Coverage Gap Rows", gapRows.length],
  ["Primary Data Sheet", "Activity Boxes"],
  ["Recommendation Data Sheet", "Recommendations"],
  ["Gap Audit Sheet", "Coverage Gaps"]
];
overview.getRange("A1:B1").format = {
  fill: "#DC2626",
  font: { bold: true, color: "#FFFFFF" },
};
overview.getRange("A2:A8").format = {
  fill: "#F3F4F6",
  font: { bold: true, color: "#111827" },
};
overview.getRange("A1:B8").format.borders = { preset: "all", style: "thin", color: "#E5E7EB" };
overview.getRange("A1:B8").format.autofitColumns();
overview.showGridLines = false;

const preview = await workbook.render({
  sheetName: "Overview",
  autoCrop: "all",
  scale: 1,
  format: "png"
});
await fs.writeFile(path.join(outputDir, "picos_parsed_activity_recommendations_preview.png"), new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
