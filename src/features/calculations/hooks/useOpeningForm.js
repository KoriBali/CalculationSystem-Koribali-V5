import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useProjectStorage } from "./useProjectStorage";

import { validateOpening } from "../logic/opening/openingValidation";
import { executeOpeningCalculation } from "../logic/opening/openingCalculation";
import * as Utils from "../utils";
import { scrollToFirstError, firstErrorMessage } from "../utils/scrollToError";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";
import {
  STANDARD_OPENING_TYPE,
  STANDARD_BOX_TYPE,
} from "../constants/standardPoleDefaults";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// Maps opening type id to its display label
const TYPE_LABEL_MAP = {
  box: "Box Type",
  r: "R Type",
};

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useOpeningForm() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");

  // Read condition from sessionStorage — projectType must be available first
  const condition = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}",
      );
    } catch {
      return {};
    }
  })();

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


  // ── Persisted state ──

  // Opening type selection (box / r)
  const [openingType, setOpeningType] = useProjectStorage(
    projectType,
    "openingType",
    isStandard ? STANDARD_OPENING_TYPE : { type: "" },
  );

  // Box type dimension inputs
  const [boxType, setBoxType] = useProjectStorage(
    projectType,
    "boxType",
    isStandard
      ? STANDARD_BOX_TYPE
      : {
          boxWidth: "",
          opWidth: "",
          boxHeight: "",
          opSurfaceHeight: "",
          opLength: "",
          openingDirection: "",
        },
  );

  // Auto-select Box Type and auto-fill defaults for Standard Pole
  useEffect(() => {
    if (isStandard) {
      setOpeningType((prev) => (!prev?.type ? STANDARD_OPENING_TYPE : prev));
      setBoxType((prev) => {
        if (!prev?.boxHeight && !prev?.boxWidth && !prev?.opWidth) {
          return {
            ...prev,
            boxHeight: prev?.boxHeight || STANDARD_BOX_TYPE.boxHeight,
            boxWidth: prev?.boxWidth || STANDARD_BOX_TYPE.boxWidth,
            opWidth: prev?.opWidth || STANDARD_BOX_TYPE.opWidth,
            opSurfaceHeight:
              prev?.opSurfaceHeight || STANDARD_BOX_TYPE.opSurfaceHeight,
            opLength: prev?.opLength || STANDARD_BOX_TYPE.opLength,
          };
        }
        return prev;
      });
    }
  }, [isStandard, setOpeningType, setBoxType]);

  // R type dimension inputs
  const [rType, setRType] = useProjectStorage(projectType, "rType", {
    opWidth: "",
    opSurfaceHeight: "",
    opLength: "",
    openingDirection: "",
  });

  // Calculated result — persisted so result survives reload
  const [calculatedOp, setCalculatedOp] = useProjectStorage(
    projectType,
    "calculatedOp",
    null,
  );

  // Controls result table visibility
  const [showResultsOp, setShowResultsOp] = useProjectStorage(
    projectType,
    "showResultsOp",
    false,
  );

  // ── UI state ──

  const [openingTypeErrors, setOpeningTypeErrors] = useState({});
  const [boxTypeErrors, setBoxTypeErrors] = useState({});
  const [rTypeErrors, setRTypeErrors] = useState({});
  const [isOpeningExpanded, setIsOpeningExpanded] = useState(true);
  const [isSelectExpanded, setIsSelectExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useProjectStorage(
    projectType,
    "isCalculatedOp",
    false
  );
  const [toast, setToast] = useState(null);

  // If there are no calculated results yet, isCalculated must be false
  useEffect(() => {
    if ((!calculatedOp || Object.keys(calculatedOp).length === 0) && isCalculated) {
      setIsCalculated(false);
      sessionStorage.removeItem(`${projectType}_isCalculatedOp`);
      notifyCalculationProgressChanged();
    }
  }, [calculatedOp, isCalculated, setIsCalculated, projectType]);

  // ── Navigation ──

  // Determines button label, next step path, and whether this is the last step
  const { buttonLabel, nextStep, prevStep, isLast } = Utils.getStepNavigation(
    condition,
    "opening",
    workflow.withReport
  );

  const isCalculationAndDrawing = workflow.projectMode === "both";

  // ── Helpers ──

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

  // Updates opening type selection
  const updateOpeningType = (updates) => {
    Utils.updateOpeningType(openingType, updates, setOpeningType);
    invalidateCalculation();

    // Hapus error spesifik saat field diupdate
    setOpeningTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Updates box type fields
  const updateBoxType = (updates) => {
    Utils.updateBoxType(boxType, updates, setBoxType);
    invalidateCalculation();

    // Hapus error spesifik saat field diupdate
    setBoxTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Updates R type fields
  const updateRType = (updates) => {
    Utils.updateRType(rType, updates, setRType);
    invalidateCalculation();

    // Hapus error spesifik saat field diupdate
    setRTypeErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // ── Calculation ──

  // Validates inputs then calls the opening calculation API
  const calculate = async () => {
    setOpeningTypeErrors({});
    setBoxTypeErrors({});
    setRTypeErrors({});

    const validation = await validateOpening({
      openingType,
      boxType,
      rType,
      isCalculationAndDrawing,
    });

    if (!validation.isValid) {
      setOpeningTypeErrors(validation.typeErrors || {});
      setBoxTypeErrors(validation.boxErrors || {});
      setRTypeErrors(validation.rErrors || {});

      const firstErrors =
        validation.typeErrors || validation.boxErrors || validation.rErrors || {};
      showToast(firstErrorMessage(firstErrors) || validation.message);
      scrollToFirstError(firstErrors);
      return;
    }

    try {
      setLoading(true);

      const data = await executeOpeningCalculation({
        openingType,
        boxType,
        rType,
      });

      // Persist result alongside its opening type for the result table
      setCalculatedOp({ ...data, openingType });
      setShowResultsOp(true);
      setIsCalculated(true);
      // Let Header re-read sessionStorage now — otherwise the next tab
      // stays locked-looking until the user also clicks Next and navigates.
      notifyCalculationProgressChanged();
    } catch (err) {
      showToast(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation ──

  // Navigates to next step — returns "OPEN_COVER" signal if this is the last step
  const finish = (force = false) => {
    if (!isCalculated && !force) return;
    if (isLast) return "OPEN_COVER";
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${nextStep}`
        : `/projects/${projectType}/${draftId}/${nextStep}`
    );
  };

  // Navigates back to the previous step (always "pole" for opening)
  const goBack = () => {
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${prevStep}`
        : `/projects/${projectType}/${draftId}/${prevStep}`
    );
  };

  // ── Return ──

  return {
    openingType,
    boxType,
    rType,
    calculatedOp,
    showResultsOp,

    openingTypeErrors,
    boxTypeErrors,
    rTypeErrors,
    isOpeningExpanded,
    isSelectExpanded,
    isCalculated,
    loading,
    toast,

    typeLabelMap: TYPE_LABEL_MAP,
    buttonLabel,
    isCalculationAndDrawing,

    setToast,
    setIsOpeningExpanded,
    setIsSelectExpanded,

    updateOpeningType,
    updateBoxType,
    updateRType,
    calculate,
    finish,
    goBack,
    showToast,
    nextStep,
    prevStep,
    isLast,
  };
}
