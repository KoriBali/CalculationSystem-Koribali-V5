import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { DrawingPoleForm } from "../../components/forms/drawing/DrawingPoleForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { useDrawingPoleForm } from "../../hooks/useDrawingPoleForm";

export default function DrawingPolePage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;

  const {
    localPole,
    errors,
    toast,
    setToast,
    handleUpdate,
    handleReset,
    handleNext,
    isBaseplate,
    nextLabel,
  } = useDrawingPoleForm();

  const onNextStep = async () => {
    const result = await handleNext();
    if (result === "GO_OPENING") {
      navigate(`${drawingPrefix}/opening`);
    } else if (result === "GO_BASEPLATE") {
      navigate(`${drawingPrefix}/baseplate`);
    } else if (result === "GO_COUPLING") {
      navigate(`${drawingPrefix}/coupling`);
    } else if (result === "GO_SURFACE") {
      navigate(`${drawingPrefix}/surface`);
    }
  };

  const onBack = () => {
    navigate(`${drawingPrefix}/drawing-setup`);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>Pole Drawing Input - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <DrawingPoleForm
                pole={localPole}
                onUpdate={handleUpdate}
                onReset={handleReset}
                onBack={onBack}
                onNext={onNextStep}
                errors={errors}
                onToast={setToast}
                isBaseplate={isBaseplate}
                nextLabel={nextLabel}
              />
            </div>
          </div>
        </div>

        <ToastModal toast={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
}
