import React, { useRef, useMemo, useState, useLayoutEffect } from "react";
import { createBlocks } from "./LightingPoleBlock";
import { paginateA4LightingPole } from "../../../hooks/useReportPagination";
import LightingPoleReportContent from "./LightingPoleReportContent";
import "../../../styles/report.css";

export default function LightingPoleReport({
  cover,
  condition,
  poleConfig,
  results,
  resultsDo,
  schematicSvg,
  isSchematicEdited,
  isSchematicGenerating,
  onEditSchematic,
  onRegenerateSchematic,
  officialReport,
}) {
  // 1. blocks memo
  const blocks = useMemo(
    () => createBlocks(results, resultsDo, poleConfig, officialReport),
    [results, resultsDo, poleConfig, officialReport],
  );

  // 2. ref untuk measurement
  const measureRef = useRef(null);

  // 3. pages = null dulu (belum render final)
  const [pages, setPages] = useState(null);

  // 4. HITUNG PAGINATION SEKALI, SEBELUM PAINT
  useLayoutEffect(() => {
    if (!measureRef.current) return;

    // Tunggu font siap agar pengukuran offsetHeight akurat
    document.fonts.ready.then(() => {
      const paginatedPages = paginateA4LightingPole({
        blocks,
        measureRef,
      });
      setPages(paginatedPages);
    });
  }, [blocks]);

  // 5. FASE 1 — measurement ONLY (user TIDAK LIHAT)
  if (!pages) {
    return (
      <div ref={measureRef} className="measure-container old-lighting-pole-report">
        {blocks.map((b) => (
          <div key={b.id} data-id={b.id} className="measure-block">
            {b.node}
          </div>
        ))}
      </div>
    );
  }

  // 6. FASE 2 — FINAL RENDER (HANYA SEKALI)
  return (
    <div className="old-lighting-pole-report">
      <LightingPoleReportContent
        cover={cover}
        condition={condition}
        results={results}
        officialReport={officialReport}
        pages={pages}
        schematicSvg={schematicSvg}
        isSchematicEdited={isSchematicEdited}
        isSchematicGenerating={isSchematicGenerating}
        onEditSchematic={onEditSchematic}
        onRegenerateSchematic={onRegenerateSchematic}
      />
    </div>
  );
}
