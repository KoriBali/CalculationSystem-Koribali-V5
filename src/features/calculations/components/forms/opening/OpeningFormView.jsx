import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box } from "lucide-react";

import { HeaderCalculationPage } from "../../layout/HeaderCalculationPage";
import { OpeningType } from "./OpeningType";
import { BoxTypeForm } from "./BoxTypeForm";
import { RTypeForm } from "./RTypeForm";
import { OpeningResultTable } from "../../tables/opening-result/OpeningResultTable";
import { ToastModal } from "../../modals/ToastModal";
import { FinishCalculationModal } from "../../modals/FinishCalculationModal";
import { ConfirmSaveDatabaseModal } from "../../modals/ConfirmSaveDatabaseModal";
import { CoverFormModal } from "../../modals/CoverFormModal";
import {
  saveWorkingSessionToDraft,
  clearActiveDraftId,
} from "../../../utils/coreLogic";
import { clearCalculationSession } from "../../../utils";
import { useOpeningForm } from "../../../hooks/useOpeningForm";
import { useReport } from "../../../../report/hooks/useReport";
import { ReportLoadingModal } from "../../../../report/components/modals/ReportLoadingModal";
import { ReportErrorModal } from "../../../../report/components/modals/ReportErrorModal";
import { useState } from "react";
import { activeDraftRequestPath, submitCaseForCheck } from "../../../utils/requestCases";
import { useReadOnly } from "../../../contexts/ReadOnlyContext";
import { getUser } from "../../../../../utils/auth";
import { NextStepFoundationCard } from "../common/NextStepFoundationCard";
import { notifyCalculationProgressChanged } from "../../../utils/calculationProgressEvent";

