import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { validateWithYup } from "../utils/validation";
import { DrawingGeneralSchema } from "../schemas/drawing/DrawingGeneralSchema";
import { useProjectStorage } from "./useProjectStorage";
import { scrollToFirstError, firstErrorMessage } from "../utils/scrollToError";
import { setProgressFlag } from "../utils/calculationProgressEvent";

const getDefaultGeneral = () => ({
  drawingType: "",
  drawingNumber: "",
  partNumber: "",
  openingDirection: "",
  lightingCompanyName: "",
  poleType: "",
  additionalComponents: {
    opening: false,
    baseplate: false,
    foundation: false,
  },
  useCoupling: null,
});

// ─────────────────────────────────────────────────────────────────────────────
// Reads the committed general from sessionStorage (the last saved version).
// Returns null if nothing was committed yet.
const readCommittedGeneral = (projectType) => {
  const raw = sessionStorage.getItem(`${projectType}_drawing_general`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

// Writes to sessionStorage directly (synchronous) so the header re-renders
// with the correct data immediately after navigation.
const writeCommittedGeneral = (projectType, data) => {
  sessionStorage.setItem(`${projectType}_drawing_general`, JSON.stringify(data));
};
// ─────────────────────────────────────────────────────────────────────────────

export function useDrawingGeneralForm() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;

  // We still use useProjectStorage so that saving to drafts / clearing session works.
  // But we do NOT rely on its auto-write effect for the real-time header sync.
  const [, setGeneral] = useProjectStorage(
    projectType,
    "drawing_general",
    getDefaultGeneral()
  );

  const workflowRaw = sessionStorage.getItem(`${projectType}_workflow`);
  const workflow = workflowRaw ? JSON.parse(workflowRaw) : {};
  const projectMode = workflow.projectMode || "calculation";

  // `committedGeneral` = what's actually saved in sessionStorage right now
  const committedRef = useRef(
    readCommittedGeneral(projectType) ?? getDefaultGeneral()
  );

  // `localGeneral` = live UI draft — NOT persisted until Save passes
  const [localGeneral, setLocalGeneral] = useState(committedRef.current);

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  // Array of human-readable items to warn about, or null
  const [confirmDisable, setConfirmDisable] = useState(null);

  // Update local draft only — does NOT touch sessionStorage
  const handleUpdate = (updates) => {
    setLocalGeneral((prev) => {
      if (updates.additionalComponents) {
        return {
          ...prev,
          ...updates,
          additionalComponents: {
            ...(prev.additionalComponents || {}),
            ...updates.additionalComponents,
          },
        };
      }
      return { ...prev, ...updates };
    });

    setErrors((prev) => {
      const cleared = { ...prev };
      Object.keys(updates).forEach((key) => delete cleared[key]);
      return cleared;
    });
  };

  // Returns list of human-readable items that need a warning before disabling
  const getWarningItems = (prev, next) => {
    const items = [];

    const componentMap = { opening: "Opening", baseplate: "Baseplate", foundation: "Foundation" };
    Object.entries(componentMap).forEach(([key, label]) => {
      const wasOn = prev?.additionalComponents?.[key] === true;
      const isOff = next?.additionalComponents?.[key] !== true;
      if (wasOn && isOff) items.push(label);
    });

    if (prev?.useCoupling === true && next?.useCoupling !== true) {
      items.push("Coupling");
    }

    return items;
  };

  // Commit local state to sessionStorage synchronously, then navigate
  const proceed = () => {
    const prev = committedRef.current;

    // Cleanup sessionStorage for any disabled additional components
    const componentMap = { opening: "opening", baseplate: "baseplate", foundation: "foundation" };
    Object.entries(componentMap).forEach(([key, storageKey]) => {
      const wasOn = prev?.additionalComponents?.[key] === true;
      const isOff = localGeneral?.additionalComponents?.[key] !== true;
      if (wasOn && isOff) {
        setProgressFlag(projectType, `drawing_${storageKey}_completed`, false);
        sessionStorage.removeItem(`${projectType}_drawing_${storageKey}`);
      }
    });

    // Cleanup coupling data if coupling was disabled
    if (prev?.useCoupling === true && localGeneral?.useCoupling !== true) {
      setProgressFlag(projectType, "drawing_coupling_confirmed", false);
      setProgressFlag(projectType, "drawing_coupling_completed", false);
      sessionStorage.removeItem(`${projectType}_drawing_coupling`);
    }

    // Write everything to sessionStorage synchronously so header re-renders correctly
    writeCommittedGeneral(projectType, localGeneral);
    setGeneral(localGeneral); // keep useProjectStorage in sync (for draft saving)
    committedRef.current = localGeneral;

    setProgressFlag(projectType, "drawing_completed", true);
    setProgressFlag(
      projectType,
      "drawing_coupling_confirmed",
      localGeneral.useCoupling === true,
    );

    // Navigate — header will re-render on new page with correct sessionStorage data
    if (workflow.projectMode === "drawing") {
      navigate(`${drawingPrefix}/pole`);
      return;
    }

    if (localGeneral.useCoupling) {
      navigate(`${drawingPrefix}/coupling`);
    } else {
      navigate(`${drawingPrefix}/surface`);
    }
  };

  const handleNext = async () => {
    const { isValid, errors: validationErrors } = await validateWithYup(
      DrawingGeneralSchema,
      localGeneral,
      { context: { projectMode } }
    );

    if (!isValid) {
      setErrors(validationErrors);
      setToast({ message: firstErrorMessage(validationErrors) });
      scrollToFirstError(validationErrors);
      return;
    }

    const warnings = getWarningItems(committedRef.current, localGeneral);
    if (warnings.length > 0) {
      setConfirmDisable(warnings);
      return;
    }

    proceed();
  };

  const handleReset = () => {
    // Reset local UI only — does NOT touch sessionStorage, preserving case poleType, drawingType, region
    setLocalGeneral((prev) => ({
      ...getDefaultGeneral(),
      drawingType: prev?.drawingType || committedRef.current?.drawingType || "",
      region: prev?.region || committedRef.current?.region || "",
      poleType: prev?.poleType || committedRef.current?.poleType || "Standard Pole",
    }));
    setErrors({});
  };

  // Expose the committed snapshot so the page can revert on modal cancel
  const getCommitted = () => committedRef.current;

  // Mirrors proceed()'s routing above — Drawing Only goes to Pole, while
  // Calculation & Drawing skips Pole (that's driven by the Calculation
  // side) and goes straight to Coupling or Surface.
  const nextLabel =
    projectMode === "drawing"
      ? "Next: Pole"
      : localGeneral.useCoupling
        ? "Next: Coupling"
        : "Next: Surface";

  return {
    projectType,
    localGeneral,
    errors,
    toast,
    confirmDisable,
    setToast,
    setConfirmDisable,
    setLocalGeneral,
    handleUpdate,
    handleReset,
    handleNext,
    proceed,
    projectMode,
    nextLabel,
    getCommitted,
  };
}
