import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveWorkingSessionToDraft } from "../../calculations/utils/coreLogic";
import { normalizeCover } from "../utils/reportFormatters";
import { getContextualCoverDefaults } from "../../calculations/components/modals/CoverFormModal";
import {
  createCaseRun,
  getCaseRunReport,
  saveReportHeader,
  buildReportHeaderPayload,
  previewProjectToolsReport,
} from "../../calculations/services/requestService";
import { findRequestOfCase } from "../../calculations/data/requestStore";
import {
  getMasterDesignStandards,
  getMasterMaterials,
} from "../../calculations/services/masterDataService";
import {
  resolveDesignStandardId,
  mapCalculationDirectObjects,
  mapCalculationOverheadWires,
  mapCalculationArms,
} from "../../calculations/utils/requestPayloadMapper";

// ─── HOOK ────────────────────────────────────────────────────────────────────

// Handles report generation — validates cover, builds payload, navigates to report page
export function useReport(projectType) {
  const navigate = useNavigate();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  const clearReportError = () => setReportError(null);

  // ── Read helper ──
  // Reads and parses a value from sessionStorage by key
  const read = (key, fallback = null) => {
    try {
      const raw = sessionStorage.getItem(`${projectType}_${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  // ── Validation helpers ──

  // Checks whether a calculated result object has actual data
  const hasResult = (calculated) =>
    calculated && Object.keys(calculated).length > 0;

  // Validates all required calculation results based on enabled flags
  const validateCalculationResults = (
    results,
    calculatedOp,
    calculatedBaseplate,
    calculatedFoundation,
    liveCond,
    showToast,
  ) => {
    const { openingEnabled, baseplateEnabled, foundationEnabled } = liveCond || {};

    // Pole results are always required regardless of flags
    if (!results?.length) {
      if (showToast) {
        showToast(
          "No pole calculation results available. Please calculate first.",
          "error",
        );
      }
      return false;
    }

    // Opening result — only required if openingEnabled
    if (openingEnabled && !hasResult(calculatedOp)) {
      if (showToast) {
        showToast(
          "Opening calculation result is missing. Please calculate the opening first.",
          "error",
        );
      }
      return false;
    }

    // Baseplate result — only required if baseplateEnabled
    if (baseplateEnabled && !hasResult(calculatedBaseplate)) {
      if (showToast) {
        showToast(
          "Baseplate calculation result is missing. Please calculate the baseplate first.",
          "error",
        );
      }
      return false;
    }

    // Foundation result — only required if foundationEnabled
    if (foundationEnabled && !hasResult(calculatedFoundation)) {
      if (showToast) {
        showToast(
          "Foundation calculation result is missing. Please calculate the foundation first.",
          "error",
        );
      }
      return false;
    }

    return true;
  };

  // ── Merge helpers ──
  // Input FE dijadikan base, field dari BE menimpa jika ada key yang sama.

  // Opening: merge openingType + detail input (boxType atau rType) + result BE
  const mergeOpening = (openingType, boxType, rType, calculatedOp) => {
    const type = openingType?.type;

    // Pilih input detail sesuai tipe yang dipilih user
    const detailInput = type === "box" ? boxType : type === "R" ? rType : {};

    return {
      openingType, // tipe opening yang dipilih (box / r)
      ...detailInput, // field input detail: boxWidth, opWidth, opLength, dll
      ...calculatedOp, // hasil kalkulasi dari BE (override jika konflik)
    };
  };

  // Baseplate: merge baseplateType + detail input (fourRibType atau eightRibType) + result BE
  const mergeBaseplate = (
    baseplateType,
    fourRibType,
    eightRibType,
    calculatedBaseplate,
  ) => {
    const ribType = baseplateType?.ribType;

    // Pilih input detail sesuai jumlah rib yang dipilih user
    const detailInput =
      ribType === "four"
        ? fourRibType
        : ribType === "eight"
          ? eightRibType
          : {};

    return {
      baseplateType, // tipe baseplate yang dipilih
      ...detailInput, // field input detail sesuai rib type
      ...calculatedBaseplate, // hasil kalkulasi dari BE
    };
  };

  // Foundation: merge foundationType + detail input (squareCaisson atau roundCaisson) + result BE
  const mergeFoundation = (
    foundationType,
    squareCaisson,
    roundCaisson,
    calculatedFoundation,
  ) => {
    const shape = foundationType?.shape;

    // Pilih input detail sesuai bentuk pondasi yang dipilih user
    const detailInput =
      shape === "square"
        ? squareCaisson
        : shape === "round"
          ? roundCaisson
          : {};

    return {
      foundationType, // tipe pondasi yang dipilih
      ...detailInput, // field input detail sesuai shape
      ...calculatedFoundation, // hasil kalkulasi dari BE
    };
  };

  // ── Main function ──

  // Validates all required results, then navigates to report page
  const makeReport = async ({
    isCalculated,
    showToast,
    coverOverride = null,
    draftIdOverride = null,
  } = {}) => {
    setIsGeneratingReport(true);
    setReportError(null);

    const startTime = Date.now();
    const ensureMinimumWait = async (minMs = 1200) => {
      const elapsed = Date.now() - startTime;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }
    };

    // Pole calculation must have been run
    if (!isCalculated) {
      await ensureMinimumWait(400);
      const err = {
        title: "Calculation Not Run Yet",
        message:
          "Please calculate the pole results first before generating the report preview.",
        details: "isCalculated is false or results array is empty.",
        status: "NOT_CALCULATED",
      };
      setReportError(err);
      setIsGeneratingReport(false);
      if (showToast) showToast(err.message, "error");
      return false;
    }

    // Read live condition at call time to ensure accurate step flags
    const liveCondition = read("condition", {}) || {};
    const foundationChoice = sessionStorage.getItem(`${projectType}_foundation_step_choice`);
    if (foundationChoice === "finish") {
      liveCondition.foundationEnabled = false;
    } else if (foundationChoice === "foundation") {
      liveCondition.foundationEnabled = true;
    }
    const { openingEnabled, baseplateEnabled, foundationEnabled } = liveCondition;

    // Read all results from sessionStorage at call time
    const results = read("results", []);
    const resultsDo = read("resultsDo", []);
    const resultsOhw = read("resultsOhw", []);
    const resultsArm = read("resultsArm", []);

    const isProjectTools =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/project-tools");

    const activeDraftId = isProjectTools
      ? null
      : (draftIdOverride || sessionStorage.getItem(`${projectType}_active_draft_id`));
    const foundReq = activeDraftId ? findRequestOfCase(activeDraftId) : null;
    const reqId = isProjectTools
      ? null
      : (foundReq?.request?.id || sessionStorage.getItem("active_request_id"));

    let cover;
    if (isProjectTools) {
      cover = {
        reportNumber: "",
        calculationNumber: "",
        managementCode: "",
        title1: "",
        projectName: "",
        title2: "",
        coverTopText: "",
        title3: "",
        coverBottomText: "",
        client: "",
        author: "",
        companyName: "",
        date: "",
      };
    } else {
      const contextualDefaults = getContextualCoverDefaults(
        projectType,
        activeDraftId,
        reqId,
      );
      const rawCover = coverOverride || read("cover", {}) || {};
      const mergedCover = {
        ...contextualDefaults,
        ...rawCover,
        reportNumber:
          rawCover.reportNumber ||
          rawCover.calculationNumber ||
          contextualDefaults.reportNumber,
        calculationNumber:
          rawCover.reportNumber ||
          rawCover.calculationNumber ||
          contextualDefaults.calculationNumber,
        title1:
          rawCover.title1 ||
          rawCover.projectName ||
          contextualDefaults.title1,
        projectName:
          rawCover.title1 ||
          rawCover.projectName ||
          contextualDefaults.projectName,
        title2:
          rawCover.title2 !== undefined && rawCover.title2 !== ""
            ? rawCover.title2
            : contextualDefaults.title2,
        coverTopText:
          rawCover.coverTopText !== undefined && rawCover.coverTopText !== ""
            ? rawCover.coverTopText
            : contextualDefaults.coverTopText,
        region: rawCover.region || contextualDefaults.region,
        author: rawCover.author || contextualDefaults.author,
        responsibleDepartment:
          rawCover.responsibleDepartment ||
          contextualDefaults.responsibleDepartment,
        date: rawCover.date || contextualDefaults.date,
      };
      cover = normalizeCover(mergedCover);
    }
    sessionStorage.setItem(`${projectType}_cover`, JSON.stringify(cover));

    // Read calculated results for optional steps
    const calculatedOp = read("calculatedOp", {});
    const calculatedBaseplate = read("calculatedBaseplate", {});
    const calculatedFoundation = read("calculatedFoundation", {});

    // Validate all required results based on condition flags
    // For Project Tools: skip this validation — no pre-stored results, BE handles calculation directly
    if (!isProjectTools) {
      const isResultsValid = validateCalculationResults(
        results,
        calculatedOp,
        calculatedBaseplate,
        calculatedFoundation,
        liveCondition,
        showToast,
      );
      if (!isResultsValid) {
        await ensureMinimumWait(400);
        const missingSteps = [];
        if (!results?.length) missingSteps.push("Pole Calculation");
        if (openingEnabled && !hasResult(calculatedOp)) missingSteps.push("Opening Calculation");
        if (baseplateEnabled && !hasResult(calculatedBaseplate)) missingSteps.push("Baseplate Calculation");
        if (foundationEnabled && !hasResult(calculatedFoundation)) missingSteps.push("Foundation Calculation");

        const err = {
          title: "Incomplete Calculation Steps",
          message: `Cannot preview report because the following steps have not been calculated: ${missingSteps.join(", ")}. Please complete them first.`,
          details: { missingSteps, openingEnabled, baseplateEnabled, foundationEnabled },
          status: "INCOMPLETE_CALCULATION",
        };
        setReportError(err);
        setIsGeneratingReport(false);
        return false;
      }
    }

    // Read poleConfig from storage
    const poleConfig = read("poleConfig", {}) || {};

    // Build report payload
    const reportPayload = {
      results,
      resultsDo,
      resultsOhw,
      resultsArm,
      cover,
      condition: liveCondition,
      poleConfig,
      taperPoleStandard: read("taperPoleStandard", null),
      straightPoleStandard: read("straightPoleStandard", null),
      poleTypeStandard: read("poleTypeStandard", null),
      ...(openingEnabled && {
        calculatedOp: mergeOpening(
          read("openingType", {}),
          read("boxType", {}),
          read("rType", {}),
          calculatedOp,
        ),
      }),
      ...(baseplateEnabled && {
        calculatedBaseplate: mergeBaseplate(
          read("baseplateType", {}),
          read("fourRibType", {}),
          read("eightRibType", {}),
          calculatedBaseplate,
        ),
      }),
      ...(foundationEnabled && {
        calculatedFoundation: mergeFoundation(
          read("foundationType", {}),
          read("squareCaisson", {}),
          read("roundCaisson", {}),
          calculatedFoundation,
        ),
      }),
      schematicSvg: (() => {
        const data = read("schematic_data", null);
        return data?.editedSvg || data?.generatedSvg || null;
      })(),
    };

    const taperStandard = read("taperPoleStandard", {}) || {};
    const poleHeightId =
      taperStandard?.poleStandardHeightId ||
      poleConfig?.taperPoleStandard?.poleStandardHeightId ||
      liveCondition?.taperPoleStandard?.poleStandardHeightId;

    let officialReport = null;
    let runId = null;

    if (reqId && activeDraftId && poleHeightId) {
      try {
        const std = String(liveCondition?.designStandard || liveCondition?.standard || "").toLowerCase();
        const isOldJil =
          (std.includes("jil") ||
            std.includes("lighting") ||
            std === "old_lighting_pole" ||
            std === "old_jil" ||
            std === "jil") &&
          !std.includes("new");

        const rawDoList =
          Array.isArray(resultsDo) && resultsDo.length > 0
            ? resultsDo
            : Array.isArray(poleConfig?.directObjects) && poleConfig.directObjects.length > 0
              ? poleConfig.directObjects
              : [];

        const doList = mapCalculationDirectObjects(rawDoList, isOldJil);

        const rawCaseOhw =
          Array.isArray(resultsOhw) && resultsOhw.length > 0
            ? resultsOhw
            : Array.isArray(poleConfig?.overheadWires) && poleConfig.overheadWires.length > 0
              ? poleConfig.overheadWires
              : JSON.parse(sessionStorage.getItem(`${projectType}_overheadWires`) || "[]");

        const rawCaseArms =
          Array.isArray(resultsArm) && resultsArm.length > 0
            ? resultsArm
            : Array.isArray(poleConfig?.arms) && poleConfig.arms.length > 0
              ? poleConfig.arms
              : JSON.parse(sessionStorage.getItem(`${projectType}_arms`) || "[]");

        const materialsList = await getMasterMaterials();
        const runResult = await createCaseRun(reqId, activeDraftId, {
          poleStandardHeightId: poleHeightId,
          directObjects: doList,
          overheadWires: mapCalculationOverheadWires(rawCaseOhw),
          arms: mapCalculationArms(rawCaseArms, materialsList, isOldJil),
        });

        const resolvedRunId = runResult?.run?.id || runResult?.id;
        if (resolvedRunId) {
          runId = resolvedRunId;
          sessionStorage.setItem(`${projectType}_latest_run_id`, runId);
          sessionStorage.setItem(`${projectType}_${activeDraftId}_latest_run_id`, runId);
          try {
            officialReport = await getCaseRunReport(reqId, activeDraftId, runId);
          } catch (repErr) {
            console.warn("getCaseRunReport failed:", repErr);
            throw repErr;
          }
        }
      } catch (runErr) {
        console.error("Backend calculation run error:", runErr);
        await ensureMinimumWait(600);

        const status =
          runErr?.response?.status ||
          runErr?.status ||
          (runErr?.response ? "HTTP Error" : "Network Error");

        const respData = runErr?.response?.data;
        let detailMessage = "Failed to process calculation on the calculation engine server.";

        if (typeof respData?.detail === "string") {
          detailMessage = respData.detail;
        } else if (Array.isArray(respData?.detail)) {
          detailMessage = respData.detail
            .map(
              (item) =>
                `${item?.loc ? item.loc.join(" -> ") : "Parameter"}: ${item?.msg || "invalid"}`,
            )
            .join("\n");
        } else if (respData?.message) {
          detailMessage = respData.message;
        } else if (runErr?.message) {
          detailMessage = runErr.message;
        }

        setReportError({
          title:
            status === 422
              ? "Calculation Validation Failed (HTTP 422)"
              : "Unable to Generate Report",
          message: detailMessage,
          details: respData || runErr?.message || runErr,
          status,
        });
        setIsGeneratingReport(false);
        return false;
      }
    } else if (isProjectTools && !poleHeightId) {
      // Project Tools but no pole height selected — cannot generate report
      setReportError({
        title: "Pole Configuration Incomplete",
        message: "Please complete the pole calculation before generating the report.",
        details: { poleHeightId },
        status: "INCOMPLETE_CALCULATION",
      });
      setIsGeneratingReport(false);
      return false;
    } else if (isProjectTools && poleHeightId) {
      try {
        const std = String(liveCondition?.designStandard || liveCondition?.standard || "").toLowerCase();
        const isOldJil =
          (std.includes("jil") ||
            std.includes("lighting") ||
            std === "old_lighting_pole" ||
            std === "old_jil" ||
            std === "jil") &&
          !std.includes("new");

        // Resolve designStandardId — async fetch from master data, no hardcoded UUIDs
        let designStandardId = liveCondition?.designStandardId;
        if (!designStandardId) {
          const standardsList = await getMasterDesignStandards();
          designStandardId = resolveDesignStandardId(
            liveCondition?.designStandard || liveCondition?.standard,
            standardsList,
          );
        }
        if (!designStandardId) {
          throw new Error(
            "Design standard could not be resolved. Please ensure master data is loaded or re-select the standard from the Initial step.",
          );
        }

        const rawDoList =
          Array.isArray(resultsDo) && resultsDo.length > 0
            ? resultsDo
            : Array.isArray(poleConfig?.directObjects) && poleConfig.directObjects.length > 0
              ? poleConfig.directObjects
              : [];

        const calcDirectObjects = mapCalculationDirectObjects(rawDoList, isOldJil);

        const rawOhwList =
          Array.isArray(resultsOhw) && resultsOhw.length > 0
            ? resultsOhw
            : Array.isArray(poleConfig?.overheadWires) && poleConfig.overheadWires.length > 0
              ? poleConfig.overheadWires
              : JSON.parse(sessionStorage.getItem(`${projectType}_overheadWires`) || "[]");

        const rawArmsList =
          Array.isArray(resultsArm) && resultsArm.length > 0
            ? resultsArm
            : Array.isArray(poleConfig?.arms) && poleConfig.arms.length > 0
              ? poleConfig.arms
              : JSON.parse(sessionStorage.getItem(`${projectType}_arms`) || "[]");

        const materialsList = await getMasterMaterials();
        const calcOverheadWires = mapCalculationOverheadWires(rawOhwList);
        const calcArms = mapCalculationArms(rawArmsList, materialsList, isOldJil);

        const groundPosition =
          taperStandard?.installationPole === "embedment" || liveCondition?.groundPosition === "embedment"
            ? "embedment"
            : taperStandard?.groundPosition === "underGL" || taperStandard?.groundPosition === "under_gl"
              ? "under_gl"
              : "on_gl";

        const toolPayload = {
          conditions: {
            designStandardId,
            designStandard:
              liveCondition.designStandard || liveCondition.standard || "standard",
            windSpeed: Number(liveCondition?.designWindSpeed ?? liveCondition?.windSpeed ?? 60),
            airDensity: Number(liveCondition?.designAirDensity ?? liveCondition?.airDensity ?? 1.23),
            horizontalAcceleration: liveCondition?.horizontalAcceleration
              ? Number(liveCondition.horizontalAcceleration)
              : null,
            responseRatio: liveCondition?.responseRatio
              ? Number(liveCondition.responseRatio)
              : null,
          },
          input: {
            poleStandardHeightId: poleHeightId,
            directObjects: calcDirectObjects,
            overheadWires: calcOverheadWires,
            arms: calcArms,
            groundPosition,
            embedmentLengthMm:
              (taperStandard?.installationPole === "embedment" || liveCondition?.groundPosition === "embedment") && taperStandard?.embedmentLength
                ? Number(taperStandard.embedmentLength)
                : null,
          },
        };

        const rep = await previewProjectToolsReport(toolPayload);
        const resolvedOfficial = rep?.data || rep;
        if (resolvedOfficial && (resolvedOfficial.sections || resolvedOfficial.template || resolvedOfficial.geometry)) {
          officialReport = resolvedOfficial;
        } else if (rep) {
          officialReport = rep;
        }
      } catch (ptErr) {
        console.error("Project tools preview report error:", ptErr);
        await ensureMinimumWait(600);

        const status =
          ptErr?.response?.status ||
          ptErr?.status ||
          (ptErr?.response ? "HTTP Error" : "Network Error");

        const respData = ptErr?.response?.data;
        let detailMessage = "Failed to generate report from the calculation engine server.";

        if (typeof respData?.detail === "string") {
          detailMessage = respData.detail;
        } else if (Array.isArray(respData?.detail)) {
          detailMessage = respData.detail
            .map(
              (item) =>
                `${item?.loc ? item.loc.join(" -> ") : "Parameter"}: ${item?.msg || "invalid"}`,
            )
            .join("\n");
        } else if (respData?.message) {
          detailMessage = respData.message;
        } else if (ptErr?.message) {
          detailMessage = ptErr.message;
        }

        setReportError({
          title:
            status === 422
              ? "Calculation Validation Failed (HTTP 422)"
              : "Unable to Generate Report",
          message: detailMessage,
          details: respData || ptErr?.message || ptErr,
          status,
        });
        setIsGeneratingReport(false);
        return false;
      }
    }

    await ensureMinimumWait(600);
    setIsGeneratingReport(false);

    const finalReportPayload = {
      ...reportPayload,
      ...(runId ? { runId } : {}),
      ...(officialReport ? { officialReport } : {}),
    };

    // Persist snapshot so report page can access it on reload
    sessionStorage.setItem(`${projectType}_hasReport`, "true");
    sessionStorage.setItem(
      `${projectType}_reportSnapshot`,
      JSON.stringify(finalReportPayload),
    );
    sessionStorage.setItem(`${projectType}_cover`, JSON.stringify(cover));

    // Persist report header to backend API
    if (activeDraftId && reqId && cover) {
      try {
        const headerPayload = buildReportHeaderPayload(cover);
        saveReportHeader(reqId, activeDraftId, headerPayload).catch((err) => {
          console.debug("[useReport] saveReportHeader background error:", err?.message);
        });
      } catch (err) {
        console.debug("[useReport] saveReportHeader error:", err);
      }
    }

    if (isProjectTools) {
      navigate(`/project-tools/${projectType}/report`, { state: finalReportPayload });
    } else if (activeDraftId) {
      saveWorkingSessionToDraft(projectType, activeDraftId);
      navigate(`/projects/${projectType}/${activeDraftId}/report`, { state: finalReportPayload });
    } else {
      navigate(`/projects/${projectType}`, { state: finalReportPayload });
    }
    return true;
  };

  return {
    makeReport,
    isGeneratingReport,
    reportError,
    setReportError,
    clearReportError,
  };
}
