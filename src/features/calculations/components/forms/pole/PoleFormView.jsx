import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle,
  Circle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Calculator,
  Copy,
  ClipboardPaste,
  CircleDot,
  Lock,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { HeaderCalculationPage } from "../../layout/HeaderCalculationPage";
import { useReadOnly } from "../../../contexts/ReadOnlyContext";
import { PoleConfigForm } from "./custom/PoleConfigForm";
import { PoleForm } from "./custom/PoleForm";
import { DirectObjectForm } from "./custom/DirectObjectForm";
import { OverheadWireForm } from "./custom/OverheadWireForm";
import { ArmForm } from "./custom/ArmForm";
import { ArmObjectForm } from "./custom/ArmObjectForm";
import { PoleTypeSelector } from "./standard/PoleType";
import { TaperPoleStandardForm } from "./standard/TaperTypeForm";
import { StraightPoleStandardForm } from "./standard/StraightTypeForm";
import { StandardDirectObjectForm } from "./standard/StandardDirectObjectForm";
import { ResultsTableView } from "../../tables/pole-result/ResultTableView";
import STANDARD_POLE_DATA from "../../../data/specStandardPole.json";

import { ToastModal } from "../../modals/ToastModal";
import { ConfirmDeleteModal } from "../../modals/ConfirmDeleteModal";
import { ConfirmReduceModal } from "../../modals/ConfirmReduceModal";
import { usePoleForm } from "../../../hooks/usePoleForm";
import { useDirectObjectForm } from "../../../hooks/useDirectObjectForm";
import { useOverheadWireForm } from "../../../hooks/useOverheadWireForm";
import { useArmForm } from "../../../hooks/useArmForm";
import { usePoleStandardForm } from "../../../hooks/usePoleStandardForm";
import { usePoleConfigForm } from "../../../hooks/usePoleConfigForm";
import { usePoleCalculation } from "../../../hooks/usePoleCalculation";
import { useReport } from "../../../../report/hooks/useReport";
import { ReportLoadingModal } from "../../../../report/components/modals/ReportLoadingModal";
import { ReportErrorModal } from "../../../../report/components/modals/ReportErrorModal";

import { FinishCalculationModal } from "../../modals/FinishCalculationModal";
import { ConfirmSaveDatabaseModal } from "../../modals/ConfirmSaveDatabaseModal";
import { CoverFormModal } from "../../modals/CoverFormModal";
import {
  saveWorkingSessionToDraft,
  clearActiveDraftId,
} from "../../../utils/coreLogic";
import { clearCalculationSession } from "../../../utils";
import { CustomPoleModal } from "../../modals/CustomPoleModal";
import {
  activeDraftRequestPath,
  submitCaseForCheck,
} from "../../../utils/requestCases";
import { getUser } from "../../../../../utils/auth";

