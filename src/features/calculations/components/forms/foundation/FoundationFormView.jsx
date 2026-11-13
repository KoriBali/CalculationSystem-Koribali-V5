import { useState } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box } from "lucide-react";

import { HeaderCalculationPage } from "../../layout/HeaderCalculationPage";
import { FoundationType } from "./FoundationType";
import { RoundCaissonTypeForm } from "./RoundCaissonTypeForm";
import { SquareCaissonTypeForm } from "./SquareCaissonTypeForm";
import { FoundationResultTable } from "../../tables/foundation-result/FoundationResultTable";
import { ToastModal } from "../../modals/ToastModal";
import { FinishCalculationModal } from "../../modals/FinishCalculationModal";
import { ConfirmSaveDatabaseModal } from "../../modals/ConfirmSaveDatabaseModal";
import { CoverFormModal } from "../../modals/CoverFormModal";
import {
  saveWorkingSessionToDraft,
  clearActiveDraftId,
} from "../../../utils/coreLogic";
import { clearCalculationSession } from "../../../utils";

import { useFoundationForm } from "../../../hooks/useFoundationForm";
import { useReport } from "../../../../report/hooks/useReport";
import { ReportLoadingModal } from "../../../../report/components/modals/ReportLoadingModal";
import { ReportErrorModal } from "../../../../report/components/modals/ReportErrorModal";
import { activeDraftRequestPath, submitCaseForCheck } from "../../../utils/requestCases";
import { useReadOnly } from "../../../contexts/ReadOnlyContext";
import { getUser } from "../../../../../utils/auth";

// Main view component for foundation calculation form
export default function FoundationFormView() {
  const { type: projectType, draftId } = useParams();
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  // ================= FOUNDATION FORM HOOK =================
  const {
    // State
    foundationType,
    squareCaisson,
    roundCaisson,
    foundationTypeErrors,
    squareCaissonErrors,
    roundCaissonErrors,
    isCalculated,
    showResultsFoundation, // Pastikan menggunakan nama variabel yang sinkron dengan Hook (S di belakang)
    calculatedFoundation,
    buttonLabel,
    toast,
    loading,

    // Actions
    handleFoundationTypeUpdate,
    handleSquareCaissonUpdate,
    handleRoundCaissonUpdate,
    handleCalculate,
    handleFinish,
    handleBack,
    setToast,
    showToast,
  } = useFoundationForm();

  // ================= REPORT HOOK =================
  const report = useReport(projectType);
  const { isReadOnly } = useReadOnly();

  // Handle navigation to next step or create report.
  const handleNextStep = () => {
    if (isReadOnly) {
      const result = handleFinish(true);
      if (result === "OPEN_COVER") {
        navigate(
          isProjectTools
            ? `/project-tools/${projectType}/report`
            : `/projects/${projectType}/${draftId}/report`
        );
      }
      return;
    }
    if (!isCalculated) {
      showToast('Click "Calculate Results" first', "error");
      return;
    }
    const result = handleFinish();
    if (result === "OPEN_COVER") {
      setShowFinishModal(true);
    }
  };

  const handleConfirmCover = async (overrideCover) => {
    const success = await report.makeReport({
      isCalculated,
      showToast,
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
    showToast("Draft successfully saved!", "success");
    setShowFinishModal(false);
  };

  const handleSaveDatabaseClick = () => {
    setShowFinishModal(false);
    setShowDbModal(true);
  };

  const handleConfirmSaveDb = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    submitCaseForCheck(draftId, getUser());
    showToast("Case saved and submitted for checking!", "success");
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
        {/* Page metadata */}
        <Helmet>
          <title>Calculation Foundation - KORI BALI</title>
          <meta
            name="calculation"
            content="Calculation System CV. KORI BALI membantu Anda menghitung dan menganalisis struktur pole dengan mudah."
          />
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          {/* PERBAIKAN: Menggunakan HeaderCalculationPage sesuai import */}
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            {/* ── Foundation configuration (Foundation Type + Detail) ── */}
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
                {/* ================= FOUNDATION TYPE SECTION ================= */}
                <div>
                  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
                    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                    Foundation Type <span className="text-red-500 ml-1 font-semibold">*</span>
                  </h3>
                  <FoundationType
                    foundationType={foundationType}
                    onUpdate={handleFoundationTypeUpdate}
                    errors={foundationTypeErrors}
                    readOnly={isReadOnly}
                  />
                </div>

                {/* ================= FOUNDATION DETAIL SECTION ================= */}
                <div>
                  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
                    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                    Foundation Specifications
                  </h3>

                  {/* Empty state when no type selected */}
                  {!foundationType.type && (
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex flex-col items-center justify-center text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <Box className="w-6 h-6 text-gray-400" />
                        </div>

                        <p className="text-gray-500 text-sm">
                          Please select foundation type first
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Choose the type above to configure parameters
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Render Square Caisson Type form */}
                  {foundationType.type === "square-caisson" && (
                    <SquareCaissonTypeForm
                      squareCaisson={squareCaisson}
                      onUpdate={handleSquareCaissonUpdate}
                      errors={squareCaissonErrors}
                      onCalculate={handleCalculate}
                      onBack={handleBack}
                      onNext={handleNextStep}
                      isCalculated={isCalculated}
                      buttonLabel={buttonLabel}
                      readOnly={isReadOnly}
                    />
                  )}

                  {/* Render Round Caisson Type form */}
                  {foundationType.type === "round-caisson" && (
                    <RoundCaissonTypeForm
                      roundCaisson={roundCaisson}
                      onUpdate={handleRoundCaissonUpdate}
                      errors={roundCaissonErrors}
                      onCalculate={handleCalculate}
                      onBack={handleBack}
                      onNext={handleNextStep}
                      isCalculated={isCalculated}
                      buttonLabel={buttonLabel}
                      readOnly={isReadOnly}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ================= RESULT TABLE ================= */}
            <div id="results-foundation">
              {showResultsFoundation && (
                <FoundationResultTable
                  foundationType={calculatedFoundation?.foundationType}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
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
      <ToastModal toast={toast} onClose={() => setToast(null)} />
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
