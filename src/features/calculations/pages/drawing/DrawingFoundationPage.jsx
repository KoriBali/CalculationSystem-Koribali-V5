import { Helmet } from "react-helmet";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { HeaderCalculationPage } from "../../components/layout/HeaderCalculationPage";
import { DrawingFoundationForm } from "../../components/forms/drawing/DrawingFoundationForm";
import { ToastModal } from "../../components/modals/ToastModal";
import { useDrawingFoundationForm } from "../../hooks/useDrawingFoundationForm";

export default function DrawingFoundationPage() {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const drawingPrefix = isProjectTools
    ? `/project-tools/${projectType}/drawing`
    : `/projects/${projectType}/${draftId}/drawing`;

  const {
    foundationType,
    squareCaisson,
    roundCaisson,
    foundationTypeErrors,
    squareCaissonErrors,
    roundCaissonErrors,
    toast,
    setToast,
    handleFoundationTypeUpdate,
    handleSquareCaissonUpdate,
    handleRoundCaissonUpdate,
    handleNext,
  } = useDrawingFoundationForm();

  const errors = {
    foundationType: foundationTypeErrors,
    squareCaisson: squareCaissonErrors,
    roundCaisson: roundCaissonErrors,
  };

  // Foundation always goes to Coupling or Surface next — no further branch.
  const isCouplingUsed =
    sessionStorage.getItem(`${projectType}_drawing_coupling_confirmed`) === "true";
  const nextLabel = isCouplingUsed ? "Next: Coupling" : "Next: Surface";

  const onNextStep = async () => {
    const result = await handleNext();
    if (result) {
      const isCouplingUsed = sessionStorage.getItem(`${projectType}_drawing_coupling_confirmed`) === "true";
      if (isCouplingUsed) {
        navigate(`${drawingPrefix}/coupling`);
      } else {
        navigate(`${drawingPrefix}/surface`);
      }
    }
  };

  const onBack = () => {
    const general = JSON.parse(sessionStorage.getItem(`${projectType}_drawing_general`) || "{}");
    if (general?.additionalComponents?.baseplate) {
      navigate(`${drawingPrefix}/baseplate`);
    } else if (general?.additionalComponents?.opening) {
      navigate(`${drawingPrefix}/opening`);
    } else {
      navigate(`${drawingPrefix}/pole`);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <Helmet>
          <title>Foundation Drawing Input - KORI BALI</title>
        </Helmet>

        <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
          <HeaderCalculationPage />

          <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
            <div className="mt-6">
              <DrawingFoundationForm
                foundationType={foundationType}
                squareCaisson={squareCaisson}
                roundCaisson={roundCaisson}
                onFoundationTypeUpdate={handleFoundationTypeUpdate}
                onSquareCaissonUpdate={handleSquareCaissonUpdate}
                onRoundCaissonUpdate={handleRoundCaissonUpdate}
                errors={errors}
                onNext={onNextStep}
                onBack={onBack}
                buttonLabel={nextLabel}
              />
            </div>
          </div>
        </div>

        <ToastModal toast={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
}