// Helper to extract all standard objects (both directObjects and armObjects) from spec
export function getStandardPoleObjects(selectedPole) {
  if (!selectedPole) return [];

  const objects = [];

  // 1. Direct objects (e.g. IS, IA)
  if (selectedPole.directObjects && selectedPole.directObjects.length > 0) {
    selectedPole.directObjects.forEach((d, index) => {
      objects.push({
        ...d,
        idDo: index + 1,
        sourceType: "direct",
        sourceIndex: index,
        sourceLabel: "Direct Object",
        name: d.name || "灯具",
        type: d.type || "directional",
        frontArea: d.frontArea ?? "0.1",
        sideArea: d.sideArea || d.frontArea || "0.1",
        weight: d.weight ?? "14",
        zHeight: d.zHeight ?? "8000",
        nnC: d.nnC ?? "1",
        quantity: d.quantity ?? "1",
        fixAngle: d.fixAngle ?? "0",
      });
    });
  }

  // 2. Arm objects (e.g. LS, LA, TS, TA)
  if (selectedPole.arms && selectedPole.arms.length > 0) {
    selectedPole.arms.forEach((arm, armIdx) => {
      const armName = arm.name || `Arm ${armIdx + 1}`;
      if (arm.armObjects && arm.armObjects.length > 0) {
        arm.armObjects.forEach((ao, aoIdx) => {
          objects.push({
            ...ao,
            idDo: objects.length + 1,
            sourceType: "arm",
            armIndex: armIdx,
            armObjectIndex: aoIdx,
            sourceLabel: `${armName} Object`,
            name: ao.name || "灯具",
            type: ao.type || "directional",
            frontArea: ao.frontArea ?? "0.1",
            sideArea: ao.sideArea || ao.frontArea || "0.1",
            weight: ao.weight ?? "14",
            zHeight: ao.zHeight ?? "180",
            nnC: ao.nnC ?? "1",
            quantity: ao.quantity ?? "1",
            fixAngle: ao.fixAngle ?? (armIdx === 1 ? "180" : "0"),
          });
        });
      }
    });
  }

  return objects;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function PoleFormView() {
  const { type: projectType, draftId } = useParams();
  const { isReadOnly } = useReadOnly();

  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  // Read condition from sessionStorage
  const [condition, setConditionState] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}",
      );
    } catch {
      return {};
    }
  });

  const updateCondition = useCallback((updates) => {
    try {
      const raw = sessionStorage.getItem(`${projectType}_condition`);
      const prev = raw ? JSON.parse(raw) : {};
      const next = { ...prev, ...updates };
      sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));
      setConditionState(next);

      const rawConfig = sessionStorage.getItem(`${projectType}_calculation_config`);
      const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
      const nextConfig = {
        ...prevConfig,
        pole: true,
        opening: next.openingEnabled !== undefined ? !!next.openingEnabled : true,
        baseplate: !!next.baseplateEnabled,
        foundation: !!next.foundationEnabled,
      };
      sessionStorage.setItem(
        `${projectType}_calculation_config`,
        JSON.stringify(nextConfig),
      );

      if (updates.baseplateEnabled === false) {
        sessionStorage.removeItem(`${projectType}_isCalculatedBp`);
      }

      notifyCalculationProgressChanged();
    } catch (e) {
      console.warn("Failed to update condition:", e);
    }
  }, [projectType]);

  const workflow = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_workflow`) || "{}",
      );
    } catch {
      return {};
    }
  })();

  const isCalculationAndDrawing = workflow.projectMode === "both";

  const std = String(
    condition.designStandard || condition.standard || "",
  ).toLowerCase();
  const isOldJil =
    (std.includes("jil") ||
      std.includes("lighting") ||
      std === "old_lighting_pole" ||
      std === "old_jil" ||
      std === "jil") &&
    !std.includes("new");

  // ── UI-only accordion state — lives in page, not in hooks ──
  const [isExpandedPole, setIsExpandedPole] = useState(true);
  const [isExpandedDo, setIsExpandedDo] = useState(true);
  const [isExpandedOhw, setIsExpandedOhw] = useState(true);
  const [isExpandedArm, setIsExpandedArm] = useState(true);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showStraightModal, setShowStraightModal] = useState(false);

  // ── Hooks ──
  const poleForm = usePoleForm(projectType);
  const doForm = useDirectObjectForm(projectType);
  const ohwForm = useOverheadWireForm(projectType);
  const armForm = useArmForm(projectType);
  const poleStandardForm = usePoleStandardForm(projectType);
  const poleConfigForm = usePoleConfigForm(projectType);

  const calculation = usePoleCalculation({
    poleForm,
    directObjectForm: doForm,
    ohwForm,
    armForm,
    poleStandardForm,
    poleConfigForm,
    expandPole: setIsExpandedPole,
    expandDo: setIsExpandedDo,
    expandOhw: setIsExpandedOhw,
    expandArm: setIsExpandedArm,
  });

  // Manage smooth progress bar animation so it hits 100% full before showing results
  const [calcProgress, setCalcProgress] = useState(15);
  const [isFinishingCalc, setIsFinishingCalc] = useState(false);

  useEffect(() => {
    let timer;
    if (calculation.loading) {
      setIsFinishingCalc(true);
      setCalcProgress(20);
      timer = setInterval(() => {
        setCalcProgress((prev) => {
          if (prev < 45) return prev + 14;
          if (prev < 70) return prev + 7;
          if (prev < 88) return prev + 3;
          return prev;
        });
      }, 130);
    } else if (isFinishingCalc) {
      // Calculation finished from backend: glide to 100% full smoothly
      setCalcProgress(100);
      const finishTimer = setTimeout(() => {
        setIsFinishingCalc(false);
      }, 350);
      return () => clearTimeout(finishTimer);
    }
    return () => clearInterval(timer);
  }, [calculation.loading, isFinishingCalc]);

  useEffect(() => {
    if (calculation.calculationError) {
      setIsFinishingCalc(false);
      setCalcProgress(0);
    }
  }, [calculation.calculationError]);

  const isShowingCalcLoading = calculation.loading || isFinishingCalc;

  const report = useReport(projectType);

  // Automatically select taper pole in calculation & drawing mode
  useEffect(() => {
    if (
      projectType === "lighting-project" &&
      condition.poleType === "standard" &&
      isCalculationAndDrawing
    ) {
      if (
        poleStandardForm.poleTypeStandard.type !== "taper" &&
        poleStandardForm.poleTypeStandard.type !== "tapered"
      ) {
        poleStandardForm.updatePoleTypeStandard({ type: "taper" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectType,
    condition.poleType,
    isCalculationAndDrawing,
    poleStandardForm.poleTypeStandard.type,
  ]);

  // Opens cover modal if last step, otherwise navigates to next.
  // calculation.finish() itself silently no-ops when not yet calculated —
  // fine when the button was natively `disabled` (it couldn't be clicked
  // at all), but the button below no longer is, so this needs to explain
  // why nothing happened instead of just doing nothing.
  const handleFinish = () => {
    if (!calculation.isCalculated) {
      calculation.showToast(
        "Please calculate pole results first before proceeding.",
        "error",
      );
      return;
    }
    const result = calculation.finish();
    if (result === "OPEN_COVER") {
      setShowFinishModal(true);
    }
  };

  const handleConfirmCover = async (overrideCover) => {
    const success = await report.makeReport({
      isCalculated: calculation.isCalculated,
      showToast: calculation.showToast,
      coverOverride: overrideCover,
      draftIdOverride: draftId,
    });
    if (success) {
      setShowCoverModal(false);
    }
  };

  const handleGenerateReportClick = () => {
    setShowFinishModal(false);
    if (draftId) {
      saveWorkingSessionToDraft(projectType, draftId);
    }
    handleConfirmCover();
  };

  const handleSaveDraft = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    calculation.showToast("Draft successfully saved!", "success");
    setShowFinishModal(false);
  };

  const handleSaveDatabaseClick = () => {
    setShowFinishModal(false);
    setShowDbModal(true);
  };

  const handleConfirmSaveDb = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    submitCaseForCheck(draftId, getUser());
    calculation.showToast("Case saved and submitted for checking!", "success");
    setShowDbModal(false);
    // Back to the case's request — read before the session is cleared.
    const backPath = activeDraftRequestPath(projectType);
    setTimeout(() => {
      clearCalculationSession(projectType);
      clearActiveDraftId(projectType);
      navigate(backPath);
    }, 2000);
  };

  // custom mode — non lighting-project always custom, lighting-project only if poleType === custom
  const isCustomMode =
    projectType !== "lighting-project" || condition.poleType === "custom";

  // standard taper mode
  const isStandardTaper =
    projectType === "lighting-project" &&
    condition.poleType === "standard" &&
    (poleStandardForm.poleTypeStandard?.type === "taper" ||
      poleStandardForm.poleTypeStandard?.type === "tapered");

  // straight pole standard mode (in development preview)
  const isStraightStandard =
    !isCustomMode &&
    condition.poleType === "standard" &&
    poleStandardForm.poleTypeStandard?.type === "straight";

  const maxOhw = isStandardTaper ? 4 : 8;

  // If in standard taper and overhead wires currently exceed 4, trim to 4
  useEffect(() => {
    if (isStandardTaper && ohwForm.overheadWires.length > 4) {
      ohwForm.setOverheadWires((prev) => prev.slice(0, 4));
    }
  }, [isStandardTaper, ohwForm.overheadWires.length, ohwForm]);

  // Derive standard taper pole key for syncing defaults
  const standardTaperPoleKey = useMemo(() => {
    if (!isStandardTaper) return "";
    const taper = poleStandardForm.taperPoleStandard;
    if (!taper.poleType || !taper.height) return "";
    const isEmbedment =
      !condition.baseplateEnabled && taper.groundPosition === "underGL";
    const rawH = Number(taper.height);
    const mHeight = rawH > 100 ? rawH / 1000 : rawH;
    const heightKey = isEmbedment
      ? (mHeight + 0.3).toFixed(1)
      : String(Math.round(mHeight * 10) / 10);
    return `${taper.poleType}_${taper.groundPosition}_${heightKey}`;
  }, [
    isStandardTaper,
    condition.baseplateEnabled,
    poleStandardForm.taperPoleStandard.poleType,
    poleStandardForm.taperPoleStandard.groundPosition,
    poleStandardForm.taperPoleStandard.height,
  ]);

  // Extract standard default direct & arm objects from specStandardPole.json
  const standardDefaultObjects = useMemo(() => {
    if (!isStandardTaper) return [];
    const taper = poleStandardForm.taperPoleStandard;
    if (!taper.poleType || !taper.height) return [];
    const isEmbedment =
      !condition.baseplateEnabled && taper.groundPosition === "underGL";
    const rawH = Number(taper.height);
    const mHeight = rawH > 100 ? rawH / 1000 : rawH;
    const heightKey = isEmbedment
      ? (mHeight + 0.3).toFixed(1)
      : String(Math.round(mHeight * 10) / 10);
    const dataTaper = STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper;
    const group = dataTaper?.[taper.poleType]?.[taper.groundPosition] || {};
    const isTypeWith100 = taper.poleType !== "IS" && taper.poleType !== "IA";
    const nominalKey = isTypeWith100
      ? String(Math.round((Number(heightKey) - 0.1) * 10) / 10)
      : String(Math.round((Number(heightKey) + 0.1) * 10) / 10);
    const selectedPole =
      group[heightKey] ||
      group[nominalKey] ||
      group[String(rawH)] ||
      group[String(mHeight)];
    const objects = getStandardPoleObjects(selectedPole);
    if (isOldJil) {
      return objects.map((obj) => ({
        ...obj,
        type: "omni",
        sideArea: null,
        fixAngle: null,
      }));
    }
    return objects;
  }, [
    isStandardTaper,
    condition.baseplateEnabled,
    poleStandardForm.taperPoleStandard.poleType,
    poleStandardForm.taperPoleStandard.groundPosition,
    poleStandardForm.taperPoleStandard.height,
    isOldJil,
  ]);

  // Ensure all direct objects are omni when Old JIL is active
  useEffect(() => {
    if (isOldJil && doForm.directObjects.some((d) => d.type !== "omni")) {
      doForm.setDirectObjects((prev) =>
        prev.map((d) => ({
          ...d,
          type: "omni",
          sideArea: null,
          fixAngle: null,
        })),
      );
    }
  }, [isOldJil, doForm.directObjects, doForm.setDirectObjects]);

  // Sync default direct & arm objects from specStandardPole.json when standard taper pole selection changes
  useEffect(() => {
    if (!isStandardTaper || !standardTaperPoleKey) return;

    const savedKey = sessionStorage.getItem(
      `${projectType}_standardTaperPoleKey`,
    );

    // If key changed, or if directObjects count doesn't match standardDefaultObjects
    if (
      savedKey !== standardTaperPoleKey ||
      doForm.directObjects.length !== standardDefaultObjects.length ||
      (standardDefaultObjects.length > 0 &&
        doForm.directObjects.some((d) => !d.sourceType))
    ) {
      doForm.setDirectObjects(standardDefaultObjects);
      sessionStorage.setItem(
        `${projectType}_standardTaperPoleKey`,
        standardTaperPoleKey,
      );
    }
  }, [
    isStandardTaper,
    standardTaperPoleKey,
    standardDefaultObjects,
    projectType,
    doForm,
  ]);

  // Reset a standard direct or arm object to its default values from specStandardPole.json
  const handleResetStandardDirectObject = (idDo) => {
    const defaultSpec = standardDefaultObjects.find((d) => d.idDo === idDo);
    if (defaultSpec) {
      doForm.updateDo(idDo, {
        name: defaultSpec.name,
        type: isOldJil ? "omni" : defaultSpec.type,
        frontArea: defaultSpec.frontArea,
        sideArea: isOldJil ? null : defaultSpec.sideArea,
        weight: defaultSpec.weight,
        zHeight: defaultSpec.zHeight,
        nnC: defaultSpec.nnC,
        quantity: defaultSpec.quantity,
        fixAngle: isOldJil ? null : defaultSpec.fixAngle,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Helmet>
        <title>Calculation Pole - KORI BALI</title>
        <meta name="calculation" content="Calculation System CV. KORI BALI" />
      </Helmet>

      {/* MODALS */}
      <ConfirmReduceModal
        open={poleForm.confirmReducePole}
        onClose={poleForm.cancelReduce}
        onConfirm={poleForm.confirmReduce}
        itemName="step poles"
      />

      <CustomPoleModal
        isOpen={showStraightModal}
        onClose={() => setShowStraightModal(false)}
        featureName="Straight Pole"
      />

      <div className="flex-1 rounded-t-2xl hp:rounded-xl bg-gray-50">
        <HeaderCalculationPage />

        <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
          {/* ── Pole Specifications ── */}
          <div
            className="
              bg-white
              mt-6 md:mt-8
              rounded-2xl hp:rounded-xl
              border border-slate-200
              shadow-[0_2px_10px_rgba(15,23,42,0.06)]
              overflow-hidden
            "
          >
            {/* Top accent strip — same gradient/style as ConditionForm's card strip */}
            <div
              aria-hidden="true"
              className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
            />

            {/* Expand / collapse header */}
            <button
              type="button"
              onClick={() => setIsExpandedPole((prev) => !prev)}
              aria-expanded={isExpandedPole}
              className={`
                group
                w-full
                flex items-center justify-between
                gap-4
                px-4 md:px-5
                py-3.5
                bg-slate-50/60
                hover:bg-slate-50
                transition-colors
                duration-200
                ${isExpandedPole ? "border-b border-slate-200" : ""}
              `}
            >
              <h2
                className="
                  text-[#0d3b66]
                  text-sm md:text-[15px]
                  font-medium
                  tracking-normal
                  whitespace-nowrap
                "
              >
                Pole Specifications
              </h2>

              {/* Expand / collapse icon */}
              <span
                className="
                  flex
                  h-8 w-8
                  sm:h-9 sm:w-9
                  shrink-0
                  items-center justify-center
                  rounded-full

                  text-slate-400

                  group-hover:text-[#0d3b66]
                  group-hover:bg-blue-50

                  transition-colors
                  duration-200
                "
              >
                <ChevronDown
                  className={`
                    w-4 h-4
                    sm:w-[20px] sm:h-[20px]
                    transition-transform
                    duration-300
                    ${isExpandedPole ? "rotate-180" : ""}
                  `}
                />
              </span>
            </button>

            {/* Expandable content */}
            <div
              className={`
                grid
                transition-[grid-template-rows]
                duration-300
                ease-in-out
                ${isExpandedPole ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
              `}
            >
              <div className="min-h-0 overflow-hidden">
                {/* Standard mode — lighting-project only */}
                {projectType === "lighting-project" &&
                  condition.poleType === "standard" && (
                    <>
                      <div className="pt-6 hp:pt-4" />

                      <PoleTypeSelector
                        readOnly={isReadOnly}
                        poleTypeStandard={
                          isCalculationAndDrawing && !condition.baseplateEnabled
                            ? { type: "taper" }
                            : poleStandardForm.poleTypeStandard
                        }
                        onUpdate={(val) => {
                          if (isReadOnly) return;
                          poleStandardForm.updatePoleTypeStandard(val);
                        }}
                      />

                      {(poleStandardForm.poleTypeStandard.type === "taper" ||
                        poleStandardForm.poleTypeStandard.type ===
                          "tapered") && (
                        <TaperPoleStandardForm
                          taperPoleStandard={poleStandardForm.taperPoleStandard}
                          onUpdate={poleStandardForm.updateTaperPoleStandard}
                          isBaseplate={condition.baseplateEnabled}
                          onUpdateCondition={updateCondition}
                          errors={poleStandardForm.taperPoleErrors}
                          readOnly={isReadOnly}
                          isCalculated={
                            calculation.isCalculated ||
                            Boolean(
                              calculation.results &&
                                calculation.results.length > 0,
                            ) ||
                            sessionStorage.getItem(
                              `${projectType}_isCalculatedPole`,
                            ) === "true" ||
                            sessionStorage.getItem(
                              `${projectType}_isCalculatedBp`,
                            ) === "true"
                          }
                        />
                      )}

                      {poleStandardForm.poleTypeStandard.type ===
                        "straight" && (
                        <StraightPoleStandardForm
                          straightPoleStandard={
                            poleStandardForm.straightPoleStandard
                          }
                          onUpdate={poleStandardForm.updateStraightPoleStandard}
                          errors={poleStandardForm.straightPoleErrors}
                          condition={condition}
                          readOnly={isReadOnly}
                        />
                      )}
                    </>
                  )}

                {/* Custom mode */}
                {isCustomMode && (
                  <>
                    {/* Structural Design — [CHANGE 4] bind ke poleConfigForm, bukan coverForm */}
                    <div className="border-b border-gray-200 px-6 pt-6 pb-7 hp:px-4 hp:pt-4">
                      <div className="flex items-center justify-between mb-4 hp:mb-2">
                        <h3 className="text-[#0d3b66] mb-2 flex items-center gap-2 text-xs md:text-sm font-medium hp:text-xs hp:gap-1">
                          <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
                          Structural Design{" "}
                          <span className="text-red-500 ml-1 font-semibold">
                            *
                          </span>
                        </h3>
                      </div>
                      <PoleConfigForm
                        poleConfig={poleConfigForm.poleConfig}
                        onUpdate={poleConfigForm.updatePoleConfig}
                        errors={poleConfigForm.poleConfigErrors}
                      />
                    </div>

                    {/* Pole Header */}
                    <div className="px-6 pt-6 pb-3 hp:px-4 hp:pt-4 hp:pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <h3 className="text-[#0d3b66] flex items-center gap-2 text-xs md:text-sm font-medium hp:text-xs hp:gap-1">
                            <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
                            <span className="font-semibold">
                              Configure up to 6 Step Poles
                            </span>
                            <span className="font-medium hp:hidden">
                              {" "}
                              with detailed specifications
                            </span>
                            <span className="text-red-500 ml-1 font-semibold">
                              *
                            </span>
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* INPUT CONTROL SECTION */}
                    <div className="border-b border-gray-200">
                      <div
                        className="
                          flex items-center justify-start
                          px-6 pt-3 pb-6
                          hp:flex-col
                          hp:items-stretch
                          hp:gap-3
                          hp:px-3
                          hp:pt-2
                          hp:pb-4
                        "
                      >
                        {/* INPUT + ACTION BUTTON */}
                        <div
                          className="
                            flex items-center gap-3
                            hp:flex-row
                            hp:items-center
                            hp:gap-2
                            hp:w-full
                          "
                        >
                          {/* Current object count display */}
                          <div
                            className="
                              flex items-center gap-2 px-5 py-2 lg:py-2.5 text-sm rounded-md sm:rounded-lg
                              bg-slate-50 border border-slate-200 text-slate-700 font-medium
                              whitespace-nowrap
                              hp:px-3
                              hp:py-2
                              hp:text-xs
                              hp:justify-center
                              hp:flex-shrink-0
                            "
                          >
                            <span className="text-[#0d3b66] font-semibold">
                              {poleForm.poles.length}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-600">6 Poles</span>
                          </div>

                          {/* Input for number of object to add */}
                          <input
                            type="number"
                            min={1}
                            max={6}
                            placeholder="Input Pole Number"
                            value={poleForm.poleCountInput}
                            onChange={(e) =>
                              poleForm.setPoleCountInput(e.target.value)
                            }
                            onWheel={(e) => e.target.blur()}
                            className="
                              w-[180px] px-3.5 py-2 lg:py-2.5 text-center text-sm rounded-md sm:rounded-lg outline-none
                              transition-all border border-slate-300 bg-white
                              focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]
                              hp:flex-1
                              hp:min-w-0
                              hp:w-auto
                              hp:px-2
                              hp:py-2
                              hp:text-xs
                            "
                          />

                          {/* Confirm add object button */}
                          <button
                            onClick={poleForm.handleAddPoleBulk}
                            disabled={
                              !poleForm.poleCountInput ||
                              isNaN(poleForm.poleCountInput) ||
                              Number(poleForm.poleCountInput) <= 0 ||
                              Number(poleForm.poleCountInput) > 6 ||
                              Number(poleForm.poleCountInput) ===
                                poleForm.poles.length
                            }
                            className={`
                              flex items-center gap-2 px-7 py-2 lg:py-2.5 text-sm font-medium rounded-md sm:rounded-lg
                              transition-all border whitespace-nowrap
                              hp:px-4
                              hp:py-2
                              hp:text-xs
                              hp:gap-1.5
                              hp:flex-shrink-0
                              ${
                                !poleForm.poleCountInput ||
                                isNaN(poleForm.poleCountInput) ||
                                Number(poleForm.poleCountInput) <= 0 ||
                                Number(poleForm.poleCountInput) > 6 ||
                                Number(poleForm.poleCountInput) ===
                                  poleForm.poles.length
                                  ? "bg-gray-50 border-gray-300 text-gray-600 opacity-40 cursor-not-allowed"
                                  : "bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100"
                              }
                            `}
                          >
                            {!poleForm.poleCountInput ||
                            isNaN(poleForm.poleCountInput) ||
                            Number(poleForm.poleCountInput) <= 0 ||
                            Number(poleForm.poleCountInput) > 6 ||
                            Number(poleForm.poleCountInput) ===
                              poleForm.poles.length ? (
                              <Circle className="w-4 h-4 text-gray-400 hp:w-3.5 hp:h-3.5" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-blue-500 hp:w-3.5 hp:h-3.5" />
                            )}
                            OK
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* List of Pole Forms */}
                    {poleForm.poles.map((pole, index) => {
                      const isLast = index === poleForm.poles.length - 1;
                      const hasMultiple = poleForm.poles.length > 1;

                      return (
                        <div
                          key={pole.id}
                          className={`hover:bg-blue-50/50 p-6 
                          ${hasMultiple && !isLast ? "border-b border-gray-200" : ""} hp:px-4 hp:pb-6 hp:pt-4`}
                        >
                          <div className="space-y-6 hp:space-y-4">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 hp:flex-col hp:items-start hp:gap-3">
                              <div className="flex items-center gap-3 hp:gap-2">
                                {/* Index badge */}
                                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#0d3b66] text-white font-semibold text-xs md:text-sm shrink-0">
                                  {index + 1}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-[#0d3b66] text-sm font-semibold hp:text-xs truncate">
                                    Step Pole {index + 1}
                                    {pole.name && ` : ${pole.name}`}
                                  </h4>
                                  <p className="text-xs text-gray-500 hp:text-[10px]">
                                    {pole.type} Type
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 sm:gap-3 justify-end items-center">
                                {/* Copy & Paste */}
                                <div className="flex items-center gap-1.5 sm:gap-2 mr-1 sm:mr-2">
                                  <button
                                    onClick={() => poleForm.copyPole(pole)}
                                    title="Copy this Pole Spec"
                                    className="flex justify-center items-center w-9 h-9 lg:w-10 lg:h-10 rounded-md sm:rounded-lg border bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                  >
                                    <Copy className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => poleForm.pastePole(pole.id)}
                                    disabled={!poleForm.poleClipboard}
                                    title={
                                      poleForm.poleClipboard
                                        ? "Paste copied Pole Spec"
                                        : "No copied Pole Spec"
                                    }
                                    className={`flex justify-center items-center w-9 h-9 lg:w-10 lg:h-10 rounded-md sm:rounded-lg border transition ${
                                      poleForm.poleClipboard
                                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    }`}
                                  >
                                    <ClipboardPaste className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                  </button>
                                </div>

                                {/* Divider */}
                                <div className="h-8 w-px bg-gray-300 opacity-70" />

                                {/* Reset */}
                                <button
                                  onClick={() =>
                                    poleForm.resetActivePole(pole.id)
                                  }
                                  className="flex justify-center items-center gap-2 px-4 py-2 md:px-5 lg:py-2.5 rounded-lg hp:rounded-md font-medium bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-red-300 transition-colors"
                                >
                                  <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                  <span className="text-sm">Reset</span>
                                </button>

                                {poleForm.poles.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      poleForm.setConfirmDelete?.(pole.id);
                                    }}
                                    className="flex justify-center items-center gap-2 px-4 py-2 md:px-5 lg:py-2.5 rounded-lg hp:rounded-md font-medium bg-red-50 hover:bg-red-100
                                    text-red-600 ring-1 ring-inset ring-red-200 hover:ring-red-300 shadow-sm transition-all"
                                  >
                                    <Trash2 className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                    <span className="text-sm">Delete Step</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <PoleForm
                              pole={pole}
                              onUpdate={(updates) =>
                                poleForm.updatePole(pole.id, updates)
                              }
                              errors={poleForm.poleErrors[pole.id] || {}}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Add Step Button */}
                    <div className="flex justify-center items-center p-6 hp:p-4">
                      <button
                        onClick={poleForm.addPole}
                        disabled={poleForm.poles.length >= 6}
                        className={`
                          w-full py-2 lg:py-2.5 font-medium text-sm rounded-md sm:rounded-lg
                          flex items-center justify-center gap-2
                          transition-all duration-200
              
                          ${
                            poleForm.poles.length >= 6
                              ? "border-2 border-dashed border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                              : "border-2 border-dashed border-[#3399cc] text-[#3399cc] bg-transparent hover:bg-[#3399cc] hover:text-white"
                          }
              
                          hp:text-xs
                        `}
                      >
                        <Plus className="w-3.5 sm:w-4 lg:w-4.5 h-3.5 sm:h-4 lg:h-4.5" />
                        Add Step
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Direct Object ── */}
          {(isCustomMode || isStandardTaper) && (
            <>
              <div
                className="
                  bg-white
                  mt-6 md:mt-8
                  rounded-2xl hp:rounded-xl
                  border border-slate-200
                  shadow-[0_2px_10px_rgba(15,23,42,0.06)]
                  overflow-hidden
                "
              >
                {/* Top accent */}
                <div
                  aria-hidden="true"
                  className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
                />

                {/* Expand / collapse header */}
                <button
                  type="button"
                  onClick={() => setIsExpandedDo((prev) => !prev)}
                  aria-expanded={isExpandedDo}
                  className={`
                    group
                    w-full
                    flex items-center justify-between
                    gap-4
                    px-4 md:px-5
                    py-3.5
                    bg-slate-50/60
                    hover:bg-slate-50
                    transition-colors
                    duration-200
                    ${isExpandedDo ? "border-b border-slate-200" : ""}
                  `}
                >
                  <h2
                    className="
                      text-[#0d3b66]
                      text-sm md:text-[15px]
                      font-medium
                      tracking-normal
                      whitespace-nowrap
                    "
                  >
                    {isCustomMode
                      ? "Direct Object Specifications"
                      : "Object Specifications"}
                  </h2>

                  {/* Expand / collapse icon */}
                  <span
                    className="
                      flex
                      h-8 w-8
                      sm:h-9 sm:w-9
                      shrink-0
                      items-center justify-center
                      rounded-full
                      text-slate-400
                      group-hover:text-[#0d3b66]
                      group-hover:bg-blue-50
                      transition-colors
                      duration-200
                    "
                  >
                    <ChevronDown
                      className={`
                        w-4 h-4
                        sm:w-[20px] sm:h-[20px]
                        transition-transform
                        duration-300
                        ${isExpandedDo ? "rotate-180" : ""}
                      `}
                    />
                  </span>
                </button>

                {/* Expandable content */}
                <div
                  className={`
                    grid
                    transition-[grid-template-rows]
                    duration-300
                    ease-in-out
                    ${isExpandedDo ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
                  `}
                >
                  <div className="min-h-0 overflow-hidden">
                    {isCustomMode ? (
                      <DirectObjectForm
                        directObjects={doForm.directObjects}
                        doCountInput={doForm.doInputValue}
                        setDoCountInput={doForm.setDoInputValue}
                        onUpdate={doForm.updateDo}
                        errors={doForm.doErrors}
                        onAddDo={doForm.addDoByInput}
                        onCopyDo={doForm.copyDo}
                        onPasteDo={doForm.pasteDo}
                        hasClipboard={Boolean(doForm.doClipboard)}
                        setConfirmDeleteDo={doForm.setConfirmDeleteDo}
                        resetCurrentDo={doForm.resetDo}
                        handleAddDo={doForm.addDo}
                        readOnly={isReadOnly}
                        isOldJil={isOldJil}
                      />
                    ) : (
                      <StandardDirectObjectForm
                        directObjects={doForm.directObjects}
                        defaultObjects={standardDefaultObjects}
                        onUpdate={doForm.updateDo}
                        errors={doForm.doErrors}
                        taperPoleStandard={poleStandardForm.taperPoleStandard}
                        readOnly={isReadOnly}
                        onResetDefault={handleResetStandardDirectObject}
                        isOldJil={isOldJil}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Overhead Wire ── */}
          {(isCustomMode || isStandardTaper) && (
            <>
              <div
                className="
                  bg-white
                  mt-6 md:mt-8
                  rounded-2xl hp:rounded-xl
                  border border-slate-200
                  shadow-[0_2px_10px_rgba(15,23,42,0.06)]
                  overflow-hidden
                "
              >
                {/* Top accent */}
                <div
                  aria-hidden="true"
                  className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
                />

                {/* Expand / collapse header */}
                <button
                  type="button"
                  onClick={() => setIsExpandedOhw((prev) => !prev)}
                  aria-expanded={isExpandedOhw}
                  className={`
                    group
                    w-full
                    flex items-center justify-between
                    gap-4
                    px-4 md:px-5
                    py-3.5
                    bg-slate-50/60
                    hover:bg-slate-50
                    transition-colors
                    duration-200
                    ${isExpandedOhw ? "border-b border-slate-200" : ""}
                  `}
                >
                  <h2
                    className="
                      text-[#0d3b66]
                      text-sm md:text-[15px]
                      font-medium
                      tracking-normal
                      whitespace-nowrap
                    "
                  >
                    Overhead Wire (OHW) Specifications
                  </h2>

                  {/* Expand / collapse icon */}
                  <span
                    className="
                      flex
                      h-8 w-8
                      sm:h-9 sm:w-9
                      shrink-0
                      items-center justify-center
                      rounded-full
                      text-slate-400
                      group-hover:text-[#0d3b66]
                      group-hover:bg-blue-50
                      transition-colors
                      duration-200
                    "
                  >
                    <ChevronDown
                      className={`
                        w-4 h-4
                        sm:w-[20px] sm:h-[20px]
                        transition-transform
                        duration-300
                        ${isExpandedOhw ? "rotate-180" : ""}
                      `}
                    />
                  </span>
                </button>

                {/* Expandable content */}
                <div
                  className={`
                    grid
                    transition-[grid-template-rows]
                    duration-300
                    ease-in-out
                    ${isExpandedOhw ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
                  `}
                >
                  <div className="min-h-0 overflow-hidden">
                    <OverheadWireForm
                      overheadWires={ohwForm.overheadWires}
                      wireCountInput={ohwForm.ohwInputValue}
                      setWireCountInput={ohwForm.setOhwInputValue}
                      onUpdate={ohwForm.updateOhw}
                      errors={ohwForm.ohwErrors}
                      onAddOhw={() => ohwForm.addOhwByInput(maxOhw)}
                      onCopyOhw={ohwForm.copyOhw}
                      onPasteOhw={ohwForm.pasteOhw}
                      hasClipboard={Boolean(ohwForm.ohwClipboard)}
                      setConfirmDeleteOhw={ohwForm.setConfirmDeleteOhw}
                      resetCurrentOhw={ohwForm.resetOhw}
                      handleAddOhw={() => ohwForm.addOhw(maxOhw)}
                      readOnly={isReadOnly}
                      maxOhw={maxOhw}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Arm & Arm Objects ── */}
          {projectType !== "disaster-prevention-project" && isCustomMode && (
            <>
              <div
                className="
                  bg-white
                  mt-6 md:mt-8
                  rounded-2xl hp:rounded-xl
                  border border-slate-200
                  shadow-[0_2px_10px_rgba(15,23,42,0.06)]
                  overflow-hidden
                "
              >
                {/* Top accent */}
                <div
                  aria-hidden="true"
                  className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
                />

                {/* Expand / collapse header */}
                <button
                  type="button"
                  onClick={() => setIsExpandedArm((prev) => !prev)}
                  aria-expanded={isExpandedArm}
                  className={`
                    group
                    w-full
                    flex items-center justify-between
                    gap-4
                    px-4 md:px-5
                    py-3.5
                    bg-slate-50/60
                    hover:bg-slate-50
                    transition-colors
                    duration-200
                    ${isExpandedArm ? "border-b border-slate-200" : ""}
                  `}
                >
                  <h2
                    className="
                      text-[#0d3b66]
                      text-sm md:text-[15px]
                      font-medium
                      tracking-normal
                      whitespace-nowrap
                    "
                  >
                    Arm & Object Specifications
                  </h2>

                  {/* Expand / collapse icon */}
                  <span
                    className="
                      flex
                      h-8 w-8
                      sm:h-9 sm:w-9
                      shrink-0
                      items-center justify-center
                      rounded-full

                      text-slate-400

                      group-hover:text-[#0d3b66]
                      group-hover:bg-blue-50

                      transition-colors
                      duration-200
                    "
                  >
                    <ChevronDown
                      className={`
                        w-4 h-4
                        sm:w-[20px] sm:h-[20px]
                        transition-transform
                        duration-300
                        ${isExpandedArm ? "rotate-180" : ""}
                      `}
                    />
                  </span>
                </button>

                {/* Expandable content */}
                <div
                  className={`
                    grid
                    transition-[grid-template-rows]
                    duration-300
                    ease-in-out
                    ${isExpandedArm ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
                  `}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="px-6 pt-6 hp:p-4">
                      <div className="flex items-center justify-between mb-4 hp:items-start hp:flex-col hp:gap-4 hp:mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[#0d3b66] flex items-center gap-2 text-xs md:text-sm font-medium hp:text-xs hp:gap-1">
                            <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
                            <span className="font-semibold">
                              Configure up to 10 Arms
                            </span>
                            <span className="font-medium hp:hidden text-gray-500">
                              {" "}
                              with detailed specifications
                            </span>
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {armForm.arms.length} / 10
                          </span>
                        </div>
                        <button
                          onClick={armForm.addArm}
                          disabled={armForm.arms.length >= 10}
                          className={`flex justify-center items-center gap-2 p-2.5 sm:px-4 sm:py-2 md:px-5 lg:py-2 rounded-lg hp:rounded-md font-medium shadow-sm text-sm hp:text-xs hp:px-4 hp:self-center transition-all
                          ${
                            armForm.arms.length >= 10
                              ? "bg-gray-300 text-black opacity-40 cursor-not-allowed"
                              : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:scale-105"
                          }`}
                        >
                          <Plus className="w-3.5 sm:w-4 lg:w-4.5 h-3.5 sm:h-4 lg:h-4.5" />
                          Add Arm
                        </button>
                      </div>

                      {/* Arm tabs */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1">
                        {armForm.arms.map((arm, index) => {
                          const isActive = armForm.activeTabArm === arm.idArm;
                          const hasError = Boolean(
                            armForm.armsErrors?.[arm.idArm] &&
                            Object.keys(armForm.armsErrors[arm.idArm]).length >
                              0,
                          );
                          return (
                            <button
                              key={arm.idArm}
                              type="button"
                              onClick={() => armForm.setActiveTabArm(arm.idArm)}
                              className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border-[1.5px] text-sm font-medium transition-all
                                hp:px-3 hp:py-1.5 hp:text-xs hp:rounded-md
                                ${
                                  isActive
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : hasError
                                      ? "border-red-300 bg-red-50/50 text-red-600 hover:bg-red-50"
                                      : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                                }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors
                                ${
                                  hasError && !isActive
                                    ? "bg-red-500"
                                    : isActive
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                                }`}
                              />
                              <span className="hp:hidden">Arm {index + 1}</span>
                              <span className="hidden hp:inline">
                                {index + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 border-t border-gray-200" />
                    </div>

                    {/* Active arm input */}
                    {armForm.activeArm && (
                      <div className="p-6 hp:px-4 hp:pt-0 hp:pb-4">
                        <div className="space-y-6 hp:space-y-4">
                          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 hp:flex-col hp:items-start hp:gap-3 hp:mb-4 hp:pb-4">
                            <div className="flex items-center gap-2 hp:gap-1">
                              {/* Accent bar */}
                              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#3399cc] to-[#3399cc] flex-shrink-0 hp:hidden" />

                              <h4 className="text-[#0d3b66] text-sm font-semibold hp:text-xs">
                                Arm {armForm.currentIndex + 1}
                                {armForm.activeArm.name &&
                                  ` : ${armForm.activeArm.name}`}
                              </h4>
                            </div>

                            {armForm.arms.length > 0 && (
                              <>
                                {/* ACTION BUTTONS (DESKTOP) */}
                                <div className="flex items-center gap-3 hp:hidden">
                                  <div className="flex items-center gap-2 ml-2">
                                    <button
                                      onClick={() =>
                                        armForm.copyArm(armForm.activeArm)
                                      }
                                      title="Copy this Arm Spec"
                                      className="flex justify-center items-center w-9 h-9 lg:w-10 lg:h-10 rounded-md sm:rounded-lg border bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                    >
                                      <Copy className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        armForm.pasteArm(
                                          armForm.activeArm.idArm,
                                        )
                                      }
                                      disabled={!armForm.armClipboard}
                                      title={
                                        armForm.armClipboard
                                          ? "Paste copied Arm Spec"
                                          : "No copied Arm Spec"
                                      }
                                      className={`flex justify-center items-center w-9 h-9 lg:w-10 lg:h-10 rounded-md sm:rounded-lg border transition ${
                                        armForm.armClipboard
                                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <ClipboardPaste className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                    </button>
                                  </div>

                                  {/* DIVIDER */}
                                  <div className="h-8 w-px bg-gray-300 opacity-70" />

                                  {/* RESET BUTTON */}
                                  <button
                                    onClick={armForm.resetArm}
                                    className="flex justify-center items-center gap-2 px-4 py-2 md:px-5 lg:py-2.5 rounded-lg text-sm font-medium bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-red-300 transition-colors"
                                  >
                                    <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                    Reset
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      armForm.setConfirmDeleteArm(
                                        armForm.activeArm.idArm,
                                      );
                                    }}
                                    className="flex justify-center items-center gap-2 px-4 py-2 md:px-5 lg:py-2.5 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 ring-1 ring-inset ring-red-200 hover:ring-red-300 shadow-sm transition-all"
                                  >
                                    <Trash2 className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                                    Delete Arm
                                  </button>
                                </div>

                                {/* ACTION BUTTONS (MOBILE / hp) */}
                                <div className="hidden hp:flex items-center justify-between gap-2 w-full">
                                  {/* LEFT: COPY & PASTE */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        armForm.copyArm(armForm.activeArm)
                                      }
                                      title="Copy this Arm Spec"
                                      className="w-[34px] h-[34px] flex-shrink-0 rounded-md border bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center justify-center"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        armForm.pasteArm(
                                          armForm.activeArm.idArm,
                                        )
                                      }
                                      disabled={!armForm.armClipboard}
                                      title={
                                        armForm.armClipboard
                                          ? "Paste copied Arm Spec"
                                          : "No copied Arm Spec"
                                      }
                                      className={`w-[34px] h-[34px] flex-shrink-0 rounded-md border transition flex items-center justify-center ${
                                        armForm.armClipboard
                                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <ClipboardPaste className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* RIGHT: RESET & DELETE */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={armForm.resetArm}
                                      title="Reset"
                                      className="w-[34px] h-[34px] flex-shrink-0 rounded-md border border-red-300 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        armForm.setConfirmDeleteArm(
                                          armForm.activeArm.idArm,
                                        );
                                      }}
                                      title="Delete"
                                      className="w-[34px] h-[34px] flex-shrink-0 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center justify-center"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <ArmForm
                            arm={armForm.activeArm}
                            onUpdate={(updates) =>
                              armForm.updateArm(armForm.activeTabArm, updates)
                            }
                            armError={
                              armForm.armsErrors[armForm.activeTabArm] || {}
                            }
                          />

                          <ArmObjectForm
                            armObjects={
                              Array.isArray(armForm.activeArm.armObjects)
                                ? armForm.activeArm.armObjects
                                : []
                            }
                            aoCountInput={armForm.aoInputValue}
                            setAoCountInput={armForm.setAoInputValue}
                            onUpdate={armForm.updateAo}
                            errors={armForm.aoErrors}
                            onAddAo={armForm.addAoByInput}
                            onCopyAo={armForm.copyAo}
                            onPasteAo={armForm.pasteAo}
                            hasClipboard={Boolean(armForm.aoClipboard)}
                            setConfirmDeleteAo={armForm.setConfirmDeleteAo}
                            resetCurrentAo={armForm.resetAo}
                            handleAddAo={armForm.addAo}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 hp:mt-5 hp:pt-4">
                          <button
                            onClick={armForm.goToPrevArm}
                            disabled={armForm.isBackDisabledArm}
                            className={`flex justify-center items-center gap-2 text-sm px-3.5 py-2.5 sm:px-4 sm:py-2 md:px-5 lg:py-2.5 rounded-lg hp:rounded-md ring-1 ring-inset font-medium transition-colors
                            ${
                              armForm.isBackDisabledArm
                                ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                                : "bg-[#eef2f6] text-[#0d3b66] ring-[#d0d7e2] hover:bg-[#e2e8f0] hover:ring-[#b8c2d1]"
                            }`}
                          >
                            <ChevronLeft className="w-3.5 sm:w-4 lg:w-4.5 h-3.5 sm:h-4 lg:h-4.5" />
                            <span className="hp:hidden">Back</span>
                          </button>

                          <button
                            onClick={armForm.goToNextArm}
                            disabled={armForm.isNextDisabledArm}
                            className={`flex justify-center items-center gap-2 text-sm px-3.5 py-2.5 sm:px-4 sm:py-2 md:px-5 lg:py-2.5 rounded-lg hp:rounded-md font-medium transition-all
                            ${
                              armForm.isNextDisabledArm
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110"
                            }`}
                          >
                            <span className="hp:hidden">Next Arm</span>
                            <ChevronRight className="w-3.5 sm:w-4 lg:w-4.5 h-3.5 sm:h-4 lg:h-4.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Calculate / Finish footer ── */}
          <div className="flex items-center justify-between p-5 mt-12 mb-20 bg-gradient-to-b from-white to-slate-50 rounded-2xl hp:rounded-xl border border-gray-200 shadow-sm hp:gap-2">
            {/* Back => returns to Initial Input step */}
            <button
              onClick={() =>
                navigate(
                  isProjectTools
                    ? `/project-tools/${projectType}/initial`
                    : `/projects/${projectType}/${draftId}/initial`
                )
              }
              disabled={isShowingCalcLoading}
              className="flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-3 hp:py-2 md:px-6
              rounded-lg hp:rounded-md font-medium bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] text-sm
              ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] shadow-sm transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 md:w-5 h-4 md:h-5 hp:w-4 hp:h-4" />
              <span className="hp:hidden">Back</span>
            </button>

            <div className="flex items-center gap-3 hp:gap-0">
              {/* Calculate button — steps aside to the secondary style
                  once calculated, so Next/Finish reads as the thing to do
                  now. Stays fully clickable either way (e.g. to
                  recalculate on purpose without editing anything). */}
              {isReadOnly ? (
                <button
                  type="button"
                  disabled
                  title="Calculations are locked in Read-Only mode"
                  className="flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-4 hp:py-2 md:px-6 rounded-lg hp:rounded-md font-medium text-sm bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none"
                >
                  <Lock className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                  <span className="hp:text-[11px] whitespace-nowrap">
                    {calculation.isCalculated
                      ? "Results Locked"
                      : "Calculation Locked"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isStraightStandard ? undefined : calculation.calculate}
                  disabled={isShowingCalcLoading || isStraightStandard}
                  title={
                    isStraightStandard
                      ? "Straight pole calculation is currently in development"
                      : undefined
                  }
                  className={`inline-flex justify-center items-center gap-2 min-w-[160px] px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-4 hp:py-2 md:px-6
                  rounded-lg hp:rounded-md font-medium text-sm transition-all duration-200 shadow-sm
                  ${
                    isStraightStandard
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                      : isShowingCalcLoading
                        ? "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white opacity-50 cursor-not-allowed"
                        : calculation.isInputsChanged
                          ? "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white ring-2 ring-sky-300 ring-offset-2 ring-offset-white shadow-md hover:brightness-110 active:scale-[0.98] cursor-pointer"
                          : calculation.isCalculated
                            ? "bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] cursor-pointer"
                            : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 cursor-pointer"
                  }`}
                >
                  {isShowingCalcLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : calculation.isInputsChanged && !isStraightStandard ? (
                    <RefreshCw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                  ) : (
                    <Calculator className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                  )}
                  <span className="hp:text-[11px] whitespace-nowrap">
                    {isStraightStandard
                      ? "Calculate Results"
                      : isShowingCalcLoading
                        ? "Calculating..."
                        : calculation.isInputsChanged
                          ? "Recalculate Results"
                          : "Calculate Results"}
                  </span>
                </button>
              )}

              {/* Next/Finish button — strictly disabled when calculating or uncalculated */}
              <button
                type="button"
                disabled={
                  isShowingCalcLoading ||
                  (!calculation.isCalculated && !isReadOnly)
                }
                onClick={
                  isReadOnly
                    ? () =>
                        navigate(
                          isProjectTools
                            ? `/project-tools/${projectType}/opening`
                            : `/projects/${projectType}/${draftId}/opening`
                        )
                    : handleFinish
                }
                aria-disabled={
                  isShowingCalcLoading ||
                  (!calculation.isCalculated && !isReadOnly)
                }
                title={
                  isReadOnly
                    ? "Next: Opening"
                    : !calculation.isCalculated
                      ? "Please calculate pole results first before proceeding"
                      : calculation.buttonLabel
                }
                className={`flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-3 hp:py-2 md:px-6
                rounded-lg hp:rounded-md font-medium transition-all text-sm
                ${
                  isShowingCalcLoading ||
                  (!calculation.isCalculated && !isReadOnly)
                    ? "bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200 cursor-not-allowed shadow-none opacity-60"
                    : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm cursor-pointer"
                }`}
              >
                <span className="hp:hidden">
                  {isReadOnly ? "Next: Opening" : calculation.buttonLabel}
                </span>
                <ChevronRight className="w-4 md:w-5 h-4 md:h-5 hp:w-4 hp:h-4" />
              </button>
            </div>
          </div>

          {/* Results table container with reactive animated states */}
          <div id="results-pole" className="mt-8">
            <AnimatePresence mode="wait">
              {/* 1. Clean, Minimalist Enterprise Loading State (Single Focal Point) */}
              {isShowingCalcLoading && (
                <motion.div
                  key="calc-loading-clean"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Top accent line — exact match with ResultsTableView */}
                  <div className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]" />

                  {/* Header — clean, identical to ResultsTableView (no duplicate spinning loader) */}
                  <div className="px-6 py-5 hp:px-4 hp:py-3 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3 hp:gap-2">
                      <div className="bg-blue-50 p-2 hp:p-1.5 rounded-lg shrink-0">
                        <Calculator className="w-6 h-6 hp:w-5 hp:h-5 text-[#0d3b66]" />
                      </div>
                      <div>
                        <h2 className="text-[#0d3b66] text-sm hp:text-xs font-semibold mb-0.5">
                          Calculation Results
                        </h2>
                        <p className="text-slate-500 text-xs font-medium hp:hidden">
                          Calculating structural analysis & safety factors...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[13px] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#3399cc] animate-pulse" />
                      <span>Calculating...</span>
                    </div>
                  </div>

                  {/* Center Body — Clean direct layout without top icon */}
                  <div className="py-12 px-6 text-center max-w-2xl mx-auto space-y-4">
                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-slate-800 text-sm sm:text-base font-medium tracking-tight">
                        Evaluating pole structural capacity...
                      </h3>
                    </div>

                    {/* Progressive Bar & Technical Labels */}
                    <div className="max-w-lg mx-auto pt-2 space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0d3b66] via-[#3399cc] to-[#38bdf8] shadow-xs relative overflow-hidden transition-all duration-300 ease-out"
                          style={{ width: `${calcProgress}%` }}
                        >
                          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-laser-sweep" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 2. Error state if backend calculation failed */}
              {!isShowingCalcLoading && calculation.calculationError && (
                <motion.div
                  key="calc-error-card"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-2xl border border-rose-200/90 shadow-sm overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />
                  <div className="p-6 hp:p-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight mb-2">
                          Calculation Incomplete
                        </h3>

                        {/* Reason Callout */}
                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100/90 text-[13px] text-rose-900 font-medium leading-relaxed">
                          {calculation.calculationError}
                        </div>

                        {/* Clear English explanation */}
                        <p className="text-[13px] text-slate-500 mt-2.5 leading-relaxed">
                          The structural calculation could not be completed with
                          the current configuration. Previous evaluation data
                          has been reset to maintain data integrity. Please
                          review your design conditions or retry.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3. Results state with transition animation */}
              {!isShowingCalcLoading &&
                !calculation.calculationError &&
                !isStraightStandard &&
                calculation.showResults && (
                  <motion.div
                    key={`results-container-${calculation.calculationKey}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    <ResultsTableView
                      results={calculation.results}
                      resultsDo={calculation.resultsDo}
                      resultsOhw={calculation.resultsOhw}
                      resultsArm={calculation.resultsArm}
                      display={calculation.displayResult}
                      calculationKey={calculation.calculationKey}
                    />
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      <FinishCalculationModal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onSaveDraft={handleSaveDraft}
        onSaveDatabase={handleSaveDatabaseClick}
        onGenerateReport={handleGenerateReportClick}
      />
      <ConfirmSaveDatabaseModal
        open={showDbModal}
        onClose={() => setShowDbModal(false)}
        onConfirm={handleConfirmSaveDb}
      />
      <ToastModal
        toast={calculation.toast}
        onClose={() => calculation.setToast(null)}
      />

      {/* ── Delete/Reduce modals ── */}
      <ConfirmDeleteModal
        open={poleForm.confirmDelete}
        onClose={() => poleForm.setConfirmDelete?.(null)}
        onConfirm={() => poleForm.removePole(poleForm.confirmDelete)}
        itemName="pole"
      />
      <ConfirmDeleteModal
        open={doForm.confirmDeleteDo}
        onClose={() => doForm.setConfirmDeleteDo(null)}
        onConfirm={() => doForm.removeDo(doForm.confirmDeleteDo)}
        itemName="object"
      />
      <ConfirmReduceModal
        open={doForm.confirmReduceDo}
        onClose={doForm.cancelReduce}
        onConfirm={doForm.confirmReduce}
        itemName="direct objects"
      />
      <ConfirmDeleteModal
        open={ohwForm.confirmDeleteOhw}
        onClose={() => ohwForm.setConfirmDeleteOhw(null)}
        onConfirm={() => ohwForm.removeOhw(ohwForm.confirmDeleteOhw)}
        itemName="overhead wire"
      />
      <ConfirmReduceModal
        open={ohwForm.confirmReduceOhw}
        onClose={ohwForm.cancelReduce}
        onConfirm={ohwForm.confirmReduce}
        itemName="overhead wires"
      />
      <ConfirmDeleteModal
        open={armForm.confirmDeleteArm}
        onClose={() => armForm.setConfirmDeleteArm(null)}
        onConfirm={() => armForm.removeArm(armForm.confirmDeleteArm)}
        itemName="arm"
      />
      <ConfirmDeleteModal
        open={armForm.confirmDeleteAo}
        onClose={() => armForm.setConfirmDeleteAo(null)}
        onConfirm={() => armForm.removeAo(armForm.confirmDeleteAo)}
        itemName="object"
      />
      <ConfirmReduceModal
        open={armForm.confirmReduceAo}
        onClose={armForm.cancelReduceArmObjects}
        onConfirm={armForm.confirmReduceArmObjects}
        itemName="arm objects"
      />

      <CoverFormModal
        open={showCoverModal}
        onClose={() => {
          setShowCoverModal(false);
          setShowFinishModal(true);
        }}
        projectType={projectType}
        draftId={draftId}
        onConfirm={handleConfirmCover}
      />

      {/* ── Report Generation Loading & Error Modals ── */}
      <ReportLoadingModal open={report.isGeneratingReport} />
      <ReportErrorModal
        open={Boolean(report.reportError)}
        onClose={report.clearReportError}
        title={report.reportError?.title}
        message={report.reportError?.message}
        details={report.reportError?.details}
        status={report.reportError?.status}
        onRetry={() => {
          report.clearReportError();
          handleConfirmCover();
        }}
        onBackToCalculation={report.clearReportError}
      />
    </div>
  );
}
