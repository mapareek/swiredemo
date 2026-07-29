import React, { useState } from "react";
import { ActivityOutcome, ExecutionCheckResult, FlowLiftMetrics, FlowType, Screen, PicOSConstraints, OptimizeConstraints, StoreInfo } from "./types";
import { DEFAULT_STORE } from "./data/picosStores";
import SignInScreen from "./components/SignInScreen";
import StoreSelector from "./components/StoreSelector";
import StoreActionHub from "./components/StoreActionHub";
import HuntWorkflow from "./components/HuntWorkflow";
import ExecutePicOS from "./components/ExecutePicOS";
import OptimizeDisplay from "./components/OptimizeDisplay";
import PhotoCapture from "./components/PhotoCapture";
import RemovalSurvey from "./components/RemovalSurvey";
import MerchandiserExport from "./components/MerchandiserExport";
import Summary from "./components/Summary";
import { Check, X } from "lucide-react";

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SIGN_IN);
  const [selectedStore, setSelectedStore] = useState<StoreInfo>(DEFAULT_STORE);
  
  // Workflow coordination state
  const [flowType, setFlowType] = useState<FlowType>("EXECUTE_PICOS");
  const [picosConstraints, setPicosConstraints] = useState<PicOSConstraints | null>(null);
  const [optimizeConstraints, setOptimizeConstraints] = useState<OptimizeConstraints | null>(null);
  const [flowLiftMetrics, setFlowLiftMetrics] = useState<FlowLiftMetrics | null>(null);
  const [executionCheck, setExecutionCheck] = useState<ExecutionCheckResult | null>(null);
  const [activityOutcomes, setActivityOutcomes] = useState<Record<string, ActivityOutcome>>({});
  const [lastActivityOutcomeId, setLastActivityOutcomeId] = useState<string | null>(null);
  const [huntOutcomes, setHuntOutcomes] = useState<Record<string, string>>({});
  const [pendingHuntOpportunityId, setPendingHuntOpportunityId] = useState<string | null>(null);
  
  // Toast Alert Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"default" | "success">("default");

  // Close visit simulation state
  const [isVisitClosed, setIsVisitClosed] = useState(false);

  // Show a toast message
  const triggerToast = (msg: string, tone: "default" | "success" = "default") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Screen Routing Logic
  const handleStartVisit = (store: StoreInfo) => {
    setSelectedStore(store);
    setPicosConstraints(null);
    setOptimizeConstraints(null);
    setFlowLiftMetrics(null);
    setExecutionCheck(null);
    setActivityOutcomes({});
    setLastActivityOutcomeId(null);
    setHuntOutcomes({});
    setPendingHuntOpportunityId(null);
    setCurrentScreen(Screen.ACTION_HUB);
    triggerToast(`Visit started at ${store.storeName}`);
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleSignIn = () => {
    setCurrentScreen(Screen.STORE_SELECTOR);
    triggerToast("Signed in. Select a store to begin.");
  };

  const handleBackToHub = () => {
    setCurrentScreen(Screen.ACTION_HUB);
  };

  const handleBackToSelector = () => {
    setCurrentScreen(Screen.STORE_SELECTOR);
  };

  // Hunt actions to proceed directly into photo captures
  const handleHuntSelectAction = (nextScreen: Screen, selectedFlow: FlowType, metrics?: FlowLiftMetrics, opportunityId?: string) => {
    setFlowType(selectedFlow);
    setFlowLiftMetrics(metrics || null);
    setPendingHuntOpportunityId(selectedFlow === "HUNT_SPACE" ? opportunityId || null : null);
    setCurrentScreen(selectedFlow === "EXECUTE_PICOS" ? Screen.EXECUTE_PICOS : selectedFlow === "HUNT_SPACE" ? Screen.AFTER_PHOTO : nextScreen);
    triggerToast(`Initiating ${selectedFlow === "HUNT_SPACE" ? "Hunt Space Capture" : selectedFlow === "EXECUTE_PICOS" ? "PicOS Execution" : "SKU Optimization"}`);
  };

  // Optimize configuration complete
  const handleProceedToOptimizePhoto = (selectedFlow: "OPTIMIZE_DISPLAY", constraints: OptimizeConstraints) => {
    setFlowType(selectedFlow);
    setOptimizeConstraints(constraints);
    setFlowLiftMetrics(null);
    setCurrentScreen(Screen.AFTER_PHOTO);
  };

  // PicOS configuration complete
  const handleProceedToPicosOutcome = (constraints: PicOSConstraints) => {
    setFlowType("EXECUTE_PICOS");
    setPicosConstraints(constraints);
    setFlowLiftMetrics(null);
    setExecutionCheck(null);
    setCurrentScreen(Screen.REMOVAL_SURVEY);
    triggerToast("Activity recorded. Confirm execution outcome.");
  };

  // Before photo captured
  const handleConfirmBeforePhoto = () => {
    setCurrentScreen(Screen.AFTER_PHOTO);
    triggerToast("Photo saved. Capture the final display photo.");
  };

  // After photo captured
  const handleConfirmAfterPhoto = () => {
    if (flowType === "EXECUTE_PICOS") {
      setCurrentScreen(Screen.EXECUTE_PICOS);
      triggerToast("Outcome saved.", "success");
      return;
    }
    if (flowType === "HUNT_SPACE") {
      if (pendingHuntOpportunityId) {
        setHuntOutcomes(prev => ({
          ...prev,
          [pendingHuntOpportunityId]: new Date().toISOString()
        }));
      }
      setPendingHuntOpportunityId(null);
      setCurrentScreen(Screen.HUNT_WORKFLOW);
      triggerToast("Outcome saved.", "success");
      return;
    }
    setCurrentScreen(Screen.SUMMARY);
    triggerToast("After Photo stamped & saved. Recalculating compliance.");
  };

  const handleSubmitExecutionCheck = (result: ExecutionCheckResult) => {
    setExecutionCheck(result);
    if (picosConstraints?.directiveId) {
      const outcome: ActivityOutcome = {
        ...result,
        directiveId: picosConstraints.directiveId,
        recordedAt: new Date().toISOString()
      };
      setActivityOutcomes(prev => ({
        ...prev,
        [outcome.directiveId]: outcome
      }));
      setLastActivityOutcomeId(outcome.directiveId);
    }
    if (result.executed === true) {
      setCurrentScreen(Screen.AFTER_PHOTO);
      triggerToast("Execution confirmed. Capture the completed activity.");
      return;
    }
    if (result.executed === false && result.reason === "Merchandiser visit needed") {
      setCurrentScreen(Screen.MERCHANDISER_EXPORT);
      triggerToast("Execution status saved. Preparing merchandiser PDF handoff.");
      return;
    }
    setCurrentScreen(Screen.EXECUTE_PICOS);
    triggerToast("Outcome saved.", "success");
  };

  const handleUndoActivityOutcome = (directiveId: string) => {
    const outcome = activityOutcomes[directiveId];
    setActivityOutcomes(prev => {
      const next = { ...prev };
      delete next[directiveId];
      return next;
    });
    setLastActivityOutcomeId(prev => (prev === directiveId ? null : prev));
    if (picosConstraints?.directiveId === directiveId) {
      setExecutionCheck(null);
    }
    triggerToast(outcome ? "Activity outcome undone." : "Activity outcome cleared.");
  };

  // Finish workflow and return to the originating list/workflow
  const handleFinishWorkflow = () => {
    if (flowType === "EXECUTE_PICOS") {
      setCurrentScreen(Screen.EXECUTE_PICOS);
    } else if (flowType === "HUNT_SPACE") {
      setCurrentScreen(Screen.HUNT_WORKFLOW);
    } else {
      setCurrentScreen(Screen.ACTION_HUB);
    }
    triggerToast(`${flowType === "HUNT_SPACE" ? "Hunt Space" : flowType === "EXECUTE_PICOS" ? "PicOS Execution" : "SKU Optimization"} successfully synced.`);
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
    setFlowLiftMetrics(null);
    setExecutionCheck(null);
    setActivityOutcomes({});
    setLastActivityOutcomeId(null);
    setHuntOutcomes({});
    setPendingHuntOpportunityId(null);
  };

  return (
    <div className="w-full h-screen font-sans bg-slate-50 relative select-none">
      
      {/* RENDER ACTIVE SCREEN */}
      {currentScreen === Screen.SIGN_IN && (
        <SignInScreen onSignIn={handleSignIn} />
      )}

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
          huntOutcomes={huntOutcomes}
          onBackToHub={handleBackToHub}
          onSelectAction={handleHuntSelectAction}
        />
      )}

      {currentScreen === Screen.EXECUTE_PICOS && (
        <ExecutePicOS
          store={selectedStore}
          activityOutcomes={activityOutcomes}
          lastActivityOutcomeId={lastActivityOutcomeId}
          onBackToHub={handleBackToHub}
          onUndoActivityOutcome={handleUndoActivityOutcome}
          onProceedToAfterPhoto={handleProceedToPicosOutcome}
        />
      )}

      {currentScreen === Screen.OPTIMIZE_DISPLAY && (
        <OptimizeDisplay
          store={selectedStore}
          onBackToHub={handleBackToHub}
          onProceedToAfterPhoto={handleProceedToOptimizePhoto}
        />
      )}

      {currentScreen === Screen.BEFORE_PHOTO && (
        <PhotoCapture
          store={selectedStore}
          photoType="BEFORE"
          flowType={flowType}
          onConfirmPhoto={handleConfirmBeforePhoto}
          onCancel={() => setCurrentScreen(flowType === "HUNT_SPACE" ? Screen.HUNT_WORKFLOW : Screen.OPTIMIZE_DISPLAY)}
        />
      )}

      {currentScreen === Screen.AFTER_PHOTO && (
        <PhotoCapture
          store={selectedStore}
          photoType="AFTER"
          flowType={flowType}
          onConfirmPhoto={handleConfirmAfterPhoto}
          onCancel={() => setCurrentScreen(flowType === "EXECUTE_PICOS" ? Screen.REMOVAL_SURVEY : flowType === "HUNT_SPACE" ? Screen.HUNT_WORKFLOW : Screen.OPTIMIZE_DISPLAY)}
        />
      )}

      {currentScreen === Screen.REMOVAL_SURVEY && (
        <RemovalSurvey
          onBackToPhoto={() => setCurrentScreen(Screen.EXECUTE_PICOS)}
          onSubmit={handleSubmitExecutionCheck}
        />
      )}

      {currentScreen === Screen.MERCHANDISER_EXPORT && (
        <MerchandiserExport
          store={selectedStore}
          picosConstraints={picosConstraints}
          executionCheck={executionCheck}
          onBack={() => setCurrentScreen(Screen.REMOVAL_SURVEY)}
          onContinue={() => {
            setCurrentScreen(Screen.EXECUTE_PICOS);
            triggerToast("Outcome saved.", "success");
          }}
        />
      )}

      {currentScreen === Screen.SUMMARY && (
        <Summary
          store={selectedStore}
          flowType={flowType}
          picosConstraints={picosConstraints}
          optimizeConstraints={optimizeConstraints}
          flowLiftMetrics={flowLiftMetrics}
          executionCheck={executionCheck}
          onFinish={handleFinishWorkflow}
          onCloseVisit={handleCloseVisitSession}
        />
      )}

      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className={`fixed bottom-6 left-6 text-xs font-semibold px-4.5 py-3 rounded-md shadow-xl flex items-center gap-3 animate-slide-up z-50 max-w-md ${
          toastTone === "success"
            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
            : "bg-slate-900 text-white border border-slate-800"
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            toastTone === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}>
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="leading-normal">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className={`ml-2 ${
            toastTone === "success" ? "text-emerald-700 hover:text-emerald-950" : "text-slate-400 hover:text-white"
          }`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* CLOSE VISIT OVERLAY MODAL */}
      {isVisitClosed && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-6 text-center animate-scale-up">
            <h3 className="text-lg font-bold text-slate-950 mb-5">Are you sure</h3>

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
