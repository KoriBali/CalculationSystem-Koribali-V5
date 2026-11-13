import React from "react";
import {
  formatDateYS,
  getDesignStandardText,
  formatCalculationNumber,
  formatManagementCode,
} from "../../../utils/reportFormatters";
import { SchematicReportPage } from "../../pages/SchematicReportPage";
import "../../../styles/report.css";

const toNumFixed = (val, digits = 1) => {
  if (val === undefined || val === null || val === "") return "";
  const n = Number(val);
  return isNaN(n) ? "" : n.toFixed(digits);
};

export default function NewJilReportContent({
  cover = {},
  condition = {},
  results = [],
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
                  !(cover?.coverTopText || cover?.title2)
                    ? "py-[19px]"
                    : "py-[7px]"
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
            <br />
            <br />
            <img
              src="/images/yp-logo.jpg"
              alt="logo YP"
              className="mx-auto w-[300px] h-auto"
            />
          </div>
        </div>
      </div>

      {/* ============================= PAGE 1 (SCHEMATIC) ============================= */}
      {(schematicSvg || isSchematicGenerating) && (
        <SchematicReportPage
          svg={schematicSvg}
          calculationNumber={cover?.calculationNumber ?? ""}
          pageNumber={1}
          sectionNumber={1}
          onEdit={onEditSchematic}
          onRegenerate={onRegenerateSchematic}
          isEdited={isSchematicEdited}
          isGenerating={isSchematicGenerating}
        />
      )}

      {/* =================================== PAGE 2 (CONDITIONS) =================================== */}
      <div className="page-preview">
        <div className="page-a4">
          <div className="page-header">
            No. {cover?.calculationNumber ?? ""} P-
            {schematicSvg || isSchematicGenerating ? 2 : 1}
          </div>

          <div className="page1-content leading-[1.45]">
            {/* 2. 計算条件 */}
            <h2 className="page1-title mb-[2px]">
              <span className="page1-number">2.</span>
              <span className="page1-text tracking-[0.05em] jp">計算条件</span>
            </h2>

            {/* (1). 荷重条件 */}
            <div className="flex flex-col mb-[18px]">
              <div className="flex justify-start ml-[22px] mb-[2px]">
                <span className="page1-number">
                  <span className="jp">(</span>1<span className="jp">).</span>
                </span>
                <span className="page1-text tracking-[0.05em] jp">
                  荷重条件
                </span>
              </div>

              {/* 1). 設計風速 Vo(m/s) */}
              <div className="flex flex-col ml-[44px] mb-[18px]">
                <div className="flex justify-start">
                  <span className="page1-number">
                    1<span className="jp">).</span>
                  </span>
                  <span className="page1-text tracking-[0.05em] jp">
                    設計風速
                  </span>
                  <span className="page1-text ml-[8px]">
                    Vo<span className="jp">(</span>m/s
                    <span className="jp">)</span>
                  </span>
                </div>
                <div className="ml-[22px]">
                  Vo = {condition?.designWindSpeed || 60} m/s
                </div>
              </div>

              {/* 2). 風圧荷重 P(N) */}
              <div className="flex flex-col ml-[44px] mb-[18px]">
                <div className="flex justify-start">
                  <span className="page1-number">
                    2<span className="jp">).</span>
                  </span>
                  <span className="page1-text tracking-[0.05em] jp">
                    風圧荷重
                  </span>
                  <span className="page1-text ml-[8px]">
                    P<span className="jp">(</span>N<span className="jp">)</span>
                  </span>
                </div>
                <div className="ml-[22px]">
                  P<span className="jp">(</span>N<span className="jp">)</span> ={" "}
                  <span className="jp mr-[6px]">速度圧</span> q
                  <span className="jp">(</span>N/m<sup>2</sup>
                  <span className="jp">)</span>{" "}
                  <span className="text-[11pt] jp mx-[1px]">×</span>{" "}
                  <span className="jp">風力係数</span> Cf{" "}
                  <span className="text-[11pt] jp mx-[1px]">×</span>{" "}
                  <span className="jp">受風圧面積</span> A
                  <span className="jp">(</span>m<sup>2</sup>
                  <span className="jp">)</span>
                </div>

                <div className="ml-[22px] mt-[18px]">
                  <div>
                    <span className="jp mr-[6px]">□速度圧</span> q
                    <span className="jp">(</span>N/m<sup>2</sup>
                    <span className="jp">)</span>
                  </div>
                  <div className="ml-[20px]">
                    q = 1/2・ρ・Vo<sup>2</sup> ={" "}
                    {Math.round(
                      0.5 *
                        (Number(condition?.designAirDensity) || 1.23) *
                        Math.pow(Number(condition?.designWindSpeed) || 60, 2),
                    ) || 2210}{" "}
                    N/m<sup>2</sup>
                  </div>
                </div>

                <div className="ml-[22px] mt-[18px]">
                  <div>
                    <span className="jp mr-[4px]">□風力係数</span> Cf
                  </div>
                  <div className="ml-[20px]">
                    ・<span className="jp">支柱</span>
                  </div>
                  <div className="ml-[36px]">Cf = 0.7</div>
                </div>

                <div className="ml-[2px]">
                  <div>
                    ・<span className="jp">装柱物</span>
                  </div>
                  <div className="ml-[40px] jp tracking-[0.05em]">
                    装柱物の形状により決定する。
                  </div>
                </div>
              </div>

              {/* 3). 鉛直荷重 W(N) */}
              <div className="flex flex-col ml-[44px] mb-[18px]">
                <div className="flex justify-start">
                  <span className="page1-number">
                    3<span className="jp">).</span>
                  </span>
                  <span className="page1-text tracking-[0.05em] jp">
                    鉛直荷重
                  </span>
                  <span className="page1-text ml-[8px]">
                    W<span className="jp">(</span>N<span className="jp">)</span>
                  </span>
                </div>
                <div className="ml-[22px]">
                  <span className="jp">柱自重</span> Wp、
                  <span className="jp">装柱物重量</span> Wa{" "}
                  <span className="jp">を考慮する。</span>
                </div>
              </div>

              {/* 4). 地震荷重 Pk [N] */}
              <div className="flex flex-col ml-[44px]">
                <div className="flex justify-start">
                  <span className="page1-number">
                    4<span className="jp">).</span>
                  </span>
                  <span className="page1-text tracking-[0.05em] jp">
                    地震荷重
                  </span>
                  <span className="page1-text ml-[8px]">
                    Pk <span className="jp">[</span>N
                    <span className="jp">]</span>
                  </span>
                </div>
                <div className="ml-[22px]">
                  <span className="jp">水平加速度 :</span> EQa ={" "}
                  {condition?.horizontalAcceleration
                    ? Number(condition.horizontalAcceleration).toFixed(2)
                    : "4.71"}
                  <span className="jp">(</span>m/s<sup>2</sup>
                  <span className="jp">)</span>
                </div>
                <div className="ml-[22px]">
                  <span className="jp">応答倍率 :</span> EQr ={" "}
                  {condition?.responseRatio
                    ? Number(condition.responseRatio).toFixed(2)
                    : "1.00"}
                </div>
                <div className="ml-[36px] mt-[16px] flex items-center justify-start gap-14">
                  <span>
                    EL = Eqr <span className="text-[11pt] jp mx-[1px]">×</span>{" "}
                    EQa <span className="text-[11pt] jp mx-[1px]">×</span> M
                  </span>
                  <span>
                    M: <span className="jp">質量(</span>kg
                    <span className="jp">)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* (2). 許容応力度 */}
            <div className="flex flex-col">
              <div className="flex justify-start ml-[22px] mb-[2px]">
                <span className="page1-number">
                  <span className="jp">(</span>2<span className="jp">).</span>
                </span>
                <span className="page1-text tracking-[0.05em] jp">
                  許容応力度
                </span>
              </div>

              {/* Tables container with proper indent and width matching original design */}
              <div className="ml-[66px] w-[83%]">
                {/* Table 1: 短期許容応力度 */}
                <div className="mb-[18px]">
                  <table className="w-full border border-black border-collapse text-[9pt] leading-tight">
                    <thead>
                      <tr>
                        <th
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal"
                          colSpan={3}
                          rowSpan={2}
                        ></th>
                        <th
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px]"
                          colSpan={4}
                        >
                          <span className="jp">短期許容応力度(</span>N/mm
                          <sup>2</sup>
                          <span className="jp">)</span>
                        </th>
                      </tr>
                      <tr>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">引張(</span>sft
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">圧縮(</span>sfc
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">曲げ(</span>sfb
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">せん断(</span>sfs
                          <span className="jp">)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 鋼材 - SS400, STK400 */}
                      <tr>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal w-[5%] py-1"
                          rowSpan={7}
                        >
                          <div className="flex flex-col justify-center gap-6 items-center h-[110px] mx-auto jp text-[9pt]">
                            <span>鋼</span>
                            <span>材</span>
                          </div>
                        </td>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle px-1 w-[25%]"
                          rowSpan={2}
                        >
                          SS400, STK400
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1 w-[18%]">
                          t≦40
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          235
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          235
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          235
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          136
                        </td>
                      </tr>
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          40&lt;t≦100
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          215
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          215
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          215
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          124
                        </td>
                      </tr>
                      {/* STK500 */}
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          STK500
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          t≦40
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          350
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          350
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          350
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          202
                        </td>
                      </tr>
                      {/* SS540, STK540 */}
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          SS540, STK540
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          t≦40
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          375
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          375
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          375
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          216
                        </td>
                      </tr>
                      {/* ボルト */}
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1 jp">
                          ボルト
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          SS400
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          180
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          105
                        </td>
                      </tr>
                      {/* 高力ボルト */}
                      <tr>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle px-1 jp"
                          rowSpan={2}
                        >
                          高力ボルト
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          F8T
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          375
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          180
                        </td>
                      </tr>
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          F10T
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          465
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          225
                        </td>
                      </tr>
                      {/* 溶接 */}
                      <tr>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal py-1"
                          rowSpan={2}
                        >
                          <div className="flex flex-col justify-center items-center h-[30px] mx-auto jp text-[9pt]">
                            <span>溶</span>
                            <span>接</span>
                          </div>
                        </td>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle px-1"
                          rowSpan={2}
                        >
                          SS400, STK400
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          t≦40
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          136
                        </td>
                      </tr>
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          40&lt;t≦100
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          124
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: 長期許容応力度 */}
                <div>
                  <table className="w-full border border-black border-collapse text-[9pt] leading-tight">
                    <thead>
                      <tr>
                        <th
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal"
                          colSpan={3}
                          rowSpan={2}
                        ></th>
                        <th
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px]"
                          colSpan={4}
                        >
                          <span className="jp">長期許容応力度(</span>N/mm
                          <sup>2</sup>
                          <span className="jp">)</span>
                        </th>
                      </tr>
                      <tr>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">引張(</span>ft
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">圧縮(</span>fc
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">曲げ(</span>fb
                          <span className="jp">)</span>
                        </th>
                        <th className="border tracking-[0.05em] border-black text-center align-middle font-normal py-[1.5px] w-[13%]">
                          <span className="jp">せん断(</span>fs
                          <span className="jp">)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 鋼材 - SS400, STK400 */}
                      <tr>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle font-normal w-[5%] py-1"
                          rowSpan={4}
                        >
                          <div className="flex flex-col justify-center gap-6 items-center h-[62px] mx-auto jp text-[9pt]">
                            <span>鋼</span>
                            <span>材</span>
                          </div>
                        </td>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle px-1"
                          colSpan={2}
                        >
                          SS400, STK400
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          156
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          156
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          156
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          90.4
                        </td>
                      </tr>
                      {/* ボルト */}
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1 jp w-[25%]">
                          ボルト
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1 w-[18%]">
                          SS400
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          120
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]"></td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          70
                        </td>
                      </tr>
                      {/* 高力ボルト */}
                      <tr>
                        <td
                          className="border tracking-[0.05em] border-black text-center align-middle px-1 jp"
                          rowSpan={2}
                        >
                          高力ボルト
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          F8T
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          250
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]"></td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          120
                        </td>
                      </tr>
                      <tr>
                        <td className="border tracking-[0.05em] border-black text-center align-middle px-1">
                          F10T
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          310
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]"></td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          －
                        </td>
                        <td className="border tracking-[0.05em] border-black text-center align-middle py-[1px]">
                          150
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================== PAGE ++ =================================== */}
      {pages?.map((pageBlocks, i) => (
        <div className="page-preview" key={i}>
          <div className="page-a4">
            <div className="page-header">
              No. {cover?.calculationNumber ?? ""} P-
              {i + (schematicSvg || isSchematicGenerating ? 3 : 2)}
            </div>
            <div className="page1-content leading-[1.45]">{pageBlocks}</div>
          </div>
        </div>
      ))}
    </>
  );
}
