import { useState } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { SurfaceForm } from "../../components/forms/drawing/SurfaceForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { useSurfaceForm } from "../../hooks/useSurfaceForm";
import { FinishCalculationModal } from "../../components/modals/FinishCalculationModal";
import { ConfirmSaveDatabaseModal } from "../../components/modals/ConfirmSaveDatabaseModal";
import { saveWorkingSessionToDraft, clearCalculationSession, clearActiveDraftId } from "../../utils/coreLogic";
import { activeDraftRequestPath, submitCaseForCheck } from "../../utils/requestCases";
import { getUser } from "../../../../utils/auth";

export default function DrawingSurfacePage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);

  const {
    localSurface,
    errors,
    toast,
    setToast,
    handleUpdate,
    handleReset,
    handleFinish,
  } = useSurfaceForm();

  const onFinishStep = async () => {
    const result = await handleFinish();
    if (result === "OPEN_FINISH") {
      setShowFinishModal(true);
    }
  };

  const handleBack = () => {
    const isCouplingUsed = sessionStorage.getItem(`${projectType}_drawing_coupling_confirmed`) === "true";
    const general = JSON.parse(sessionStorage.getItem(`${projectType}_drawing_general`) || "{}");
    
    if (isCouplingUsed) {
      navigate(`${drawingPrefix}/coupling`);
    } else if (general?.additionalComponents?.foundation) {
      navigate(`${drawingPrefix}/foundation`);
    } else if (general?.additionalComponents?.baseplate) {
      navigate(`${drawingPrefix}/baseplate`);
    } else if (general?.additionalComponents?.opening) {
      navigate(`${drawingPrefix}/opening`);
    } else {
      navigate(`${drawingPrefix}/pole`);
    }
  };

  const handleGenerateReport = () => {
    setShowFinishModal(false);
    setToast({ 
      message: "Preview Drawing Output feature is coming soon!", 
      type: "success" 
    });
  };

  const handleSaveDraft = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    setToast({ message: "Draft successfully saved!", type: "success" });
    setShowFinishModal(false);
  };

  const handleSaveDatabaseClick = () => {
    setShowFinishModal(false);
    setShowDbModal(true);
  };

  const handleConfirmSaveDb = () => {
    saveWorkingSessionToDraft(projectType, draftId);
    submitCaseForCheck(draftId, getUser());
    setToast({ message: "Case saved and submitted for checking!", type: "success" });
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
          <title>Surface Configuration - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <SurfaceForm
                surface={localSurface}
                onUpdate={handleUpdate}
                onReset={handleReset}
                onBack={handleBack}
                onFinish={onFinishStep}
                errors={errors}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <FinishCalculationModal
          open={showFinishModal}
          onClose={() => setShowFinishModal(false)}
          onGenerateReport={handleGenerateReport}
          onSaveDatabase={handleSaveDatabaseClick}
          onSaveDraft={handleSaveDraft}
          isDrawingMode={true}
        />

        <ConfirmSaveDatabaseModal
          open={showDbModal}
          onClose={() => setShowDbModal(false)}
          onConfirm={handleConfirmSaveDb}
        />

        {/* Toast */}
        <ToastModal toast={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
}
