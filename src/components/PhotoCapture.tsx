import React, { useState } from "react";
import { FlowType, IMAGES, StoreInfo } from "../types";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";

interface PhotoCaptureProps {
  store: StoreInfo;
  photoType: "BEFORE" | "AFTER";
  flowType: FlowType;
  onConfirmPhoto: () => void;
  onCancel: () => void;
}

export default function PhotoCapture({ photoType, flowType, onConfirmPhoto, onCancel }: PhotoCaptureProps) {
  const [isCaptured, setIsCaptured] = useState(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const cameraMockImage = photoType === "BEFORE" ? IMAGES.cameraBefore : IMAGES.cameraAfter;
  const direction = flowType === "EXECUTE_PICOS"
    ? "Capture the completed PicOS activity."
    : flowType === "HUNT_SPACE"
      ? "Capture the display opportunity."
      : "Capture the optimized display.";

  const handleShutterClick = () => {
    setIsShutterFlashing(true);
    setTimeout(() => {
      setIsShutterFlashing(false);
      setIsCaptured(true);
    }, 400);
  };

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden relative">
      <button
        id="photo-back"
        onClick={onCancel}
        className="absolute top-4 left-4 z-20 bg-black/70 hover:bg-black text-white border border-white/30 rounded px-4 py-2 text-xs uppercase tracking-wider font-mono cursor-pointer flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <button
        id="skip-photo"
        onClick={onConfirmPhoto}
        className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-black text-white border border-white/30 rounded px-4 py-2 text-xs uppercase tracking-wider font-mono cursor-pointer"
      >
        Skip
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white border border-white/20 rounded px-4 py-2 text-xs font-medium">
        {direction}
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4 pb-28">
        {isShutterFlashing && (
          <div className="absolute inset-0 bg-white z-50 animate-fade-in pointer-events-none"></div>
        )}

        <div className="relative w-full max-w-5xl aspect-4/3 rounded overflow-hidden bg-slate-900">
          <img
            src={cameraMockImage}
            alt="Camera"
            className={`w-full h-full object-cover transition-filter duration-350 ${
              isCaptured ? "contrast-105 brightness-100" : "contrast-95 brightness-90 saturate-85"
            }`}
            referrerPolicy="no-referrer"
          />

          {isCaptured && (
            <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 animate-scale-up">
                <Check className="h-8 w-8" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-20 bg-black/80 backdrop-blur-xs p-5 flex items-center justify-center">
        {!isCaptured ? (
          <button
            id="camera-shutter"
            onClick={handleShutterClick}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 active:bg-white/20 cursor-pointer group transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-red-600 group-hover:scale-95 transition-all"></div>
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              id="confirm-photo"
              onClick={onConfirmPhoto}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {flowType === "EXECUTE_PICOS" ? "Continue to Survey" : "Confirm & Proceed"} <Check className="h-4 w-4" />
            </button>
            <button
              id="retake-photo"
              onClick={() => setIsCaptured(false)}
              className="bg-transparent hover:bg-slate-900 text-slate-300 font-semibold py-3 px-6 rounded text-xs uppercase tracking-wider font-mono cursor-pointer border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retake
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
