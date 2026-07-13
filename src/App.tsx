import React, { useState } from "react";
import { FlowType, Screen, PicOSConstraints, OptimizeConstraints, RemovalSurveyResult, StoreInfo } from "./types";
import { DEFAULT_STORE } from "./data/picosStores";
import StoreSelector from "./components/StoreSelector";
import StoreActionHub from "./components/StoreActionHub";
import HuntWorkflow from "./components/HuntWorkflow";
import ExecutePicOS from "./components/ExecutePicOS";
import OptimizeDisplay from "./components/OptimizeDisplay";
import PhotoCapture from "./components/PhotoCapture";
import RemovalSurvey from "./components/RemovalSurvey";
import Summary from "./components/Summary";
import SignInScreen from "./components/SignInScreen";
import { Sparkles, Check, X } from "lucide-react";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.STORE_SELECTOR);
  const [selectedStore, setSelectedStore] = useState<StoreInfo>(DEFAULT_STORE);
  
  // Workflow coordination state
  const [flowType, setFlowType] = useState<FlowType>("EXECUTE_PICOS");
  const [picosConstraints, setPicosConstraints] = useState<PicOSConstraints | null>(null);
  const [optimizeConstraints, setOptimizeConstraints] = useState<OptimizeConstraints | null>(null);
  const [removalSurvey, setRemovalSurvey] = useState<RemovalSurveyResult | null>(null);
  
  // Toast Alert Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close visit simulation state
  const [isVisitClosed, setIsVisitClosed] = useState(false);

  // Show a toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Screen Routing Logic
  const handleStartVisit = (store: StoreInfo) => {
    setSelectedStore(store);
    setPicosConstraints(null);
    setOptimizeConstraints(null);
    setRemovalSurvey(null);
    setCurrentScreen(Screen.ACTION_HUB);
    triggerToast(`Store Visit Session Commenced successfully at ${store.storeName}`);
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleBackToHub = () => {
    setCurrentScreen(Screen.ACTION_HUB);
  };

  const handleBackToSelector = () => {
    setCurrentScreen(Screen.STORE_SELECTOR);
  };

  // Hunt actions to proceed directly into photo captures
  const handleHuntSelectAction = (nextScreen: Screen, selectedFlow: FlowType) => {
    setFlowType(selectedFlow);
    setCurrentScreen(selectedFlow === "EXECUTE_PICOS" ? Screen.EXECUTE_PICOS : nextScreen);
    triggerToast(`Initiating ${selectedFlow === "HUNT_SPACE" ? "Hunt Space Capture" : selectedFlow === "EXECUTE_PICOS" ? "PicOS Execution" : "SKU Optimization"}`);
  };

  // Optimize configuration complete
  const handleProceedToBeforePhoto = (selectedFlow: "OPTIMIZE_DISPLAY", constraints: OptimizeConstraints) => {
    setFlowType(selectedFlow);
    setOptimizeConstraints(constraints);
    setCurrentScreen(Screen.BEFORE_PHOTO);
  };

  // PicOS configuration complete
  const handleProceedToPicosAfterPhoto = (constraints: PicOSConstraints) => {
    setFlowType("EXECUTE_PICOS");
    setPicosConstraints(constraints);
    setRemovalSurvey(null);
    setCurrentScreen(Screen.AFTER_PHOTO);
  };

  // Before photo captured
  const handleConfirmBeforePhoto = () => {
    setCurrentScreen(Screen.AFTER_PHOTO);
    triggerToast("Before Photo stamped & saved. Capture the optimized display after photo.");
  };

  // After photo captured
  const handleConfirmAfterPhoto = () => {
    if (flowType === "EXECUTE_PICOS") {
      setCurrentScreen(Screen.REMOVAL_SURVEY);
      triggerToast("After Photo stamped & saved. Complete removal survey.");
    } else {
      setCurrentScreen(Screen.SUMMARY);
      triggerToast("After Photo stamped & saved. Recalculating compliance.");
    }
  };

  const handleSubmitRemovalSurvey = (result: RemovalSurveyResult) => {
    setRemovalSurvey(result);
    setCurrentScreen(Screen.SUMMARY);
    triggerToast("Removal survey saved. Preparing PicOS summary.");
  };

  // Finish workflow and return to hub
  const handleFinishWorkflow = () => {
    setCurrentScreen(Screen.ACTION_HUB);
    triggerToast(`Congratulations! ${flowType === "HUNT_SPACE" ? "Hunt Space" : flowType === "EXECUTE_PICOS" ? "PicOS Execution" : "SKU Optimization"} successfully synced to Liberty B2B Portal.`);
  };

  // Close Visit
  const handleCloseVisitSession = () => {
    setIsVisitClosed(true);
  };

  const handleResetApp = () => {
    setIsVisitClosed(false);
    setCurrentScreen(Screen.STORE_SELECTOR);
    setPicosConstraints(null);
    setOptimizeConstraints(null);
    setRemovalSurvey(null);
  };

  if (!isSignedIn) {
    return <SignInScreen onSignIn={() => setIsSignedIn(true)} />;
  }

  return (
    <div className="w-full h-screen font-sans bg-slate-50 relative select-none">
      
      {/* RENDER ACTIVE SCREEN */}
      {currentScreen === Screen.STORE_SELECTOR && (
        <StoreSelector
          selectedStore={selectedStore}
          onStartVisit={handleStartVisit}
        />
      )}

      {currentScreen === Screen.ACTION_HUB && (
        <StoreActionHub
          store={selectedStore}
          onBackToSelector={handleBackToSelector}
          onNavigate={handleNavigate}
          onCloseVisit={handleCloseVisitSession}
        />
      )}

      {currentScreen === Screen.HUNT_WORKFLOW && (
        <HuntWorkflow
          store={selectedStore}
          onBackToHub={handleBackToHub}
          onSelectAction={handleHuntSelectAction}
        />
      )}

      {currentScreen === Screen.EXECUTE_PICOS && (
        <ExecutePicOS
          store={selectedStore}
          onBackToHub={handleBackToHub}
          onProceedToAfterPhoto={handleProceedToPicosAfterPhoto}
        />
      )}

      {currentScreen === Screen.OPTIMIZE_DISPLAY && (
        <OptimizeDisplay
          store={selectedStore}
          onBackToHub={handleBackToHub}
          onProceedToBeforePhoto={handleProceedToBeforePhoto}
        />
      )}

      {currentScreen === Screen.BEFORE_PHOTO && (
        <PhotoCapture
          store={selectedStore}
          photoType="BEFORE"
          flowType={flowType}
          onConfirmPhoto={handleConfirmBeforePhoto}
          onCancel={() => {
            setCurrentScreen(flowType === "HUNT_SPACE" ? Screen.HUNT_WORKFLOW : Screen.OPTIMIZE_DISPLAY);
          }}
        />
      )}

      {currentScreen === Screen.AFTER_PHOTO && (
        <PhotoCapture
          store={selectedStore}
          photoType="AFTER"
          flowType={flowType}
          onConfirmPhoto={handleConfirmAfterPhoto}
          onCancel={() => setCurrentScreen(flowType === "EXECUTE_PICOS" ? Screen.EXECUTE_PICOS : Screen.BEFORE_PHOTO)}
        />
      )}

      {currentScreen === Screen.REMOVAL_SURVEY && (
        <RemovalSurvey
          store={selectedStore}
          picosConstraints={picosConstraints}
          onBackToPhoto={() => setCurrentScreen(Screen.AFTER_PHOTO)}
          onSubmit={handleSubmitRemovalSurvey}
        />
      )}

      {currentScreen === Screen.SUMMARY && (
        <Summary
          store={selectedStore}
          flowType={flowType}
          picosConstraints={picosConstraints}
          removalSurvey={removalSurvey}
          onFinish={handleFinishWorkflow}
          onCloseVisit={handleCloseVisitSession}
        />
      )}

      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-slate-900 text-white text-xs font-semibold px-4.5 py-3 rounded-md shadow-xl border border-slate-800 flex items-center gap-3 animate-slide-up z-50 max-w-md">
          <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="leading-normal">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* CLOSE VISIT OVERLAY MODAL */}
      {isVisitClosed && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-6 text-center animate-scale-up">
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-950">Store Visit Synchronized</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              All field audits, planograms, checklists and photo coordinates have been permanently committed to the Liberty B2B database.
            </p>

            <div className="my-5 p-3.5 bg-slate-50 rounded text-left space-y-1.5 font-mono text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Account Visited:</span>
                <span className="font-bold text-slate-900">{selectedStore.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Actions:</span>
                <span className="font-bold text-slate-900">{selectedStore.picosBoxes.length} PicOS Activities Loaded</span>
              </div>
              <div className="flex justify-between">
                <span>Sync Code:</span>
                <span className="font-bold text-emerald-600">{selectedStore.routeId}-SYNC-OK</span>
              </div>
            </div>

            <button
              onClick={handleResetApp}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 rounded text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors"
            >
              Close Visit & Load Next Store
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
