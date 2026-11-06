import React, { useEffect } from "react";
import { FileText, FileEdit, RotateCcw, ChevronRight } from "lucide-react";
import { useCoverForm, DEFAULT_COVER } from "../../hooks/useCoverForm";
import { useMasterData } from "../../hooks/useMasterData";
import {
  inputStyle,
  ErrorStyle,
  Label,
} from "../forms/cover/coverFieldPrimitives";
import { FormSelect } from "../../../../shared/components/FormSelect";
import {
  getReportHeader,
  saveReportHeader,
  buildReportHeaderPayload,
  normalizeReportHeaderResponse,
} from "../../services/requestService";
import { findRequestOfCase, getRequest } from "../../data/requestStore";

// Master-data region/author options come as {value, label} where `value` is
// the code — combine into "CODE - Name" for clear and consistent display.
const toCodeSelectOptions = (opts) =>
  opts.map((o) => ({ value: o.value, label: `${o.value} - ${o.label}` }));

/**
 * Determines whether the pole calculation evaluated to OK or NG.
 * Returns "ok" if calculation ran and results are OK / O.K,
 * "ng" if calculation ran and failed or is NG / N.G, or null if no results exist.
 */
export function determinePoleCalculationStatus(projectType) {
  try {
    const checkStatusString = (val) => {
      if (typeof val !== "string") return null;
      const clean = val.trim().toLowerCase().replace(/\s+/g, "");
      if (
        clean === "ok" ||
        clean === "o.k" ||
        clean === "o.k." ||
        clean === "pass"
      ) {
        return "ok";
      }
      if (
        clean === "ng" ||
        clean === "n.g" ||
        clean === "n.g." ||
        clean === "fail"
      ) {
        return "ng";
      }
      return null;
    };

    // 1. Check displayResult in sessionStorage
    const rawDisplay = sessionStorage.getItem(`${projectType}_displayResult`);
    if (rawDisplay) {
      const display = JSON.parse(rawDisplay);
      const strStatus = checkStatusString(
        display?.status || display?.overallStatus,
      );
      if (strStatus) return strStatus;

      const list =
        (Array.isArray(display?.checks) && display.checks) ||
        (Array.isArray(display?.positions) && display.positions) ||
        (Array.isArray(display?.sections) && display.sections) ||
        (Array.isArray(display) && display);

      if (Array.isArray(list) && list.length > 0) {
        let hasAnyItem = false;
        for (const item of list) {
          if (!item) continue;
          hasAnyItem = true;
          const itemSt = checkStatusString(item.status);
          if (itemSt === "ng") return "ng";
          if (itemSt === "ok") continue;

          const ratio =
            item.utilizationRatio ??
            item.utilization_ratio ??
            item.safetyFactor ??
            item.safety_factor ??
            item.safetyRatio ??
            item.stressRatio ??
            item.ratio ??
            item.value;

          if (ratio != null && !Number.isNaN(Number(ratio))) {
            const limit = Number(item.limit ?? item.allowableRatio ?? 1.0);
            if (Number(ratio) > limit) return "ng";
          }
        }
        if (hasAnyItem) return "ok";
      }

      if (display?.governing) {
        const govSt = checkStatusString(display.governing.status);
        if (govSt) return govSt;
        const govRatio =
          display.governing.utilizationRatio ??
          display.governing.safetyFactor;
        if (govRatio != null && !Number.isNaN(Number(govRatio))) {
          const limit = Number(display.governing.limit ?? 1.0);
          return Number(govRatio) <= limit ? "ok" : "ng";
        }
      }
    }

    // 2. Check reportSnapshot in sessionStorage
    const rawSnapshot = sessionStorage.getItem(`${projectType}_reportSnapshot`);
    if (rawSnapshot) {
      const snap = JSON.parse(rawSnapshot);
      const snapSt =
        checkStatusString(snap?.status) ||
        checkStatusString(snap?.officialReport?.status) ||
        checkStatusString(snap?.display?.status) ||
        checkStatusString(snap?.displayResult?.status);
      if (snapSt) return snapSt;

      const snapSections =
        snap?.officialReport?.sections ||
        snap?.sections ||
        snap?.officialReport?.checks;
      if (Array.isArray(snapSections) && snapSections.length > 0) {
        for (const s of snapSections) {
          const sSt = checkStatusString(s?.status);
          if (sSt === "ng") return "ng";
          const ratio = s?.utilizationRatio ?? s?.safetyRatio;
          if (ratio != null && !Number.isNaN(Number(ratio))) {
            if (Number(ratio) > 1.0) return "ng";
          }
        }
        return "ok";
      }
    }

    // 3. Check results array in sessionStorage
    const rawResults = sessionStorage.getItem(`${projectType}_results`);
    if (rawResults) {
      const results = JSON.parse(rawResults);
      if (Array.isArray(results) && results.length > 0) {
        let hasChecked = false;
        for (const r of results) {
          if (!r) continue;
          const rSt = checkStatusString(r.status);
          if (rSt === "ng") return "ng";
          if (r.safetyFactor != null && !Number.isNaN(Number(r.safetyFactor))) {
            hasChecked = true;
            const sf = Number(r.safetyFactor);
            const limit = Number(r.limit != null ? r.limit : 1.0);
            if (sf > limit) return "ng";
          }
        }
        if (hasChecked) return "ok";
      }
    }
  } catch (err) {
    console.debug("[determinePoleCalculationStatus] error parsing status:", err);
  }

  return null;
}

