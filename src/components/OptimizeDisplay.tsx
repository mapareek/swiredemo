import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, PackageCheck, Sliders } from "lucide-react";
import { OptimizeConstraints, OptimizeDisplayType, IMAGES, StoreInfo } from "../types";
import { getStoreSignalOptimizeRecommendation } from "../utils/storeSignalEngine";

interface OptimizeDisplayProps {
  store: StoreInfo;
  onBackToHub: () => void;
  onProceedToAfterPhoto: (flowType: "OPTIMIZE_DISPLAY", constraints: OptimizeConstraints) => void;
}

type OptimizeStep = "DISPLAY_TYPE" | "LOCATION" | "CURRENT_PRODUCTS" | "RECOMMENDATION";

const steps: { id: OptimizeStep; label: string }[] = [
  { id: "DISPLAY_TYPE", label: "Display" },
  { id: "LOCATION", label: "Location" },
  { id: "CURRENT_PRODUCTS", label: "Current" },
  { id: "RECOMMENDATION", label: "Plan" }
];

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

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function PositiveLift({ value, className }: { value: number; className: string }) {
  if (value <= 0) return null;
  return <div className={className}>{signedPercent(value)}</div>;
}

export default function OptimizeDisplay({ store, onBackToHub, onProceedToAfterPhoto }: OptimizeDisplayProps) {
  const displayTypeOptions = useMemo(() => dedupeByNormalized(
    store.picosBoxes.flatMap(box => (box.optimizationCandidates || []).map(candidate => candidate.displayType).filter(Boolean))
  ).sort(), [store]);

  const getLocationOptions = (displayType: string) => dedupeByNormalized(
    store.picosBoxes.flatMap(box => (box.optimizationCandidates || [])
      .filter(candidate => !displayType || candidate.displayType === displayType)
      .map(candidate => candidate.locationGuidance || candidate.location)
      .filter(Boolean))
  ).sort();

  const initialDisplayType = (displayTypeOptions[0] || "Display") as OptimizeDisplayType;
  const initialLocation = getLocationOptions(initialDisplayType)[0] || "";

  const [step, setStep] = useState<OptimizeStep>("DISPLAY_TYPE");
  const [constraints, setConstraints] = useState<OptimizeConstraints>({
    focus: "Low Sugar",
    maxSkus: 4,
    brandFocus: "Coca-Cola",
    displayType: initialDisplayType,
    location: initialLocation,
    currentProducts: [],
    currentFacings: {}
  });

  const locationOptions = useMemo(
    () => getLocationOptions(constraints.displayType || ""),
    [constraints.displayType, store]
  );

  const currentProductOptions = useMemo(() => {
    const candidates = store.picosBoxes.flatMap(box => (box.optimizationCandidates || [])
      .filter(candidate => candidate.displayType === constraints.displayType)
      .filter(candidate => !constraints.location || (candidate.locationGuidance || candidate.location) === constraints.location)
      .sort((a, b) => b.opportunityUnits - a.opportunityUnits)
      .map(candidate => candidate.sku));
    return dedupeByNormalized(candidates).slice(0, 8);
  }, [constraints.displayType, constraints.location, store]);

  const optData = useMemo(
    () => getStoreSignalOptimizeRecommendation(store, constraints, constraints.currentProducts),
    [constraints, store]
  );

  const stepIndex = steps.findIndex(item => item.id === step);
  const selectedProducts = constraints.currentProducts || [];

  const updateDisplayType = (displayType: OptimizeDisplayType) => {
    const nextLocation = getLocationOptions(displayType)[0] || "";
    setConstraints(prev => ({
      ...prev,
      displayType,
      location: nextLocation,
      currentProducts: [],
      currentFacings: {}
    }));
  };

  const toggleCurrentProduct = (product: string) => {
    setConstraints(prev => {
      const currentProducts = prev.currentProducts || [];
      const currentFacings = prev.currentFacings || {};
      if (currentProducts.includes(product)) {
        const nextFacings = { ...currentFacings };
        delete nextFacings[product];
        return {
          ...prev,
          currentProducts: currentProducts.filter(item => item !== product),
          currentFacings: nextFacings
        };
      }
      return {
        ...prev,
        currentProducts: [...currentProducts, product],
        currentFacings: {
          ...currentFacings,
          [product]: currentFacings[product] || 1
        }
      };
    });
  };

  const updateCurrentFacings = (product: string, value: number) => {
    const nextValue = Math.max(0, Math.min(99, Number.isFinite(value) ? value : 0));
    setConstraints(prev => ({
      ...prev,
      currentFacings: {
        ...(prev.currentFacings || {}),
        [product]: nextValue
      }
    }));
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      onBackToHub();
      return;
    }
    setStep(steps[stepIndex - 1].id);
  };

  const goNext = () => {
    if (stepIndex >= steps.length - 1) return;
    setStep(steps[stepIndex + 1].id);
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                Workflow 3
              </span>
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none truncate">
                Optimize Existing Display
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Bottler Swire - {store.storeName}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {steps.map((item, index) => {
            const isActive = item.id === step;
            const isComplete = index < stepIndex;
            return (
              <div key={item.id} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold font-mono ${
                  isActive
                    ? "bg-red-600 border-red-600 text-white"
                    : isComplete
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-400"
                }`}>
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isActive ? "text-red-600" : "text-slate-400"}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {step === "DISPLAY_TYPE" && (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-6">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Sliders className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Step 1</span>
              </div>
              <h2 className="text-2xl font-black text-slate-950">What type of display are you optimizing?</h2>
              <p className="text-sm text-slate-600 mt-2">Only display types available in this store's recommendation data are shown.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {displayTypeOptions.map(displayType => (
                  <button
                    key={displayType}
                    onClick={() => updateDisplayType(displayType as OptimizeDisplayType)}
                    className={`p-4 rounded border text-left transition-all cursor-pointer ${
                      constraints.displayType === displayType
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div className="text-lg font-black">{displayType}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={goNext}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === "LOCATION" && (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-6">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Sliders className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Step 2</span>
              </div>
              <h2 className="text-2xl font-black text-slate-950">Where is the existing {constraints.displayType} you found?</h2>
              <p className="text-sm text-slate-600 mt-2">Pick the closest location. These are model-supported options, not confirmed displays in this store.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-h-[420px] overflow-y-auto pr-1">
                {locationOptions.map(location => (
                  <button
                    key={location}
                    onClick={() => setConstraints(prev => ({ ...prev, location }))}
                    className={`p-3 rounded border text-left transition-all cursor-pointer ${
                      constraints.location === location
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div className="text-sm font-bold">{location}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={goBack} className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono cursor-pointer">
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === "CURRENT_PRODUCTS" && (
            <section className="bg-white border border-slate-200 rounded shadow-xs p-6">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <PackageCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Optional</span>
              </div>
              <h2 className="text-2xl font-black text-slate-950">What is already on this display?</h2>
              <p className="text-sm text-slate-600 mt-2">Select anything currently present and enter how many facings are on the display today.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {currentProductOptions.map(product => {
                  const isSelected = selectedProducts.includes(product);
                  const currentFacingValue = constraints.currentFacings?.[product] || 1;
                  return (
                    <div
                      key={product}
                      className={`p-3 rounded border transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCurrentProduct(product)}
                        className="w-full text-left cursor-pointer"
                      >
                        <div className="text-sm font-bold leading-snug">{product}</div>
                        <div className={`text-[10px] font-mono mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          {isSelected ? "Currently on display" : "Tap to add current SKU"}
                        </div>
                      </button>

                      {isSelected && (
                        <label className="block mt-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300">
                            Current facings
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={currentFacingValue}
                            onChange={event => updateCurrentFacings(product, Number(event.target.value))}
                            className="mt-1 w-full h-10 rounded border border-slate-700 bg-white text-slate-950 px-3 text-sm font-bold font-mono"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={goBack} className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono cursor-pointer">
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setConstraints(prev => ({ ...prev, currentProducts: [], currentFacings: {} }));
                      goNext();
                    }}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold py-3 px-5 rounded text-xs uppercase tracking-wider font-mono cursor-pointer"
                  >
                    Skip
                  </button>
                  <button
                    onClick={goNext}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === "RECOMMENDATION" && (
            <section className="space-y-4">
              <div className="bg-white border border-slate-200 rounded shadow-xs p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Recommended Mix</span>
                  <h2 className="text-2xl font-black text-slate-950 mt-1">{constraints.displayType} / {constraints.location}</h2>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Expected Lift</span>
                  <PositiveLift value={optData.liftPercent} className="text-3xl font-black text-red-600 font-mono" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  What should be on it
                </div>

                <div className="divide-y divide-slate-100">
                  {optData.skus.map((item) => (
                    <div key={`${item.sku}-${item.sourceBox}`} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_120px_100px] gap-3 md:items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <img src={IMAGES.skuReference} alt="" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-950 text-sm truncate">{item.sku}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {item.packSize} - {item.facings} target facings
                            {item.currentFacings > 0 ? ` - current ${item.currentFacings}` : ""}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="inline-flex items-center border border-slate-200 bg-white text-slate-800 rounded px-2 py-1 text-[10px] font-bold uppercase font-mono">
                          {item.action}
                        </span>
                      </div>

                      <div className="md:text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">Lift</div>
                        <PositiveLift value={item.lift} className="text-lg font-black text-red-600 font-mono" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={goBack} className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono cursor-pointer">
                  Back
                </button>
                <button
                  id="proceed-after-opt"
                  onClick={() => onProceedToAfterPhoto("OPTIMIZE_DISPLAY", constraints)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
                >
                  Confirm & Capture Photo <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
