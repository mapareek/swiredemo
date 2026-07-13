import React from "react";
import { Screen, StoreInfo } from "../types";
import { ArrowLeft, Compass, CheckSquare, Zap, LogOut } from "lucide-react";

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

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToSelector}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none">
                {store.storeName}
              </h1>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                {store.segment}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {store.address} • {store.retailer}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{store.manager.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">AUTHORIZED CONTACT</p>
          </div>
          <img
            src={store.manager.avatar}
            alt="Store Manager"
            className="w-9 h-9 rounded-full border border-slate-200 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Primary Operational Workflows Header */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">
            Primary Store Workflows
          </h2>
          
          {/* Workflows Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* EXECUTE PICOS CARD */}
            <div className="bg-white border border-slate-200 rounded flex flex-col justify-between hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group">
              <div className="p-5">
                <div className="w-10 h-10 rounded bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950 text-base">1. Execute New PicOS Activities</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Capture the store surface and turn the recommended activity into an execution plan.
                </p>
                <div className="text-[10px] text-slate-500 font-mono mt-3">{activityCount} total activities: {executeCount} execute / {sellCount} sell</div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b">
                <button
                  id="picos-wf-btn"
                  onClick={() => onNavigate(Screen.EXECUTE_PICOS)}
                  className="w-full bg-slate-900 hover:bg-slate-950 active:bg-black text-white font-semibold py-2 px-4 rounded text-xs transition-all uppercase tracking-wider font-mono cursor-pointer"
                >
                  Execute PicOS Audit
                </button>
              </div>
            </div>

            {/* OPTIMIZE EXISTING CARD */}
            <div className="bg-white border border-slate-200 rounded flex flex-col justify-between hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group">
              <div className="p-5">
                <div className="w-10 h-10 rounded bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950 text-base">2. Optimize Existing Display</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Scan what is already on shelf and rebalance facings against local demand.
                </p>
                <div className="text-[10px] text-slate-500 font-mono mt-3">{sellCount} sell activities available</div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b">
                <button
                  id="opt-wf-btn"
                  onClick={() => onNavigate(Screen.OPTIMIZE_DISPLAY)}
                  className="w-full bg-slate-900 hover:bg-slate-950 active:bg-black text-white font-semibold py-2 px-4 rounded text-xs transition-all uppercase tracking-wider font-mono cursor-pointer"
                >
                  Re-Optimize SKU Mix
                </button>
              </div>
            </div>

            {/* HUNT WORKFLOW CARD */}
            <div className="bg-white border border-slate-200 rounded flex flex-col justify-between hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group">
              <div className="p-5">
                <div className="w-10 h-10 rounded bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950 text-base">3. Get Guidance for Hunts</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Use store signals to decide what to inspect next and where to look first.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b">
                <button
                  id="hunt-wf-btn"
                  onClick={() => onNavigate(Screen.HUNT_WORKFLOW)}
                  className="w-full bg-slate-900 hover:bg-slate-950 active:bg-black text-white font-semibold py-2 px-4 rounded text-xs transition-all uppercase tracking-wider font-mono cursor-pointer"
                >
                  Start Hunt Space Workflow
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Close Visit Button */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onCloseVisit}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium py-2 px-5 rounded text-xs transition-all uppercase tracking-wider font-mono cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Close Visit Session
          </button>
        </div>

      </div>
    </div>
  );
}


