import React, { useState } from "react";
import { StoreInfo } from "../types";
import { PICOS_STORES } from "../data/picosStores";
import { MapPin, Search, Filter, Landmark } from "lucide-react";

interface StoreSelectorProps {
  selectedStore: StoreInfo;
  onStartVisit: (store: StoreInfo) => void;
}

export default function StoreSelector({ selectedStore, onStartVisit }: StoreSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStoreId, setActiveStoreId] = useState(selectedStore.id);

  const activeStore = PICOS_STORES.find(store => store.id === activeStoreId) || PICOS_STORES[0];
  const filteredStores = PICOS_STORES.filter(store => {
    const haystack = `${store.storeName} ${store.retailer} ${store.routeId}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-white font-black tracking-tighter text-sm">
            KO
          </div>
          <div>
            <h1 className="font-sans font-bold text-slate-900 tracking-tight text-lg">picOS Store Assist</h1>
          </div>
        </div>
      </header>

      {/* Main Container - Left list, Right map details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Store Search & Selection */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Store Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by store name, ID or route..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center justify-end">
              <button className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredStores.map(store => {
              const isActive = store.id === activeStore.id;
              const storeExecuteCount = store.picosBoxes.filter(box => box.mode === "Execute").length;
              const storeSellCount = store.picosBoxes.filter(box => box.mode === "Sell").length;

              return (
                <button
                  key={store.id}
                  onClick={() => setActiveStoreId(store.id)}
                  className={`w-full p-3 rounded cursor-pointer transition-all text-left border ${
                    isActive
                      ? "bg-red-50/60 border-red-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <h3 className="font-bold text-slate-950 text-sm">{store.storeName}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{store.retailer}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-slate-500 font-mono">
                    <span>{store.picosBoxes.length} Activities</span>
                    <span>{storeExecuteCount} Execute</span>
                    <span>{storeSellCount} Sell</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Map & Operational Store Profile */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Store Information Card */}
            <div className="space-y-4 max-w-3xl">
              <div className="bg-white border border-slate-200 rounded p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="h-4 w-4 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Route Account Details</span>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-950 tracking-tight">{activeStore.storeName}</h2>
                <p className="text-sm font-semibold text-slate-700 mt-1">{activeStore.retailer}</p>
                <div className="text-xs text-slate-500 mt-1 font-mono">{activeStore.segment}</div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-start gap-2.5 text-sm text-slate-800">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Store Address</p>
                      <p className="text-xs text-slate-600 mt-0.5">{activeStore.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-sm text-slate-800 pt-1">
                    <div className="w-4 h-4 text-slate-400 font-mono text-xs font-bold leading-none mt-0.5">@</div>
                    <div>
                      <p className="font-medium">Bottler</p>
                      <p className="text-xs text-slate-600 mt-0.5">Swire</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              id="start-visit-btn"
              onClick={() => onStartVisit(activeStore)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-8 rounded shadow-xs text-sm transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider font-mono"
            >
              Start Visit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
