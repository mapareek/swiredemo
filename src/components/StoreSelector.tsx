import React, { useState } from "react";
import { StoreInfo } from "../types";
import { PICOS_STORES } from "../data/picosStores";
import { Search, Filter, Users } from "lucide-react";

interface StoreSelectorProps {
  selectedStore: StoreInfo;
  onStartVisit: (store: StoreInfo) => void;
}

function MixBar({ label, value, color = "bg-red-600" }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 truncate">{label}</span>
        <span className="font-semibold text-slate-900 shrink-0">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded bg-slate-200 overflow-hidden">
        <div className={`h-full rounded ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function MixChart({
  title,
  rows
}: {
  title: string;
  rows: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2">
        {rows.map(row => (
          <React.Fragment key={row.label}>
            <MixBar label={row.label} value={row.value} color={row.color} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function StoreSelector({ selectedStore, onStartVisit }: StoreSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStoreId, setActiveStoreId] = useState(selectedStore.id);

  const activeStore = PICOS_STORES.find(store => store.id === activeStoreId) || PICOS_STORES[0];
  const filteredStores = PICOS_STORES.filter(store => {
    const haystack = `${store.storeName} ${store.retailer} ${store.routeId}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });
  const executeCount = activeStore.picosBoxes.filter(box => box.mode === "Execute").length;
  const sellCount = activeStore.picosBoxes.filter(box => box.mode === "Sell").length;

  return (
    <div className="h-full bg-slate-100 p-3 md:p-5 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col">
        <header className="h-11 border-b border-slate-200 px-4 flex items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white font-black tracking-tighter text-[10px]">
              KO
            </div>
            <h1 className="font-bold text-slate-900 text-sm">picOS Store Assist</h1>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-4 pb-2 flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by store name, ID or route..."
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex items-center justify-end">
              <button className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-1 space-y-2">
            {filteredStores.map(store => {
              const isActive = store.id === activeStore.id;

              return (
                <button
                  key={store.id}
                  onClick={() => setActiveStoreId(store.id)}
                  className={`w-full px-3 py-3 rounded-md cursor-pointer transition-all text-left border ${
                    isActive
                      ? "bg-red-50/50 border-red-500"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <h3 className="font-semibold text-slate-950 text-xs">{store.storeName}</h3>
                  <p className="text-xs text-slate-600 mt-1">{store.picosBoxes.length} Activities</p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-6 overflow-hidden flex flex-col min-h-0">
          <div className="max-w-5xl shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950 leading-tight">{activeStore.storeName}</h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {activeStore.segment}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{activeStore.address}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 max-w-lg rounded-md border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5">
                <div className="text-xl font-bold text-slate-950 leading-none">{activeStore.picosBoxes.length}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">Activities</div>
              </div>
              <div className="px-4 py-2.5 border-l border-slate-200">
                <div className="text-xl font-bold text-slate-950 leading-none">{executeCount}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">Execute</div>
              </div>
              <div className="px-4 py-2.5 border-l border-slate-200">
                <div className="text-xl font-bold text-slate-950 leading-none">{sellCount}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">Sell</div>
              </div>
            </div>

            {activeStore.demographics && (
              <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2 text-slate-800">
                  <Users className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-950">Trade Area Demographics</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Zip {activeStore.demographics.zip} - {activeStore.demographics.segment}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <MixChart
                    title="Age Mix"
                    rows={[
                      { label: "18-34", value: activeStore.demographics.ageMix["18-34"], color: "bg-red-600" },
                      { label: "35-54", value: activeStore.demographics.ageMix["35-54"], color: "bg-red-500" },
                      { label: "55-64", value: activeStore.demographics.ageMix["55-64"], color: "bg-slate-500" },
                      { label: "65+", value: activeStore.demographics.ageMix["65+"], color: "bg-slate-500" }
                    ]}
                  />

                  <MixChart
                    title="Income Mix"
                    rows={[
                      { label: "Middle", value: activeStore.demographics.incomeMix.Middle, color: "bg-red-600" },
                      { label: "Low", value: activeStore.demographics.incomeMix.Low, color: "bg-slate-500" },
                      { label: "High", value: activeStore.demographics.incomeMix.High, color: "bg-slate-500" }
                    ]}
                  />

                  <MixChart
                    title="Ethnicity Mix"
                    rows={[
                      { label: "Hispanic", value: activeStore.demographics.ethnicityMix.Hispanic, color: "bg-red-600" },
                      { label: "White", value: activeStore.demographics.ethnicityMix.White, color: "bg-slate-500" },
                      { label: "Black", value: activeStore.demographics.ethnicityMix.Black, color: "bg-slate-500" }
                    ]}
                  />
                </div>
              </section>
            )}
          </div>

          <div className="flex-1 min-h-3"></div>
          <div className="flex items-center justify-end pt-4 shrink-0">
            <button
              id="start-visit-btn"
              onClick={() => onStartVisit(activeStore)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-8 rounded-md shadow-xs text-xs transition-all cursor-pointer uppercase tracking-wider"
            >
              Start Visit
            </button>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
