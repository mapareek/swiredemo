import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { ExecutionCheckResult, PicOSConstraints, StoreInfo } from "../types";
import { directivesForStore } from "./ExecutePicOS";

interface MerchandiserExportProps {
  store: StoreInfo;
  picosConstraints: PicOSConstraints | null;
  executionCheck: ExecutionCheckResult | null;
  onBack: () => void;
  onContinue: () => void;
}

function planogramShelves(items: { sku: string; facings: number }[]) {
  const shelfSizes = [2, 3, 1, 2, 1, 1];
  let cursor = 0;
  const shelves = shelfSizes
    .map((size, index) => {
      const shelfItems = items.slice(cursor, cursor + size);
      cursor += size;
      return { label: `Shelf ${index + 1}`, items: shelfItems };
    })
    .filter(shelf => shelf.items.length > 0);

  if (shelves.length) return shelves;
  return [{ label: "Recommended Facings", items }];
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteAssetUrl(path: string) {
  return new URL(path, window.location.origin).href;
}

export default function MerchandiserExport({
  store,
  picosConstraints,
  executionCheck,
  onBack,
  onContinue
}: MerchandiserExportProps) {
  const directive = useMemo(() => {
    const directives = directivesForStore(store);
    return directives.find(item => item.id === picosConstraints?.directiveId) || directives[0];
  }, [picosConstraints?.directiveId, store]);

  const buildItems = directive.planogramItems?.length
    ? directive.planogramItems
    : (picosConstraints?.items || []).map(item => ({ sku: item.sku, facings: item.targetFacings }));
  const shelves = planogramShelves(buildItems);
  const totalFacings = buildItems.reduce((sum, item) => sum + item.facings, 0);
  const notExecutedReason = executionCheck?.reason === "Other"
    ? executionCheck.otherReason
    : executionCheck?.reason;
  const recommendationVisual = directive.planogramImage || directive.recommendationImage || directive.sourceImage;
  const [imageStatus, setImageStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    setImageStatus(recommendationVisual ? "loading" : "idle");
  }, [recommendationVisual]);

  const handleDownloadPdf = () => {
    if (imageStatus === "loading") return;
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;

    const imageUrl = recommendationVisual ? absoluteAssetUrl(recommendationVisual) : "";
    const shelvesHtml = shelves.map(shelf => `
      <section class="shelf">
        <div class="shelf-title">${escapeHtml(shelf.label)}</div>
        ${shelf.items.map(item => `
          <div class="build-row">
            <span>${escapeHtml(item.sku)}</span>
            <strong>${escapeHtml(item.facings)}</strong>
          </div>
        `).join("")}
      </section>
    `).join("");
    const additionalItemsHtml = directive.additionalItems?.length ? `
      <section class="additional">
        <h3>Additional SKUs to Add</h3>
        ${directive.additionalItems.map(item => `
          <div class="additional-row">
            <span>${escapeHtml(item.sku)}</span>
            <strong>${escapeHtml(item.facings)} facings</strong>
          </div>
        `).join("")}
      </section>
    ` : "";

    pdfWindow.document.open();
    pdfWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(directive.name)} - Merchandiser Handoff</title>
          <style>
            @page { margin: 0.35in; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 100%;
              max-width: 1040px;
              margin: 24px auto;
              background: white;
              border: 1px solid #dbe3ef;
              border-radius: 10px;
              overflow: hidden;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 24px;
              border-bottom: 1px solid #e2e8f0;
            }
            .eyebrow {
              color: #dc0024;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            h1 {
              margin: 12px 0 6px;
              font-size: 22px;
              line-height: 1.2;
            }
            .store, .details, .meta {
              color: #475569;
              font-size: 13px;
              line-height: 1.45;
            }
            .meta {
              min-width: 180px;
              text-align: right;
            }
            .meta strong {
              display: block;
              color: #0f172a;
              margin-bottom: 3px;
            }
            main {
              padding: 24px;
            }
            .content {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 270px;
              gap: 18px;
              margin-top: 20px;
              align-items: start;
            }
            .visual {
              min-height: 400px;
              border: 1px solid #dbe3ef;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 18px;
              background: white;
            }
            .visual img {
              max-width: 100%;
              max-height: 380px;
              object-fit: contain;
            }
            .fallback {
              color: #64748b;
              font-size: 13px;
              text-align: center;
            }
            aside {
              border: 1px solid #dbe3ef;
              border-radius: 10px;
              background: white;
              padding: 16px;
            }
            .build-head {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: #64748b;
            }
            .build-head strong {
              color: #0f172a;
            }
            .shelf {
              padding: 14px 0;
              border-bottom: 1px solid #eef2f7;
            }
            .shelf:last-child {
              border-bottom: 0;
            }
            .shelf-title {
              margin-bottom: 8px;
              color: #94a3b8;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            .build-row, .additional-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-top: 7px;
              font-size: 12px;
              line-height: 1.25;
            }
            .build-row span, .additional-row span {
              font-weight: 700;
            }
            .additional {
              margin-top: 18px;
              border: 1px solid #dbe3ef;
              border-radius: 10px;
              overflow: hidden;
            }
            .additional h3 {
              margin: 0;
              padding: 13px 16px;
              border-bottom: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 11px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }
            .additional-row {
              margin: 0;
              padding: 12px 16px;
              border-bottom: 1px solid #eef2f7;
            }
            .additional-row:last-child {
              border-bottom: 0;
            }
            @media print {
              body { background: white; }
              .page { margin: 0; border: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <article class="page">
            <header>
              <div>
                <div class="eyebrow">Merchandiser Visit Needed</div>
                <h1>${escapeHtml(directive.name)}</h1>
                <div class="store">${escapeHtml(store.storeName)} - ${escapeHtml(store.address)}</div>
              </div>
              <div class="meta">
                <strong>Reason</strong>
                <div>${escapeHtml(notExecutedReason || "Merchandiser visit needed")}</div>
                <strong style="margin-top:12px;">Timing</strong>
                <div>${escapeHtml(directive.timing)}</div>
              </div>
            </header>
            <main>
              <p class="details">${escapeHtml(directive.details)}</p>
              <div class="content">
                <div class="visual">
                  ${imageUrl ? `<img class="recommendation-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(directive.name)} recommendation" />` : `<div class="fallback">Recommendation image unavailable. Use the build list for execution.</div>`}
                </div>
                <aside>
                  <div class="build-head">
                    <span>Build List</span>
                    <strong>${escapeHtml(totalFacings)} facings</strong>
                  </div>
                  ${shelvesHtml}
                </aside>
              </div>
              ${additionalItemsHtml}
            </main>
          </article>
          <script>
            const printReady = () => setTimeout(() => {
              window.focus();
              window.print();
            }, 250);
            const image = document.querySelector(".recommendation-image");
            if (image && !image.complete) {
              image.addEventListener("load", printReady, { once: true });
              image.addEventListener("error", printReady, { once: true });
            } else {
              printReady();
            }
          </script>
        </body>
      </html>`);
    pdfWindow.document.close();
  };

  return (
    <div className="h-full bg-slate-100 overflow-y-auto">
      <div className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-bold text-slate-950 text-base">Merchandiser PDF Handoff</h1>
            <p className="text-xs text-slate-500">Download this recommendation view and send it to the merchandiser.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={imageStatus === "loading"}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-wait text-white font-semibold py-2.5 px-5 rounded text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {imageStatus === "loading" ? "Loading Image" : "Download PDF"}
          </button>
          <button
            onClick={onContinue}
            className="border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold py-2.5 px-5 rounded text-xs uppercase tracking-wider cursor-pointer"
          >
            Return to Activities
          </button>
        </div>
      </div>

      <main className="print-page max-w-5xl mx-auto my-6 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <header className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-red-600 font-semibold text-xs uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              Merchandiser Visit Needed
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-950">{directive.name}</h2>
            <p className="text-sm text-slate-600 mt-1">{store.storeName} · {store.address}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-950">Reason</div>
            <div>{notExecutedReason || "Merchandiser visit needed"}</div>
            <div className="mt-2 font-semibold text-slate-950">Timing</div>
            <div>{directive.timing}</div>
          </div>
        </header>

        <section className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">{directive.details}</p>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
            <div className="rounded-lg border border-slate-200 min-h-[390px] flex items-center justify-center p-4 bg-white">
              {recommendationVisual && imageStatus !== "error" ? (
                <img
                  src={recommendationVisual}
                  alt={`${directive.name} recommendation`}
                  className="w-full max-w-[560px] max-h-[360px] object-contain"
                  onLoad={() => setImageStatus("ready")}
                  onError={() => setImageStatus("error")}
                />
              ) : (
                <div className="text-center text-slate-500 text-sm">
                  Recommendation image unavailable. Use the build list for execution.
                </div>
              )}
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Build List</h3>
                <span className="text-xs font-bold text-slate-950">{totalFacings} facings</span>
              </div>
              <div className="divide-y divide-slate-100">
                {shelves.map(shelf => (
                  <div key={shelf.label} className="py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{shelf.label}</div>
                    <div className="space-y-1.5">
                      {shelf.items.map(item => (
                        <div key={`${shelf.label}-${item.sku}`} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-slate-800 leading-tight">{item.sku}</span>
                          <span className="font-bold text-slate-950 shrink-0">{item.facings}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {!!directive.additionalItems?.length && (
            <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional SKUs to Add</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {directive.additionalItems.map(item => (
                  <div key={item.sku} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="font-semibold text-xs text-slate-950">{item.sku}</div>
                    <div className="text-xs text-slate-500 shrink-0">{item.facings} facings</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
