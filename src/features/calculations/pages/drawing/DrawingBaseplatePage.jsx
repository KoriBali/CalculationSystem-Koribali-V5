import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { DrawingBaseplateForm } from "../../components/forms/drawing/DrawingBaseplateForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { useDrawingBaseplateForm } from "../../hooks/useDrawingBaseplateForm";

export default function DrawingBaseplatePage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;

  const {
    localBaseplate,
    errors,
    toast,
    setToast,
    handleUpdate,
    handleReset,
    handleNext,
    nextLabel,
  } = useDrawingBaseplateForm();

  const onNextStep = async () => {
    const result = await handleNext();
    if (result === "GO_FOUNDATION") {
      navigate(`${drawingPrefix}/foundation`);
    } else if (result === "GO_COUPLING") {
      navigate(`${drawingPrefix}/coupling`);
    } else if (result === "GO_SURFACE") {
      navigate(`${drawingPrefix}/surface`);
    }
  };

  const onBack = () => {
    const general = JSON.parse(sessionStorage.getItem(`${projectType}_drawing_general`) || "{}");
    if (general?.additionalComponents?.opening) {
      navigate(`${drawingPrefix}/opening`);
    } else {
      navigate(`${drawingPrefix}/pole`);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>Baseplate Drawing Input - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <DrawingBaseplateForm
                baseplate={localBaseplate}
                onUpdate={handleUpdate}
                onReset={handleReset}
                onBack={onBack}
                onNext={onNextStep}
                errors={errors}
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
