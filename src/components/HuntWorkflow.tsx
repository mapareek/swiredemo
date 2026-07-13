import React, { useMemo, useState } from "react";
import { FlowType, Screen, IMAGES, PicOSOptimizationCandidate, StoreInfo } from "../types";
import { ArrowLeft, ArrowRight, EyeOff, Filter, MapPin } from "lucide-react";

interface HuntWorkflowProps {
  store: StoreInfo;
  onBackToHub: () => void;
  onSelectAction: (nextScreen: Screen, flowType: FlowType) => void;
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

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function PositiveLift({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value <= 0) return null;
  return <>{signedPercent(value)}{suffix}</>;
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
          b.liftPct - a.liftPct ||
          b.opportunityUnits - a.opportunityUnits ||
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
      b.bestLiftPct - a.bestLiftPct ||
      b.totalUnits - a.totalUnits
    );
}

export default function HuntWorkflow({ store, onBackToHub, onSelectAction }: HuntWorkflowProps) {
  const [locationFilter, setLocationFilter] = useState("All");
  const [displayTypeFilter, setDisplayTypeFilter] = useState("All");
  const [hideCovered, setHideCovered] = useState(true);
  const [sortBy, setSortBy] = useState<"lift" | "units">("lift");

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
      .filter(opportunity => !hideCovered || !opportunity.coveredByPicos)
      .sort((a, b) => {
        if (sortBy === "units") {
          return b.totalUnits - a.totalUnits || b.bestLiftPct - a.bestLiftPct;
        }
        return b.bestLiftPct - a.bestLiftPct || b.totalUnits - a.totalUnits;
      });
  }, [displayTypeFilter, hideCovered, locationFilter, opportunities, sortBy]);

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
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                Workflow 1
              </span>
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none truncate">
                Hunt Space Guidance
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {store.storeName} - Ranked net-new display opportunities
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

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_180px] gap-3">
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
                  <option value="lift">Highest lift</option>
                  <option value="units">Highest units</option>
                </select>
              </label>

              <button
                onClick={() => setHideCovered(prev => !prev)}
                className={`h-11 self-end rounded border px-3 text-xs font-bold uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-2 ${
                  hideCovered
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <EyeOff className="h-4 w-4" />
                Hide Covered
              </button>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Ranked Hunt Opportunities
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {filteredOpportunities.length} shown / {opportunities.length} total
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-bold">
            Lift estimates compare the recommended execution against a no-activation baseline for this store and period.
          </div>

          {filteredOpportunities.length === 0 ? (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-8 text-center">
              <h3 className="font-bold text-slate-950">No hunt opportunities match these filters.</h3>
              <p className="text-sm text-slate-500 mt-2">Try showing PicOS-covered locations or clearing the location/display type filter.</p>
            </section>
          ) : (
            <div className="space-y-3">
              {filteredOpportunities.map((opportunity, index) => (
                <section key={opportunity.id} className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_170px_170px] gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-red-600 text-white rounded px-2 py-1 text-[11px] font-bold font-mono">
                          #{index + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {opportunity.location}
                        </span>
                        <span className="bg-slate-100 text-slate-700 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                          {opportunity.displayType}
                        </span>
                        {opportunity.coveredByPicos && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                            PicOS-covered
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-950 mt-3">
                        {opportunity.displayType} at {opportunity.location}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Products are stack ranked by lift within this location and display type.
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Best Lift</span>
                      <div className="text-2xl font-black text-red-600 font-mono">
                        <PositiveLift value={opportunity.bestLiftPct} />
                      </div>
                      {opportunity.averageLiftPct > 0 && (
                        <p className="text-[10px] text-slate-500 font-mono">Avg {signedPercent(opportunity.averageLiftPct)}</p>
                      )}
                    </div>

                    <div className="lg:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Unit Opportunity</span>
                      <div className="text-2xl font-black text-slate-950 font-mono">+{opportunity.totalUnits.toFixed(1)}</div>
                      <p className="text-[10px] text-slate-500 font-mono">units</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      {opportunity.products.map(product => (
                        <div key={`${product.id}-${product.sku}-${product.packSize}`} className="bg-white border border-slate-200 rounded p-3 min-w-0">
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
                            <span className="text-red-600 font-bold">
                              <PositiveLift value={Math.round(product.liftPct)} suffix=" lift" />
                            </span>
                            <span className="text-slate-500">+{product.opportunityUnits.toFixed(1)} units</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => onSelectAction(Screen.BEFORE_PHOTO, "HUNT_SPACE")}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                      >
                        Start Hunt <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
