import { useState, useRef } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { DrawingGeneralForm } from "../../components/forms/drawing/DrawingGeneralForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { ConfirmDisableModal } from "../../components/modals/ConfirmDisableModal";
import { useDrawingGeneralForm } from "../../hooks/useDrawingGeneralForm";

import { requestPathForDraft } from "../../utils/requestCases";

export default function DrawingGeneralPage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
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
    getCommitted, // read-only snapshot for cancel revert
  } = useDrawingGeneralForm();

  const onNextStep = async () => {
    await handleNext();
  };

  const onBackStep = () => {
    if (location.pathname.startsWith("/project-tools")) {
      navigate(`/project-tools/${projectType}/setup`);
      return;
    }
    navigate(requestPathForDraft(draftId));
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>General Drawing Input - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <DrawingGeneralForm
                general={localGeneral}
                onUpdate={handleUpdate}
                onReset={handleReset}
                onNext={onNextStep}
                onBack={onBackStep}
                errors={errors}
                projectMode={projectMode}
                nextLabel={nextLabel}
              />
            </div>
          </div>
        </div>

        <ToastModal toast={toast} onClose={() => setToast(null)} />

        {/* Confirmation modal — shown when user disables an active component or coupling */}
        <ConfirmDisableModal
          data={confirmDisable}
          onClose={() => {
            // Cancel: revert local state back to last committed snapshot
            setConfirmDisable(null);
            setLocalGeneral(getCommitted());
          }}
          onConfirm={() => {
            setConfirmDisable(null);
            proceed();
          }}
        />
      </div>
    </>
  );
}
