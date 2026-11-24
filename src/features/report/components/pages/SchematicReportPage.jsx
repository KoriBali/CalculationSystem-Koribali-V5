import React, { useMemo } from "react";
import { Edit3, CheckCircle2, Pencil, Loader2, RotateCcw } from "lucide-react";
import { validateSvg } from "../../../calculations/utils/schematicValidator";

/**
 * SchematicReportPage
 * Displays the schematic vector drawing on Page 2 (仕様略図) of the calculation report.
 * Provides a screen-only "Edit Schematic" button that triggers SVG-Edit in a modal.
 */
export function SchematicReportPage({
  svg,
  calculationNumber = "",
  pageNumber = 2,
  sectionNumber = 2,
  onEdit,
  onRegenerate,
  isEdited = false,
  isGenerating = false,
}) {
  // Validate and parse SVG
  const sanitizedSvgContent = useMemo(() => {
    if (!svg) return null;
    try {
      const clean = validateSvg(svg);
      const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
      const root = doc.documentElement;

      // Ensure hover title is in English
      const titleElem = root.querySelector("title");
      if (titleElem) {
        titleElem.textContent = "A4 Pole Schematic";
      } else {
        const newTitle = doc.createElementNS("http://www.w3.org/2000/svg", "title");
        newTitle.textContent = "A4 Pole Schematic";
        root.insertBefore(newTitle, root.firstChild);
      }

      // Remove unwanted title text lines if present in existing/cached SVGs
      const textElements = root.querySelectorAll("text");
      textElements.forEach((el) => {
        const text = el.textContent || "";
        if (
          text.includes("Pole with Parametric Dimensions") ||
          text.includes("Model units: mm | A4 portrait")
        ) {
          el.remove();
        }
      });

      // Ensure proper scaling within the printable box
      root.setAttribute("width", "100%");
      root.setAttribute("height", "100%");
      root.setAttribute(
        "style",
        "max-height: 245mm; max-width: 100%; margin: 0 auto; display: block;"
      );
      return new XMLSerializer().serializeToString(root);
    } catch (err) {
      console.error("[SchematicReportPage] Failed to parse SVG:", err);
      return null;
    }
  }, [svg]);

  if (!svg && !isGenerating) {
    return null;
  }

  return (
    <>
      {/* Toolbar (SCREEN ONLY - HIDDEN ON PRINT), aligned to the A4 page width */}
      <div className="print:hidden w-[210mm] max-w-full mx-auto mt-6 mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          {isEdited ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80">
              <Pencil className="w-3 h-3 text-amber-600 shrink-0" />
              Manually Edited
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Auto-generated
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEdited && onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium bg-white text-[#0d3b66] hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-lg shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Reset diagram to standard calculated schematic (discard manual edits)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0d3b66] shrink-0" />
              <span>Reset to Default</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="group inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold text-white bg-gradient-to-r from-[#0d3b66] to-[#1e5a8a] hover:from-[#0b3156] hover:to-[#17466c] border border-[#092644] rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#3399cc]/50 cursor-pointer"
              title="Edit text, dimensions, or lines on the schematic"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white/20 text-cyan-200 group-hover:bg-white/30 group-hover:scale-110 transition-all">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Edit Schematic</span>
            </button>
          )}
        </div>
      </div>

    <div className="page-preview relative mb-6 print:mb-0">
      {/* A4 Page Container */}
      <div className="page-a4 flex flex-col justify-between">
        {/* Page Header */}
        <div className="page-header shrink-0">
          No. {calculationNumber} P-{pageNumber}
        </div>

        {/* Subtitle: 仕様略図 */}
        <div className="page1-content shrink-0">
          <h2 className="page1-title">
            <span className="page1-number">{sectionNumber ?? 2}.</span>
            <span className="page1-text tracking-[0.05em] jp">仕様略図</span>
          </h2>
        </div>

        {/* Page Content: SVG Schematic */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden py-1 schematic-svg-container">
          {isGenerating && !sanitizedSvgContent ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#3399cc] mb-2" />
              <p className="text-xs font-medium">Memuat gambar skematik...</p>
            </div>
          ) : sanitizedSvgContent ? (
            <div
              className="w-full h-full flex items-center justify-center schematic-svg-inner"
              dangerouslySetInnerHTML={{ __html: sanitizedSvgContent }}
            />
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

export default SchematicReportPage;
