import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, PackageMinus } from "lucide-react";
import { PicOSConstraints, RemovalSurveyResult, StoreInfo } from "../types";

interface RemovalSurveyProps {
  store: StoreInfo;
  picosConstraints: PicOSConstraints | null;
  onBackToPhoto: () => void;
  onSubmit: (result: RemovalSurveyResult) => void;
}

export default function RemovalSurvey({ store, picosConstraints, onBackToPhoto, onSubmit }: RemovalSurveyProps) {
  const productOptions = useMemo(() => {
    if (picosConstraints?.items.length) {
      return picosConstraints.items.map(item => item.sku);
    }
    return store.picosBoxes
      .filter(box => box.mode === "Execute" && box.skusStated !== "Not explicitly stated")
      .flatMap(box => box.skusStated.split(";").map(sku => sku.trim()).filter(Boolean));
  }, [picosConstraints, store]);

  const [removedItems, setRemovedItems] = useState(false);
  const [firstProduct, setFirstProduct] = useState(productOptions[0] || "");
  const [firstCases, setFirstCases] = useState(0);
  const [secondProduct, setSecondProduct] = useState("");
  const [secondCases, setSecondCases] = useState(0);

  const hasValidRemoval = !removedItems || firstCases > 0;

  const handleSubmit = () => {
    const items = removedItems
      ? [
          { product: firstProduct, casesRemoved: firstCases },
          ...(secondProduct && secondCases > 0 ? [{ product: secondProduct, casesRemoved: secondCases }] : [])
        ]
      : [];

    onSubmit({
      removedItems,
      items
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToPhoto}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                Step 3 of 4
              </span>
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none">
                Product Removal Survey
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Record any cases removed while completing the PicOS execution.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400">
          <span>1. Setup</span>
          <span className="text-slate-300">-&gt;</span>
          <span>2. After Photo</span>
          <span className="text-slate-300">-&gt;</span>
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">3. Removal Survey</span>
          <span className="text-slate-300">-&gt;</span>
          <span>4. Finish</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <PackageMinus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-950 text-sm">Were any products removed?</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Select yes only if cases were physically removed from the display or cooler during execution.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setRemovedItems(false)}
                className={`py-3 px-4 rounded border text-xs font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                  !removedItems
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                No
              </button>
              <button
                onClick={() => setRemovedItems(true)}
                className={`py-3 px-4 rounded border text-xs font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                  removedItems
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {removedItems && (
            <div className="bg-white border border-slate-200 rounded p-5 shadow-xs space-y-4">
              <div>
                <h2 className="font-bold text-slate-950 text-sm">Removal Details</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Capture up to two removed products and the case quantity removed for each.
                </p>
              </div>

              {[1, 2].map((row) => {
                const product = row === 1 ? firstProduct : secondProduct;
                const cases = row === 1 ? firstCases : secondCases;
                const setProduct = row === 1 ? setFirstProduct : setSecondProduct;
                const setCases = row === 1 ? setFirstCases : setSecondCases;

                return (
                  <div key={row} className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                        Product {row}
                      </label>
                      <select
                        value={product}
                        onChange={(event) => setProduct(event.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                      >
                        {row === 2 && <option value="">No second product</option>}
                        {productOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                        Cases Removed
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cases}
                        onChange={(event) => setCases(Math.max(0, Number(event.target.value)))}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
        <button
          id="submit-removal-survey"
          onClick={handleSubmit}
          disabled={!hasValidRemoval}
          className={`font-bold py-3 px-8 rounded text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 transition-colors ${
            hasValidRemoval
              ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          }`}
        >
          Continue to Summary <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}
