import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useProjectStorage } from "./useProjectStorage";

import { validatePoleForm } from "../logic/pole/poleValidation";
import { executePoleCalculation } from "../logic/pole/poleCalculation";
import { scrollToFirstError, scrollToFirstNestedError } from "../utils/scrollToError";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";
import { saveWorkingSessionToDraft } from "../utils/coreLogic";
import { findRequestOfCase } from "../data/requestStore";
import * as Utils from "../utils";
import { normalizeCover } from "../../report/utils/reportFormatters";

// Orchestrates pole calculation — validates, calls API, maps errors back to UI
export function usePoleCalculation({
  poleForm,
  directObjectForm,
  ohwForm,
  armForm,
  poleStandardForm,
  poleConfigForm, // structural design (lowestStep, overDesign)
  // Optional callbacks to expand collapsed accordion sections before scrolling
  expandPole,
  expandDo,
  expandOhw,
  expandArm,
}) {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");

  // Read condition from sessionStorage
  const condition = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}",
      );
    } catch {
      return {};
    }
  })();

  // Read cover from sessionStorage — used for the report payload in makeReport()
  const cover = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_cover`) || "{}"
      ) || {};
    } catch {
      return {};
    }
  })();

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

  // ── Persisted results ──
  const [results, setResults] = useProjectStorage(projectType, "results", []);
  const [resultsDo, setResultsDo] = useProjectStorage(
    projectType,
    "resultsDo",
    [],
  );
  const [resultsOhw, setResultsOhw] = useProjectStorage(
    projectType,
    "resultsOhw",
    [],
  );
  const [resultsArm, setResultsArm] = useProjectStorage(
    projectType,
    "resultsArm",
    [],
  );
  const [showResults, setShowResults] = useProjectStorage(
    projectType,
    "showResults",
    false,
  );
  const [displayResult, setDisplayResult] = useProjectStorage(
    projectType,
    "displayResult",
    null,
  );

  // ── UI state ──
  const [isCalculated, setIsCalculated] = useProjectStorage(
    projectType,
    "isCalculatedPole",
    false
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [calculationError, setCalculationError] = useState(null);
  const [calculationKey, setCalculationKey] = useState(0);
  const [isInputsChanged, setIsInputsChanged] = useState(false);
  const hasCalculatedRef = useRef(Boolean(isCalculated && results && results.length > 0));

  const showToast = (message, type = "error") => setToast({ message, type });

  // If there are no results yet (fresh case or reset), isCalculated must be false
  useEffect(() => {
    if ((!results || results.length === 0) && isCalculated) {
      setIsCalculated(false);
      hasCalculatedRef.current = false;
      setIsInputsChanged(false);
      sessionStorage.removeItem(`${projectType}_isCalculatedPole`);
      notifyCalculationProgressChanged();
    }
  }, [results, isCalculated, setIsCalculated, projectType]);

  // Any actual content edit to the underlying pole/object/wire/arm/standard/config data
  // after a calculation invalidates it.
  // We compare serialized content rather than raw references to avoid false positives
  // during page mount, catalog hydration, or case switching.
  const prevDepsJsonRef = useRef(null);
  useEffect(() => {
    const currentDeps = [
      poleForm.poles,
      directObjectForm.directObjects,
      ohwForm.overheadWires,
      armForm.arms,
      poleStandardForm.poleTypeStandard,
      poleStandardForm.taperPoleStandard,
      poleStandardForm.straightPoleStandard,
      poleConfigForm.poleConfig,
    ];

    let currentJson = "";
    try {
      currentJson = JSON.stringify(currentDeps);
    } catch {
      currentJson = "";
    }

    if (prevDepsJsonRef.current === null) {
      prevDepsJsonRef.current = currentJson;
      return;
    }

    const hasChanged = prevDepsJsonRef.current !== currentJson;
    prevDepsJsonRef.current = currentJson;

    if (!hasChanged) return;

    if (hasCalculatedRef.current && results && results.length > 0) {
      setIsInputsChanged(true);
    }

    setIsCalculated(false);
    setCalculationError(null);
    sessionStorage.removeItem(`${projectType}_isCalculatedPole`);

    // Opening, Baseplate, and Foundation each take one of their calculation
    // parameters from Pole's result — so once Pole's own inputs change
    // (meaning its current result is about to go stale), their previously
    // calculated results are stale too, even though nothing on their own
    // pages was touched. Their tab in the header nav already re-locks based
    // on isCalculatedPole, but that only blocks getting there by clicking
    // the tab — a direct URL/back-button visit would still land on a page
    // that looks fully calculated. Resetting their own "isCalculated" flags
    // here (written straight to sessionStorage, since this hook only has
    // scope over the Pole page) makes each page correctly show "needs
    // recalculating" regardless of how the user gets there.
    sessionStorage.removeItem(`${projectType}_isCalculatedOp`);
    sessionStorage.removeItem(`${projectType}_isCalculatedBp`);
    sessionStorage.removeItem(`${projectType}_isCalculatedFd`);

    // Header nav computes tab-lock state by reading sessionStorage
    // directly, which a plain write like the ones above can't itself
    // prompt it to re-read — this nudges it to re-render immediately
    // instead of only catching up on the next route change.
    notifyCalculationProgressChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    poleForm.poles,
    directObjectForm.directObjects,
    ohwForm.overheadWires,
    armForm.arms,
    poleStandardForm.poleTypeStandard,
    poleStandardForm.taperPoleStandard,
    poleStandardForm.straightPoleStandard,
    poleConfigForm.poleConfig,
  ]);

  // Step navigation — determines button label and next route
  const { buttonLabel, nextStep, isLast } = Utils.getStepNavigation(
    condition,
    "pole",
    workflow.withReport
  );

  // ── Resets all error states across all sub-forms ──
  const resetAllErrors = () => {
    poleConfigForm.setPoleConfigErrors({});
    poleForm.setPoleErrors({});
    directObjectForm.setDoErrors({});
    ohwForm.setOhwErrors({});
    armForm.setArmsErrors({});
    armForm.setAoErrors({});
    poleStandardForm.setStraightPoleErrors({});
    poleStandardForm.setTaperPoleErrors({});
  };

  // ── Maps validation errors back to each sub-form's error state ──
  const mapErrors = (result) => {
    if (result.poleConfigErrors)
      poleConfigForm.setPoleConfigErrors(result.poleConfigErrors);
    if (result.polesErrors) poleForm.setPoleErrors(result.polesErrors);
    if (result.doErrors) directObjectForm.setDoErrors(result.doErrors);
    if (result.ohwErrors) ohwForm.setOhwErrors(result.ohwErrors);
    if (result.armsErrors) armForm.setArmsErrors(result.armsErrors);
    if (result.aoErrors) armForm.setAoErrors(result.aoErrors);
    if (result.straightPoleStandardErrors)
      poleStandardForm.setStraightPoleErrors(result.straightPoleStandardErrors);
    if (result.taperPoleStandardErrors)
      poleStandardForm.setTaperPoleErrors(result.taperPoleStandardErrors);
  };

  // ── Merge helpers ──
  // Menggabungkan input FE (dari sessionStorage) dengan hasil kalkulasi BE.
  // Input FE dijadikan base, field dari BE menimpa jika ada key yang sama —
  // karena BE adalah sumber kebenaran untuk field kalkulasi.

  // Merge poles: tiap pole input + result BE berdasarkan index
  const mergePoles = (beResults, resolvedPoles) => {
    const baseList =
      Array.isArray(resolvedPoles) && resolvedPoles.length > 0
        ? resolvedPoles
        : Array.isArray(beResults) && beResults.length > 0
          ? beResults
          : [];
    return baseList.map((pole, i) => {
      const be = beResults?.[i] || {};
      return {
        ...pole,
        ...be,
        description:
          be.description ||
          be.name ||
          pole.description ||
          pole.name ||
          `Pole ${i + 1}`,
      };
    });
  };

  // Merge direct objects: tiap DO input + result BE berdasarkan index
  const mergeDirectObjects = (beResults, resolvedDo) =>
    (resolvedDo || []).map((doObj, i) => ({
      ...doObj,
      ...(beResults?.[i] || {}),
    }));

  // Merge overhead wires: tiap OHW input + result BE berdasarkan index
  const mergeOverheadWires = (beResults, resolvedOhw) =>
    (resolvedOhw || []).map((ohw, i) => ({
      ...ohw,
      ...(beResults?.[i] || {}),
    }));

  // Merge arms + arm objects (nested): tiap arm input + result BE berdasarkan index
  const mergeArms = (beResults, resolvedArms) =>
    (resolvedArms || []).map((arm, i) => {
      const be = beResults?.[i] || {};
      const inputArm = arm || {};

      // Merge arm objects secara nested
      const mergedArmObjects = (inputArm.armObjects || []).map((ao, j) => ({
        ...ao,
        ...(be.armObjects?.[j] || {}),
      }));

      return {
        ...inputArm,
        ...be,
        armObjects: mergedArmObjects,
      };
    });

  // ── Calculate ──
  // Validates all inputs then calls the pole calculation API
  const calculate = async () => {
    resetAllErrors();

    const validation = await validatePoleForm({
      condition,
      poleTypeStandard: poleStandardForm.poleTypeStandard,
      taperPoleStandard: poleStandardForm.taperPoleStandard,
      straightPoleStandard: poleStandardForm.straightPoleStandard,
      poleConfig: poleConfigForm.poleConfig,
      poles: poleForm.poles,
      directObjects: directObjectForm.directObjects,
      overheadWires: ohwForm.overheadWires,
      arms: armForm.arms,
    });

    if (!validation.isValid) {
      mapErrors(validation);
      showToast(validation.message);

      // Helper: expand a section then scroll after the DOM has updated
      const expandAndScroll = (expandFn, scrollFn) => {
        if (expandFn) expandFn(true);
        // Wait a tick so the accordion animation starts before we scroll
        setTimeout(scrollFn, 50);
      };

      if (
        validation.poleStandardErrors &&
        Object.keys(validation.poleStandardErrors).length > 0
      ) {
        expandAndScroll(expandPole, () =>
          scrollToFirstError(validation.poleStandardErrors)
        );
      } else if (
        validation.straightPoleStandardErrors &&
        Object.keys(validation.straightPoleStandardErrors).length > 0
      ) {
        expandAndScroll(expandPole, () =>
          scrollToFirstError(validation.straightPoleStandardErrors)
        );
      } else if (
        validation.taperPoleStandardErrors &&
        Object.keys(validation.taperPoleStandardErrors).length > 0
      ) {
        expandAndScroll(expandPole, () =>
          scrollToFirstError(validation.taperPoleStandardErrors, "taperPoleStandard.")
        );
      } else if (
        validation.poleConfigErrors &&
        Object.keys(validation.poleConfigErrors).length > 0
      ) {
        expandAndScroll(expandPole, () =>
          scrollToFirstError(validation.poleConfigErrors)
        );
      } else if (
        validation.polesErrors &&
        Object.keys(validation.polesErrors).length > 0
      ) {
        expandAndScroll(expandPole, () =>
          scrollToFirstNestedError(validation.polesErrors, "pole-")
        );
      } else if (
        validation.doErrors &&
        Object.keys(validation.doErrors).length > 0
      ) {
        expandAndScroll(expandDo, () =>
          scrollToFirstNestedError(validation.doErrors, "do-")
        );
      } else if (
        validation.ohwErrors &&
        Object.keys(validation.ohwErrors).length > 0
      ) {
        expandAndScroll(expandOhw, () =>
          scrollToFirstNestedError(validation.ohwErrors, "ohw-")
        );
      } else if (
        validation.armsErrors &&
        Object.keys(validation.armsErrors).length > 0
      ) {
        expandAndScroll(expandArm, () =>
          scrollToFirstNestedError(validation.armsErrors, "arm-")
        );
      }

      return;
    }

    try {
      setLoading(true);
      setCalculationError(null);

      const foundReq = draftId ? findRequestOfCase(draftId) : null;
      const requestId = foundReq?.request?.id || null;

      const data = await executePoleCalculation({
        condition,
        poleTypeStandard: poleStandardForm.poleTypeStandard,
        poleConfig: poleConfigForm.poleConfig,
        poles: validation.resolvedPoles,
        directObjects: validation.resolvedDirectObjects,
        overheadWires: validation.resolvedOverheadWires,
        arms: validation.resolvedArms,
        straightPoleStandard: poleStandardForm.straightPoleStandard,
        taperPoleStandard: poleStandardForm.taperPoleStandard,
        requestId,
        caseId: draftId,
      });

      // Merge input FE + hasil kalkulasi BE sebelum disimpan ke state
      setResults(mergePoles(data.results, validation.resolvedPoles));
      setResultsDo(
        mergeDirectObjects(data.resultsDo, validation.resolvedDirectObjects),
      );
      setResultsOhw(
        mergeOverheadWires(data.resultsOhw, validation.resolvedOverheadWires),
      );
      setResultsArm(mergeArms(data.resultsArm, validation.resolvedArms));
      if (data.display) {
        setDisplayResult(data.display);
      }
      setShowResults(true);
      setIsCalculated(true);
      hasCalculatedRef.current = true;
      setIsInputsChanged(false);
      setCalculationError(null);
      setCalculationKey((prev) => prev + 1);
      sessionStorage.setItem(`${projectType}_isCalculatedPole`, "true");
      // Let Header re-read sessionStorage now — otherwise the Opening tab
      // stays locked-looking until the user also clicks Next and navigates.
      notifyCalculationProgressChanged();

      document
        .getElementById("results-pole")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error("Calculation failed:", err);
      const errMsg = err?.message || "Something went wrong during calculation";
      setCalculationError(errMsg);
      setIsCalculated(false);
      setShowResults(false);
      sessionStorage.removeItem(`${projectType}_isCalculatedPole`);
      notifyCalculationProgressChanged();
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Make Report ──
  // Validates all inputs before generating the final report
  const makeReport = async () => {
    resetAllErrors();

    const validation = await validatePoleForm({
      condition,
      poleTypeStandard: poleStandardForm.poleTypeStandard,
      taperPoleStandard: poleStandardForm.taperPoleStandard,
      straightPoleStandard: poleStandardForm.straightPoleStandard,
      poleConfig: poleConfigForm.poleConfig,
      poles: poleForm.poles,
      directObjects: directObjectForm.directObjects,
      overheadWires: ohwForm.overheadWires,
      arms: armForm.arms,
    });

    if (!validation.isValid) {
      mapErrors(validation);
      showToast(validation.message);
      return;
    }

    // results sudah merged (input + kalkulasi), langsung dipakai untuk report


    const reportPayload = {
      results,
      resultsDo,
      resultsOhw,
      resultsArm,
      cover: normalizeCover(cover),
      condition,
      poleConfig: poleConfigForm.poleConfig,
      taperPoleStandard: poleStandardForm.taperPoleStandard,
      straightPoleStandard: poleStandardForm.straightPoleStandard,
      poleTypeStandard: poleStandardForm.poleTypeStandard,
    };

    sessionStorage.setItem(`${projectType}_hasReport`, "true");
    sessionStorage.setItem(
      `${projectType}_reportSnapshot`,
      JSON.stringify(reportPayload),
    );

    const activeDraft = draftId || sessionStorage.getItem(`${projectType}_active_draft_id`);
    if (isProjectTools) {
      navigate(`/project-tools/${projectType}/report`, { state: reportPayload });
    } else if (activeDraft) {
      saveWorkingSessionToDraft(projectType, activeDraft);
      navigate(`/projects/${projectType}/${activeDraft}/report`, { state: reportPayload });
    } else {
      navigate(`/projects/${projectType}`, { state: reportPayload });
    }
  };

  // ── Finish ──
  // Navigates to next step or opens cover modal if this is the last step
  const finish = () => {
    if (!isCalculated) return;
    if (isLast) return "OPEN_COVER";
    navigate(
      isProjectTools
        ? `/project-tools/${projectType}/${nextStep}`
        : `/projects/${projectType}/${draftId}/${nextStep}`
    );
  };

  return {
    results,
    resultsDo,
    resultsOhw,
    resultsArm,
    displayResult,
    showResults,

    isCalculated,
    loading,
    toast,
    buttonLabel,
    calculationError,
    calculationKey,
    isInputsChanged,

    setToast,

    calculate,
    makeReport,
    finish,
    showToast,
  };
}
