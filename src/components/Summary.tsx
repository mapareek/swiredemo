import React from "react";
import { FlowType, IMAGES, RemovalSurveyResult, StoreInfo } from "../types";
import { Check, CheckCircle, Clock, TrendingUp, Sparkles, AlertCircle, FileText, Share2, CornerDownRight, Landmark } from "lucide-react";

interface SummaryProps {
  store: StoreInfo;
  flowType: FlowType;
  picosConstraints?: any; // optional constraints for context
  removalSurvey?: RemovalSurveyResult | null;
  onFinish: () => void;
  onCloseVisit: () => void;
}

export default function Summary({ store, flowType, picosConstraints, removalSurvey, onFinish, onCloseVisit }: SummaryProps) {
  // Mock Summary Stats
  const score = 100;
  const lift = flowType === "EXECUTE_PICOS" ? 18 : 24;
  const visitTime = "18 Mins";
  const flowLabel = flowType === "EXECUTE_PICOS"
    ? "PicOS Picture of Success Standard"
    : flowType === "HUNT_SPACE"
      ? "Hunt Space Opportunity"
      : "SKU Optimization Standard";

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="h-6 w-[1px] bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                Step 4 of 4
              </span>
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none">
                Execution Sync Summary
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {store.storeName} • {flowLabel}
            </p>
          </div>
        </div>

        {/* Stepper indicator */}
        {flowType === "EXECUTE_PICOS" ? (
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400">
            <span>1. Setup</span>
            <span className="text-slate-300">-&gt;</span>
            <span>2. After Photo</span>
            <span className="text-slate-300">-&gt;</span>
            <span>3. Removal Survey</span>
            <span className="text-slate-300">-&gt;</span>
            <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">4. Finish</span>
          </div>
        ) : (
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400">
          <span>1. Setup</span>
          <span className="text-slate-300">→</span>
          <span>2. Before Photo</span>
          <span className="text-slate-300">→</span>
          <span>3. After Photo</span>
          <span className="text-slate-300">→</span>
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">4. Finish</span>
        </div>
        )}
      </header>

      {/* Main Grid: Comparison, Metrics & Completed Items */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Verification Alert */}
        <div className="bg-emerald-50 border border-emerald-200 rounded p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 bg-emerald-100 rounded-full p-0.5" />
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">PLANOGRAM COMPLIANCE SECURED</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {flowType === "EXECUTE_PICOS"
                  ? `After capture and removal survey saved for ${store.storeName}. PicOS execution record is ready to sync.`
                  : flowType === "HUNT_SPACE"
                    ? `Hunt capture stamped for ${store.storeName}. Net-new display opportunity is ready to sync.`
                    : `Before and After capture stamped for ${store.storeName}. Verified 100% compliance with selected standards.`
                }
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold uppercase px-2 py-1 rounded font-mono">
            Execution Saved
          </span>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* COMPLIANCE SCORE */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                EXECUTION SCORE
              </span>
              <span className="text-3xl font-black text-emerald-600 tracking-tight font-sans mt-1 block">
                {score}%
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Perfect Gold Standard
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>

          {/* EXPECTED LIFT */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                PROJECTED VELOCITY LIFT
              </span>
              <span className="text-3xl font-black text-red-600 tracking-tight font-sans mt-1 block">
                +{lift}%
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Compared to starting shelf
              </span>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600 border border-red-150">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          {/* TIME ELAPSED */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                EXECUTION TIME
              </span>
              <span className="text-3xl font-bold text-slate-950 tracking-tight font-mono mt-1 block">
                {visitTime}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                SOP average is 25 mins
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-full text-slate-800 border border-slate-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* SIDE BY SIDE CAPTURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before Photo Box */}
          {flowType !== "EXECUTE_PICOS" && (
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-3">
              Before State
            </span>
            <div className="relative aspect-4/3 rounded overflow-hidden border border-slate-150 bg-slate-100">
              <img
                src={IMAGES.beforeThumbnail}
                alt="Before Capture"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 text-white font-mono text-[10px] py-1 px-2.5 rounded-xs uppercase">
                Baseline Snapshot
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 leading-normal">
              <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Severe spacing error. Diet and zero-sugar selections were hidden on lowest shelf layer. Gaps detected in core columns.</span>
            </div>
          </div>
          )}

          {/* After Photo Box */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-3">
              After PicOS Standard
            </span>
            <div className="relative aspect-4/3 rounded overflow-hidden border border-slate-150 bg-slate-100">
              <img
                src={IMAGES.afterThumbnail}
                alt="After Capture"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[10px] py-1 px-2.5 rounded-xs uppercase font-bold">
                Compliant Standard
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 leading-normal">
              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
              <span>Full compliance. Zero-sugar products correctly moved to top shelves. Facings cleaned, faced forward and prices set.</span>
            </div>
          </div>

          {flowType === "EXECUTE_PICOS" && (
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-3">
                Product Removal Survey
              </span>
              <div className="rounded border border-slate-150 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-900">
                  Products removed: {removalSurvey?.removedItems ? "Yes" : "No"}
                </div>
                {removalSurvey?.removedItems ? (
                  <div className="mt-4 space-y-2">
                    {removalSurvey.items.map((item, idx) => (
                      <div key={`${item.product}-${idx}`} className="flex items-center justify-between gap-3 rounded bg-white border border-slate-200 px-3 py-2">
                        <span className="text-xs font-semibold text-slate-800">{item.product}</span>
                        <span className="text-xs font-mono font-bold text-red-600">{item.casesRemoved} cases</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    No products were removed during this PicOS execution.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* METADATA SUMMARY */}
        <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Signed Compliance Log Report
            </span>
            <span className="text-xs text-slate-400 font-mono">STAMP: {store.routeId}-2026-COMPLIANT</span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">Route Account:</span>
                <span className="font-bold text-slate-900">{store.storeName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">Segment Standard:</span>
                <span className="font-bold text-slate-900">{store.segment}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">Retailer Franchise:</span>
                <span className="font-bold text-slate-900">{store.retailer}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">Distributor Branch:</span>
                <span className="font-bold text-slate-900">{store.distributor}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">Manager Approved Contact:</span>
                <span className="font-bold text-slate-900">{store.manager.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-medium font-mono">GPS Verification coordinates:</span>
                <span className="font-bold font-mono text-slate-900">{store.routeId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-4 w-4 text-slate-400" />
            <span>This session log is legally synchronized with your distributor B2B handheld portal.</span>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onCloseVisit}
              className="w-full sm:w-auto border border-slate-350 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors"
            >
              Close Visit Session
            </button>
            <button
              id="finish-audit-sync"
              onClick={onFinish}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-8 rounded text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-xs"
            >
              Complete & Return to Action Hub
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