/**
 * Computes contextual defaults for the cover modal:
 * - reportNumber: WS{pjNo}-{caseName}
 * - title1: Project Name from request
 * - title2: "強度検討" if pole calculation is OK/O.K, else "【強度 N.G】"
 */
export function getContextualCoverDefaults(projectType, draftId, requestId) {
  const effectiveDraftId =
    draftId ||
    sessionStorage.getItem(`${projectType}_active_draft_id`) ||
    (typeof window !== "undefined"
      ? window.location.pathname
          .split("/")
          .find((p) => p.startsWith("draft_") || /^[0-9a-f-]{36}$/i.test(p))
      : null);

  const foundReq = effectiveDraftId
    ? findRequestOfCase(effectiveDraftId)
    : null;
  const effectiveReqId =
    requestId ||
    foundReq?.request?.id ||
    sessionStorage.getItem("active_request_id") ||
    (effectiveDraftId
      ? sessionStorage.getItem(`case_request_id_${effectiveDraftId}`)
      : null);

  const req =
    foundReq?.request || (effectiveReqId ? getRequest(effectiveReqId) : null);

  // 1. Resolve PJ Number
  let rawPjNo =
    req?.pjNo ||
    req?.fields?.projectNo ||
    req?.projectNo ||
    req?.fields?.pjNo ||
    sessionStorage.getItem("active_request_pj_no") ||
    "";

  if (!rawPjNo) {
    try {
      const idRaw = sessionStorage.getItem(`${projectType}_projectIdentity`);
      if (idRaw) {
        const idObj = JSON.parse(idRaw);
        rawPjNo = idObj?.projectNo || idObj?.pjNo || "";
      }
    } catch {
      // ignore
    }
  }

  // Strip leading WS- or WS prefix so we can construct WS{pjNo}
  const cleanPjNo = String(rawPjNo || "")
    .trim()
    .replace(/^WS-?/i, "");

  // 2. Resolve Case Number
  let rawCaseNo =
    foundReq?.case?.no ||
    foundReq?.case?.caseNo ||
    foundReq?.case?.caseLabel ||
    foundReq?.case?.case_label ||
    foundReq?.case?.title ||
    (effectiveDraftId
      ? sessionStorage.getItem(`case_no_${effectiveDraftId}`)
      : null) ||
    sessionStorage.getItem("active_case_no") ||
    "";

  if (!rawCaseNo && req?.cases && effectiveDraftId) {
    const matched = req.cases.find((c) => c.id === effectiveDraftId);
    if (matched) {
      rawCaseNo =
        matched.no || matched.caseNo || matched.caseLabel || "";
    }
  }

  let cleanCase = "";
  if (rawCaseNo) {
    const match = String(rawCaseNo).match(/\d+/);
    cleanCase = match ? match[0].padStart(3, "0") : String(rawCaseNo).trim();
  }

  // Build report number: WS{pjNo}-{caseName}
  let defaultReportNumber = "";
  if (cleanPjNo && cleanCase) {
    defaultReportNumber = `WS${cleanPjNo}-${cleanCase}`;
  } else if (cleanPjNo) {
    defaultReportNumber = `WS${cleanPjNo}`;
  } else if (cleanCase) {
    defaultReportNumber = `WS-${cleanCase}`;
  }

  // 3. Resolve Project Name for Title Line 1
  let defaultTitle1 =
    req?.fields?.projectName ||
    req?.fields?.subject ||
    req?.subject ||
    req?.projectName ||
    sessionStorage.getItem("active_request_project_name") ||
    "";

  if (!defaultTitle1) {
    try {
      const idRaw = sessionStorage.getItem(`${projectType}_projectIdentity`);
      if (idRaw) {
        const idObj = JSON.parse(idRaw);
        defaultTitle1 = idObj?.projectName || idObj?.subject || "";
      }
    } catch {
      // ignore
    }
  }

  // 4. Resolve Title 2 based on pole calculation result
  // If result is "ok" / "o.k" -> "強度検討"
  // Else (including "ng", error, or anything else) -> "【強度 N.G】"
  const calcStatus = determinePoleCalculationStatus(projectType);
  const defaultTitle2 = calcStatus === "ok" ? "強度検討" : "【強度 N.G】";

  return {
    reportNumber: defaultReportNumber,
    calculationNumber: defaultReportNumber,
    title1: defaultTitle1,
    projectName: defaultTitle1,
    title2: defaultTitle2,
    coverTopText: defaultTitle2,
    title3: "",
    coverBottomText: "",
    region: "A",
    author: "X",
    responsibleDepartment: "S",
    date: new Date().toISOString().split("T")[0],
  };
}

