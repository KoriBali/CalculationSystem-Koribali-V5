import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useProjectStorage } from "./useProjectStorage";

import { validateFoundation } from "../logic/foundation/foundationValidation";
import { executeFoundationCalculation } from "../logic/foundation/foundationCalculation";
import { scrollToFirstError, firstErrorMessage } from "../utils/scrollToError";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";

import * as Utils from "../utils";

// Main custom hook to manage foundation form state and workflow
export function useFoundationForm() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");

  // Safely retrieve condition data from session storage
  const getCondition = () => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}",
      );
    } catch {
      return {};
    }
  };

  const condition = getCondition();

  // Read workflow flags from sessionStorage
  const workflow = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_workflow`) || "{}"
      ) || {};
    } catch {
      return {};
    }
  })();


  // ================= STATE =================

  // Foundation type state (square caisson / round caisson)
  const [foundationType, setFoundationType] = useProjectStorage(
    projectType,
    "foundationType",
    {
      type: "",
    },
  );

  // Square Caisson type input state
  const [squareCaisson, setSquareCaisson] = useProjectStorage(
    projectType,
    "squareCaisson",
    {
      foundationWidthX: "",
      foundationWidthY: "",
      embedmentDepth: "",
      nValue: "",
      yValue: "",
      ycValue: "",
      alphaValue: "",
    },
  );

  // Round Caisson type input state
  const [roundCaisson, setRoundCaisson] = useProjectStorage(
    projectType,
    "roundCaisson",
    {
      foundationWidthX: "",
      foundationWidthY: "",
      embedmentDepth: "",
      nValue: "",
      yValue: "",
      ycValue: "",
      alphaValue: "",
    },
  );

  // Calculated result state
  const [calculatedFoundation, setCalculatedFoundation] = useProjectStorage(
    projectType,
    "calculatedFoundation",
    null,
  );

  // Toggle to show/hide results
  const [showResultsFoundation, setShowResultsFoundation] = useProjectStorage(
    projectType,
    "showResultsFoundation",
    false,
  );

  // Validation error states for each section
  const [foundationTypeErrors, setFoundationTypeErrors] = useState({});
  const [squareCaissonErrors, setSquareCaissonErrors] = useState({});
  const [roundCaissonErrors, setRoundCaissonErrors] = useState({});

  // UI expand/collapse states
  const [isFoundationExpanded, setIsFoundationExpanded] = useState(true);
  const [isSelectExpanded, setIsSelectExpanded] = useState(true);

  // Loading and calculation status
  const [loading, setLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useProjectStorage(
    projectType,
    "isCalculatedFd",
    false
  );

  // If there are no calculated results yet, isCalculated must be false
  useEffect(() => {
    if ((!calculatedFoundation || Object.keys(calculatedFoundation).length === 0) && isCalculated) {
      setIsCalculated(false);
      sessionStorage.removeItem(`${projectType}_isCalculatedFd`);
      notifyCalculationProgressChanged();
    }
  }, [calculatedFoundation, isCalculated, setIsCalculated, projectType]);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Helper to show toast messages
  const showToast = (message, type = "error") => {
    setToast({ message, type });
  };

  // Navigation helper for multi-step flow
  const { buttonLabel, nextStep, prevStep, isLast } = Utils.getStepNavigation(
    condition,
    "foundation",
    workflow.withReport
  );

  // ================= HANDLERS =================

  // Any edit after a calculation invalidates it — the stored result no
  // longer matches the current inputs, so Calculate should go back to
  // being the primary action (and Next back to disabled) until the user
  // recalculates. Cheap to call unconditionally: setting an already-null
  // value is a no-op re-render-wise.
  const invalidateCalculation = () => {
    setIsCalculated(false);
    // Header nav reads this flag straight from sessionStorage to lock/
    // unlock tabs, which a plain state update can't itself prompt it to
    // re-read — this nudges it to re-render right away.
    notifyCalculationProgressChanged();
  };

  // Update foundation type
  const handleFoundationTypeUpdate = (updates) => {
    Utils.updateFoundationType(foundationType, updates, setFoundationType);
    invalidateCalculation();

    setFoundationTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Update Square Caisson Type inputs and clear related errors
  const handleSquareCaissonUpdate = (updates) => {
    Utils.updateSquareCaisson(squareCaisson, updates, setSquareCaisson);
    invalidateCalculation();

    setSquareCaissonErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Update Round Caisson Type inputs and clear related errors
  const handleRoundCaissonUpdate = (updates) => {
    Utils.updateRoundCaisson(roundCaisson, updates, setRoundCaisson);
    invalidateCalculation();

    setRoundCaissonErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Handle calculation flow (validation + API call)
  const handleCalculate = async () => {
    // Reset all error states before validation
    setFoundationTypeErrors({});
    setSquareCaissonErrors({});
    setRoundCaissonErrors({});

    // Run validation logic
    const validation = await validateFoundation({
      foundationType,
      squareCaisson,
      roundCaisson,
    });

    // Handle validation failure
    if (!validation.isValid) {
      setFoundationTypeErrors(validation.typeErrors || {});
      setSquareCaissonErrors(validation.squareCaissonErrors || {});
      setRoundCaissonErrors(validation.roundCaissonErrors || {});

      const firstErrors =
        validation.typeErrors || validation.squareCaissonErrors || validation.roundCaissonErrors || {};
      showToast(firstErrorMessage(firstErrors) || validation.message);
      scrollToFirstError(firstErrors);
      return;
    }

    try {
      // Start loading state
      setLoading(true);

      // Execute API calculation
      const data = await executeFoundationCalculation({
        foundationType,
        squareCaisson,
        roundCaisson,
      });

      // Save calculated result
      setCalculatedFoundation({
        ...data,
        foundationType,
      });

      // Update UI state after success
      setShowResultsFoundation(true);
      setIsCalculated(true);
      // Let Header re-read sessionStorage now — otherwise the next tab
      // stays locked-looking until the user also clicks Next and navigates.
      notifyCalculationProgressChanged();
    } catch (err) {
      // Handle API or unexpected errors
      showToast(err?.message || "Something went wrong");
    } finally {
      // Stop loading state
      setLoading(false);
    }
  };

  // Handle navigation to next step or finish flow
  const handleFinish = (force = false) => {
    if (!isCalculated && !force) return;

    if (isLast) {
      return "OPEN_COVER";
    }

    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${nextStep}`
        : `/projects/${projectType}/${draftId}/${nextStep}`
    );
  };

  // Navigates back to the previous step (pole, opening, or baseplate — whichever is enabled)
  const handleBack = () => {
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${prevStep}`
        : `/projects/${projectType}/${draftId}/${prevStep}`
    );
  };

  // Mapping for UI labels
  const typeLabelMap = {
    "square-caisson": "Square Caisson Type",
    "round-caisson": "Round Caisson Type",
  };

  // ================= RETURN =================

  return {
    // State
    foundationType,
    squareCaisson,
    roundCaisson,
    foundationTypeErrors,
    squareCaissonErrors,
    roundCaissonErrors,
    isFoundationExpanded,
    isSelectExpanded,
    isCalculated,
    showResultsFoundation, // PERBAIKAN: Sinkronisasi nama (tambah s) agar sesuai view
    calculatedFoundation,
    buttonLabel,
    toast,
    typeLabelMap,
    loading,
    nextStep,
    prevStep,
    isLast,

    // Actions
    setIsFoundationExpanded,
    setIsSelectExpanded,
    handleFoundationTypeUpdate,
    handleSquareCaissonUpdate,
    handleRoundCaissonUpdate,
    handleCalculate,
    handleFinish,
    handleBack,
    setToast,
    showToast,
  };
}
