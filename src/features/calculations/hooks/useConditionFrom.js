import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { validateCondition } from "../logic/initial-setup/conditionValidation";
import {
  applyStandardDefaults,
  getDisabledComponents,
  saveCalculationConfig,
  cleanupDisabledComponents,
} from "../logic/initial-setup/conditionLogic";
import { useProjectStorage } from "./useProjectStorage";
import { scrollToFirstError, firstErrorMessage } from "../utils/scrollToError";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const getDefaultCondition = (projectType) => ({
  designStandard: "",
  designWindSpeed: "",
  designAirDensity: "",
  poleType: projectType === "lighting-project" ? "standard" : "custom",
  openingEnabled: projectType === "lighting-project",
  baseplateEnabled: projectType === "lighting-project",
  foundationEnabled: false,
});

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useConditionForm() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Persisted condition — auto sync ke sessionStorage via useProjectStorage
  const [condition, setCondition] = useProjectStorage(
    projectType,
    "condition",
    getDefaultCondition(projectType),
  );

  // Local draft — tidak langsung persist, hanya commit saat proceed
  const [localCondition, setLocalCondition] = useState(() => {
    if (condition?.poleType === "standard") {
      return {
        ...condition,
        openingEnabled: true,
        baseplateEnabled: true,
      };
    }
    return condition;
  });
  const [prevCondition, setPrevCondition] = useState(condition);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);

  // Update local draft + auto-fill defaults + clear related errors
  const handleUpdate = (updates) => {
    const next = applyStandardDefaults(updates);
    if (next.poleType === "standard") {
      next.openingEnabled = true;
      next.baseplateEnabled = true;
    }
    setLocalCondition((prev) => ({ ...prev, ...next }));

    // Pakai `next` bukan `updates` — supaya key yang di-autofill juga ter-clear
    setErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(next).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Validate then proceed — or show confirm modal if components were disabled
  const handleNext = async () => {
    const validation = await validateCondition(localCondition, projectType);

    if (!validation.isValid) {
      setErrors(validation.errors); // Yup langsung set error yang benar
      setToast({
        message: firstErrorMessage(validation.errors) || validation.message,
      });
      scrollToFirstError(validation.errors);
      return;
    }

    const disabled = getDisabledComponents(condition, localCondition);

    if (disabled.length > 0) {
      setPrevCondition(condition);
      setConfirmDisable(disabled);
      return;
    }

    proceed();
  };

  // Commit local draft to sessionStorage then navigate to next step
  const proceed = () => {
    // 1. Save config — determines which steps are visible in header nav
    saveCalculationConfig(projectType, localCondition);

    // 2. Cleanup sessionStorage for disabled components
    cleanupDisabledComponents(projectType, localCondition);

    // 3. If condition changes, invalidate every step's calculation so the
    // user is forced to recalculate before proceeding — but only the
    // "isCalculated" flags, not the result data itself. This mirrors how an
    // ordinary input edit already invalidates a step (see the poleForm/etc.
    // deps effect in usePoleCalculation.js and friends): Calculate goes back
    // to primary, Next/Finish disables, and the step's tab re-locks in
    // HeaderCalculationPage — while the previously-computed table stays on
    // screen as a stale-but-visible reference instead of vanishing outright.
    // (Steps the user just *disabled* in this condition change are handled
    // separately by cleanupDisabledComponents() above, which does wipe their
    // data since they're no longer part of the calculation at all.)
    const hasPoleResults = (() => {
      try {
        const r = JSON.parse(sessionStorage.getItem(`${projectType}_results`) || "[]");
        return Array.isArray(r) && r.length > 0;
      } catch {
        return false;
      }
    })();

    if (JSON.stringify(condition) !== JSON.stringify(localCondition) || !hasPoleResults) {
      sessionStorage.removeItem(`${projectType}_isCalculatedPole`);
      sessionStorage.removeItem(`${projectType}_isCalculatedOp`);
      sessionStorage.removeItem(`${projectType}_isCalculatedBp`);
      sessionStorage.removeItem(`${projectType}_isCalculatedFd`);
      sessionStorage.removeItem(`${projectType}_reportSnapshot`);
      sessionStorage.removeItem(`${projectType}_hasReport`);
      notifyCalculationProgressChanged();
    }

    // 4. Commit condition to sessionStorage
    setCondition(localCondition);

    // 5. Navigate to pole step
    const isProjectTools = location.pathname.startsWith("/project-tools");
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/pole`
        : `/projects/${projectType}/${draftId}/pole`
    );
  };

  return {
    projectType,
    localCondition,
    errors,
    toast,
    confirmDisable,
    prevCondition,

    setToast,
    setConfirmDisable,
    setLocalCondition,

    handleUpdate,
    handleNext,
    proceed,
  };
}
