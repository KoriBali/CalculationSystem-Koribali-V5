import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import {
  Wrench,
  Wind,
  Calculator,
  ArrowRightLeft,
  BookOpen,
  Copy,
  Check,
  ShieldAlert,
  Layers,
  Info,
  Maximize2,
  CheckCircle2,
} from "lucide-react";

// Standard Pole Catalog Data for Quick Reference
const STANDARD_POLE_CATALOG = [
  {
    code: "IS-8000-GL",
    name: "IS Standard Taper Pole 8m (onGL)",
    height: 8000,
    topDia: 89.1,
    bottomDia: 165.2,
    thickness: 3.2,
    weight: 96,
    baseplate: "BP-350-19",
    anchorBolt: "4-M24 (PCD 260)",
    ground: "onGL",
  },
  {
    code: "IS-10000-GL",
    name: "IS Standard Taper Pole 10m (onGL)",
    height: 10000,
    topDia: 89.1,
    bottomDia: 190.7,
    thickness: 3.5,
    weight: 142,
    baseplate: "BP-400-22",
    anchorBolt: "4-M27 (PCD 300)",
    ground: "onGL",
  },
  {
    code: "IS-12000-GL",
    name: "IS Standard Taper Pole 12m (onGL)",
    height: 12000,
    topDia: 101.6,
    bottomDia: 216.3,
    thickness: 4.0,
    weight: 210,
    baseplate: "BP-450-25",
    anchorBolt: "4-M30 (PCD 350)",
    ground: "onGL",
  },
  {
    code: "IS-14000-GL",
    name: "IS Standard Taper Pole 14m (onGL)",
    height: 14000,
    topDia: 114.3,
    bottomDia: 241.8,
    thickness: 4.5,
    weight: 298,
    baseplate: "BP-500-28",
    anchorBolt: "8-M30 (PCD 400)",
    ground: "onGL",
  },
  {
    code: "IS-8000-EMB",
    name: "IS Embedded Taper Pole 8m",
    height: 8000,
    topDia: 89.1,
    bottomDia: 165.2,
    thickness: 3.2,
    weight: 108,
    baseplate: "None (Direct Embedment)",
    anchorBolt: "Root Embedment 1400mm",
    ground: "Embedded",
  },
  {
    code: "IS-10000-EMB",
    name: "IS Embedded Taper Pole 10m",
    height: 10000,
    topDia: 89.1,
    bottomDia: 190.7,
    thickness: 3.5,
    weight: 160,
    baseplate: "None (Direct Embedment)",
    anchorBolt: "Root Embedment 1700mm",
    ground: "Embedded",
  },
];

