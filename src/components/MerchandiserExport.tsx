import React, { useMemo } from "react";
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

  const handleDownloadPdf = () => {
    window.print();
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
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2.5 px-5 rounded text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={onContinue}
            className="border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold py-2.5 px-5 rounded text-xs uppercase tracking-wider cursor-pointer"
          >
            Continue to Summary
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
              {directive.planogramImage ? (
                <img
                  src={directive.planogramImage}
                  alt={`${directive.name} recommendation`}
                  className="w-full max-w-[560px] max-h-[360px] object-contain"
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
