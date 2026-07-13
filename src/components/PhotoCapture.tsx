import React, { useState } from "react";
import { FlowType, IMAGES, StoreInfo } from "../types";
import { ArrowLeft, Camera, RefreshCw, Check, AlertCircle, HelpCircle, Eye } from "lucide-react";

interface PhotoCaptureProps {
  store: StoreInfo;
  photoType: "BEFORE" | "AFTER";
  flowType: FlowType;
  onConfirmPhoto: () => void;
  onCancel: () => void;
}

export default function PhotoCapture({ store, photoType, flowType, onConfirmPhoto, onCancel }: PhotoCaptureProps) {
  const [isCaptured, setIsCaptured] = useState(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);

  // Determine correct background camera mockup based on BEFORE or AFTER
  const cameraMockImage = photoType === "BEFORE" ? IMAGES.cameraBefore : IMAGES.cameraAfter;
  const flowTitle = flowType === "EXECUTE_PICOS"
    ? "PicOS Execution"
    : flowType === "HUNT_SPACE"
      ? "Hunt Space Capture"
      : "Display SKU Optimization";

  const handleShutterClick = () => {
    setIsShutterFlashing(true);
    setTimeout(() => {
      setIsShutterFlashing(false);
      setIsCaptured(true);
    }, 400);
  };

  const handleRetake = () => {
    setIsCaptured(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Dark minimalist camera header */}
      <header className="bg-slate-950 border-b border-slate-900 px-6 py-4 flex items-center justify-between shrink-0 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                {photoType} PHOTO
              </span>
              <h1 className="font-sans font-bold text-slate-100 tracking-tight text-sm leading-none">
                {flowTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Align frame with display, shipper, or cooler boundaries
            </p>
          </div>
        </div>

        {/* Workflow Stepper Indicator (Dark themed) */}
        {flowType === "EXECUTE_PICOS" ? (
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-500">
            <span className="text-slate-400">1. Setup</span>
            <span className="text-slate-750">-&gt;</span>
            <span className="text-red-500 uppercase border-b border-red-500 pb-0.5">2. After Photo</span>
            <span className="text-slate-750">-&gt;</span>
            <span>3. Removal Survey</span>
            <span className="text-slate-750">-&gt;</span>
            <span>4. Finish</span>
          </div>
        ) : (
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-500">
          <span className="text-slate-400">1. Setup</span>
          <span className="text-slate-750">â†’</span>
          <span className={photoType === "BEFORE" ? "text-red-500 uppercase border-b border-red-500 pb-0.5" : "text-slate-400"}>2. Before Photo</span>
          <span className="text-slate-750">â†’</span>
          <span className={photoType === "AFTER" ? "text-red-500 uppercase border-b border-red-500 pb-0.5" : "text-slate-400"}>3. After Photo</span>
          <span className="text-slate-750">â†’</span>
          <span>4. Finish</span>
        </div>
        )}
      </header>

      {/* Main Viewfinder Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Shutter flash screen overlay */}
        {isShutterFlashing && (
          <div className="absolute inset-0 bg-white z-50 animate-fade-in pointer-events-none"></div>
        )}

        {/* Viewfinder Column */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 relative overflow-hidden">
          
          {/* Virtual Camera Viewfinder Chassis */}
          <div className="relative w-full max-w-3xl aspect-4/3 rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
            
            {/* Real mockup photo of cooler */}
            <img
              src={cameraMockImage}
              alt="Live Viewfinder feed"
              className={`w-full h-full object-cover transition-filter duration-350 ${
                isCaptured ? "contrast-105 brightness-100" : "contrast-95 brightness-90 saturate-85"
              }`}
              referrerPolicy="no-referrer"
            />

            {/* Simulated HUD Guide Box (Crosshair markings, green when ready) */}
            {!isCaptured && (
              <div className="absolute inset-8 border border-white/20 rounded pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-white/60"></div>
                  <div className="w-6 h-6 border-t-2 border-r-2 border-white/60"></div>
                </div>
                
                {/* Visual alignment help */}
                <div className="text-center">
                  <span className="text-[10px] font-mono tracking-wider text-white/50 bg-slate-950/70 py-1 px-3 rounded uppercase">
                    Align display borders within white brackets
                  </span>
                </div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-white/60"></div>
                  <div className="w-6 h-6 border-b-2 border-r-2 border-white/60"></div>
                </div>
              </div>
            )}

            {/* Top camera stats HUD */}
            <div className="absolute top-3 left-4 flex gap-3 text-[10px] font-mono text-white bg-slate-950/60 backdrop-blur-xs py-0.5 px-2 rounded-xs">
              <span className="text-red-500 font-bold">â— REC</span>
              <span>1080P/60</span>
              <span>ISO 120</span>
              <span>EV -0.3</span>
            </div>

            {/* Bottom GPS lock status HUD */}
            <div className="absolute bottom-3 left-4 text-[9px] font-mono text-white/85 bg-slate-950/60 backdrop-blur-xs py-1 px-2.5 rounded-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>GPS SYNCED: {store.routeId} AREA</span>
            </div>

            {/* CAPTURED BADGE OVERLAY */}
            {isCaptured && (
              <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <div className="w-14 h-14 bg-emerald-500 border border-emerald-400 rounded-full flex items-center justify-center text-slate-950 mb-3 animate-scale-up shadow-lg">
                  <Check className="h-8 w-8" />
                </div>
                <h4 className="font-bold text-sm tracking-wide uppercase font-mono">Image Capture Verified</h4>
                <p className="text-xs text-slate-300 mt-1">Image metadata is stamped & ready for submission</p>
              </div>
            )}

          </div>

        </div>

        {/* Controls Column (Right hand iPad UI) */}
        <div className="w-full md:w-[320px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-900 flex flex-col justify-between p-6 text-white shrink-0">
          
          {/* Top Panel - Guidance Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                {photoType} Operational Guidelines
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {photoType === "BEFORE" 
                  ? "Take a baseline photo before any restock or configuration adjustments are made. Avoid glare and capture the full execution area."
                  : flowType === "EXECUTE_PICOS"
                    ? "Capture the completed PicOS execution after standards have been locked and the display has been faced."
                    : flowType === "HUNT_SPACE"
                      ? "Capture the net-new display opportunity area after the hunt recommendation is placed or validated."
                      : "Capture the fully styled, faced, and priced display shelf setup. Must maintain identical distance and perspective as before."
                }
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 rounded border border-slate-850 space-y-2">
              <div className="flex gap-2 items-start text-xs text-slate-400">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Ensure product labels face forward (100% front facing).</span>
              </div>
              <div className="flex gap-2 items-start text-xs text-slate-400 pt-1.5 border-t border-slate-850">
                <HelpCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Verify that there are no empty cardboard cartons left inside the display shelf.</span>
              </div>
            </div>
          </div>

          {/* Bottom Panel - Shutter Action & Process navigation */}
          <div className="space-y-4 pt-6 border-t border-slate-900">
            {!isCaptured ? (
              <div className="flex flex-col items-center gap-3">
                {/* CIRCULAR SHUTTER BUTTON */}
                <button
                  id="camera-shutter"
                  onClick={handleShutterClick}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 active:bg-white/20 cursor-pointer group transition-all shrink-0"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 group-hover:scale-95 transition-all"></div>
                </button>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Tap shutter to capture
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  id="confirm-photo"
                  onClick={onConfirmPhoto}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {flowType === "EXECUTE_PICOS" ? "Continue to Survey" : "Confirm & Proceed"} <Check className="h-4 w-4" />
                </button>
                <button
                  id="retake-photo"
                  onClick={handleRetake}
                  className="w-full bg-transparent hover:bg-slate-900 text-slate-300 font-semibold py-2.5 px-4 rounded text-xs uppercase tracking-wider font-mono cursor-pointer border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retake Photo
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

