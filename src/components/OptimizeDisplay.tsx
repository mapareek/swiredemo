import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Filter, List, PackageCheck, Sliders } from "lucide-react";
import { FlowLiftMetrics, IMAGES, PicOSOptimizationCandidate, StoreInfo } from "../types";

interface OptimizeDisplayProps {
  store: StoreInfo;
  optimizeDisplayOutcomes?: Record<string, string>;
  onBackToHub: () => void;
  onConfirmDisplay: (metrics: FlowLiftMetrics, displayId: string) => void;
}

type OptimizeView = "SELECT_DISPLAY" | "TOP_PACKS" | "FULL_LIST";
type StatusFilter = "All" | "To do" | "Recorded" | "Covered";

type DisplayGroup = {
  id: string;
  displayType: string;
  location: string;
  coveredByPicos: boolean;
  candidates: PicOSOptimizationCandidate[];
  topPacks: PicOSOptimizationCandidate[];
  totalUnits: number;
  bestLiftPct: number;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dedupeByNormalized(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePacks(candidates: PicOSOptimizationCandidate[]) {
  const seen = new Set<string>();
  const result: PicOSOptimizationCandidate[] = [];
  candidates.forEach(candidate => {
    const key = normalize(`${candidate.sku} ${candidate.packSize}`);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(candidate);
  });
  return result;
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
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

function getDisplayGroups(store: StoreInfo): DisplayGroup[] {
  if (store.displayOpportunities?.length) {
    return store.displayOpportunities
      .map(opportunity => {
        const topPacks = dedupePacks(
          [...opportunity.packRecommendations].sort((a, b) =>
            b.liftPct - a.liftPct ||
            b.opportunityUnits - a.opportunityUnits ||
            (a.shelfRank ?? a.rank) - (b.shelfRank ?? b.rank)
          )
        );
        return {
          id: opportunity.id,
          displayType: opportunity.displayType,
          location: opportunity.location,
          coveredByPicos: opportunity.coveredByPicos,
          candidates: opportunity.packRecommendations,
          topPacks,
          totalUnits: opportunity.totalOpportunityUnits,
          bestLiftPct: Math.round(opportunity.bestLiftPct)
        };
      })
      .filter(group => group.topPacks.length > 0)
      .sort((a, b) => b.totalUnits - a.totalUnits || b.bestLiftPct - a.bestLiftPct);
  }

  const groups = new Map<string, PicOSOptimizationCandidate[]>();

  store.picosBoxes.forEach(box => {
    (box.optimizationCandidates || []).forEach(candidate => {
      const displayType = candidate.displayType || "Display";
      const location = candidate.locationGuidance || candidate.location || "Store";
      const id = `${displayType}|${location}`;
      groups.set(id, [...(groups.get(id) || []), candidate]);
    });
  });

  return [...groups.entries()]
    .map(([id, candidates]) => {
      const [displayType, location] = id.split("|");
      const topPacks = dedupePacks(
        [...candidates].sort((a, b) =>
          b.opportunityUnits - a.opportunityUnits ||
          b.liftPct - a.liftPct ||
          b.facings - a.facings
        )
      );
      return {
        id,
        displayType,
        location,
        coveredByPicos: false,
        candidates,
        topPacks,
        totalUnits: topPacks.reduce((sum, pack) => sum + pack.opportunityUnits, 0),
        bestLiftPct: Math.round(topPacks[0]?.liftPct || 0)
      };
    })
    .filter(group => group.topPacks.length > 0)
    .sort((a, b) => b.totalUnits - a.totalUnits || b.bestLiftPct - a.bestLiftPct);
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full h-12 appearance-none rounded border border-slate-200 bg-white px-3 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-slate-400" />
      </div>
    </label>
  );
}

const PackCard: React.FC<{ pack: PicOSOptimizationCandidate; rank: number }> = ({ pack, rank }) => {
  const displayRank = pack.shelfRank ?? rank;
  return (
    <section className="bg-white border border-slate-200 rounded p-4 shadow-xs min-w-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <img src={IMAGES.skuReference} alt="" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono">
              #{displayRank}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              {pack.packSize}
            </span>
          </div>
          <h3 className="mt-2 font-black text-slate-950 text-sm leading-tight">{pack.sku}</h3>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">
            {pack.facings} target facings
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1.5">
          <div className="text-emerald-700 uppercase font-bold">Unit opportunity</div>
          <div className="text-emerald-900 font-black">+{Math.round(pack.opportunityUnits)} units</div>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div className="text-slate-500 uppercase font-bold">Lift</div>
          <div className="text-slate-950 font-black">{signedPercent(Math.round(pack.liftPct))}</div>
        </div>
      </div>
    </section>
  );
};

export default function OptimizeDisplay({
  store,
  optimizeDisplayOutcomes = {},
  onBackToHub,
  onConfirmDisplay
}: OptimizeDisplayProps) {
  const [view, setView] = useState<OptimizeView>("SELECT_DISPLAY");
  const displayGroups = useMemo(() => getDisplayGroups(store), [store]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [listLocationFilter, setListLocationFilter] = useState("All");
  const [listDisplayTypeFilter, setListDisplayTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const displayTypeOptions = useMemo(
    () => dedupeByNormalized(displayGroups.map(group => group.displayType)).sort(),
    [displayGroups]
  );

  const selectedGroup = useMemo(() => {
    return displayGroups.find(group => group.id === selectedGroupId) || displayGroups[0];
  }, [displayGroups, selectedGroupId]);

  const displayType = selectedGroup?.displayType || displayTypeOptions[0] || "";
  const locationOptions = useMemo(
    () => dedupeByNormalized(
      displayGroups
        .filter(group => group.displayType === displayType)
        .map(group => group.location)
    ).sort(),
    [displayGroups, displayType]
  );
  const location = selectedGroup?.location || locationOptions[0] || "";

  const listLocationOptions = useMemo(
    () => ["All", ...dedupeByNormalized(displayGroups.map(group => group.location)).sort()],
    [displayGroups]
  );

  const listDisplayTypeOptions = useMemo(
    () => ["All", ...displayTypeOptions],
    [displayTypeOptions]
  );

  const filteredDisplayGroups = useMemo(() => {
    return displayGroups
      .filter(group => listLocationFilter === "All" || group.location === listLocationFilter)
      .filter(group => listDisplayTypeFilter === "All" || group.displayType === listDisplayTypeFilter)
      .filter(group => {
        const isRecorded = Boolean(optimizeDisplayOutcomes[group.id]);
        if (statusFilter === "To do") return !isRecorded && !group.coveredByPicos;
        if (statusFilter === "Recorded") return isRecorded;
        if (statusFilter === "Covered") return group.coveredByPicos;
        return true;
      });
  }, [displayGroups, listDisplayTypeFilter, listLocationFilter, optimizeDisplayOutcomes, statusFilter]);

  useEffect(() => {
    if (!displayGroups.length) {
      setSelectedGroupId("");
      return;
    }
    if (!displayGroups.some(group => group.id === selectedGroupId)) {
      setSelectedGroupId(displayGroups[0].id);
    }
  }, [displayGroups, selectedGroupId]);

  const handleDisplayTypeChange = (nextDisplayType: string) => {
    const nextGroup = displayGroups.find(group => group.displayType === nextDisplayType);
    if (nextGroup) setSelectedGroupId(nextGroup.id);
  };

  const handleLocationChange = (nextLocation: string) => {
    const nextGroup = displayGroups.find(group => group.displayType === displayType && group.location === nextLocation)
      || displayGroups.find(group => group.location === nextLocation);
    if (nextGroup) setSelectedGroupId(nextGroup.id);
  };

  const handleSelectGroup = (group: DisplayGroup) => {
    setSelectedGroupId(group.id);
    setView("TOP_PACKS");
  };

  const handleConfirmSelectedGroup = () => {
    if (!selectedGroup || optimizeDisplayOutcomes[selectedGroup.id]) return;
    onConfirmDisplay({
      liftPct: selectedGroup.bestLiftPct,
      opportunityUnits: selectedGroup.totalUnits
    }, selectedGroup.id);
  };

  const goBack = () => {
    if (view === "FULL_LIST") {
      setView("TOP_PACKS");
      return;
    }
    if (view === "TOP_PACKS") {
      setView("SELECT_DISPLAY");
      return;
    }
    onBackToHub();
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={goBack}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-200 shrink-0"></div>
          <div className="min-w-0">
            <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none truncate">
              Optimize Display
            </h1>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {store.storeName} - Pick an existing display and verify top packs
            </p>
          </div>
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto p-6 ${view === "SELECT_DISPLAY" ? "flex items-center justify-center" : ""}`}>
        <div className={`${view === "SELECT_DISPLAY" ? "w-full max-w-5xl" : "max-w-5xl mx-auto"}`}>
          {displayGroups.length === 0 ? (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-8 text-center">
              <h2 className="text-lg font-black text-slate-950">No optimize candidates available.</h2>
              <p className="text-sm text-slate-500 mt-2">This store does not have display optimization data yet.</p>
            </section>
          ) : view === "SELECT_DISPLAY" ? (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Sliders className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Display Selector</span>
              </div>

              <h2 className="text-2xl font-black text-slate-950">Which display would you like to optimize?</h2>
              <p className="text-sm text-slate-600 mt-2">
                Start with the location and display type you are standing in front of.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <SelectField
                  label="Location"
                  value={location}
                  options={locationOptions}
                  onChange={handleLocationChange}
                />
                <SelectField
                  label="Type of Display"
                  value={displayType}
                  options={displayTypeOptions}
                  onChange={handleDisplayTypeChange}
                />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={() => setView("FULL_LIST")}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Whole List
                </button>
                <button
                  onClick={() => setView("TOP_PACKS")}
                  disabled={!selectedGroup}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                >
                  Show Top Packs <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          ) : view === "TOP_PACKS" && selectedGroup ? (
            <section className="space-y-4 pb-28">
              <div className="bg-white border border-slate-200 rounded shadow-xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Selected Display
                  </span>
                  <h2 className="text-2xl font-black text-slate-950 mt-1">
                    {selectedGroup.displayType} at {selectedGroup.location}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selectedGroup.coveredByPicos && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                        Covered by PicOS
                      </span>
                    )}
                    {optimizeDisplayOutcomes[selectedGroup.id] && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                        Recorded {formatOutcomeTimestamp(optimizeDisplayOutcomes[selectedGroup.id])}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono min-w-[230px]">
                  <div className="rounded border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <div className="text-emerald-700 uppercase font-bold">Opportunity</div>
                    <div className="text-emerald-900 font-black">+{Math.round(selectedGroup.totalUnits)} units</div>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-slate-500 uppercase font-bold">Best lift</div>
                    <div className="text-slate-950 font-black">{signedPercent(selectedGroup.bestLiftPct)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 font-bold flex items-start gap-2 leading-relaxed">
                <PackageCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Ranked by greatest lift, these are the packs that would perform well. If you want to replace any slow moving product, do so with these.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {selectedGroup.topPacks.slice(0, 9).map((pack, index) => (
                  <PackCard key={`${pack.id}-${pack.sku}-${pack.packSize}`} pack={pack} rank={index + 1} />
                ))}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={() => setView("SELECT_DISPLAY")}
                  className="border border-slate-300 hover:bg-white text-slate-800 font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer"
                >
                  Other Displays
                </button>
                <button
                  onClick={() => setView("FULL_LIST")}
                  className="bg-slate-950 hover:bg-black text-white font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Whole List
                </button>
              </div>

              <div className="sticky bottom-0 z-20 -mx-6 px-6 pt-3 pb-4 bg-[#F8FAFC]/95 backdrop-blur border-t border-slate-200">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    {optimizeDisplayOutcomes[selectedGroup.id]
                      ? `Display optimization recorded ${formatOutcomeTimestamp(optimizeDisplayOutcomes[selectedGroup.id])}.`
                      : "Record this display once you have reviewed the packs for the current display."}
                  </div>
                  <button
                    disabled={Boolean(optimizeDisplayOutcomes[selectedGroup.id])}
                    onClick={handleConfirmSelectedGroup}
                    className={`font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shrink-0 ${
                      optimizeDisplayOutcomes[selectedGroup.id]
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    }`}
                  >
                    {optimizeDisplayOutcomes[selectedGroup.id] ? "Recorded" : "Record Outcome"}
                    {!optimizeDisplayOutcomes[selectedGroup.id] && <Check className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">All Optimizable Displays</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Choose any display to see its top packs.
                  </p>
                </div>
                <button
                  onClick={() => setView("SELECT_DISPLAY")}
                  className="border border-slate-300 hover:bg-white text-slate-800 font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer"
                >
                  Other Displays
                </button>
              </div>

              <section className="bg-white border border-slate-200 rounded shadow-xs p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                  <Filter className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SelectField
                    label="Location"
                    value={listLocationFilter}
                    options={listLocationOptions}
                    onChange={setListLocationFilter}
                  />
                  <SelectField
                    label="Type of Display"
                    value={listDisplayTypeFilter}
                    options={listDisplayTypeOptions}
                    onChange={setListDisplayTypeFilter}
                  />
                  <SelectField
                    label="Status"
                    value={statusFilter}
                    options={["All", "To do", "Recorded", "Covered"]}
                    onChange={value => setStatusFilter(value as StatusFilter)}
                  />
                </div>
              </section>

              {filteredDisplayGroups.length === 0 ? (
                <section className="bg-white border border-slate-200 rounded shadow-xs p-8 text-center">
                  <h3 className="font-bold text-slate-950">No displays match these filters.</h3>
                  <p className="text-sm text-slate-500 mt-2">Clear a filter or show covered/recorded displays.</p>
                </section>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredDisplayGroups.map(group => {
                  const recordedAt = optimizeDisplayOutcomes[group.id];
                  const isRecorded = Boolean(recordedAt);
                  return (
                  <section key={group.id} className="bg-white border border-slate-200 rounded shadow-xs p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {group.displayType}
                          </span>
                          {group.coveredByPicos && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-0.5 text-[9px] font-bold uppercase font-mono">
                              Covered
                            </span>
                          )}
                          {isRecorded && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-[9px] font-bold uppercase font-mono">
                              Recorded
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-950 mt-1 leading-tight">
                          {group.location}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {isRecorded ? `Recorded ${formatOutcomeTimestamp(recordedAt)}` : `Top pack: ${group.topPacks[0]?.sku}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-emerald-700 font-mono">
                          +{Math.round(group.totalUnits)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">units</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectGroup(group)}
                      className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-2"
                    >
                      View Top Packs <ArrowRight className="h-4 w-4" />
                    </button>
                  </section>
                );
                })}
              </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
