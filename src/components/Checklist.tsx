import React, { useState } from "react";
import { IMAGES, StoreInfo } from "../types";
import { ArrowLeft, CheckCircle, CheckSquare, ClipboardList, Info, AlertTriangle, ArrowRight, CornerDownRight } from "lucide-react";

interface ChecklistProps {
  store: StoreInfo;
  flowType: "EXECUTE_PICOS" | "OPTIMIZE_DISPLAY";
  onBackToPhoto: () => void;
  onProceedToAfterPhoto: () => void;
}

interface ChecklistItem {
  id: string;
  category: string;
  text: string;
  completed: boolean;
}

export default function Checklist({ store, flowType, onBackToPhoto, onProceedToAfterPhoto }: ChecklistProps) {
  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // Planogram Allocation
    { id: "pl-1", category: "Planogram & Spacing", text: "Core Coca-Cola SKU allocated to designated eye-level slots", completed: false },
    { id: "pl-2", category: "Planogram & Spacing", text: "Zero Sugar & Diet extensions correctly stocked on middle shelves", completed: false },
    { id: "pl-3", category: "Planogram & Spacing", text: "Product distribution exactly matches configured solver profile", completed: false },
    
    // Quality & Presentation
    { id: "qu-1", category: "Merchandising Quality", text: "Labels faced forward (100% full front facings)", completed: false },
    { id: "qu-2", category: "Merchandising Quality", text: "FIFO rotation implemented (older stock in front, new in back)", completed: false },
    { id: "qu-3", category: "Merchandising Quality", text: "Pricing tags present, updated, and positioned under each SKU column", completed: false },
    
    // Equipment & POP Signage
    { id: "eq-1", category: "Equipment & POP Setup", text: "Equipment shelves wiped clean, dust-free and liners flat", completed: false },
    { id: "eq-2", category: "Equipment & POP Setup", text: "Promotional POS header signage mounted and clearly visible", completed: false },
    { id: "eq-3", category: "Equipment & POP Setup", text: "Shelf talkers or pricing collars secured on shelf rims", completed: false }
  ]);

  const toggleItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleCheckAll = () => {
    setChecklist(prev => prev.map(item => ({ ...item, completed: true })));
  };

  const totalItems = checklist.length;
  const completedItems = checklist.filter(i => i.completed).length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);
  const isAllCompleted = completedItems === totalItems;

  // Group checklist by categories
  const categories = Array.from(new Set(checklist.map(item => item.category)));

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header bar */}
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
              <span className="text-[10px] bg-red-105 text-red-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                Step 3 of 5
              </span>
              <h1 className="font-sans font-bold text-slate-900 tracking-tight text-base leading-none">
                PicOS Merchandising Audit
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {store.storeName} • {flowType === "EXECUTE_PICOS" ? "Picture of Success Standards" : "SKU Mix Optimization Guide"}
            </p>
          </div>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400">
          <span>1. Setup</span>
          <span className="text-slate-300">â†’</span>
          <span>2. Before Photo</span>
          <span className="text-slate-300">â†’</span>
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">3. Audit Check</span>
          <span className="text-slate-300">â†’</span>
          <span>4. After Photo</span>
          <span className="text-slate-300">â†’</span>
          <span>5. Finish</span>
        </div>
      </header>

      {/* Main Container - Left: Checklist items, Right: Before Photo reference */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: Interactive Checklist */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Progress Header Box */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs flex items-center justify-between">
            <div className="flex-1 pr-6">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 mb-1.5">
                <span>AUDIT PROGRESS RATING</span>
                <span className={isAllCompleted ? "text-emerald-600" : "text-slate-700"}>
                  {completedItems} OF {totalItems} TASKS COMPLETED ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isAllCompleted ? "bg-emerald-500" : "bg-red-600"}`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={handleCheckAll}
              disabled={isAllCompleted}
              className="px-3.5 py-2 text-xs border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 font-bold font-mono rounded cursor-pointer shrink-0 transition-colors uppercase"
            >
              Audited All (Auto-Check)
            </button>
          </div>

          {/* Grouped Checklist */}
          <div className="space-y-6">
            {categories.map((cat, cIdx) => (
              <div key={cIdx} className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    {cat}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {checklist
                    .filter(item => item.category === cat)
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`p-4 flex items-start gap-3.5 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          item.completed ? "bg-slate-50/25" : ""
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleItem(item.id)}
                            className="h-4.5 w-4.5 accent-red-600 cursor-pointer rounded border-slate-300"
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-semibold leading-normal transition-all ${
                            item.completed ? "text-slate-400 line-through" : "text-slate-900"
                          }`}>
                            {item.text}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right column: Before Photo & Guidances Reference */}
        <div className="w-[340px] bg-white border-l border-slate-200 flex flex-col overflow-y-auto shrink-0 p-5 space-y-5">
          
          {/* Before Photo Comparison Thumbnail */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">Before Audit State Reference</span>
            <div className="relative aspect-4/3 bg-slate-200 rounded overflow-hidden border border-slate-150">
              <img
                src={IMAGES.beforeCooler}
                alt="Before Reference Thumbnail"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/70 text-white font-mono text-[9px] rounded-xs uppercase tracking-wider">
                Baseline Photo
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Use this before snapshot to verify which SKU shelf layers were displaced. Correct them to match the target.
            </p>
          </div>

          {/* Operational Checklist Information */}
          <div className="bg-red-50/40 border border-red-100 rounded p-4 space-y-3">
            <div className="flex gap-2 text-red-900">
              <Info className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono mt-0.5">Merchandise SOP</span>
            </div>
            <p className="text-xs text-slate-650 leading-relaxed">
              Verify that pricing is present for all new items introduced during the optimization. Lack of pricing tags accounts for up to <strong>14% drop</strong> in spontaneous sales volume.
            </p>
          </div>

        </div>

      </div>

      {/* Action Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isAllCompleted ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1 font-mono">
              <CheckCircle className="h-4.5 w-4.5" /> ALL PICOS ITEMS AUDITED
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Complete remaining {totalItems - completedItems} audits to unlock After Photo
            </span>
          )}
        </div>

        <button
          id="proceed-after-photo"
          onClick={onProceedToAfterPhoto}
          className={`font-semibold py-3 px-8 rounded text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-1.5 transition-all ${
            isAllCompleted
              ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs"
              : "bg-slate-100 text-slate-450 border border-slate-200 cursor-not-allowed"
          }`}
        >
          Proceed to After Photo <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}

