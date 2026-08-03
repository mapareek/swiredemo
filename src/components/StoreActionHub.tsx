import React from "react";
import { Screen, StoreInfo } from "../types";
import { ArrowLeft, CheckSquare, Compass, LogOut, SlidersHorizontal, UserRound } from "lucide-react";

interface StoreActionHubProps {
  store: StoreInfo;
  onBackToSelector: () => void;
  onNavigate: (screen: Screen) => void;
  onCloseVisit: () => void;
}

export default function StoreActionHub({ store, onBackToSelector, onNavigate, onCloseVisit }: StoreActionHubProps) {
  const executeCount = store.picosBoxes.filter(box => box.mode === "Execute").length;
  const sellCount = store.picosBoxes.filter(box => box.mode === "Sell").length;
  const activityCount = store.picosBoxes.length;
  const opportunityCount = store.picosBoxes.reduce((sum, box) => sum + (box.optimizationCandidates?.length || 0), 0);
  const managerLabel = store.manager.name && store.manager.name !== "Store Manager"
    ? `${store.manager.name} · Store Manager`
    : "Store Manager";

  return (
    <div className="h-full bg-slate-50 p-4 md:p-6">
      <div className="h-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
        <header className="h-14 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white font-black tracking-tighter text-[10px] shrink-0">
              KO
            </div>
            <button
              onClick={onBackToSelector}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-black text-slate-950 tracking-tight text-sm leading-none truncate">
                  {store.storeName}
                </h1>
                <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider shrink-0">
                  {store.segment}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {store.address} <span className="mx-1">·</span> {managerLabel}
              </p>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <UserRound className="h-3.5 w-3.5" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <h2 className="font-bold text-slate-950 text-base mb-4">What would you like to do?</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="bg-white border border-slate-200 rounded-lg p-5 min-h-[176px] flex flex-col shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-5">
                <CheckSquare className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-slate-950 text-base">Execute New PicOS Activities</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md">
                All of this store's activities in one place, each with a display plan built for this store.
              </p>
              <div className="mt-auto pt-5">
                <div className="text-xs text-slate-600 mb-3">
                  {activityCount} activities: {executeCount} execute / {sellCount} sell
                </div>
                <button
                  id="picos-wf-btn"
                  onClick={() => onNavigate(Screen.EXECUTE_PICOS)}
                  className="w-full bg-slate-950 hover:bg-black active:bg-black text-white font-semibold py-2.5 px-4 rounded text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Start
                </button>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-5 min-h-[176px] flex flex-col shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-5">
                <Compass className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-slate-950 text-base">Get Guidance for Hunts</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md">
                Browse ranked spots in this store where a new display could drive more sales.
              </p>
              <div className="mt-auto pt-5">
                <div className="text-xs text-slate-600 mb-3">
                  {opportunityCount} opportunities found
                </div>
                <button
                  id="hunt-wf-btn"
                  onClick={() => onNavigate(Screen.HUNT_WORKFLOW)}
                  className="w-full bg-slate-950 hover:bg-black active:bg-black text-white font-semibold py-2.5 px-4 rounded text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Start
                </button>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-5 min-h-[176px] flex flex-col shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-5">
                <SlidersHorizontal className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-slate-950 text-base">Optimize Display</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md">
                Select an existing display by location and type, then verify the top packs that should be present.
              </p>
              <div className="mt-auto pt-5">
                <div className="text-xs text-slate-600 mb-3">
                  {opportunityCount} pack signals available
                </div>
                <button
                  id="optimize-display-btn"
                  onClick={() => onNavigate(Screen.OPTIMIZE_DISPLAY)}
                  className="w-full bg-slate-950 hover:bg-black active:bg-black text-white font-semibold py-2.5 px-4 rounded text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Start
                </button>
              </div>
            </section>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
            <button
              onClick={onCloseVisit}
              className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold py-2 px-4 rounded text-xs transition-all uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> End Visit
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