// Main view for the opening calculation step
export default function OpeningFormView() {
  const { type: projectType, draftId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);

  // Read condition to know if standard mode and whether baseplate is enabled
  const condition = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}"
      );
    } catch {
      return {};
    }
  })();

  const isStandard = condition?.poleType === "standard";
  const isFinalStepInStandard = isStandard && !condition?.baseplateEnabled;

  // ── Hooks ──
  const opening = useOpeningForm();
  const report = useReport(projectType);
  const { isReadOnly } = useReadOnly();

  // Opens cover modal if this is the last step, otherwise navigates to next.
  const handleNextStep = () => {
    if (isReadOnly) {
      const result = opening.finish(true);
      if (result === "OPEN_COVER") {
        navigate(
          isProjectTools
            ? `/project-tools/${projectType}/report`
            : `/projects/${projectType}/${draftId}/report`
        );
      }
      return;
    }
    if (!opening.isCalculated) {
      opening.showToast('Click "Calculate Results" first', "error");
      return;
    }
    const result = opening.finish();
    if (result === "OPEN_COVER") {
      if (isProjectTools) {
        handleGenerateReportClick();
        return;
      }
      setShowFinishModal(true);
    }
  };

  const handleConfirmCover = async (overrideCover) => {
    const success = await report.makeReport({
      isCalculated: opening.isCalculated,
      showToast: opening.showToast,
      coverOverride: overrideCover,
      draftIdOverride: draftId,
    });
    if (success) {
      setShowCoverModal(false);
    }
  };

  const handleGenerateReportClick = async () => {
    setShowFinishModal(false);
    if (isProjectTools) {
      await report.makeReport({
        isCalculated: opening.isCalculated,
        showToast: opening.showToast,
      });
      return;
    }
    if (draftId) {
      saveWorkingSessionToDraft(projectType, draftId);
    }
    handleConfirmCover();
  };

  const handleSaveDraft = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    opening.showToast("Draft successfully saved!", "success");
    setShowFinishModal(false);
  };

  const handleSaveDatabaseClick = () => {
    setShowFinishModal(false);
    setShowDbModal(true);
  };

  const handleConfirmSaveDb = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    submitCaseForCheck(draftId, getUser());
    opening.showToast("Case saved and submitted for checking!", "success");
    setShowDbModal(false);
    // Back to the case's request — read before the session is cleared.
    const backPath = activeDraftRequestPath(projectType);
    setTimeout(() => {
      clearCalculationSession(projectType);
      clearActiveDraftId(projectType);
      navigate(backPath);
    }, 2000);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>Calculation Opening - KORI BALI</title>
          <meta
            name="calculation"
            content="Calculation System CV. KORI BALI membantu Anda menghitung dan menganalisis struktur pole dengan mudah."
          />
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            {/* ── Opening configuration (Opening Type + Detail) ── */}
            <div
              className="
                bg-white
                mt-6
                rounded-2xl hp:rounded-xl
                border border-gray-200
                shadow-[0_2px_10px_rgba(15,23,42,0.06)]
                overflow-hidden
              "
            >
              {/* Top accent strip */}
              <div
                aria-hidden="true"
                className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
              />

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* ── Opening Type selector ── */}
                <div>
                  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
                    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                    Opening Type <span className="text-red-500 ml-1 font-semibold">*</span>
                  </h3>
                  <OpeningType
                    openingType={opening.openingType}
                    onUpdate={opening.updateOpeningType}
                    errors={opening.openingTypeErrors}
                    readOnly={isReadOnly}
                  />
                </div>

                {/* ── Opening detail section ── */}
                <div>
                  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
                    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                    Opening Specifications
                  </h3>

                  {/* Empty state — prompt user to select type first */}
                  {!opening.openingType.type && (
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex flex-col items-center justify-center text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <Box className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">
                          Please select opening type first
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Choose the type above to configure parameters
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Box type form */}
                  {opening.openingType.type === "box" && (
                    <BoxTypeForm
                      boxType={opening.boxType}
                      onUpdate={opening.updateBoxType}
                      errors={opening.boxTypeErrors}
                      onCalculate={opening.calculate}
                      onBack={opening.goBack}
                      onNext={handleNextStep}
                      isCalculated={opening.isCalculated}
                      buttonLabel={isProjectTools && opening.isLast ? "Generate Report" : opening.buttonLabel}
                      isCalculationAndDrawing={opening.isCalculationAndDrawing}
                      readOnly={isReadOnly}
                      hideNextButton={isFinalStepInStandard}
                    />
                  )}

                  {/* R type form */}
                  {opening.openingType.type === "R" && (
                    <RTypeForm
                      rType={opening.rType}
                      onUpdate={opening.updateRType}
                      errors={opening.rTypeErrors}
                      onCalculate={opening.calculate}
                      onBack={opening.goBack}
                      onNext={handleNextStep}
                      isCalculated={opening.isCalculated}
                      buttonLabel={isProjectTools && opening.isLast ? "Generate Report" : opening.buttonLabel}
                      isCalculationAndDrawing={opening.isCalculationAndDrawing}
                      readOnly={isReadOnly}
                      hideNextButton={isFinalStepInStandard}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ── Next Step Card (When Opening is the last tab in Standard Embedment mode) ── */}
            {isFinalStepInStandard && (
              <NextStepFoundationCard
                parentType="opening"
                projectType={projectType}
                isCalculated={opening.isCalculated}
                isReadOnly={isReadOnly}
                initialOption={condition?.foundationEnabled ? "foundation" : null}
                onProceedToFoundation={() => {
                  sessionStorage.setItem(`${projectType}_foundation_step_choice`, "foundation");
                  const raw = sessionStorage.getItem(`${projectType}_condition`);
                  const prev = raw ? JSON.parse(raw) : {};
                  const next = { ...prev, foundationEnabled: true };
                  sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));

                  const rawConfig = sessionStorage.getItem(`${projectType}_calculation_config`);
                  const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
                  sessionStorage.setItem(
                    `${projectType}_calculation_config`,
                    JSON.stringify({ ...prevConfig, foundation: true })
                  );
                  notifyCalculationProgressChanged();
                  navigate(
                    isProjectTools
                      ? `/project-tools/${projectType}/foundation`
                      : `/projects/${projectType}/${draftId}/foundation`
                  );
                }}
                onFinishWithoutFoundation={() => {
                  sessionStorage.setItem(`${projectType}_foundation_step_choice`, "finish");
                  const raw = sessionStorage.getItem(`${projectType}_condition`);
                  const prev = raw ? JSON.parse(raw) : {};
                  const next = { ...prev, foundationEnabled: false };
                  sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));

                  const rawConfig = sessionStorage.getItem(`${projectType}_calculation_config`);
                  const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
                  sessionStorage.setItem(
                    `${projectType}_calculation_config`,
                    JSON.stringify({ ...prevConfig, foundation: false })
                  );
                  notifyCalculationProgressChanged();
                  handleGenerateReportClick();
                }}
              />
            )}

            {/* ── Result table ── */}
            <div id="results-op">
              {opening.showResultsOp && (
                <OpeningResultTable
                  openingType={opening.calculatedOp?.openingType}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast notification ── */}
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
        toast={opening.toast}
        onClose={() => opening.setToast(null)}
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
    </>
  );
}
