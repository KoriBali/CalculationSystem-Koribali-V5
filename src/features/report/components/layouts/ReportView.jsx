import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import LightingPoleReport from "../templates/lighting-pole/LightingPoleReport";
import NewJilReport from "../templates/new-jil/NewJilReport";
import AcemastReport from "../templates/acemast/AcemastReport";
import SignboardReport from "../templates/signboard/SignboardReport";
import MultipleReport from "../templates/multiple/MultipleReport";

import { clearCalculationSession } from "../../../calculations/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  FileEdit,
  AlertCircle,
  Calculator,
  SendHorizontal,
} from "lucide-react";
import { EmptyReport } from "../../../../assets/icon";
import { ConfirmSaveDatabaseModal } from "../../../calculations/components/modals/ConfirmSaveDatabaseModal";
import { activeDraftRequestPath, submitCaseForCheck } from "../../../calculations/utils/requestCases";
import { SchematicEditorModal } from "../../../calculations/components/schematic/SchematicEditorModal";
import {
  useSchematicBridge,
  DEFAULT_SCHEMATIC_URL,
} from "../../../calculations/hooks/useSchematicBridge";
import { getStandardPoleSchematicParameters } from "../../../calculations/utils/standardPoleSchematicMapper";
import { getDummyReportPayload } from "../../utils/dummyReportPayload";
import { normalizeCover } from "../../utils/reportFormatters";
import {
  getDraftData,
  deserializeWorkingSession,
  saveWorkingSessionToDraft,
  clearActiveDraftId,
  resolveRequestIdForCase,
} from "../../../calculations/utils/coreLogic";
import { CoverFormModal } from "../../../calculations/components/modals/CoverFormModal";
import { ToastModal } from "../../../calculations/components/modals/ToastModal";
import { useReadOnly } from "../../../calculations/contexts/ReadOnlyContext";
import { getUser } from "../../../../utils/auth";
import { findRequestOfCase } from "../../../calculations/data/requestStore";
import { resolveDesignStandardCode } from "../../../calculations/utils/requestPayloadMapper";
import {
  getCaseRuns,
  getCaseRunReport,
  getCaseReport,
  getReportHeader,
  saveReportHeader,
  buildReportHeaderPayload,
  normalizeReportHeaderResponse,
  getCalculationDraft,
} from "../../../calculations/services/requestService";
import { ReportLoadingModal } from "../modals/ReportLoadingModal";
import { ReportErrorModal } from "../modals/ReportErrorModal";

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function ReportView() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const projectType =
    params.type || sessionStorage.getItem("projectType") || "lighting-project";
  const draftId =
    params.draftId || sessionStorage.getItem(`${projectType}_active_draft_id`);

  // If opened via /requests/:type/:draftId/report, ensure draft data is restored to session
  useEffect(() => {
    let active = true;
    if (params.type && params.draftId) {
      sessionStorage.setItem("projectType", params.type);
      sessionStorage.setItem(`${params.type}_active_draft_id`, params.draftId);
      const draftData = getDraftData(params.type, params.draftId);
      if (draftData) {
        deserializeWorkingSession(params.type, draftData);
      } else {
        (async () => {
          try {
            const reqId = await resolveRequestIdForCase(params.draftId);
            if (reqId) {
              const serverDraft = await getCalculationDraft(reqId, params.draftId);
              if (serverDraft && active) {
                deserializeWorkingSession(params.type, serverDraft);
                sessionStorage.setItem(
                  `${params.type}_draft_data_${params.draftId}`,
                  JSON.stringify(serverDraft)
                );
              }
            }
          } catch {}
        })();
      }
    }
    return () => {
      active = false;
    };
  }, [params.type, params.draftId]);

  const [officialReportFromApi, setOfficialReportFromApi] = useState(null);
  const [serverCover, setServerCover] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  // ── Load report data ──
  // Prioritize route state (fresh navigation), fallback to sessionStorage snapshot (reload),
  // fallback to draft data snapshot, fallback to dummy simulation payload if no draftId specified.
  const storedSnapshot = useMemo(() => {
    try {
      let snap = location.state || null;
      if (!snap) {
        const sessionSnap = sessionStorage.getItem(
          `${projectType}_reportSnapshot`,
        );
        if (sessionSnap) snap = JSON.parse(sessionSnap);
      }
      if (!snap && draftId) {
        const draftData = getDraftData(projectType, draftId);
        if (draftData?.reportSnapshot) {
          snap =
            typeof draftData.reportSnapshot === "string"
              ? JSON.parse(draftData.reportSnapshot)
              : draftData.reportSnapshot;
        }
      }
      return snap;
    } catch {
      return location.state || null;
    }
  }, [location.state, projectType, draftId]);

  const hasFetchedRef = useRef(false);

  // Auto-fetch official calculation report from backend if missing (e.g. reload or direct URL)
  const fetchOfficialReport = useCallback(
    async (isRetry = false) => {
      // If we already have official report from snapshot or state, no need to fetch
      if (storedSnapshot?.officialReport || (officialReportFromApi && !isRetry)) {
        return;
      }
      // If already fetched and not a manual retry, prevent duplicate calls
      if (hasFetchedRef.current && !isRetry) {
        return;
      }
      if (!draftId) return;

      const foundReq = findRequestOfCase(draftId);
      let reqId = foundReq?.request?.id || sessionStorage.getItem("active_request_id");
      if (!reqId) {
        reqId = await resolveRequestIdForCase(draftId);
      }
      if (!reqId) return;

      hasFetchedRef.current = true;
      setIsLoadingReport(true);
      setReportError(null);

      try {
        const caseRunKey = `${projectType}_${draftId}_latest_run_id`;
        let runId = sessionStorage.getItem(caseRunKey) || sessionStorage.getItem(`${projectType}_latest_run_id`);

        // Always query server runs to ensure we target the latest official calculation run
        const runsRes = await getCaseRuns(reqId, draftId).catch((err) => {
          console.warn("Failed to get case runs from server:", err);
          return null;
        });
        const runs = Array.isArray(runsRes) ? runsRes : runsRes?.items || runsRes?.runs || [];

        if (runs.length > 0) {
          const hasTimestamps = runs.some(
            (r) => r.createdAt || r.created_at || r.runAt || r.run_at
          );
          let newestRun = null;
          if (hasTimestamps) {
            const sortedRuns = [...runs].sort((a, b) => {
              const timeA = new Date(a.createdAt || a.created_at || a.runAt || a.run_at || 0).getTime();
              const timeB = new Date(b.createdAt || b.created_at || b.runAt || b.run_at || 0).getTime();
              return timeB - timeA;
            });
            newestRun = sortedRuns[0];
          } else {
            // In API responses without timestamps, the last element is the newest run
            newestRun = runs[runs.length - 1];
          }

          if (newestRun?.id) {
            runId = newestRun.id;
            sessionStorage.setItem(caseRunKey, runId);
            sessionStorage.setItem(`${projectType}_latest_run_id`, runId);
          }
        } else if (!runId) {
          runId = sessionStorage.getItem(`${projectType}_latest_run_id`);
        }

        let rep = null;
        if (runId) {
          try {
            rep = await getCaseRunReport(reqId, draftId, runId);
          } catch (runErr) {
            console.warn("getCaseRunReport fallback:", runErr?.message);
          }
        }
        if (!rep) {
          try {
            rep = await getCaseReport(reqId, draftId);
          } catch (dErr) {
            console.debug("getCaseReport direct fallback:", dErr?.message);
          }
        }
        if (rep) {
          setOfficialReportFromApi(rep);
        }

        // Fetch server report header in parallel
        try {
          const headerData = await getReportHeader(reqId, draftId);
          if (headerData) {
            setServerCover(normalizeReportHeaderResponse(headerData));
          }
        } catch (hErr) {
          console.debug("[fetchOfficialReport] getReportHeader error:", hErr?.message);
        }
      } catch (err) {
        console.warn("Auto-fetch official report error in ReportView:", err);
        const status = err?.response?.status || (err?.response ? "HTTP Error" : "Network Error");
        const detailMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load official report from the backend server.";
        setReportError({
          title: status === 422 ? "Report Validation Failed (HTTP 422)" : "Unable to Load Report",
          message:
            typeof detailMsg === "string"
              ? detailMsg
              : "The server could not provide report data for this calculation.",
          details: err?.response?.data || err?.message || err,
          status,
        });
      } finally {
        setIsLoadingReport(false);
      }
    },
    [draftId, projectType, Boolean(storedSnapshot?.officialReport)],
  );

  useEffect(() => {
    if (!storedSnapshot?.officialReport && !officialReportFromApi && !hasFetchedRef.current) {
      fetchOfficialReport();
    }
  }, [fetchOfficialReport, storedSnapshot?.officialReport, officialReportFromApi]);

  const handleRetryFetch = useCallback(() => {
    fetchOfficialReport(true);
  }, [fetchOfficialReport]);

  const reportData = useMemo(() => {
    let storedPole = null;
    try {
      storedPole = JSON.parse(
        sessionStorage.getItem(`${projectType}_taperPoleStandard`) || "null",
      );
    } catch {
      storedPole = null;
    }

    if (storedSnapshot && storedSnapshot.results?.length > 0) {
      // Check if this is a straight pole standard or custom pole
      const isStraight =
        storedSnapshot?.poleTypeStandard === "straight" ||
        storedSnapshot?.condition?.poleTypeStandard === "straight" ||
        storedSnapshot?.condition?.standardPoleType === "straight" ||
        Boolean(storedSnapshot?.straightPoleStandard);

      // Check if user selected or changed the pole standard in the form
      const isPoleChanged =
        !isStraight &&
        Boolean(
          storedPole?.poleType &&
            (storedSnapshot?.condition?.standardPoleType !==
              storedPole.poleType ||
              storedSnapshot?.taperPoleStandard?.poleType !==
                storedPole.poleType ||
              storedSnapshot?.taperPoleStandard?.groundPosition !==
                storedPole.groundPosition ||
              String(storedSnapshot?.taperPoleStandard?.height || "") !==
                String(storedPole?.height || "")),
        );

      const hasOldDummyCover =
        storedSnapshot.cover?.calculationNumber === "KB-2026-001";
      if (isPoleChanged || hasOldDummyCover) {
        const fresh = getDummyReportPayload(projectType, storedPole);
        sessionStorage.setItem(
          `${projectType}_reportSnapshot`,
          JSON.stringify(fresh),
        );
        return fresh;
      }
      return storedSnapshot;
    }

    // If looking at a specific draft that hasn't calculated yet, return null (trigger empty state)
    if (draftId) {
      return null;
    }

    const fresh = getDummyReportPayload(projectType, storedPole);
    sessionStorage.setItem(
      `${projectType}_reportSnapshot`,
      JSON.stringify(fresh),
    );
    return fresh;
  }, [storedSnapshot, projectType, draftId]);

  const num = (v, fallback = 0) => {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const effectiveOfficialReport = reportData?.officialReport || officialReportFromApi;

  // ── Normalize results to ensure all numeric fields are numbers ──
  const results = useMemo(() => {
    const official = effectiveOfficialReport;
    const isOldJil = (() => {
      const std = String(reportData?.condition?.designStandard || reportData?.condition?.standard || "").toLowerCase();
      return (
        (std.includes("jil") ||
          std.includes("lighting") ||
          std === "old_lighting_pole" ||
          std === "old_jil" ||
          std === "jil") &&
        !std.includes("new")
      );
    })();

    const rawList =
      official?.specifications && official.specifications.length > 0
        ? official.specifications
        : official?.sections && official.sections.length > 0
          ? official.sections
          : official?.geometry?.stepPoles && official.geometry.stepPoles.length > 0
            ? official.geometry.stepPoles.map((sp, idx) => ({
                name: sp.name || `Pole ${idx + 1}`,
                material: sp.material || sp.materialName || "STK400",
                lowerDiameter: sp.diameterLowerMm || sp.lowerDiameterMm || sp.lowerDiameter,
                upperDiameter: sp.diameterUpperMm || sp.upperDiameterMm || sp.upperDiameter,
                lowerThickness: sp.thicknessLowerMm || sp.thicknessMm || sp.lowerThickness,
                upperThickness: sp.thicknessUpperMm || sp.upperThicknessMm || sp.thicknessMm || sp.upperThickness,
                sectionModulus: sp.sectionModulusCm3 || sp.sectionModulus,
                momentInertia: sp.momentOfInertiaCm4 || sp.momentInertia,
                radiusGyration: sp.radiusOfGyrationCm || sp.radiusGyration,
                sectionArea: sp.crossSectionAreaCm2 || sp.crossSectionalAreaCm2 || sp.crossSectionArea || sp.sectionArea,
                crossSectionArea: sp.crossSectionAreaCm2 || sp.crossSectionalAreaCm2 || sp.crossSectionArea || sp.sectionArea,
                unitWeightKgM: sp.unitWeightKgM || sp.unitWeight,
                zHeight: sp.zHeightMm || sp.zHeight,
                heightSection: sp.lengthMm || sp.heightSection,
                bendingMoment: sp.bendingMoment,
                shearStress: sp.shearStress,
                bendingStress: sp.bendingStress,
                combinedStress: sp.combinedStress,
                safetyRatio: sp.safetyRatio || sp.safetyFactor,
              }))
            : reportData?.results || [];

    if (isOldJil) {
      // Untuk Old JIL: Data murni apa adanya dari backend tanpa default angka dummy
      return rawList.map((r, idx) => {
        if (!r) return {};
        const sectionItem = official?.sections?.[idx] || null;
        return {
          ...r,
          name: r.name || r.poleName || `Pole ${idx + 1}`,
          material: r.materialName || r.material || "",
          lowerDiameter: r.diameterMm ?? r.lowerDiameter,
          lowerThickness: r.thicknessMm ?? r.lowerThickness,
          sectionModulus: r.sectionModulusCm3 ?? r.sectionModulus ?? sectionItem?.sectionModulusCm3 ?? null,
          sectionModulusCm3: r.sectionModulusCm3 ?? sectionItem?.sectionModulusCm3 ?? null,
          momentInertia: r.momentOfInertiaCm4 ?? r.momentInertia,
          radiusGyration: r.radiusOfGyrationCm ?? r.radiusGyration,
          sectionArea: r.crossSectionAreaCm2 ?? r.crossSectionalAreaCm2 ?? r.crossSectionArea ?? r.sectionArea,
          crossSectionArea: r.crossSectionAreaCm2 ?? r.crossSectionalAreaCm2 ?? r.crossSectionArea ?? r.sectionArea,
          fixLoad: r.unitWeightKgM ?? r.unitWeight ?? r.fixLoad,
        };
      });
    }

    return rawList.map((r, idx) => {
      if (!r) return {};
      return {
        ...r,
        lowerDiameter: num(r.lowerDiameter, 165),
        upperDiameter: num(r.upperDiameter, 75),
        lowerThickness: num(r.lowerThickness, 4),
        upperThickness: num(r.upperThickness, 4),
        sectionModulus: num(r.sectionModulus, 30),
        sectionArea: num(r.sectionArea, 15),
        crossSectionArea: num(r.crossSectionArea || r.sectionArea, 15),
        momentInertia: num(r.momentInertia, 100),
        radiusGyration: num(r.radiusGyration, 3.5),
        fixLoad: num(r.fixLoad, 50),
        zHeight: num(r.zHeight, 10000),
        heightSection: num(r.heightSection, 1000),
        fb: num(r.fb, 120),
        stb: num(r.stb, 100),
        sts: num(r.sts, 85),
        stc: num(r.stc, 75),
        bendingMoment: num(r.bendingMoment, 1200 * (idx + 1)),
        shearStress: num(r.shearStress, 15),
        bendingStress: num(r.bendingStress, 55),
        combinedStress: num(r.combinedStress, 60),
        safetyRatio: num(r.safetyRatio, 0.65),
      };
    });
  }, [reportData, effectiveOfficialReport]);

  // ── Schematic setup (Standard Pole IA, IS, LA, LS, TA, TS & Standard Straight) ──
  const taperPoleStandard = useMemo(() => {
    if (reportData?.taperPoleStandard) return reportData.taperPoleStandard;
    try {
      return (
        JSON.parse(
          sessionStorage.getItem(`${projectType}_taperPoleStandard`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  }, [reportData, projectType]);

  const straightPoleStandard = useMemo(() => {
    if (reportData?.straightPoleStandard) return reportData.straightPoleStandard;
    try {
      return (
        JSON.parse(
          sessionStorage.getItem(`${projectType}_straightPoleStandard`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  }, [reportData, projectType]);

  const resultsDo = useMemo(() => {
    const isCustom =
      reportData?.condition?.poleType === "custom" ||
      reportData?.poleConfig?.poleType === "custom";
    const stdType = isCustom
      ? ""
      : String(
          reportData?.taperPoleStandard?.poleType ||
            taperPoleStandard?.poleType ||
            reportData?.condition?.standardPoleType ||
            "",
        ).toUpperCase();
    if (["LA", "LS", "TA", "TS"].includes(stdType)) {
      return [];
    }
    const rawDoList =
      Array.isArray(reportData?.resultsDo) && reportData.resultsDo.length > 0
        ? reportData.resultsDo
        : Array.isArray(reportData?.poleConfig?.directObjects) &&
            reportData.poleConfig.directObjects.length > 0
          ? reportData.poleConfig.directObjects
          : [];
    return rawDoList
      .filter((d) => d && d?.sourceType !== "arm")
      .map((d) => {
        return {
          ...d,
          name: d?.name || "灯具",
          weight: num(d?.weight, 14),
          fixLoad: num(d?.fixLoad || d?.weight, 14),
          frontArea: num(d?.frontArea, 0.1),
          sideArea: num(d?.sideArea, 0.1),
          cf: num(d?.cf, 1.1),
          windLoadAreaFront: num(d?.windLoadAreaFront, 60),
          windLoadAreaSide: num(d?.windLoadAreaSide, 40),
          zHeight: num(d?.zHeight, 10000),
        };
      });
  }, [reportData, taperPoleStandard]);
  const resultsOhw = reportData?.resultsOhw || [];
  const resultsArm = reportData?.resultsArm || [];
  const [editedCover, setEditedCover] = useState(null);
  const [showEditCoverModal, setShowEditCoverModal] = useState(false);

  const sessionCover = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(`${projectType}_cover`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [projectType, editedCover]);

  const parentRequest = useMemo(() => {
    if (!draftId) return null;
    return findRequestOfCase(draftId)?.request || null;
  }, [draftId]);

  const cover = useMemo(() => {
    const hasValidTitles = (c) => {
      if (!c || typeof c !== "object") return false;
      return Boolean(
        (c.projectName && String(c.projectName).trim()) ||
        (c.title1 && String(c.title1).trim()) ||
        (c.calculationNumber && String(c.calculationNumber).trim()) ||
        (c.reportNumber && String(c.reportNumber).trim()) ||
        (c.title2 && String(c.title2).trim()) ||
        (c.coverTopText && String(c.coverTopText).trim())
      );
    };

    // Candidates in priority order:
    // 1. editedCover (just edited in modal)
    // 2. sessionCover (user's input in current session)
    // 3. reportData.cover (snapshot when clicking Make Report)
    // 4. serverCover (from API getReportHeader, only if it has actual titles)
    // 5. officialReport cover (from backend calculation run)
    const validCandidate =
      (editedCover && hasValidTitles(editedCover) ? editedCover : null) ||
      (sessionCover && hasValidTitles(sessionCover) ? sessionCover : null) ||
      (reportData?.cover && hasValidTitles(reportData.cover) ? reportData.cover : null) ||
      (serverCover && hasValidTitles(serverCover) ? serverCover : null) ||
      (effectiveOfficialReport?.cover && hasValidTitles(effectiveOfficialReport.cover)
        ? effectiveOfficialReport.cover
        : null) ||
      (effectiveOfficialReport?.reportHeader &&
      hasValidTitles(effectiveOfficialReport.reportHeader)
        ? effectiveOfficialReport.reportHeader
        : null) ||
      editedCover ||
      sessionCover ||
      reportData?.cover ||
      serverCover ||
      effectiveOfficialReport?.cover ||
      effectiveOfficialReport?.reportHeader ||
      {};

    const normalized = normalizeCover(validCandidate);

    // Smart fallback from parentRequest so project name and calculation number are never blank
    const fallbackProjName =
      parentRequest?.subject ||
      parentRequest?.fields?.projectName ||
      sessionCover?.projectName ||
      sessionCover?.title1 ||
      reportData?.cover?.projectName ||
      reportData?.cover?.title1 ||
      "";
    const fallbackCalcNo =
      parentRequest?.requestNo ||
      parentRequest?.fields?.requestNo ||
      parentRequest?.fields?.calcReportNo ||
      sessionCover?.calculationNumber ||
      sessionCover?.reportNumber ||
      "";
    const fallbackCompany =
      parentRequest?.fields?.companyName ||
      parentRequest?.companyName ||
      sessionCover?.companyName ||
      "";

    return {
      ...normalized,
      projectName: normalized.projectName || fallbackProjName,
      title1: normalized.title1 || fallbackProjName,
      calculationNumber: normalized.calculationNumber || fallbackCalcNo,
      reportNumber: normalized.reportNumber || fallbackCalcNo,
      companyName: normalized.companyName || fallbackCompany,
    };
  }, [
    editedCover,
    sessionCover,
    serverCover,
    effectiveOfficialReport,
    reportData,
    parentRequest,
  ]);

  const condition = useMemo(() => {
    const cond = { ...(reportData?.condition || {}) };
    if (parentRequest?.designConditions?.standard) {
      const stdCode = resolveDesignStandardCode(parentRequest.designConditions.standard);
      if (stdCode) {
        cond.designStandard = stdCode;
      }
    }
    if (taperPoleStandard?.poleType) {
      cond.standardPoleType = cond.standardPoleType || taperPoleStandard.poleType;
      cond.taperPoleStandard = cond.taperPoleStandard || taperPoleStandard;
    }
    return cond;
  }, [reportData, parentRequest, taperPoleStandard]);

  const poleConfig = reportData?.poleConfig || {};

  // Optional sections — only present in payload if their flag was enabled in condition
  const calculatedOp = reportData?.calculatedOp || null;
  const calculatedBaseplate = reportData?.calculatedBaseplate || null;
  const calculatedFoundation = reportData?.calculatedFoundation || null;

  // ── UI state ──
  const { isReadOnly } = useReadOnly();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [hasReport, setHasReport] = useState(true);
  const [toast, setToast] = useState(null);

  // ── Handlers ──

  const handleSaveCover = (updatedCover) => {
    const normalizedCover = normalizeCover(updatedCover);
    setEditedCover(normalizedCover);
    sessionStorage.setItem(
      `${projectType}_cover`,
      JSON.stringify(normalizedCover),
    );

    try {
      const snap = JSON.parse(
        sessionStorage.getItem(`${projectType}_reportSnapshot`) || "{}",
      );
      const updatedSnap = {
        ...snap,
        ...(reportData || {}),
        cover: normalizedCover,
      };
      sessionStorage.setItem(
        `${projectType}_reportSnapshot`,
        JSON.stringify(updatedSnap),
      );
    } catch (e) {
      console.error("Failed to update snapshot with cover:", e);
    }

    if (draftId) {
      saveWorkingSessionToDraft(projectType, draftId);
    }

    // Persist report header to backend API
    const foundReq = draftId ? findRequestOfCase(draftId) : null;
    const reqId =
      foundReq?.request?.id || sessionStorage.getItem("active_request_id");
    if (reqId || draftId) {
      try {
        const payload = buildReportHeaderPayload(normalizedCover);
        saveReportHeader(reqId, draftId, payload).catch((err) => {
          console.debug("[ReportView] saveReportHeader background error:", err?.message);
        });
      } catch (err) {
        console.debug("[ReportView] saveReportHeader error:", err);
      }
    }

    setShowEditCoverModal(false);
  };

  const onBackCalculation = () => {
    if (projectType && draftId) {
      navigate(`/projects/${projectType}/${draftId}/initial`);
      return;
    }
    const backPath = activeDraftRequestPath(projectType);
    if (backPath && backPath !== "/projects") {
      navigate(backPath);
      return;
    }
    navigate("/projects");
  };

  const onBackRequest = () => {
    const backPath = activeDraftRequestPath(projectType);
    if (backPath && backPath !== "/projects") {
      navigate(backPath);
      return;
    }
    navigate(`/projects/${projectType}`);
  };

  // Rename PDF filename via document.title (common browser workaround)
  const handlePrint = () => {
    const oldTitle = document.title;
    document.title =
      cover?.calculationNumber || cover?.reportNumber || "Calculation Report";
    window.print();
    document.title = oldTitle;
  };

  const handleDelete = () => {
    setHasReport(false);
    setShowDeleteConfirm(false);
    clearCalculationSession(projectType);
    navigate("/projects");
  };

  const handleConfirmSaveDb = async () => {
    setShowDbModal(false);
    if (draftId) {
      saveWorkingSessionToDraft(projectType, draftId);
      await submitCaseForCheck(draftId, getUser());
    }
    setToast({
      message: "Case saved and status updated to Ready for Check!",
      type: "success",
    });
    // Redirect to My Projects list page (/projects)
    setTimeout(() => {
      clearCalculationSession(projectType);
      clearActiveDraftId(projectType);
      navigate("/projects");
    }, 1200);
  };


  const poleTypeStandard = useMemo(() => {
    if (reportData?.poleTypeStandard) return reportData.poleTypeStandard;
    try {
      return (
        JSON.parse(
          sessionStorage.getItem(`${projectType}_poleTypeStandard`) || "null",
        ) || {}
      );
    } catch {
      return {};
    }
  }, [reportData, projectType]);

  const schematicParams = useMemo(() => {
    return getStandardPoleSchematicParameters({
      taperPoleStandard,
      straightPoleStandard,
      poleTypeStandard,
      condition,
    });
  }, [taperPoleStandard, straightPoleStandard, poleTypeStandard, condition]);

  const iframeRef = useRef(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const {
    isReady,
    isGenerating,
    schematicData,
    finalSvg,
    sendParameters,
    resetToDefault,
    openEditor,
  } = useSchematicBridge({
    iframeRef,
    schematicUrl: DEFAULT_SCHEMATIC_URL,
    projectType,
    onApplied: () => {
      setIsEditorOpen(false);
    },
    onCancel: () => {
      setIsEditorOpen(false);
    },
  });

  const lastRequestedStandardIdRef = useRef("");
  useEffect(() => {
    if (!schematicParams || !isReady) return;
    if (
      schematicData?.generatedSvg &&
      schematicData?.standardId === schematicParams.standardId
    ) {
      return;
    }
    const isStandardChanged = Boolean(
      schematicData?.standardId &&
      schematicData.standardId !== schematicParams.standardId,
    );
    if (lastRequestedStandardIdRef.current === schematicParams.standardId)
      return;
    lastRequestedStandardIdRef.current = schematicParams.standardId;

    sendParameters(schematicParams.payload, {
      standardId: schematicParams.standardId,
      replaceManualEdit: isStandardChanged,
    });
  }, [isReady, schematicParams, schematicData, sendParameters]);

  const handleEditSchematic = useCallback(() => {
    setIsEditorOpen(true);
    openEditor();
  }, [openEditor]);

  const handleRegenerateSchematic = useCallback(() => {
    if (schematicParams) {
      resetToDefault(schematicParams.payload, {
        standardId: schematicParams.standardId,
      });
    }
  }, [resetToDefault, schematicParams]);

  const isMatchingSchematic =
    schematicData?.standardId &&
    schematicParams?.standardId &&
    schematicData.standardId === schematicParams.standardId;

  const reportSchematicSvg =
    (isMatchingSchematic ? finalSvg : null) ||
    finalSvg ||
    reportData?.schematicSvg;

  // ── Render report by project type ──
  // Each template receives only the props it needs.
  // Optional sections (calculatedOp, etc.) are passed through — templates
  // check condition flags internally to decide whether to render those sections.
  const renderReport = () => {
    const commonProps = {
      cover,
      condition: {
        ...condition,
        windPressureNM2: effectiveOfficialReport?.windPressureNM2,
        allowableStressNMm2: effectiveOfficialReport?.allowableStressNMm2,
        ...(effectiveOfficialReport?.designWindSpeedMS
          ? { designWindSpeed: effectiveOfficialReport.designWindSpeedMS }
          : {}),
      },
      poleConfig,
      results,
      resultsDo,
      resultsOhw,
      resultsArm,
      officialReport: effectiveOfficialReport,
      schematicSvg: reportSchematicSvg,
      isSchematicEdited: Boolean(schematicData?.editedSvg),
      isSchematicGenerating: isGenerating,
      onEditSchematic: handleEditSchematic,
      onRegenerateSchematic: handleRegenerateSchematic,
    };

    switch (projectType) {
      case "lighting-project": {
        const std = String(condition?.designStandard || "").toLowerCase();
        const isNewJil = std === "new_jil" || std === "new jil" || std.includes("new");

        if (isNewJil) {
          return (
            <div id="report-a4">
              <NewJilReport
                {...commonProps}
                calculatedOp={calculatedOp}
                calculatedBaseplate={calculatedBaseplate}
                calculatedFoundation={calculatedFoundation}
              />
            </div>
          );
        }

        return (
          <div id="report-a4">
            <LightingPoleReport
              {...commonProps}
              calculatedOp={calculatedOp}
              calculatedBaseplate={calculatedBaseplate}
              calculatedFoundation={calculatedFoundation}
            />
          </div>
        );
      }

      case "disaster-prevention-project":
        return (
          <div id="report-a4">
            <AcemastReport
              {...commonProps}
              calculatedOp={calculatedOp}
              calculatedBaseplate={calculatedBaseplate}
              calculatedFoundation={calculatedFoundation}
            />
          </div>
        );

      case "signboard-project":
        return (
          <div id="report-a4">
            <SignboardReport
              {...commonProps}
              calculatedOp={calculatedOp}
              calculatedBaseplate={calculatedBaseplate}
              calculatedFoundation={calculatedFoundation}
            />
          </div>
        );

      case "multi-purpose-project":
        return (
          <div id="report-a4">
            <MultipleReport
              {...commonProps}
              calculatedOp={calculatedOp}
              calculatedBaseplate={calculatedBaseplate}
              calculatedFoundation={calculatedFoundation}
            />
          </div>
        );

      default:
        return <div />;
    }
  };

  // ── Empty state ──
  if (!hasReport || results.length === 0 || !projectType || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-250">
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full text-center">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <EmptyReport width={160} height={120} />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-slate-700 mb-3">
              No report generated yet
            </h1>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Complete a calculation and fill in the cover details
              <br />
              to generate your first report.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button
                onClick={onBackCalculation}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white rounded-lg shadow-sm hover:brightness-110 transition-all duration-200 font-medium text-base focus:outline-none focus:ring-2 focus:ring-[#3399cc]/50"
              >
                <Calculator className="w-5 h-5" />
                Go to Calculation
              </button>
            </div>
          </div>
        </div>

        {/* ── Report Auto-fetch Loading & Error Modals ── */}
        <ReportLoadingModal open={isLoadingReport} />
        <ReportErrorModal
          open={Boolean(reportError)}
          onClose={() => setReportError(null)}
          title={reportError?.title}
          message={reportError?.message}
          details={reportError?.details}
          status={reportError?.status}
          onRetry={handleRetryFetch}
          onBackToCalculation={onBackCalculation}
        />
      </div>
    );
  }

  // ── Report view ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar — hidden on print */}
      <div className="bg-white print:hidden sticky top-[64px] z-30 shadow-sm border-b border-[#0d3b66]">
        <div className="mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
            {/* Back Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onBackRequest}
                className="h-9 px-3 sm:px-4 rounded-lg font-medium bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] text-xs sm:text-sm ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="Back to Project Detail"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Back to Project Detail</span>
                <span className="hidden sm:inline xl:hidden">Project Detail</span>
                <span className="sm:hidden">Back</span>
              </button>

              {draftId && (
                <button
                  onClick={onBackCalculation}
                  className="h-9 px-3 sm:px-4 text-xs sm:text-sm bg-white text-[#0d3b66] border border-[#0d3b66] rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer font-medium"
                  title="Back to Calculation Form"
                >
                  <Calculator className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Calculation</span>
                  <span className="md:hidden">Calc</span>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Edit Cover Information Button */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowEditCoverModal(true)}
                  title="Edit Report Cover Information"
                  className="h-9 px-3 sm:px-4 text-xs sm:text-sm bg-white text-[#0d3b66] border border-[#0d3b66] rounded-lg hover:bg-blue-50 transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer font-medium"
                >
                  <FileEdit className="w-4 h-4 text-[#0d3b66] shrink-0" />
                  <span className="hidden xl:inline">Edit Cover Information</span>
                  <span className="hidden md:inline xl:hidden">Edit Cover</span>
                  <span className="md:hidden">Cover</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                title="Export PDF"
                className="h-9 px-3 sm:px-4 text-xs sm:text-sm bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] rounded-lg transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer font-medium"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>

              {!isReadOnly && draftId && (
                <button
                  onClick={() => setShowDbModal(true)}
                  title="Save calculations and submit case as Ready for Check"
                  className="h-9 px-3.5 sm:px-5 text-xs sm:text-sm bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] text-white rounded-lg hover:brightness-110 transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer font-medium"
                >
                  <SendHorizontal className="w-4 h-4 shrink-0" />
                  <span className="hidden xl:inline">Ready for Check</span>
                  <span className="hidden md:inline xl:hidden">Ready for Check</span>
                  <span className="md:hidden">Ready</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-xs bg-white border border-gray-200 rounded-xl shadow-xl p-4 sm:max-w-md sm:p-8 sm:rounded-2xl">
            <div className="mx-auto mb-3 flex items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-red-100 rounded-full">
              <AlertCircle className="w-5 h-5 sm:w-8 sm:h-8 text-red-500" />
            </div>

            <h2 className="text-center font-bold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
              Delete Report?
            </h2>
            <p className="text-center text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
              This will delete all inputs and results. This action cannot be
              undone. Continue?
            </p>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 sm:py-3 font-bold text-xs sm:text-sm bg-slate-100 text-slate-600 rounded-md sm:rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 sm:py-3 font-bold text-xs sm:text-sm bg-red-500 text-white rounded-md sm:rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report content */}
      <div className="max-w-7xl mx-auto px-6 py-8 hp:mx-0 hp:px-0 hp:flex hp:justify-center hp:max-w-[100vh] hp:overflow-hidden">
        {renderReport()}
      </div>

      <ConfirmSaveDatabaseModal
        open={showDbModal}
        onClose={() => setShowDbModal(false)}
        onConfirm={handleConfirmSaveDb}
      />

      {/* Schematic SVG-Edit Modal (Iframe always mounted & ready) */}
      <SchematicEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        iframeRef={iframeRef}
        schematicUrl={DEFAULT_SCHEMATIC_URL}
        onOpenEditor={openEditor}
        onReset={handleRegenerateSchematic}
        isEdited={Boolean(schematicData?.editedSvg)}
      />

      {/* Cover Form Modal for editing report cover information */}
      <CoverFormModal
        open={showEditCoverModal}
        onClose={() => setShowEditCoverModal(false)}
        projectType={projectType}
        draftId={draftId}
        onConfirm={handleSaveCover}
        isEditMode={true}
      />

      <ToastModal toast={toast} onClose={() => setToast(null)} />

      {/* ── Report Loading & Error Modals ── */}
      <ReportLoadingModal open={isLoadingReport} />
      <ReportErrorModal
        open={Boolean(reportError)}
        onClose={() => setReportError(null)}
        title={reportError?.title}
        message={reportError?.message}
        details={reportError?.details}
        status={reportError?.status}
        onRetry={handleRetryFetch}
        onBackToCalculation={onBackCalculation}
      />
    </div>
  );
}
