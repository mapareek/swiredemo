import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardCheck } from "lucide-react";
import { ExecutionCheckResult } from "../types";

interface RemovalSurveyProps {
  onBackToPhoto: () => void;
  onSubmit: (result: ExecutionCheckResult) => void;
}

type NotExecutedReason = NonNullable<ExecutionCheckResult["reason"]>;

const reasons: NotExecutedReason[] = [
  "Store manager approval",
  "Merchandiser visit needed",
  "Other"
];

export default function RemovalSurvey({ onBackToPhoto, onSubmit }: RemovalSurveyProps) {
  const [executed, setExecuted] = useState<boolean | null>(null);
  const [reason, setReason] = useState<NotExecutedReason>("Store manager approval");
  const [otherReason, setOtherReason] = useState("");

  const canContinue = executed === true || (
    executed === false &&
    reason &&
    (reason !== "Other" || otherReason.trim().length > 0)
  );

  const handleSubmit = () => {
    if (!canContinue) return;

    onSubmit({
      executed: executed === true,
      ...(executed === false ? {
        reason,
        ...(reason === "Other" ? { otherReason: otherReason.trim() } : {})
      } : {})
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
              <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded uppercase">
                Step 2 of 4
              </span>
              <h1 className="font-bold text-slate-900 text-base leading-none">
                Execution Check
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Confirm whether the PicOS activity was executed in store.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span>1. Setup</span>
          <span className="text-slate-300">-&gt;</span>
          <span className="text-red-600 uppercase border-b border-red-600 pb-0.5">2. Execution Check</span>
          <span className="text-slate-300">-&gt;</span>
          <span>3. After Photo</span>
          <span className="text-slate-300">-&gt;</span>
          <span>4. Summary</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-950 text-lg">Did you execute this display?</h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Select yes if the activity was completed. If not, capture the reason so the next action is clear.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => setExecuted(true)}
                className={`py-4 px-4 rounded border text-sm font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                  executed === true
                    ? "bg-slate-950 border-slate-950 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setExecuted(false)}
                className={`py-4 px-4 rounded border text-sm font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                  executed === false
                    ? "bg-slate-950 border-slate-950 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                No
              </button>
            </div>
          </section>

          {executed === true && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-emerald-900">Great, execution confirmed.</h3>
                <p className="text-sm text-emerald-800 mt-1">Continue to capture the completed activity photo.</p>
              </div>
            </section>
          )}

          {executed === false && (
            <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div>
                <h2 className="font-bold text-slate-950 text-base">Why was it not executed?</h2>
                <p className="text-sm text-slate-500 mt-1">Choose the closest reason, or write one in.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {reasons.map(option => (
                  <button
                    key={option}
                    onClick={() => setReason(option)}
                    className={`py-3 px-4 rounded border text-sm font-semibold cursor-pointer transition-colors ${
                      reason === option
                        ? "bg-slate-950 border-slate-950 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {reason === "Other" && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Other reason
                  </span>
                  <textarea
                    value={otherReason}
                    onChange={(event) => setOtherReason(event.target.value)}
                    rows={3}
                    placeholder="Enter reason"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500 resize-none"
                  />
                </label>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
        <button
          id="submit-execution-check"
          onClick={handleSubmit}
          disabled={!canContinue}
          className={`font-semibold py-3 px-8 rounded text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
            canContinue
              ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          }`}
        >
          {executed === true ? "Continue to Camera" : "Continue to Summary"} <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}
