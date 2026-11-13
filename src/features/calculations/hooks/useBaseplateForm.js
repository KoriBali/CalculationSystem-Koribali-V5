import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useProjectStorage } from "./useProjectStorage";

import { validateBaseplate } from "../logic/baseplate/baseplateValidation";
import { executeBaseplateCalculation } from "../logic/baseplate/baseplateCalculation";
import { scrollToFirstError, firstErrorMessage } from "../utils/scrollToError";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";
import {
  STANDARD_BASEPLATE_TYPE,
  STANDARD_FOUR_RIB_TYPE,
} from "../constants/standardPoleDefaults";

import * as Utils from "../utils";

// Main custom hook to manage baseplate form state and workflow
export function useBaseplateForm() {
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
  const isStandard = condition?.poleType === "standard";

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

  // Baseplate type state (4 rib / 8 rib)
  const [baseplateType, setBaseplateType] = useProjectStorage(
    projectType,
    "baseplateType",
    isStandard ? STANDARD_BASEPLATE_TYPE : { type: "" },
  );

  // 4 Rib type input state
  const [fourRibType, setFourRibType] = useProjectStorage(
    projectType,
    "fourRibType",
    isStandard
      ? STANDARD_FOUR_RIB_TYPE
      : {
          bpWidthEW: "",
          bpWidthNS: "",
          anchorPitchEW: "",
          anchorPitchNS: "",
          anchorDia: "",
          anchorCount: "",
          anchorCountTension: "",
          bpThickness: "",
          ribHeight: "",
          ribScallop: "",
          weldLeg: "",
          ribLength: "",
          ribThickness: "",
        },
  );

  // Auto-select 4 Rib and auto-fill defaults for Standard Pole
  useEffect(() => {
    if (isStandard) {
      setBaseplateType((prev) =>
        !prev?.type ? STANDARD_BASEPLATE_TYPE : prev,
      );
      setFourRibType((prev) => {
        if (!prev?.bpWidthEW && !prev?.anchorPitchEW) {
          return {
            ...prev,
            bpWidthEW: prev?.bpWidthEW || STANDARD_FOUR_RIB_TYPE.bpWidthEW,
            bpWidthNS: prev?.bpWidthNS || STANDARD_FOUR_RIB_TYPE.bpWidthNS,
            anchorPitchEW:
              prev?.anchorPitchEW || STANDARD_FOUR_RIB_TYPE.anchorPitchEW,
            anchorPitchNS:
              prev?.anchorPitchNS || STANDARD_FOUR_RIB_TYPE.anchorPitchNS,
            anchorDia: prev?.anchorDia || STANDARD_FOUR_RIB_TYPE.anchorDia,
            anchorCount:
              prev?.anchorCount || STANDARD_FOUR_RIB_TYPE.anchorCount,
            anchorCountTension:
              prev?.anchorCountTension ||
              STANDARD_FOUR_RIB_TYPE.anchorCountTension,
            bpThickness:
              prev?.bpThickness || STANDARD_FOUR_RIB_TYPE.bpThickness,
            ribHeight: prev?.ribHeight || STANDARD_FOUR_RIB_TYPE.ribHeight,
            weldLeg: prev?.weldLeg || STANDARD_FOUR_RIB_TYPE.weldLeg,
            ribScallop: prev?.ribScallop || STANDARD_FOUR_RIB_TYPE.ribScallop,
            ribLength: prev?.ribLength || STANDARD_FOUR_RIB_TYPE.ribLength,
            ribThickness:
              prev?.ribThickness || STANDARD_FOUR_RIB_TYPE.ribThickness,
          };
        }
        return prev;
      });
    }
  }, [isStandard, setBaseplateType, setFourRibType]);

  // 8 Rib type input state
  const [eightRibType, setEightRibType] = useProjectStorage(
    projectType,
    "eightRibType",
    {
      bpWidthEW: "",
      bpWidthNS: "",
      anchorPitchEW: "",
      anchorPitchNS: "",
      anchorDia: "",
      anchorCount: "",
      anchorCountTension: "",
      ribAngle: "",
      bpThickness: "",
      ribHeight: "",
      ribScallop: "",
      weldLeg: "",
      ribLength: "",
      ribThickness: "",
    },
  );

  // Calculated result state
  const [calculatedBaseplate, setCalculatedBaseplate] = useProjectStorage(
    projectType,
    "calculatedBaseplate",
    null,
  );

  // Toggle to show/hide results
  const [showResultsBaseplate, setShowResultsBaseplate] = useProjectStorage(
    projectType,
    "showResultsBaseplate",
    false,
  );

  // Validation error states for each section  // ── UI state ──

  const [baseplateTypeErrors, setBaseplateTypeErrors] = useState({});
  const [fourRibTypeErrors, setFourRibTypeErrors] = useState({});
  const [eightRibTypeErrors, setEightRibTypeErrors] = useState({});
  const [isBaseplateExpanded, setIsBaseplateExpanded] = useState(true);
  const [isSelectExpanded, setIsSelectExpanded] = useState(true);

  // Loading and calculation status
  const [loading, setLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useProjectStorage(
    projectType,
    "isCalculatedBp",
    false
  );

  // If there are no calculated results yet, isCalculated must be false
  useEffect(() => {
    if ((!calculatedBaseplate || Object.keys(calculatedBaseplate).length === 0) && isCalculated) {
      setIsCalculated(false);
      sessionStorage.removeItem(`${projectType}_isCalculatedBp`);
      notifyCalculationProgressChanged();
    }
  }, [calculatedBaseplate, isCalculated, setIsCalculated, projectType]);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // ── Navigation ──

  // Determines button label, next step path, and whether this is the last step
  const { buttonLabel, nextStep, prevStep, isLast } = Utils.getStepNavigation(
    condition,
    "baseplate",
    workflow.withReport
  );

  // ── Helpers ──

  // Displays a toast notification
  const showToast = (message, type = "error") => setToast({ message, type });

  // ── Update handlers ──

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

  const handleBaseplateTypeUpdate = (updates) => {
    Utils.updateBaseplateType(baseplateType, updates, setBaseplateType);
    invalidateCalculation();
    setBaseplateTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  const handleFourRibTypeUpdate = (updates) => {
    Utils.updateFourRibType(fourRibType, updates, setFourRibType);
    invalidateCalculation();
    setFourRibTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  const handleEightRibTypeUpdate = (updates) => {
    Utils.updateEightRibType(eightRibType, updates, setEightRibType);
    invalidateCalculation();
    setEightRibTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // ── Calculation ──

  // Validates inputs then calls the baseplate calculation API
  const handleCalculate = async () => {
    // Reset any previous errors
    setBaseplateTypeErrors({});
    setFourRibTypeErrors({});
    setEightRibTypeErrors({});

    const validation = await validateBaseplate({
      baseplateType,
      fourRibType,
      eightRibType,
    });

    if (!validation.isValid) {
      setBaseplateTypeErrors(validation.typeErrors || {});
      setFourRibTypeErrors(validation.fourRibTypeErrors || {});
      setEightRibTypeErrors(validation.eightRibTypeErrors || {});
      
      const firstErrors =
        validation.typeErrors || validation.fourRibTypeErrors || validation.eightRibTypeErrors || {};
      showToast(firstErrorMessage(firstErrors) || validation.message);
      scrollToFirstError(firstErrors);
      return;
    }

    try {
      setLoading(true);

      const data = await executeBaseplateCalculation({
        baseplateType,
        fourRibType,
        eightRibType,
      });

      // Persist result alongside its baseplate type for the result table
      setCalculatedBaseplate({ ...data, baseplateType });

      // Update UI state after success
      setShowResultsBaseplate(true);
      setIsCalculated(true);
      // Let Header re-read sessionStorage now — otherwise the next tab
      // stays locked-looking until the user also clicks Next and navigates.
      notifyCalculationProgressChanged();
    } catch (err) {
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

  // Navigates back to the previous step (pole, or opening if enabled)
  const handleBack = () => {
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${prevStep}`
        : `/projects/${projectType}/${draftId}/${prevStep}`
    );
  };

  // Mapping for UI labels
  const typeLabelMap = {
    "4rib": "4 Rib Type",
    "8rib": "8 Rib Type",
  };

  // ================= RETURN =================

  return {
    // State
    baseplateType,
    fourRibType,
    eightRibType,
    baseplateTypeErrors,
    fourRibTypeErrors,
    eightRibTypeErrors,
    isBaseplateExpanded,
    isSelectExpanded,
    isCalculated,
    showResultsBaseplate, // PERBAIKAN: Sinkronisasi nama (tambah s) agar sesuai dengan state dan view
    calculatedBaseplate,
    buttonLabel,
    toast,
    typeLabelMap,
    loading,
    nextStep,
    prevStep,
    isLast,

    // Actions
    setIsBaseplateExpanded,
    setIsSelectExpanded,
    handleBaseplateTypeUpdate,
    handleFourRibTypeUpdate,
    handleEightRibTypeUpdate,
    handleCalculate,
    handleFinish,
    handleBack,
    setToast,
    showToast,
  };
}
