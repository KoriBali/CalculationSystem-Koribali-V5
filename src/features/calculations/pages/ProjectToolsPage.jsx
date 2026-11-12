import { Helmet } from "react-helmet";

export default function ProjectToolsPage() {
  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Project Tools - KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[2800px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Project Tools
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Calculation and drawing input utilities.
          </p>
        </div>

        {/* Empty Content Container */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto">
            <p className="text-sm font-semibold text-slate-700">Project Tools Workspace</p>
            <p className="text-xs text-slate-400 mt-1">
              Calculation and drawing input tools will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
