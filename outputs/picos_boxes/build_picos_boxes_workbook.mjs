import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/picos_boxes");
const inputJson = path.join(outputDir, "pdf_activity_boxes_extracted.json");
const outputXlsx = path.join(outputDir, "picos_activity_boxes_from_pdf_inputs.xlsx");
const previewPng = path.join(outputDir, "picos_activity_boxes_preview.png");

const rows = JSON.parse(await fs.readFile(inputJson, "utf8"));

const columns = [
  ["customer", "Customer"],
  ["source_file", "Source File"],
  ["box", "Box"],
  ["core_box", "Core Box"],
  ["mode", "Mode"],
  ["activity", "Activity"],
  ["on_ad", "On Ad"],
  ["confidence_pct", "Confidence %"],
  ["support", "Support"],
  ["window", "Active Dates"],
  ["display_type", "Display Type"],
  ["location", "Location"],
  ["location_guidance", "Location Guidance"],
  ["pack_size_status", "Pack Size Status"],
  ["pack_sizes_stated", "Pack Sizes Stated"],
  ["sku_status", "SKU Status"],
  ["skus_stated", "SKUs Stated"],
  ["execution_detail", "Execution Detail"],
  ["verification_scale", "Verification / Scale"],
  ["source_pages", "Source Pages"],
  ["optimization_note", "Optimization Note"],
];

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function a1Col(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRange(`${a1Col(index)}:${a1Col(index)}`).format.columnWidth = width;
  });
}

function styleHeader(range) {
  range.format.fill = { color: "#EAF0FA" };
  range.format.font = { bold: true, color: "#24364F" };
  range.format.wrapText = true;
  range.format.borders = { preset: "all", style: "thin", color: "#D8DEE9" };
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const detail = workbook.worksheets.add("PicOS Boxes");
summary.showGridLines = false;
detail.showGridLines = false;

summary.getRange("A1:E1").merge();
summary.getRange("A1").values = [["picOS Activity Boxes Captured From PDF"]];
summary.getRange("A1").format.font = { bold: true, size: 16, color: "#111827" };

summary.getRange("A3:B8").values = [
  ["Generated Rows", rows.length],
  ["Source PDFs", new Set(rows.map((row) => row.source_file)).size],
  ["Execute Boxes", rows.filter((row) => row.mode === "Execute").length],
  ["Sell Boxes", rows.filter((row) => row.mode === "Sell").length],
  ["Display Type Field", "Cooler / Shipper / Display"],
  ["Location Field", "Aisle / Perimeter / Lobby / Endcap / Cooler / Front End / Checkout / Backroom"],
];
summary.getRange("A3:A8").format.font = { bold: true, color: "#24364F" };
summary.getRange("A3:B8").format.borders = { preset: "all", style: "thin", color: "#D8DEE9" };

const sourceRows = countBy(rows, (row) => row.customer).map(([customer, count]) => [customer, count]);
summary.getRange("D3:E3").values = [["Customer", "Boxes"]];
summary.getRangeByIndexes(3, 3, sourceRows.length, 2).values = sourceRows;
styleHeader(summary.getRange("D3:E3"));
summary.getRangeByIndexes(3, 3, sourceRows.length, 2).format.borders = { preset: "all", style: "thin", color: "#D8DEE9" };

const modeRows = countBy(rows, (row) => row.mode).map(([mode, count]) => [mode, count]);
summary.getRange("G3:H3").values = [["Mode", "Boxes"]];
summary.getRangeByIndexes(3, 6, modeRows.length, 2).values = modeRows;
styleHeader(summary.getRange("G3:H3"));
summary.getRangeByIndexes(3, 6, modeRows.length, 2).format.borders = { preset: "all", style: "thin", color: "#D8DEE9" };

const displayRows = countBy(rows, (row) => row.display_type).map(([displayType, count]) => [displayType, count]);
summary.getRange("J3:K3").values = [["Display Type", "Boxes"]];
summary.getRangeByIndexes(3, 9, displayRows.length, 2).values = displayRows;
styleHeader(summary.getRange("J3:K3"));
summary.getRangeByIndexes(3, 9, displayRows.length, 2).format.borders = { preset: "all", style: "thin", color: "#D8DEE9" };

summary.getRange("A11:K11").merge();
summary.getRange("A11").values = [["Note: this workbook is scoped to the three provided PDF inputs only; prior sample stores were not carried forward. Red PDF boxes are classified as Execute and grey PDF boxes are classified as Sell."]];
summary.getRange("A11").format.wrapText = true;
summary.getRange("A11").format.fill = { color: "#FFF7E6" };
summary.getRange("A11").format.font = { color: "#7C2D12" };

setWidths(summary, [24, 18, 4, 30, 10, 4, 18, 10, 4, 18, 10]);

detail.getRangeByIndexes(0, 0, 1, columns.length).values = [columns.map(([, label]) => label)];
styleHeader(detail.getRangeByIndexes(0, 0, 1, columns.length));

const values = rows.map((row) => columns.map(([key]) => row[key] ?? ""));
detail.getRangeByIndexes(1, 0, values.length, columns.length).values = values;
detail.getRangeByIndexes(1, 0, values.length, columns.length).format.wrapText = true;
detail.getRangeByIndexes(1, 0, values.length, columns.length).format.borders = { preset: "all", style: "thin", color: "#E5E7EB" };
detail.freezePanes.freezeRows(1);
detail.getRangeByIndexes(1, 7, values.length, 1).format.numberFormat = [["0"]];

setWidths(detail, [
  24, 42, 16, 12, 12, 38, 10, 12, 28, 16, 16, 20, 34, 20, 28, 20, 34, 60, 24, 14, 64,
]);

await fs.mkdir(outputDir, { recursive: true });
const file = await SpreadsheetFile.exportXlsx(workbook);
await file.save(outputXlsx);

const preview = await workbook.render({ sheetName: "PicOS Boxes", autoCrop: "all", scale: 0.8, format: "png" });
await fs.writeFile(previewPng, new Uint8Array(await preview.arrayBuffer()));

const inspection = await workbook.inspect({
  kind: "workbook,sheet,region",
  sheetId: "PicOS Boxes",
  range: "A1:U12",
  tableMaxRows: 6,
  tableMaxCols: 8,
  tableMaxCellChars: 80,
  maxChars: 5000,
});

console.log(JSON.stringify({
  outputXlsx,
  previewPng,
  rowCount: rows.length,
  inspection: inspection.toString ? inspection.toString() : inspection,
}, null, 2));