export default function ProjectToolsPage() {
  const [activeTab, setActiveTab] = useState("wind");
  const [copiedKey, setCopiedKey] = useState(null);

  // ─── 1. Wind Pressure Calculator State ──────────────────────────────────────
  const [windSpeed, setWindSpeed] = useState(40); // m/s
  const [windStandard, setWindStandard] = useState("jis"); // jis (0.6 v^2) vs standard (0.5 * 1.225 v^2)
  const [projectedArea, setProjectedArea] = useState(1.5); // m^2
  const [dragCoef, setDragCoef] = useState(0.7); // 0.7 cylinder
  const [momentArmHeight, setMomentArmHeight] = useState(8.0); // meters

  // Calculations:
  // JIS C 8105: q = 0.6 * v^2
  // Bernoulli / Standard: q = 0.5 * rho * v^2 with rho = 1.225 -> q = 0.6125 * v^2
  const velocityPressure = useMemo(() => {
    const factor = windStandard === "jis" ? 0.6 : 0.6125;
    return factor * Math.pow(Number(windSpeed) || 0, 2);
  }, [windSpeed, windStandard]);

  const windForceN = useMemo(() => {
    return velocityPressure * (Number(dragCoef) || 0) * (Number(projectedArea) || 0);
  }, [velocityPressure, dragCoef, projectedArea]);

  const windForceKN = (windForceN / 1000).toFixed(2);
  const bendingMomentKNm = ((windForceN * (Number(momentArmHeight) || 0)) / 1000).toFixed(2);

  // ─── 2. Unit Converter State ────────────────────────────────────────────────
  const [converterCategory, setConverterCategory] = useState("speed");
  const [convertInputValue, setConvertInputValue] = useState(30);

  const convertedUnits = useMemo(() => {
    const val = Number(convertInputValue) || 0;
    if (converterCategory === "speed") {
      // base: m/s
      return [
        { label: "Meter per second (m/s)", val: val.toFixed(2), unit: "m/s" },
        { label: "Kilometer per hour (km/h)", val: (val * 3.6).toFixed(2), unit: "km/h" },
        { label: "Miles per hour (mph)", val: (val * 2.23694).toFixed(2), unit: "mph" },
        { label: "Knots (kt)", val: (val * 1.94384).toFixed(2), unit: "kn" },
      ];
    } else if (converterCategory === "force") {
      // base: kN
      return [
        { label: "Kilonewton (kN)", val: val.toFixed(3), unit: "kN" },
        { label: "Newton (N)", val: (val * 1000).toFixed(1), unit: "N" },
        { label: "Kilogram-force (kgf)", val: (val * 101.9716).toFixed(2), unit: "kgf" },
        { label: "Pound-force (lbf)", val: (val * 224.809).toFixed(2), unit: "lbf" },
      ];
    } else if (converterCategory === "pressure") {
      // base: N/m^2 (Pa)
      return [
        { label: "Pascal (N/m²)", val: val.toFixed(1), unit: "Pa" },
        { label: "Kilopascal (kPa)", val: (val / 1000).toFixed(3), unit: "kPa" },
        { label: "Megapascal (N/mm²)", val: (val / 1000000).toFixed(6), unit: "MPa" },
        { label: "Kilogram-force / cm² (kgf/cm²)", val: (val * 0.000010197).toFixed(5), unit: "kgf/cm²" },
      ];
    } else {
      // Moment: base kN·m
      return [
        { label: "Kilonewton-meter (kN·m)", val: val.toFixed(3), unit: "kN·m" },
        { label: "Newton-meter (N·m)", val: (val * 1000).toFixed(1), unit: "N·m" },
        { label: "Kilogram-force-meter (kgf·m)", val: (val * 101.972).toFixed(2), unit: "kgf·m" },
        { label: "Pound-force-foot (lbf·ft)", val: (val * 737.562).toFixed(2), unit: "lbf·ft" },
      ];
    }
  }, [converterCategory, convertInputValue]);

  // ─── 3. Baseplate Sizer Helper ──────────────────────────────────────────────
  const [poleBottomDia, setPoleBottomDia] = useState(190.7);

  const baseplateEstimate = useMemo(() => {
    const d = Number(poleBottomDia) || 165;
    const pcd = Math.round((d + 100) / 10) * 10;
    const plateWidth = pcd + 100;
    let thickness = 19;
    let bolt = "4-M24";
    if (d > 220) {
      thickness = 28;
      bolt = "8-M30";
    } else if (d > 200) {
      thickness = 25;
      bolt = "4-M30";
    } else if (d > 180) {
      thickness = 22;
      bolt = "4-M27";
    }
    return {
      pcd,
      plateWidth,
      thickness,
      bolt,
    };
  }, [poleBottomDia]);

  // ─── 4. Standard Catalog Filter ─────────────────────────────────────────────
  const [catalogSearch, setCatalogSearch] = useState("");
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return STANDARD_POLE_CATALOG;
    const q = catalogSearch.toLowerCase();
    return STANDARD_POLE_CATALOG.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        String(p.height).includes(q)
    );
  }, [catalogSearch]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Project Tools - KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[2800px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Wrench className="w-7 h-7 text-[#0d3b66]" />
              Project Tools
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Engineering utilities, wind velocity pressure calculators, standard pole spec lookup, and unit converters.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("wind")}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${
                activeTab === "wind"
                  ? "bg-[#0d3b66] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }
            `}
          >
            <Wind className="w-4 h-4" />
            Wind Pressure & Moment Calculator
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${
                activeTab === "catalog"
                  ? "bg-[#0d3b66] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }
            `}
          >
            <BookOpen className="w-4 h-4" />
            Standard Pole Specs Catalog
          </button>

          <button
            onClick={() => setActiveTab("converter")}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${
                activeTab === "converter"
                  ? "bg-[#0d3b66] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }
            `}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Engineering Unit Converter
          </button>

          <button
            onClick={() => setActiveTab("baseplate")}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${
                activeTab === "baseplate"
                  ? "bg-[#0d3b66] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }
            `}
          >
            <Layers className="w-4 h-4" />
            Baseplate & Bolt Quick Sizer
          </button>
        </div>

        {/* ─── TAB 1: WIND PRESSURE CALCULATOR ──────────────────────────────── */}
        {activeTab === "wind" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wind className="w-4.5 h-4.5 text-blue-600" />
                  Wind Parameter Inputs
                </h2>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  JIS C 8105-8-1
                </span>
              </div>

              {/* Design Standard */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Design Standard Formula
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWindStandard("jis")}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                      windStandard === "jis"
                        ? "border-[#0d3b66] bg-blue-50/60 text-[#0d3b66] font-semibold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div>JIS Standard</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">q = 0.6 · v²</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindStandard("standard")}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                      windStandard === "standard"
                        ? "border-[#0d3b66] bg-blue-50/60 text-[#0d3b66] font-semibold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div>Bernoulli / Air Density</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">q = ½ · ρ · v² (ρ=1.225)</div>
                  </button>
                </div>
              </div>

              {/* Wind Speed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Wind Speed (v)
                  </label>
                  <span className="text-xs font-bold text-blue-600">{windSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="1"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full accent-[#0d3b66] cursor-pointer"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[30, 40, 50, 60].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWindSpeed(preset)}
                      className={`px-2 py-0.5 text-[11px] rounded border font-medium transition-colors ${
                        windSpeed === preset
                          ? "bg-[#0d3b66] text-white border-[#0d3b66]"
                          : "border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset} m/s
                    </button>
                  ))}
                </div>
              </div>

              {/* Projected Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Projected Area (A in m²)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={projectedArea}
                  onChange={(e) => setProjectedArea(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                />
              </div>

              {/* Drag Coefficient Cd */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drag Coefficient (Cd)
                </label>
                <select
                  value={dragCoef}
                  onChange={(e) => setDragCoef(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                >
                  <option value={0.7}>0.7 - Cylindrical Pole / Taper Pole</option>
                  <option value={1.0}>1.0 - Luminaire / Arm Object</option>
                  <option value={1.2}>1.2 - Rectangular / Flat Plate</option>
                  <option value={1.4}>1.4 - Complex Sign / Projecting Object</option>
                </select>
              </div>

              {/* Height to Center of Wind */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Height to Load Center (H in meters)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={momentArmHeight}
                  onChange={(e) => setMomentArmHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                />
              </div>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-gradient-to-br from-[#0d3b66] to-[#0a2c4c] p-6 rounded-xl text-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                    Calculation Results Summary
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Live Computed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-xs border border-white/10">
                    <p className="text-xs text-white/70">Velocity Pressure (q)</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                      {velocityPressure.toFixed(0)} <span className="text-sm font-normal text-white/80">N/m²</span>
                    </h3>
                    <p className="text-[10px] text-white/50 mt-1">
                      {(velocityPressure / 1000).toFixed(3)} kPa
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-xs border border-white/10">
                    <p className="text-xs text-white/70">Total Wind Force (Fw)</p>
                    <h3 className="text-2xl font-bold mt-1 text-amber-300">
                      {windForceKN} <span className="text-sm font-normal text-white/80">kN</span>
                    </h3>
                    <p className="text-[10px] text-white/50 mt-1">
                      {windForceN.toFixed(0)} N (~{(windForceN * 0.10197).toFixed(0)} kgf)
                    </p>
                  </div>

                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-xs border border-white/10">
                    <p className="text-xs text-white/70">Base Overturning Moment (M)</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-300">
                      {bendingMomentKNm} <span className="text-sm font-normal text-white/80">kN·m</span>
                    </h3>
                    <p className="text-[10px] text-white/50 mt-1">
                      At Ground Line (GL)
                    </p>
                  </div>
                </div>

                {/* Formula Breakdown */}
                <div className="mt-5 pt-4 border-t border-white/10 text-xs font-mono text-white/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>• q = {windStandard === "jis" ? "0.6" : "0.6125"} × {windSpeed}²</span>
                    <span>= {velocityPressure.toFixed(1)} N/m²</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>• Fw = {velocityPressure.toFixed(1)} × {dragCoef} × {projectedArea} m²</span>
                    <span>= {windForceN.toFixed(1)} N</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-300">
                    <span>• M = {windForceKN} kN × {momentArmHeight} m</span>
                    <span>= {bendingMomentKNm} kN·m</span>
                  </div>
                </div>
              </div>

              {/* Reference Info Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">
                    Japanese Lighting Pole Standard Reference (JIL-1003 / JIS C 8105-8-1)
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Standard pole designs in Japan generally assume basic design wind speeds of 30 m/s to 60 m/s depending on the installation area and typhoon risk profile. Drag coefficient for standard circular/taper poles is commonly taken as 0.7.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STANDARD CATALOG SPECIFICATIONS ──────────────────────── */}
        {activeTab === "catalog" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Standard Taper Pole Specifications (IS Series)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference catalog dimensions, plate thickness, weight, and anchor bolt specs.
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search pole height or code..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Catalog Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Height (mm)</th>
                    <th className="py-3 px-4">Top Dia (mm)</th>
                    <th className="py-3 px-4">Bottom Dia (mm)</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4">Weight (kg)</th>
                    <th className="py-3 px-4">Baseplate Spec</th>
                    <th className="py-3 px-4">Anchor Bolt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalog.map((pole) => (
                    <tr key={pole.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0d3b66]">
                        {pole.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {pole.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {pole.height}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        Ø {pole.topDia}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        Ø {pole.bottomDia}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        t = {pole.thickness} mm
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {pole.weight} kg
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {pole.baseplate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-200">
                          {pole.anchorBolt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: UNIT CONVERTER ───────────────────────────────────────── */}
        {activeTab === "converter" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input & Category Selection */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Select Conversion Category
              </h2>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "speed", label: "Wind Speed", desc: "m/s, km/h, mph, knots" },
                  { key: "force", label: "Force & Weight", desc: "N, kN, kgf, lbf" },
                  { key: "pressure", label: "Pressure / Stress", desc: "Pa, kPa, MPa, N/mm²" },
                  { key: "moment", label: "Bending Moment", desc: "kN·m, N·m, kgf·m" },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setConverterCategory(cat.key);
                      setConvertInputValue(cat.key === "speed" ? 30 : cat.key === "force" ? 10 : cat.key === "pressure" ? 1000 : 25);
                    }}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      converterCategory === cat.key
                        ? "border-[#0d3b66] bg-blue-50/70 text-[#0d3b66]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold">{cat.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{cat.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Input Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={convertInputValue}
                  onChange={(e) => setConvertInputValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                />
              </div>
            </div>

            {/* Converted Values Grid */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Converted Equivalents
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {convertedUnits.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                      <h4 className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                        {item.val} <span className="text-xs font-normal text-slate-600">{item.unit}</span>
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.val, `conv-${idx}`)}
                      title="Copy to clipboard"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors"
                    >
                      {copiedKey === `conv-${idx}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: BASEPLATE & ANCHOR BOLT SIZER ────────────────────────── */}
        {activeTab === "baseplate" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Baseplate & PCD Estimator
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pole Bottom Outside Diameter (D in mm)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={poleBottomDia}
                    onChange={(e) => setPoleBottomDia(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40"
                  />
                  <span className="text-xs text-slate-500 font-mono shrink-0">mm</span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">Common Standard Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {[165.2, 190.7, 216.3, 241.8].map((dia) => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => setPoleBottomDia(dia)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        Number(poleBottomDia) === dia
                          ? "bg-[#0d3b66] text-white border-[#0d3b66] font-semibold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Ø {dia} mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Recommended Baseplate Configuration
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <p className="text-xs font-medium text-slate-500">Bolt Pitch Circle Diameter (PCD)</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    Ø {baseplateEstimate.pcd} mm
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Clears pole root with margin</p>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <p className="text-xs font-medium text-slate-500">Square Baseplate Dimensions</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    {baseplateEstimate.plateWidth} × {baseplateEstimate.plateWidth} mm
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Thickness t = {baseplateEstimate.thickness} mm</p>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                  <p className="text-xs font-medium text-slate-500">Recommended Anchor Bolts</p>
                  <h3 className="text-xl font-bold text-emerald-800 mt-1 font-mono">
                    {baseplateEstimate.bolt}
                  </h3>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">High-tensile SS400 / SNR400B</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Reinforcement Ribs</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1 font-mono">
                    4 or 8 Triangular Ribs
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Standard height 150 - 200 mm</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

