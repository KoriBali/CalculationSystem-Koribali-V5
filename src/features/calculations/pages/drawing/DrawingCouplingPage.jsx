import { useState } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { CouplingForm } from "../../components/forms/drawing/CouplingForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { setProgressFlag } from "../../utils/calculationProgressEvent";

export default function DrawingCouplingPage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;
  const [toast, setToast] = useState(null);

  const handleBack = () => {
    const general = JSON.parse(sessionStorage.getItem(`${projectType}_drawing_general`) || "{}");
    if (general?.additionalComponents?.foundation) {
      navigate(`${drawingPrefix}/foundation`);
    } else if (general?.additionalComponents?.baseplate) {
      navigate(`${drawingPrefix}/baseplate`);
    } else if (general?.additionalComponents?.opening) {
      navigate(`${drawingPrefix}/opening`);
    } else {
      navigate(`${drawingPrefix}/pole`);
    }
  };

  const handleNext = () => {
    setProgressFlag(projectType, "drawing_coupling_completed", true);
    navigate(`${drawingPrefix}/surface`);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>Coupling Configuration - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <CouplingForm
                onBack={handleBack}
                onReset={() => {}}
                onNext={handleNext}
                onError={(msg) => setToast({ message: msg })}
              />
            </div>
          </div>
        </div>
        <ToastModal toast={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
}
