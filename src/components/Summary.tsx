import { FlowLiftMetrics, FlowType, IMAGES, OptimizeConstraints, PicOSConstraints, RemovalSurveyResult, StoreInfo } from "../types";
import { getStoreSignalOptimizeRecommendation } from "../utils/storeSignalEngine";
import { Check, CheckCircle, TrendingUp } from "lucide-react";

interface SummaryProps {
  store: StoreInfo;
  flowType: FlowType;
  picosConstraints?: PicOSConstraints | null;
  optimizeConstraints?: OptimizeConstraints | null;
  flowLiftMetrics?: FlowLiftMetrics | null;
  removalSurvey?: RemovalSurveyResult | null;
  onFinish: () => void;
  onCloseVisit: () => void;
}

function planLiftMetrics(picosConstraints?: PicOSConstraints | null) {
  const items = picosConstraints?.items || [];
  if (!items.length) {
    return {
      liftPct: 0,
      opportunityUnits: 0
    };
  }

  const opportunityUnits = items.reduce((sum, item) => sum + (item.opportunityUnits || 0), 0);
  const baselineUnits = items.reduce((sum, item) => {
    if (item.baselineUnits !== undefined) return sum + item.baselineUnits;
    if (item.opportunityUnits !== undefined && item.liftPct && item.liftPct > 0) {
      return sum + (item.opportunityUnits / (item.liftPct / 100));
    }
    return sum;
  }, 0);

  return {
    liftPct: baselineUnits > 0 ? Math.round((opportunityUnits / baselineUnits) * 100) : 0,
    opportunityUnits: parseFloat(opportunityUnits.toFixed(1))
  };
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function signedUnits(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} units`;
}

function optimizeLiftMetrics(store: StoreInfo, optimizeConstraints?: OptimizeConstraints | null) {
  if (!optimizeConstraints) return { liftPct: 0, opportunityUnits: 0 };
  const result = getStoreSignalOptimizeRecommendation(store, optimizeConstraints, optimizeConstraints.currentProducts);
  return {
    liftPct: result.liftPercent,
    opportunityUnits: result.skus.reduce((sum, sku) => sum + sku.salesDelta, 0)
  };
}

export default function Summary({
  store,
  flowType,
  picosConstraints,
  optimizeConstraints,
  flowLiftMetrics,
  removalSurvey,
  onFinish,
  onCloseVisit
}: SummaryProps) {
  const executionLift = planLiftMetrics(picosConstraints);
  const optimizeLift = optimizeLiftMetrics(store, optimizeConstraints);
  const summaryLift = flowType === "EXECUTE_PICOS"
    ? executionLift
    : flowType === "HUNT_SPACE"
      ? {
        liftPct: flowLiftMetrics?.liftPct || 0,
        opportunityUnits: flowLiftMetrics?.opportunityUnits || 0
      }
      : optimizeLift;
  const lift = summaryLift.liftPct;
  const liftUnits = summaryLift.opportunityUnits;
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
        
        <div className="bg-emerald-50 border border-emerald-200 rounded p-5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Check className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5 bg-emerald-100 rounded-full p-1" />
            <div>
              <h3 className="font-bold text-emerald-900 text-base">Execution Saved and Confirmed</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 max-w-xl">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                Projected Sales / Velocity Lift
              </span>
              <span className="text-xs text-slate-700 mt-2 block font-bold">
                Compared against no activation for this store and July projection period.
              </span>
              {lift > 0 && liftUnits !== undefined ? (
                <span className="inline-flex mt-3 border rounded px-3 py-2 text-sm font-bold uppercase font-mono bg-emerald-50 text-emerald-700 border-emerald-100">
                  {signedPercent(lift)} lift / {signedUnits(liftUnits)}
                </span>
              ) : lift > 0 ? (
                <span className="text-3xl font-black text-red-600 tracking-tight font-sans mt-1 block">
                  {signedPercent(lift)}
                </span>
              ) : null}
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600 border border-red-150">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-4 shrink-0">
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

