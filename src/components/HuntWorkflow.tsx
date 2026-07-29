import React, { useMemo, useState } from "react";
import { FlowLiftMetrics, FlowType, Screen, IMAGES, PicOSOptimizationCandidate, StoreInfo } from "../types";
import { ArrowLeft, ArrowRight, Check, Filter } from "lucide-react";

interface HuntWorkflowProps {
  store: StoreInfo;
  huntOutcomes?: Record<string, string>;
  onBackToHub: () => void;
  onSelectAction: (nextScreen: Screen, flowType: FlowType, metrics?: FlowLiftMetrics, opportunityId?: string) => void;
}

type CandidateWithBox = PicOSOptimizationCandidate & {
  sourceMode: "Execute" | "Sell";
};

type HuntOpportunity = {
  id: string;
  location: string;
  displayType: string;
  coveredByPicos: boolean;
  bestLiftPct: number;
  averageLiftPct: number;
  totalUnits: number;
  products: CandidateWithBox[];
};

type StatusFilter = "All" | "To do" | "Executed" | "Covered";

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function PositiveLift({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value <= 0) return null;
  return <>{signedPercent(value)}{suffix}</>;
}

function formatOutcomeTimestamp(value: string) {
  const recordedAt = new Date(value);
  if (Number.isNaN(recordedAt.getTime())) return "";

  const now = new Date();
  const isToday = recordedAt.toDateString() === now.toDateString();
  const dateLabel = isToday
    ? "today"
    : recordedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = recordedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return `${dateLabel}, ${timeLabel}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function locationKey(value: string) {
  const source = normalize(value);
  if (source.includes("lobby")) return "lobby";
  if (source.includes("aisle")) return "aisle";
  if (source.includes("endcap") || source.includes("end cap")) return "endcap";
  if (source.includes("cooler") || source.includes("cold vault")) return "cooler";
  if (source.includes("checkout") || source.includes("register")) return "checkout";
  return source.split(" ")[0] || "store";
}

function dedupeProducts(candidates: CandidateWithBox[]) {
  const seen = new Set<string>();
  const result: CandidateWithBox[] = [];
  candidates.forEach(candidate => {
    const key = normalize(`${candidate.sku} ${candidate.packSize}`);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(candidate);
  });
  return result;
}

function getHuntOpportunities(store: StoreInfo): HuntOpportunity[] {
  const coveredKeys = new Set(
    store.picosBoxes
      .filter(box => box.mode === "Execute")
      .map(box => locationKey(`${box.location} ${box.locationGuidance}`))
  );

  const groups = new Map<string, CandidateWithBox[]>();
  store.picosBoxes.forEach(box => {
    (box.optimizationCandidates || []).forEach(candidate => {
      const location = candidate.locationGuidance || candidate.location || "Store";
      const displayType = candidate.displayType || "Display";
      const key = `${displayType}|${location}`;
      const row: CandidateWithBox = { ...candidate, sourceMode: box.mode };
      groups.set(key, [...(groups.get(key) || []), row]);
    });
  });

  return [...groups.entries()]
    .map(([key, candidates]) => {
      const [displayType, location] = key.split("|");
      const products = dedupeProducts(
        [...candidates].sort((a, b) =>
          b.opportunityUnits - a.opportunityUnits ||
          b.liftPct - a.liftPct ||
          b.facings - a.facings
        )
      ).slice(0, 4);
      const totalUnits = products.reduce((sum, product) => sum + product.opportunityUnits, 0);
      const averageLiftPct = products.length
        ? Math.round(products.reduce((sum, product) => sum + product.liftPct, 0) / products.length)
        : 0;
      return {
        id: key,
        location,
        displayType,
        coveredByPicos: coveredKeys.has(locationKey(location)),
        bestLiftPct: Math.round(products[0]?.liftPct || 0),
        averageLiftPct,
        totalUnits,
        products
      };
    })
    .filter(opportunity => opportunity.products.length > 0)
    .sort((a, b) =>
      Number(a.coveredByPicos) - Number(b.coveredByPicos) ||
      b.totalUnits - a.totalUnits ||
      b.bestLiftPct - a.bestLiftPct
    );
}

export default function HuntWorkflow({ store, huntOutcomes = {}, onBackToHub, onSelectAction }: HuntWorkflowProps) {
  const [locationFilter, setLocationFilter] = useState("All");
  const [displayTypeFilter, setDisplayTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"lift" | "units">("units");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const opportunities = useMemo(() => getHuntOpportunities(store), [store]);

  const locations = useMemo(
    () => ["All", ...Array.from(new Set(opportunities.map(opportunity => opportunity.location))).sort()],
    [opportunities]
  );

  const displayTypes = useMemo(
    () => ["All", ...Array.from(new Set(opportunities.map(opportunity => opportunity.displayType))).sort()],
    [opportunities]
  );

  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter(opportunity => locationFilter === "All" || opportunity.location === locationFilter)
      .filter(opportunity => displayTypeFilter === "All" || opportunity.displayType === displayTypeFilter)
      .filter(opportunity => {
        const isExecuted = Boolean(huntOutcomes[opportunity.id]);
        if (statusFilter === "To do") return !isExecuted && !opportunity.coveredByPicos;
        if (statusFilter === "Executed") return isExecuted;
        if (statusFilter === "Covered") return opportunity.coveredByPicos;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "units") {
          return b.totalUnits - a.totalUnits || b.bestLiftPct - a.bestLiftPct;
        }
        return b.bestLiftPct - a.bestLiftPct || b.totalUnits - a.totalUnits;
      });
  }, [displayTypeFilter, huntOutcomes, locationFilter, opportunities, sortBy, statusFilter]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBackToHub}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-200 shrink-0"></div>
          <div className="min-w-0">
            <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none truncate">
              Get Guidance for Hunts
            </h1>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {store.storeName} - Ranked spots for net-new displays
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <section className="bg-white border border-slate-200 rounded shadow-xs p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-4">
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_160px] gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Location</span>
                <select
                  value={locationFilter}
                  onChange={event => setLocationFilter(event.target.value)}
                  className="w-full h-11 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Display Type</span>
                <select
                  value={displayTypeFilter}
                  onChange={event => setDisplayTypeFilter(event.target.value)}
                  className="w-full h-11 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  {displayTypes.map(displayType => (
                    <option key={displayType} value={displayType}>{displayType}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sort</span>
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value as "lift" | "units")}
                  className="w-full h-11 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  <option value="units">Most units</option>
                  <option value="lift">Highest lift</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</span>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as StatusFilter)}
                  className="w-full h-11 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                >
                  <option value="All">All</option>
                  <option value="To do">To do</option>
                  <option value="Executed">Executed</option>
                  <option value="Covered">Covered</option>
                </select>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Opportunities for this store, ranked by {sortBy === "units" ? "unit opportunity" : "lift"}
              <span className="ml-4 text-slate-400">{filteredOpportunities.length} of {opportunities.length}</span>
            </h2>
            <span className="text-xs text-slate-500">
              Estimated July sales lift vs. no display
            </span>
          </div>

          {filteredOpportunities.length === 0 ? (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-8 text-center">
              <h3 className="font-bold text-slate-950">No hunt opportunities match these filters.</h3>
              <p className="text-sm text-slate-500 mt-2">Try showing PicOS-covered locations or clearing the location/display type filter.</p>
            </section>
          ) : (
            <div className="space-y-3">
              {filteredOpportunities.map((opportunity, index) => {
                const confirmedAt = huntOutcomes[opportunity.id];
                const isConfirmed = Boolean(confirmedAt);
                return (
                <section key={opportunity.id} className={`border rounded shadow-xs overflow-hidden transition-colors ${
                  isConfirmed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"
                }`}>
                  <div className={`p-4 ${isConfirmed ? "opacity-75" : ""}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_190px] gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 rounded px-2 py-1 text-[11px] font-bold font-mono">
                          #{index + 1}
                          </span>
                          <h3 className="text-lg font-black text-slate-950 leading-tight">
                            {opportunity.displayType} at {opportunity.location}
                          </h3>
                          {opportunity.coveredByPicos && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                              Covered by existing activity
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Top unit opportunity</span>
                        <div className="text-2xl font-black text-emerald-700 font-mono leading-tight">+{Math.round(opportunity.products[0]?.opportunityUnits || 0)} units</div>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">{opportunity.products[0]?.sku}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      {opportunity.products.map(product => (
                        <div key={`${product.id}-${product.sku}-${product.packSize}`} className={`${isConfirmed ? "bg-slate-50" : "bg-white"} border border-slate-200 rounded p-3 min-w-0`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <img src={IMAGES.skuReference} alt="" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-950 text-xs truncate">{product.sku}</h4>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{product.packSize} - {product.facings} facings</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-emerald-700 font-bold">
                              <PositiveLift value={Math.round(product.liftPct)} suffix=" lift" />
                            </span>
                            <span className="text-slate-700 font-bold">+{Math.round(product.opportunityUnits)} units</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        disabled={isConfirmed}
                        onClick={() => onSelectAction(Screen.BEFORE_PHOTO, "HUNT_SPACE", {
                          liftPct: opportunity.bestLiftPct,
                          opportunityUnits: opportunity.totalUnits
                        }, opportunity.id)}
                        className={`font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono flex items-center gap-2 ${
                          isConfirmed
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                        }`}
                      >
                        {isConfirmed ? "Executed" : "Confirm Display"} <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {isConfirmed && (
                    <div className="px-4 py-3 border-t border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>Executed</span>
                      <span className="text-emerald-500">-</span>
                      <span className="font-medium">{formatOutcomeTimestamp(confirmedAt)}</span>
                    </div>
                  )}
                </section>
              );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