export function CoverFormModal({
  open,
  onClose,
  projectType,
  draftId,
  requestId,
  onConfirm,
  isEditMode = false,
  submitText,
  titleText,
}) {
  const coverForm = useCoverForm(projectType);

  useEffect(() => {
    if (open) {
      const defaults = getContextualCoverDefaults(
        projectType,
        draftId,
        requestId,
      );
      let populated = false;
      try {
        const raw = sessionStorage.getItem(`${projectType}_cover`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isTestDraft =
            parsed.reportNumber === "1111" &&
            (parsed.title1 === "1" || !parsed.title1);

          const isLegacyDummy =
            parsed.reportNumber === "WS76509-001" ||
            parsed.calculationNumber === "WS76509-001" ||
            parsed.reportNumber === "KB-2026-001" ||
            parsed.reportNumber === "WSXXXXX-XXX" ||
            parsed.title1 === "江戸川フラワーガーデン" ||
            parsed.projectName === "江戸川フラワーガーデン";

          const userReportNumber =
            !isTestDraft && !isLegacyDummy
              ? parsed.reportNumber || parsed.calculationNumber || ""
              : "";
          const userTitle1 =
            !isTestDraft && !isLegacyDummy
              ? parsed.title1 || parsed.projectName || ""
              : "";
          const userTitle2 =
            !isTestDraft && !isLegacyDummy
              ? parsed.title2 !== undefined
                ? parsed.title2
                : parsed.coverTopText !== undefined
                  ? parsed.coverTopText
                  : ""
              : "";
          const userTitle3 = parsed.title3 || parsed.coverBottomText || "";

          const finalReportNumber = userReportNumber || defaults.reportNumber;
          const finalTitle1 = userTitle1 || defaults.title1;
          const finalTitle2 =
            userTitle2 !== "" && userTitle2 !== undefined
              ? userTitle2
              : defaults.title2;
          const finalTitle3 = userTitle3 || defaults.title3;

          coverForm.updateCover({
            reportNumber: finalReportNumber,
            calculationNumber: finalReportNumber,
            title1: finalTitle1,
            projectName: finalTitle1,
            title2: finalTitle2,
            coverTopText: finalTitle2,
            title3: finalTitle3,
            coverBottomText: finalTitle3,
            region: parsed.region || defaults.region,
            author:
              !isTestDraft && parsed.author && parsed.author !== "V"
                ? parsed.author
                : defaults.author,
            responsibleDepartment:
              !isTestDraft &&
              parsed.responsibleDepartment &&
              parsed.responsibleDepartment !== "R"
                ? parsed.responsibleDepartment
                : defaults.responsibleDepartment,
            date: parsed.date || defaults.date,
          });

          if (userReportNumber || userTitle1) {
            populated = true;
          }
        } else {
          coverForm.updateCover(defaults);
        }
      } catch (e) {
        console.error("Failed to sync cover data:", e);
        coverForm.updateCover(defaults);
      }

      // If not populated from valid sessionStorage, try loading from backend report header
      const foundReq = draftId ? findRequestOfCase(draftId) : null;
      const reqId =
        requestId ||
        foundReq?.request?.id ||
        sessionStorage.getItem("active_request_id");
      if ((reqId || draftId) && !populated) {
        getReportHeader(reqId, draftId)
          .then((header) => {
            if (header) {
              const norm = normalizeReportHeaderResponse(header);
              coverForm.updateCover({
                reportNumber: norm.reportNumber || defaults.reportNumber,
                calculationNumber:
                  norm.calculationNumber || defaults.calculationNumber,
                title1: norm.title1 || defaults.title1,
                projectName: norm.projectName || defaults.projectName,
                title2:
                  norm.title2 !== undefined && norm.title2 !== ""
                    ? norm.title2
                    : defaults.title2,
                coverTopText:
                  norm.coverTopText !== undefined && norm.coverTopText !== ""
                    ? norm.coverTopText
                    : defaults.coverTopText,
                title3: norm.title3 || defaults.title3,
                coverBottomText:
                  norm.coverBottomText || defaults.coverBottomText,
                region: norm.region || defaults.region,
                author: norm.author || defaults.author,
                responsibleDepartment:
                  norm.responsibleDepartment || defaults.responsibleDepartment,
                date: norm.date || defaults.date,
              });
            }
          })
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectType, draftId, requestId]);

  const {
    regionOptions,
    authorOptions,
    departmentOptions,
    loading: masterDataLoading,
    error: masterDataError,
    refetch: refetchMasterData,
  } = useMasterData();
  const masterDataFailed =
    masterDataError &&
    !masterDataLoading &&
    regionOptions.length === 0 &&
    authorOptions.length === 0 &&
    departmentOptions.length === 0;

  if (!open) return null;

  const handleGenerate = async () => {
    const isValid = await coverForm.validate();
    if (isValid) {
      const mgmtParts = [
        coverData.region,
        coverData.author,
        coverData.responsibleDepartment,
      ].filter(Boolean);
      const computedMgmtCode =
        mgmtParts.length > 0 ? mgmtParts.join(" ― ") : "";
      const updatedCover = {
        ...coverData,
        managementCode: computedMgmtCode,
        calculationNumber: coverData.reportNumber,
        projectName: coverData.title1 || "",
        coverTopText: coverData.title2 || "",
        coverBottomText: coverData.title3 || "",
        date: coverData.date || new Date().toISOString().split("T")[0],
      };
      coverForm.updateCover(updatedCover);
      sessionStorage.setItem(`${projectType}_cover`, JSON.stringify(updatedCover));

      // Persist to backend report header endpoint
      const foundReq = draftId ? findRequestOfCase(draftId) : null;
      const reqId =
        requestId ||
        foundReq?.request?.id ||
        sessionStorage.getItem("active_request_id");
      if (reqId || draftId) {
        try {
          const payload = buildReportHeaderPayload(updatedCover);
          saveReportHeader(reqId, draftId, payload).catch((err) => {
            console.debug("[CoverFormModal] saveReportHeader background error:", err?.message);
          });
        } catch (err) {
          console.debug("[CoverFormModal] saveReportHeader error:", err);
        }
      }

      onConfirm(updatedCover);
    }
  };

  const handleReset = () => {
    const contextualDefaults = getContextualCoverDefaults(
      projectType,
      draftId,
      requestId,
    );
    coverForm.updateCover(contextualDefaults);
    coverForm.setCoverErrors({});
  };

  const { coverData, coverErrors, updateCover } = coverForm;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[70] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] px-6 py-6 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            {isEditMode ? (
              <FileEdit className="w-4.5 h-4.5" />
            ) : (
              <FileText className="w-4.5 h-4.5" />
            )}
            <h2 className="text-base font-bold">
              {titleText || (isEditMode ? "Edit Report Cover Information" : "Report Cover Information")}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <p className="text-slate-600 mb-6 text-sm">
            {isEditMode
              ? "Update the project details below to refresh your report cover page."
              : "Please fill in the project details below. This information will be used as the cover page for your generated report."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 md:gap-y-8">
            {/* Report Number */}
            <div className="relative md:col-span-1">
              <Label>
                Report Number <span className="text-red-500 ml-1 font-semibold">*</span>
              </Label>
              <input
                type="text"
                value={coverData.reportNumber}
                onChange={(e) => updateCover({ reportNumber: e.target.value })}
                className={inputStyle(coverErrors.reportNumber)}
                placeholder="WSXXXXX-XXX"
              />
              <ErrorStyle
                show={coverErrors.reportNumber}
                text={coverErrors.reportNumber}
              />
            </div>

            {/* Report Date */}
            <div className="relative md:col-span-1">
              <Label>
                Report Date (日付) <span className="text-red-500 ml-1 font-semibold">*</span>
              </Label>
              <input
                type="date"
                value={coverData.date || ""}
                onChange={(e) => updateCover({ date: e.target.value })}
                className={inputStyle(coverErrors.date)}
              />
              <ErrorStyle
                show={coverErrors.date}
                text={coverErrors.date}
              />
            </div>

            {/* Titles */}
            <div className="relative md:col-span-2">
              <Label>
                Report Titles <span className="text-red-500 ml-1 font-semibold">*</span>
              </Label>
              <div className="flex flex-col gap-5 md:gap-6">
                <div className="relative">
                  <input
                    type="text"
                    value={coverData.title1}
                    onChange={(e) => updateCover({ title1: e.target.value })}
                    className={inputStyle(coverErrors.title1)}
                    placeholder="Title Line 1"
                  />
                  <ErrorStyle
                    show={coverErrors.title1}
                    text={coverErrors.title1}
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={coverData.title2}
                    onChange={(e) => updateCover({ title2: e.target.value })}
                    className={inputStyle(coverErrors.title2)}
                    placeholder="Title Line 2 (Optional)"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={coverData.title3}
                    onChange={(e) => updateCover({ title3: e.target.value })}
                    className={inputStyle(coverErrors.title3)}
                    placeholder="Title Line 3 (Optional)"
                  />
                </div>
              </div>
            </div>

            {/* Responsible Category block */}
            <div className="md:col-span-2 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px bg-slate-300 flex-1" />
                <h3 className="text-[#0d3b66] text-sm font-semibold">
                  Responsible category
                </h3>
                <div className="h-px bg-slate-300 flex-1" />
              </div>

              {masterDataFailed && (
                <div className="flex items-center justify-between gap-3 mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs sm:text-sm text-red-600">
                    Failed to load Region / Author / Department options.
                  </p>
                  <button
                    type="button"
                    onClick={refetchMasterData}
                    className="text-xs sm:text-sm font-medium text-red-600 underline hover:text-red-700 shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 p-5 rounded-xl bg-slate-50/50">
                {/* Region */}
                <div className="relative">
                  <Label>
                    Region <span className="text-red-500 ml-1 font-semibold">*</span>
                  </Label>
                  <FormSelect
                    value={coverData.region}
                    onChange={(val) => updateCover({ region: val })}
                    options={toCodeSelectOptions(regionOptions)}
                    loading={masterDataLoading}
                    disabled={masterDataFailed}
                    hasError={!!coverErrors.region}
                    placeholder={
                      masterDataFailed ? "Failed to load" : "Select Region"
                    }
                  />
                  <ErrorStyle show={coverErrors.region} text={coverErrors.region} />
                </div>

                {/* Author */}
                <div className="relative">
                  <Label>
                    Author <span className="text-red-500 ml-1 font-semibold">*</span>
                  </Label>
                  <FormSelect
                    value={coverData.author}
                    onChange={(val) => updateCover({ author: val })}
                    options={toCodeSelectOptions(authorOptions)}
                    loading={masterDataLoading}
                    disabled={masterDataFailed}
                    hasError={!!coverErrors.author}
                    placeholder={
                      masterDataFailed ? "Failed to load" : "Select Author"
                    }
                  />
                  <ErrorStyle show={coverErrors.author} text={coverErrors.author} />
                </div>

                {/* Responsible Department */}
                <div className="relative">
                  <Label>
                    Responsible Department <span className="text-red-500 ml-1 font-semibold">*</span>
                  </Label>
                  <FormSelect
                    value={coverData.responsibleDepartment}
                    onChange={(val) =>
                      updateCover({ responsibleDepartment: val })
                    }
                    options={toCodeSelectOptions(departmentOptions)}
                    loading={masterDataLoading}
                    disabled={masterDataFailed}
                    hasError={!!coverErrors.responsibleDepartment}
                    placeholder={
                      masterDataFailed ? "Failed to load" : "Select Department"
                    }
                  />
                  <ErrorStyle
                    show={coverErrors.responsibleDepartment}
                    text={coverErrors.responsibleDepartment}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-between gap-3 rounded-b-2xl">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md bg-white text-red-500 font-medium text-xs md:text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-red-300"
          >
            <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
            Reset
          </button>
          <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm bg-[#eef2f6] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:bg-[#e2e8f0] hover:ring-[#b8c2d1] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm transition-all cursor-pointer"
            >
              {submitText || (isEditMode ? "Save Changes" : "Generate Report")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
