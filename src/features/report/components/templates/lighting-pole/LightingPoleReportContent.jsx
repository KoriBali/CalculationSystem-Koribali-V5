import React from "react";
import {
  formatDateYS,
  getDesignStandardText,
  formatCalculationNumber,
  formatManagementCode,
} from "../../../utils/reportFormatters";
import { SchematicReportPage } from "../../pages/SchematicReportPage";
import "../../../styles/report.css";

const formatRawVal = (val, fallback = "") => {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val);
};

const toFixed1 = (val, fallback = "") => {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? String(val) : n.toFixed(1);
};

const toFixed2 = (val, fallback = "") => {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? String(val) : n.toFixed(2);
};

export default function LightingPoleReportContent({
  cover = {},
  condition = {},
  results = [],
  officialReport = null,
  pages = [],
  schematicSvg = null,
  isSchematicEdited = false,
  isSchematicGenerating = false,
  onEditSchematic = null,
  onRegenerateSchematic = null,
}) {
  return (
    <>
      {/* ================================= COVER PAGE ================================= */}
      <div className="page-preview">
        <div className="page-a4 page-cover">
          <div className="page-content page-content-border cover-border">
            {/* Header cover: management mark & calculation number */}
            <div className="flex justify-between">
              <p className="cover-row-1 ml-[10px] tracking-[0.1em] min-w-[200px]">
                <span className="jp">管理記号 : </span>
                <span>{formatManagementCode(cover?.managementCode)}</span>
              </p>
              <div className="cover-row-1 mr-[10px] flex justify-center items-center min-w-[200px]">
                <span className="tracking-[0.1em] jp">計算書番号 : </span>
                <span>{formatCalculationNumber(cover?.calculationNumber)}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="cover-row-2 ml-[10px] jp">殿</div>

            {/* Main title */}
            <h1 className="cover-title text-center jp">強 度 計 算 書</h1>

            {/* Project information block */}
            <div className="cover-double-line">
              <p className="cover-inner-text cover-inner-text-line text-center py-[7px] min-h-[36px] jp">
                {cover?.projectName || cover?.title1 || <>&nbsp;</>}
              </p>
              <p
                className={`cover-inner-text cover-inner-text-line text-center jp min-h-[36px] ${
                  !(cover?.coverTopText || cover?.title2) ? "py-[19px]" : "py-[7px]"
                }`}
              >
                {cover?.coverTopText || cover?.title2 || <>&nbsp;</>}
              </p>
              <p
                className={`cover-inner-text text-center jp py-[7px] min-h-[36px] ${
                  !(cover?.coverBottomText || cover?.title3) ? "mb-[24px]" : ""
                }`}
              >
                {cover?.coverBottomText || cover?.title3 || <>&nbsp;</>}
              </p>
            </div>

            {/* Date & logo */}
            <div className="cover-row-3 text-center jp">
              {cover?.date ? formatDateYS(cover.date) : ""}
            </div>
            <img
              src="/images/ys-logo.png"
              alt="logo YS"
              className="mx-auto w-[300px] h-auto"
            />
          </div>
        </div>
      </div>

      {/* =================================== PAGE 1 =================================== */}
      <div className="page-preview">
        <div className="page-a4">
          <div className="page-header">
            No. {cover?.calculationNumber ?? ""} P-1
          </div>

          <div className="page1-content">
            {/* 1. Calculation conditions */}
            <h2 className="page1-title">
              <span className="page1-number">1.</span>
              <span className="page1-text tracking-[0.1em] jp">計算条件</span>
            </h2>

            {/* 1) Design standard */}
            <div className="page1-item">
              <span className="page1-number">1).</span>
              <span className="page1-text tracking-[0.1em] jp">設計基準</span>
              <span className="page1-text tracking-[0.1em] jp ml-[8px] mr-[8px]">
                :
              </span>
              <span className="page1-text tracking-[0.1em] jp">
                {getDesignStandardText(condition?.designStandard)}
              </span>
            </div>

            {/* 2) Wind speed */}
            <div className="page1-item">
              <span className="page1-number">2).</span>
              <span className="page1-text tracking-[0.1em] jp">設計風速</span>
              <span className="page1-text tracking-[0.1em] jp ml-[8px] mr-[8px]">
                :
              </span>
              <span className="page1-text">
                V = {formatRawVal(officialReport?.designWindSpeedMS ?? condition?.designWindSpeed)} m/s
              </span>
            </div>

            {/* 3) Wind load calculation */}
            <div className="flex flex-col mb-[20px]">
              <div className="flex justify-start ml-[22px] mb-0">
                <span className="page1-number">3).</span>
                <span className="page1-text tracking-[0.1em] jp">風荷重</span>
                <span className="page1-text tracking-[0.1em] jp ml-[22.8px] mr-[8px]">
                  :
                </span>
                <span className="page1-text">P = q・C・A (N)</span>
              </div>

              <div className="flex ml-[44px] tracking-[0.1em] jp">ここで</div>

              <div className="flex ml-[68px] flex-col">
                <div className="flex justify-start">
                  <span>q:</span>
                  <span className="jp tracking-[0.1em] ml-[6px]">速度圧</span>
                  <span className="mr-[22px]">
                    (N/m<sup>2</sup>)
                  </span>
                  <span className="jp tracking-[0.1em] mr-[3px]">空気密度</span>
                  <span>
                    ρ = {formatRawVal(condition?.designAirDensity)} N・sec<sup>2</sup>/m
                    <sup>4</sup>
                  </span>
                </div>
                <div className="ml-[19px]">
                  q = 1/2・ρ・V<sup>2</sup> ={" "}
                  {toFixed1(
                    officialReport?.windPressureNM2 ?? condition?.windPressureNM2
                  )}{" "}
                  N/m<sup>2</sup>
                </div>

                <div className="flex justify-start">
                  <span>C:</span>
                  <span className="jp tracking-[0.1em] ml-[4px]">風力係数</span>
                </div>
                <div className="flex justify-start ml-[19px]">
                  <span className="jp tracking-[0.1em] mr-[2px]">○鋼管:</span>
                  <span className="mr-9">0.7</span>
                </div>

                <div className="flex justify-start">
                  <span>A:</span>
                  <span className="jp tracking-[0.1em] ml-[4px]">
                    受風圧面積
                  </span>
                  <span>
                    (m<sup>2</sup>)
                  </span>
                </div>
              </div>
            </div>

            {/* 4) Allowable stress */}
            <div className="flex flex-col mb-[20px]">
              <div className="flex justify-start ml-[22px] mb-0">
                <span className="page1-number">4).</span>
                <span className="page1-text jp tracking-[0.1em]">
                  短期許容曲げ応力度
                </span>
                <span className="page1-text">(SS400, STK400, STKR400)</span>
              </div>
              <div className="flex ml-[44px]">
                <span className="mr-[4px] tracking-[0.1em]">sfb</span>
                <span>
                  = {formatRawVal(officialReport?.allowableStressNMm2 ?? condition?.allowableStressNMm2)} N/mm<sup>2</sup>
                </span>
              </div>
            </div>

            {/* 5) Pole specification */}
            <div className="flex flex-col">
              <div className="flex justify-start ml-[22px] mb-0">
                <span className="page1-number">5).</span>
                <span className="page1-text jp tracking-[0.1em]">
                  支持柱の仕様
                </span>
              </div>

              <div className="ml-[44px] grid grid-cols-2 gap-y-[20px] w-[45%]">
                {results?.map((r, index) => {
                  const zVal =
                    r?.sectionModulusCm3 ??
                    r?.sectionModulus ??
                    officialReport?.sections?.[index]?.sectionModulusCm3 ??
                    officialReport?.sections?.[index]?.sectionModulus ??
                    null;
                  const wVal = r?.unitWeightKgM ?? r?.unitWeight ?? r?.fixLoad;
                  const iVal = r?.momentOfInertiaCm4 ?? r?.momentInertia;
                  const radVal = r?.radiusOfGyrationCm ?? r?.radiusGyration;
                  const aVal =
                    r?.crossSectionalAreaCm2 ??
                    r?.crossSectionArea ??
                    r?.sectionArea;

                  return (
                    <React.Fragment key={index}>
                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="mr-1 jp tracking-[0.1em]">
                            {r?.name || r?.poleName || `Pole-${index + 1}`}:
                          </span>
                          <span className="jp">φ</span>
                          <span className="tracking-[0.05em]">
                            {formatRawVal(r?.diameterMm ?? r?.lowerDiameter)}
                          </span>
                          <span className="text-[10.5pt] mx-[1.5px]">×</span>
                          <span className="tracking-[0.05em]">
                            t{formatRawVal(r?.thicknessMm ?? r?.lowerThickness)}
                          </span>
                        </div>
                        <div className="flex justify-start">
                          <div className="flex flex-col mr-1">
                            <div>w</div>
                            <div>I</div>
                            <div>i</div>
                          </div>
                          <div className="flex flex-col mr-1">
                            <div className="page1-text">=</div>
                            <div className="page1-text">=</div>
                            <div className="page1-text">=</div>
                          </div>
                          <div className="flex flex-col">
                            <div className="tracking-[0.05em]">
                              {toFixed2(wVal)} kg/m
                            </div>
                            <div className="tracking-[0.05em]">
                              {toFixed2(iVal)} cm<sup>4</sup>
                            </div>
                            <div className="tracking-[0.05em]">
                              {toFixed2(radVal)} cm
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex">{r?.materialName || r?.material || ""}</div>
                        <div className="flex justify-start">
                          <div className="flex flex-col mr-1">
                            <div>A</div>
                            <div>Z</div>
                          </div>
                          <div className="flex flex-col mr-1">
                            <div className="page1-text">=</div>
                            <div className="page1-text">=</div>
                          </div>
                          <div className="flex flex-col">
                            <div className="tracking-[0.05em]">
                              {toFixed2(aVal)} cm
                              <sup>2</sup>
                            </div>
                            <div className="tracking-[0.05em]">
                              {toFixed2(zVal)} cm<sup>3</sup>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================= PAGE 2 (SCHEMATIC) ============================= */}
      {schematicSvg && (
        <SchematicReportPage
          svg={schematicSvg}
          calculationNumber={cover?.calculationNumber ?? ""}
          pageNumber={2}
          onEdit={onEditSchematic}
          onRegenerate={onRegenerateSchematic}
          isEdited={isSchematicEdited}
          isGenerating={isSchematicGenerating}
        />
      )}

      {/* =================================== PAGE ++ =================================== */}
      {pages?.map((pageBlocks, i) => (
        <div className="page-preview" key={i}>
          <div className="page-a4">
            <div className="page-header">
              No. {cover?.calculationNumber ?? ""} P-{i + (schematicSvg ? 3 : 2)}
            </div>
            <div className="page1-content">{pageBlocks}</div>
          </div>
        </div>
      ))}
    </>
  );
}
