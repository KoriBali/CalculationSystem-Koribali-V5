import { useEffect, useState } from "react";
import { RotateCcw, Box, Loader2 } from "lucide-react";
import { GROUND_POSITION_OPTIONS } from "../../../../constants/taperPoleStandradOptions";
import { usePoleStandardData } from "../../../../hooks/usePoleStandardData";
import { ConfirmResetAllModal } from "../../../modals/ConfirmResetAllModal";
import { ConfirmSwitchInstallationModal } from "../../../modals/ConfirmSwitchInstallationModal";
import { preloadImagesWhenIdle } from "../../../../utils/preloadImages";
import { FormSelect } from "../../../../../../shared/components/FormSelect";
import { getMasterPoleStandardHeightGeometry } from "../../../../services/requestService";
import STANDARD_POLE_DATA from "../../../../data/specStandardPole.json";

// === IMAGES (12 cases: 6 pole types × 2 ground positions) ===
const DIAGRAM_IMAGE_MAP = {
  IS: {
    onGL: "/images/IS_OnGL.svg",
    underGL: "/images/IS_UnderGL.svg",
  },
  IA: {
    onGL: "/images/IA_OnGL.svg",
    underGL: "/images/IA_UnderGL.svg",
  },
  LS: {
    onGL: "/images/LS_OnGL.svg",
    underGL: "/images/LS_UnderGL.svg",
  },
  LA: {
    onGL: "/images/LA_OnGL.svg",
    underGL: "/images/LA_UnderGL.svg",
  },
  TS: {
    onGL: "/images/TS_OnGL.svg",
    underGL: "/images/TS_UnderGL.svg",
  },
  TA: {
    onGL: "/images/TA_OnGL.svg",
    underGL: "/images/TA_UnderGL.svg",
  },
};

// Embedment variant (used when !isBaseplate) for each pole type
const EMBED_IMAGE_MAP = Object.fromEntries(
  Object.keys(DIAGRAM_IMAGE_MAP).map((type) => [
    type,
    `/images/${type}_Embedment.svg`,
  ]),
);

const ALL_DIAGRAM_IMAGES = [
  ...Object.values(DIAGRAM_IMAGE_MAP).flatMap((byGround) =>
    Object.values(byGround),
  ),
  ...Object.values(EMBED_IMAGE_MAP),
];

// Distance (px) between the Height select and the overall-height dimension
// line. Positive = select sits to the left of the line, negative = it
// overlaps slightly to the right. Override per layout with `heightGap`.
const DEFAULT_HEIGHT_GAP_PX = 8;

// === DIMENSION LABELS ON THE DIAGRAM ===
// Where each dimension's text sits on a diagram, in that SVG's own viewBox
// units (so labels stay glued to the dimension lines at any rendered size).
// `anchor` says which side of the text the point is: "left" = text starts
// there, "right" = text ends there, "bottom-left" = text sits above it,
// "leader" = the point is the start of a leader line's horizontal segment,
// with the first text line above it and the second below, "vertical" = text
// rotated to read bottom-to-top, centred on the point, "bottom-center" /
// "bottom-right" = text sits above the point, centred on / ending at it.
// Mapped so far: IS, IA, LS, LA and TS (On GL / Under GL); other diagrams
// simply show no labels.

// The short dimension at the pole base is always 750mm — for every pole
// type, ground position and height. Not in specStandardPole.json.
const BASE_DIMENSION_MM = 750;

// Under GL poles are always buried 300mm below G.L. (8.3 / 10.3 / 12.3 m),
// so the part above G.L. is the selected height minus this.
const UNDER_GL_DEPTH_MM = 300;

// Arm types (LS…): the horizontal dimension above the arm is always 300mm.
// Not in specStandardPole.json.
const ARM_TOP_DIMENSION_MM = 300;

const DIAGRAM_LABEL_LAYOUT = {
  "IS.onGL": {
    viewBox: { width: 315, height: 771 },
    // x of the overall-height dimension line — the Height select sits
    // right up against it so it reads as that dimension's value.
    heightLineX: 11.7,
    heightGap: 7,
    positions: {
      // Diameters sit on top of their horizontal dimension line, as in the
      // standard drawings. At the top the extension lines come in from
      // above, so the text starts just right of where they meet the line;
      // at the base they go downward, so it can start at the line's left end.
      upperDiameter: { x: 196.2, y: 42.05, anchor: "bottom-left" },
      // Pole spec straddles the leader's horizontal line: type above,
      // standard below.
      poleSpec: { x: 184.6, y: 349.4, anchor: "leader" },
      // Vertical, just left of the 750 line (x 75.7, y 693 → 758).
      baseDimension: { x: 65, y: 725, anchor: "vertical" },
      lowerDiameter: { x: 173.2, y: 719, anchor: "bottom-left" },
    },
  },
  // Same labels as On GL (offsets from each line kept identical), plus the
  // split of the overall height into the part above G.L. and the 300mm
  // below it.
  "IS.underGL": {
    viewBox: { width: 363, height: 771 },
    heightLineX: 8,
    heightGap: 7,
    positions: {
      upperDiameter: { x: 245, y: 42.5, anchor: "bottom-left" },
      poleSpec: { x: 232.6, y: 349.3, anchor: "leader" },
      // Between the two vertical dimension lines, just left of the inner
      // one (x 60.5, y 9 → 733).
      aboveGroundHeight: { x: 46, y: 371, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 124.5, y 667 → 734).
      baseDimension: { x: 112, y: 700.5, anchor: "vertical" },
      lowerDiameter: { x: 221.5, y: 696, anchor: "bottom-left" },
      // Vertical, in line with the above-G.L. height text, centred on the
      // short G.L. → base segment (x 60.5, y 737 → 759).
      underGroundDepth: { x: 46, y: 745, anchor: "vertical" },
    },
  },
  // Stepped pole: straight top → taper → straight bottom, so four diameters
  // and the three section lengths on the inner dimension line (x 60.2).
  // Offsets from each line match the IS layouts above.
  "IA.onGL": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      // Diameter lines at y 45.5 / 183.5 (extension lines from above) and
      // y 590 / 725 (extension lines going down).
      diameter1: { x: 251.75, y: 41.55, anchor: "bottom-left" },
      diameter2: { x: 251.75, y: 181.05, anchor: "bottom-left" },
      poleSpec: { x: 240.15, y: 349.3, anchor: "leader" },
      diameter3: { x: 228.25, y: 585, anchor: "bottom-left" },
      diameter4: { x: 228.25, y: 720.05, anchor: "bottom-left" },
      // Section lengths, centred on y 9→145 / 147→622 / 624→760.
      topSectionLength: { x: 48.25, y: 77.05, anchor: "vertical" },
      taperSectionLength: { x: 48.25, y: 384.55, anchor: "vertical" },
      bottomSectionLength: { x: 48.25, y: 692.05, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 130.2, y 693 → 760).
      baseDimension: { x: 118.5, y: 726.55, anchor: "vertical" },
    },
  },
  // Same labels and values as IA On GL, plus the 300mm below G.L. Texts
  // come from the On GL entry at (height − 0.3m): the IA underGL entries in
  // specStandardPole.json store the bottom section as 1800, which would
  // make the taper section read 300 short of On GL.
  "IA.underGL": {
    viewBox: { width: 364, height: 772 },
    heightLineX: 8,
    heightGap: 7,
    textsFromOnGL: true,
    positions: {
      diameter1: { x: 246, y: 42.5, anchor: "bottom-left" },
      diameter2: { x: 246, y: 181.5, anchor: "bottom-left" },
      poleSpec: { x: 234, y: 350.3, anchor: "leader" },
      diameter3: { x: 223.5, y: 559.5, anchor: "bottom-left" },
      diameter4: { x: 223.5, y: 696.5, anchor: "bottom-left" },
      // Inner dimension line x 60.9: y 10.6→144.2 / 148.6→596.2 /
      // 600.6→734.2, then the 300 below G.L. at 738.6→759.2.
      topSectionLength: { x: 48.5, y: 77.2, anchor: "vertical" },
      taperSectionLength: { x: 48.5, y: 372.2, anchor: "vertical" },
      bottomSectionLength: { x: 48.5, y: 667.2, anchor: "vertical" },
      underGroundDepth: { x: 48.5, y: 746.5, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 123.9, y 669.6 → 734.2).
      baseDimension: { x: 114, y: 701.7, anchor: "vertical" },
    },
  },
  // Taper pole with one lighting arm at the top: pole labels as IS, plus
  // the pole-top-to-arm offset, the arm height, and the arm's own labels.
  "LS.onGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      // Arm: 300 centred above its dimension line (y 7.3, x 201.5 → 247.5);
      // (180) above its line (y 40.3), ending just left of the arrow at
      // x 201.5 — the gap between the arrows is too narrow for the text.
      armTopDimension: { x: 224.8, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      // Diameter line at y 57.3; extension lines come up from the arm and
      // end at x 278.5, so the text starts just right of them.
      upperDiameter: { x: 282.35, y: 54, anchor: "bottom-left" },
      // Arm spec: second line (material) centred under the first, as in
      // the standard drawings.
      armSpec: { x: 254.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 446, anchor: "leader" },
      // Inner dimension line x 61.5: the short 100 between the pole top
      // (y 104.3) and the arm (y 113.3) has its arrows outside, so its text
      // runs along the upper arrow stem (y 64 → 102); then the arm height
      // (y 115.5 → 855).
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 484.95, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 126.5, y 790.5 → 855).
      baseDimension: { x: 114, y: 822.45, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 813.95, anchor: "bottom-left" },
    },
  },
  // Same labels and values as LS On GL, plus the 300 below G.L. Texts come
  // from the On GL entry at (height − 0.3m): the LS underGL entries store
  // the pole top as 8400 vs the arm's 8000, which would read 400 instead
  // of On GL's 100.
  "LS.underGL": {
    viewBox: { width: 384, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 223.5, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 191, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 281.55, y: 54, anchor: "bottom-left" },
      armSpec: { x: 252.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.2, y: 444.95, anchor: "leader" },
      // Inner dimension line x 61.05: 100 on the upper arrow stem, arm
      // height y 115.2 → 829.7, then the 300 below G.L. y 834.2 → 854.7.
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 472.45, anchor: "vertical" },
      underGroundDepth: { x: 48, y: 840.8, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 126.05, y 765.2 → 829.7).
      baseDimension: { x: 114, y: 797.45, anchor: "vertical" },
      lowerDiameter: { x: 224.55, y: 791.2, anchor: "bottom-left" },
    },
  },
  // Stepped pole (as IA) with a lighting arm (as LS): the pole top sits
  // 100 above the arm, and the top section is measured from the arm down.
  "LA.onGL": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 226.5, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 284, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 248.2, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 815, anchor: "bottom-left" },
      // Inner dimension line x 60.2: 100 on the upper arrow stem (y 65 →
      // 103), then y 116.6→270.1 / 274.6→717.1 / 721.6→855.1.
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 788.34, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 128.2, y 790.6 → 855.1).
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  // Same labels and values as LA On GL, plus the 300 below G.L. Texts come
  // from the On GL entry at (height − 0.3m): the LA underGL entries store
  // the bottom section as 1900 (1600 + the buried 300).
  "LA.underGL": {
    viewBox: { width: 385, height: 867 },
    heightLineX: 7.85,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 225, y: 5.1, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.1, anchor: "bottom-right" },
      diameter1: { x: 284.35, y: 55.1, anchor: "bottom-left" },
      armSpec: { x: 254.25, y: 141, anchor: "leader", centered: true },
      diameter2: { x: 247, y: 277, anchor: "bottom-left" },
      poleSpec: { x: 238, y: 444.3, anchor: "leader" },
      diameter3: { x: 225.35, y: 654, anchor: "bottom-left" },
      diameter4: { x: 225.35, y: 791, anchor: "bottom-left" },
      // Inner dimension line x 58.85: 100 on the upper arrow stem, then
      // y 114.3→240.9 / 245.3→690.9 / 695.3→828.9, and 300 at 833.3→853.9.
      poleTopOffset: { x: 45, y: 82.98, anchor: "vertical" },
      topSectionLength: { x: 45, y: 177.6, anchor: "vertical" },
      taperSectionLength: { x: 45, y: 468.1, anchor: "vertical" },
      bottomSectionLength: { x: 45, y: 762.1, anchor: "vertical" },
      underGroundDepth: { x: 45, y: 841.1, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 127.31, y 764.3 → 828.9).
      baseDimension: { x: 114.81, y: 796.6, anchor: "vertical" },
    },
  },
  // Taper pole (as LS) with two arms, left and right: the arm dimensions
  // appear on both sides, each placed outside its arrows as in the
  // standard drawings; the arm spec sits on the right-hand leader.
  "TS.onGL": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8,
    positions: {
      // 300s on the line at y 10 (left arrow x 158, right arrow x 248);
      // (180)s on the line at y 43 — kept outside the 300 extension lines
      // (x 158 / 248) too, so the text never crosses them.
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 76, anchor: "leader", centered: true },
      // Diameter line at y 144.5; extension lines come in from above and
      // end at x 243, so the text starts just right of them.
      upperDiameter: { x: 248, y: 143, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 452.1, anchor: "leader" },
      // Inner dimension line x 59: 100 on the upper arrow stem (y 68 →
      // 105.8), then the arm height y 118.2 → 857.8.
      poleTopOffset: { x: 44.5, y: 86.9, anchor: "vertical" },
      armHeight: { x: 44.5, y: 488, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 128, y 793.2 → 857.8).
      baseDimension: { x: 115, y: 825.5, anchor: "vertical" },
      lowerDiameter: { x: 225.5, y: 817, anchor: "bottom-left" },
    },
  },
  // Same labels and values as TS On GL, plus the 300 below G.L. Texts come
  // from the On GL entry at (height − 0.3m): the TS underGL entries store
  // the pole top as 8400 vs the arms' 8000, which would read 400 instead
  // of On GL's 100.
  "TS.underGL": {
    viewBox: { width: 386, height: 872 },
    heightLineX: 8,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 76, anchor: "leader", centered: true },
      upperDiameter: { x: 248, y: 143, anchor: "bottom-left" },
      poleSpec: { x: 239.5, y: 453, anchor: "leader" },
      // Inner dimension line x 59: 100 on the upper arrow stem, arm
      // height y 118.2 → 834.1, then the 300 below G.L. y 838.5 → 859.1.
      poleTopOffset: { x: 43.5, y: 87, anchor: "vertical" },
      armHeight: { x: 43.5, y: 476, anchor: "vertical" },
      underGroundDepth: { x: 43.5, y: 845, anchor: "vertical" },
      // Vertical, just left of the 750 line (x 128, y 769.5 → 834.1).
      baseDimension: { x: 114, y: 802, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 796, anchor: "bottom-left" },
    },
  },
  // Taper pole (stepped like LA) with two arms (like TS)
  "TA.onGL": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 76, anchor: "leader", centered: true },
      diameter1: { x: 248, y: 142.5, anchor: "bottom-left" },
      diameter2: { x: 248, y: 310.3, anchor: "bottom-left" },
      poleSpec: { x: 239.5, y: 452, anchor: "leader" },
      diameter3: { x: 226, y: 682.8, anchor: "bottom-left" },
      diameter4: { x: 226, y: 818, anchor: "bottom-left" },
      poleTopOffset: { x: 45.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 45.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 45.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 45.7, y: 790.34, anchor: "vertical" },
      baseDimension: { x: 115, y: 825, anchor: "vertical" },
    },
  },
  "TA.underGL": {
    viewBox: { width: 386, height: 872 },
    heightLineX: 7.85,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 148, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 154.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 76, anchor: "leader", centered: true },
      diameter1: { x: 248, y: 142.5, anchor: "bottom-left" },
      diameter2: { x: 248, y: 283, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 453.85, anchor: "leader" },
      diameter3: { x: 224.35, y: 661.2, anchor: "bottom-left" },
      diameter4: { x: 224.35, y: 795.5, anchor: "bottom-left" },
      poleTopOffset: { x: 43, y: 82.98, anchor: "vertical" },
      topSectionLength: { x: 43, y: 177.6, anchor: "vertical" },
      taperSectionLength: { x: 43, y: 468.1, anchor: "vertical" },
      bottomSectionLength: { x: 43, y: 765.1, anchor: "vertical" },
      underGroundDepth: { x: 43, y: 844.8, anchor: "vertical" },
      baseDimension: { x: 114.81, y: 801.6, anchor: "vertical" },
    },
  },
  // --- EMBEDMENT LAYOUTS ---
  // (Copied from .onGL so you can freely modify their x/y coordinates without affecting onGL)
  "IS.embedment": {
    viewBox: { width: 315, height: 771 },
    heightLineX: 11.7,
    heightGap: 7,
    positions: {
      upperDiameter: { x: 184.5, y: 74.05, anchor: "bottom-left" },
      poleSpec: { x: 180.6, y: 353.3, anchor: "leader" },
      baseDimension: { x: 65.5, y: 594.55, anchor: "vertical" },
      lowerDiameter: { x: 166.2, y: 583.4, anchor: "bottom-left" },
    },
  },
  "IA.embedment": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      diameter1: { x: 237.75, y: 68.55, anchor: "bottom-left" },
      diameter2: { x: 237.75, y: 188.55, anchor: "bottom-left" },
      poleSpec: { x: 234.15, y: 353, anchor: "leader" },
      diameter3: { x: 220, y: 470, anchor: "bottom-left" },
      diameter4: { x: 220, y: 588, anchor: "bottom-left" },
      topSectionLength: { x: 49, y: 101.05, anchor: "vertical" },
      taperSectionLength: { x: 49, y: 340, anchor: "vertical" },
      bottomSectionLength: { x: 49, y: 566, anchor: "vertical" },
      baseDimension: { x: 116.5, y: 599, anchor: "vertical" },
    },
  },
  "LS.embedment": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      armTopDimension: { x: 223, y: 21.95, anchor: "bottom-center" },
      armLength: { x: 196, y: 55.95, anchor: "bottom-right" },
      upperDiameter: { x: 280, y: 71, anchor: "bottom-left" },
      armSpec: { x: 257.5, y: 151.5, anchor: "leader", centered: true },
      poleSpec: { x: 238, y: 445.8, anchor: "leader" },
      poleTopOffset: { x: 48, y: 96.65, anchor: "vertical" },
      armHeight: { x: 48, y: 450, anchor: "vertical" },
      baseDimension: { x: 118.8, y: 700, anchor: "vertical" },
      lowerDiameter: { x: 224, y: 688.95, anchor: "bottom-left" },
    },
  },
  "LA.embedment": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 223, y: 21.95, anchor: "bottom-center" },
      armLength: { x: 196, y: 55.95, anchor: "bottom-right" },
      diameter1: { x: 280, y: 70, anchor: "bottom-left" },
      armSpec: { x: 257.5, y: 151.5, anchor: "leader", centered: true },
      diameter2: { x: 247.2, y: 276, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 445.8, anchor: "leader" },
      diameter3: { x: 224.7, y: 566, anchor: "bottom-left" },
      diameter4: { x: 224.7, y: 690, anchor: "bottom-left" },
      poleTopOffset: { x: 48, y: 95.65, anchor: "vertical" },
      topSectionLength: { x: 48, y: 185.35, anchor: "vertical" },
      taperSectionLength: { x: 48, y: 450, anchor: "vertical" },
      bottomSectionLength: { x: 48, y: 668.34, anchor: "vertical" },
      baseDimension: { x: 120, y: 701, anchor: "vertical" },
    },
  },
  "TS.embedment": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8,
    positions: {
      armTopDimension: { x: 157.8, y: 29, anchor: "bottom-right" },
      armTopDimensionRight: { x: 251.5, y: 29, anchor: "bottom-left" },
      armLength: { x: 163.6, y: 58.95, anchor: "bottom-right" },
      armLengthRight: { x: 246, y: 58.95, anchor: "bottom-left" },
      armSpec: { x: 271, y: 90.5, anchor: "leader", centered: true },
      upperDiameter: { x: 247, y: 154, anchor: "bottom-left" },
      poleSpec: { x: 238, y: 452.1, anchor: "leader" },
      poleTopOffset: { x: 48, y: 98.9, anchor: "vertical" },
      armHeight: { x: 48, y: 452, anchor: "vertical" },
      baseDimension: { x: 120, y: 705.5, anchor: "vertical" },
      lowerDiameter: { x: 226.5, y: 694, anchor: "bottom-left" },
    },
  },
  "TA.embedment": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 157.8, y: 29, anchor: "bottom-right" },
      armTopDimensionRight: { x: 251.5, y: 29, anchor: "bottom-left" },
      armLength: { x: 163.6, y: 58.95, anchor: "bottom-right" },
      armLengthRight: { x: 246, y: 58.95, anchor: "bottom-left" },
      armSpec: { x: 275, y: 90.5, anchor: "leader", centered: true },
      diameter1: { x: 247, y: 154, anchor: "bottom-left" },
      diameter2: { x: 247, y: 280, anchor: "bottom-left" },
      poleSpec: { x: 238.5, y: 452, anchor: "leader" },
      diameter3: { x: 226, y: 568.8, anchor: "bottom-left" },
      diameter4: { x: 226, y: 694, anchor: "bottom-left" },
      poleTopOffset: { x: 48, y: 99.65, anchor: "vertical" },
      topSectionLength: { x: 48, y: 190.35, anchor: "vertical" },
      taperSectionLength: { x: 48, y: 450, anchor: "vertical" },
      bottomSectionLength: { x: 48, y: 670.34, anchor: "vertical" },
      baseDimension: { x: 120, y: 706.5, anchor: "vertical" },
    },
  },
};

const LABEL_ANCHOR_TRANSFORM = {
  left: "translate(0, -50%)",
  right: "translate(-100%, -50%)",
  "bottom-left": "translate(0, -100%)",
  // Shift up by one text line (--label-lh, the labels' line height) plus
  // half the 1px gap, so the gap lands exactly on the SVG's leader line.
  leader: "translate(0, calc(-1 * var(--label-lh) - 0.5px))",
  vertical: "translate(-50%, -50%) rotate(-90deg)",
  "bottom-center": "translate(-50%, -100%)",
  "bottom-right": "translate(-100%, -100%)",
};

// Konversi nilai dari meter ke mm jika angka berupa meter (mis. 8.0 m -> 8000 mm)
const toMm = (val) => {
  if (val == null) return null;
  const num = Number(val);
  if (Number.isNaN(num)) return null;
  return num < 50 ? Math.round(num * 1000) : Math.round(num);
};

// Builds the label texts for the selected pole from Backend geometry (with specStandardPole.json fallback).
// Returns null until a height is chosen or when the diagram isn't mapped.
function getDiagramLabels(poleType, groundPosition, height, beGeometry = null) {
  if (!height) return null;
  const layout = DIAGRAM_LABEL_LAYOUT[`${poleType}.${groundPosition}`];
  if (!layout) return null;
  // Layouts flagged textsFromOnGL read the On GL entry for the same pole
  // above G.L. (e.g. 8.3 → "8", 4.8 → "4.5").
  const dataGround =
    layout.textsFromOnGL || groundPosition === "embedment"
      ? "onGL"
      : groundPosition;
  const numH = Number(height);
  const mH = numH > 100 ? numH / 1000 : numH;
  const dataHeight = layout.textsFromOnGL
    ? String(Math.round((mH - UNDER_GL_DEPTH_MM / 1000) * 10) / 10)
    : String(mH);
  const dataTaper = STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper;
  const group = dataTaper?.[poleType]?.[dataGround] || {};
  const isTypeWith100 = poleType !== "IS" && poleType !== "IA";
  const nominalHeight = isTypeWith100
    ? String(Math.round((Number(dataHeight) - 0.1) * 10) / 10)
    : String(Math.round((Number(dataHeight) + 0.1) * 10) / 10);

  const entry =
    group[dataHeight] ||
    group[nominalHeight] ||
    group[String(Math.round(Number(dataHeight) * 10) / 10)];
  const poles = entry?.poles;
  const arm = entry?.arms?.[0];
  const arm2 = entry?.arms?.[1];
  const pole = poles?.[0];
  if (!pole) return null;

  // Ekstrak data dari BE Geometry jika tersedia
  let beStepPoles = null;
  let beTopPole = null;
  let beBottomPole = null;
  let beTaperPole = null;

  if (
    beGeometry &&
    Array.isArray(beGeometry.stepPoles) &&
    beGeometry.stepPoles.length > 0
  ) {
    // Di BE master geometry, stepPoles berurutan dari bawah ke atas berdasarkan topElevationM
    const sortedAsc = [...beGeometry.stepPoles].sort(
      (a, b) => Number(a.topElevationM || 0) - Number(b.topElevationM || 0),
    );
    const sortedDesc = [...sortedAsc].reverse();

    beStepPoles = sortedAsc;
    beBottomPole = sortedAsc[0];
    beTopPole = sortedDesc[0];
    beTaperPole =
      sortedAsc.find(
        (p) => String(p.poleType || "").toLowerCase() === "taper",
      ) || beTopPole;
  }

  // Spec text describes the tapered section (the only section for IS; the
  // middle one for stepped types like IA).
  const taper = poles.find((p) => p.poleType === "Taper") ?? pole;
  const fallbackThickness = Number(taper.upperThickness).toFixed(1);

  // Ambil ketebalan & material dari BE jika ada
  const beThick =
    beTaperPole?.thicknessLowerMm ??
    beTaperPole?.thicknessUpperMm ??
    beTopPole?.thicknessLowerMm ??
    fallbackThickness;
  const beMat =
    beTaperPole?.materialName ||
    beTaperPole?.material?.name ||
    (typeof beTaperPole?.material === "string" ? beTaperPole.material : null) ||
    taper.material;

  // Stepped poles (straight → taper → straight)
  const [top, middle, bottom] = poles;
  const isStepped = poles.length >= 3;

  const heightInMm = numH > 100 ? Math.round(numH) : Math.round(mH * 1000);
  const totalHeightMm = beGeometry?.height
    ? beGeometry.height > 100
      ? Math.round(beGeometry.height)
      : toMm(beGeometry.height)
    : heightInMm;

  // Diameters
  const upperDia =
    beTopPole?.diameterUpperMm ??
    beTopPole?.diameterLowerMm ??
    pole.upperDiameter;
  const lowerDia = beBottomPole?.diameterLowerMm ?? pole.lowerDiameter;

  let dia1 = top?.upperDiameter;
  let dia2 = taper.upperDiameter;
  let dia3 = taper.lowerDiameter;
  let dia4 = poles[poles.length - 1]?.lowerDiameter;

  let topLen = 0;
  let midLen = 0;
  let botLen = 0;

  if (isStepped && middle && bottom) {
    topLen = ((arm ?? top)?.zHeight ?? 0) - (middle?.zHeight ?? 0);
    midLen = (middle?.zHeight ?? 0) - (bottom?.zHeight ?? 0);
    botLen = bottom?.zHeight ?? 0;
  }

  if (beStepPoles && beStepPoles.length >= 3) {
    const topSeg = beStepPoles[beStepPoles.length - 1]; // top
    const midSeg = beStepPoles[1]; // middle taper
    const botSeg = beStepPoles[0]; // bottom

    dia1 = topSeg.diameterUpperMm ?? topSeg.diameterLowerMm ?? dia1;
    dia2 = midSeg.diameterUpperMm ?? dia2;
    dia3 = midSeg.diameterLowerMm ?? dia3;
    dia4 = botSeg.diameterLowerMm ?? botSeg.diameterUpperMm ?? dia4;

    // Hitung panjang segmen dari topElevationM BE (meter ke mm)
    const botElevMm = toMm(botSeg.topElevationM);
    const midElevMm = toMm(midSeg.topElevationM);
    const topElevMm = toMm(topSeg.topElevationM);

    if (botElevMm) botLen = botElevMm;
    if (midElevMm && botElevMm) midLen = midElevMm - botElevMm;
    if (topElevMm && midElevMm) {
      const armOffset = arm ? pole.zHeight - arm.zHeight : 0;
      topLen = topElevMm - midElevMm - armOffset;
    }
  }

  const texts = {
    upperDiameter: [`φ${upperDia}`],
    poleSpec: [`t${Number(beThick).toFixed(1)}`, `[JIS G3444 ${beMat}]`],
    baseDimension: [`${BASE_DIMENSION_MM}`], // 750 mm handhole/base dimension dari FE
    lowerDiameter: [`φ${lowerDia}`],
    aboveGroundHeight: [`${totalHeightMm - UNDER_GL_DEPTH_MM}`],
    underGroundDepth: [`${UNDER_GL_DEPTH_MM}`],
    // Stepped poles — diameters top to bottom, then section lengths.
    diameter1: [`φ${dia1}`],
    diameter2: [`φ${dia2}`],
    diameter3: [`φ${dia3}`],
    diameter4: [`φ${dia4}`],
    // Arm types — pole top sits above the arm by (pole zHeight − arm
    // zHeight); the arm's own spec goes on its leader.
    ...(arm && {
      poleTopOffset: [`${pole.zHeight - arm.zHeight}`],
      armHeight: [`${arm.zHeight}`],
      armTopDimension: [`${ARM_TOP_DIMENSION_MM}`],
      armLength: [`(${arm.length})`],
      // Second arm (TS / TA): mirrored dimensions on the other side.
      ...(arm2 && {
        armTopDimensionRight: [`${ARM_TOP_DIMENSION_MM}`],
        armLengthRight: [`(${arm2.length})`],
      }),
      armSpec: [
        `φ${arm.diameter}×t${Number(arm.thickness).toFixed(1)}`,
        arm.material,
      ],
    }),
    ...(isStepped && {
      topSectionLength: [`${topLen}`],
      taperSectionLength: [`${midLen}`],
      bottomSectionLength: [`${botLen}`],
    }),
  };

  return Object.entries(layout.positions)
    .filter(([key]) => texts[key])
    .map(([key, pos]) => ({
      key,
      isLeader: pos.anchor === "leader",
      isCentered: !!pos.centered,
      lines: texts[key],
      style: {
        left: `${(pos.x / layout.viewBox.width) * 100}%`,
        top: `${(pos.y / layout.viewBox.height) * 100}%`,
        transform: LABEL_ANCHOR_TRANSFORM[pos.anchor],
      },
    }));
}

// === HELPERS ===
// Renders a red error message below an invalid field
const ErrorStyle = ({ show, text }) =>
  show ? (
    <p className="mt-1.5 text-[11px] md:text-xs text-red-500">*{text}</p>
  ) : null;

const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-2 text-xs md:text-sm font-medium hp:text-xs hp:gap-1">
    <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
    {children}
  </h3>
);

const EMPTY_HEIGHT_OPTIONS = { onGL: [], underGL: [] };

const EMPTY_POLE_STANDARD = {
  poleType: "",
  installationPole: "",
  groundPosition: "",
  height: "",
  poleStandardHeightId: null,
  embedmentLength: "",
};

export function TaperPoleStandardForm({
  taperPoleStandard,
  onUpdate,
  hideReset = false,
  isBaseplate = true,
  onUpdateCondition,
  errors = {},
  readOnly = false,
  isCalculated = false,
}) {
  const {
    poleStandardOptions,
    heightOptionsByStandard,
    loading: poleStandardLoading,
    error: poleStandardError,
    refetch: refetchPoleStandard,
  } = usePoleStandardData();

  // Tracks which diagram URLs have already finished loading, so re-selecting
  // a pole type/ground position already shown once never re-shows a skeleton.
  const [loadedImages, setLoadedImages] = useState(() => new Set());

  const [showResetModal, setShowResetModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Resolved installation method: "baseplate", "embedment", or ""
  const effectiveInstallation =
    taperPoleStandard.installationPole ||
    (isBaseplate
      ? "baseplate"
      : taperPoleStandard.embedmentLength
        ? "embedment"
        : taperPoleStandard.groundPosition === "onGL"
          ? "baseplate"
          : "");

  const effectiveIsBaseplate = effectiveInstallation === "baseplate";

  const applyInstallationSwitch = (type) => {
    if (type === "baseplate") {
      onUpdateCondition?.({ baseplateEnabled: true });
      onUpdate({
        installationPole: "baseplate",
        groundPosition:
          taperPoleStandard.groundPosition === "underGL"
            ? ""
            : taperPoleStandard.groundPosition || "",
        embedmentLength: "",
      });
    } else if (type === "embedment") {
      onUpdateCondition?.({ baseplateEnabled: false });
      setBeGeometry(null);
      onUpdate({
        installationPole: "embedment",
        groundPosition: "underGL",
        height: "",
        poleStandardHeightId: null,
      });
    }
  };

  const handleSelectInstallation = (type) => {
    if (readOnly) return;
    if (effectiveInstallation === type) return;

    // Protection scenario: If calculation has already been done and user switches
    // from Baseplate to Embedment, show confirmation modal before proceeding.
    if (
      effectiveInstallation === "baseplate" &&
      type === "embedment" &&
      isCalculated
    ) {
      setShowSwitchModal(true);
      return;
    }

    applyInstallationSwitch(type);
  };

  useEffect(() => {
    if (
      effectiveInstallation === "embedment" &&
      taperPoleStandard.poleType &&
      taperPoleStandard.groundPosition !== "underGL"
    ) {
      onUpdate({ groundPosition: "underGL" });
    }
  }, [
    effectiveInstallation,
    taperPoleStandard.poleType,
    taperPoleStandard.groundPosition,
    onUpdate,
  ]);

  // Warm the browser cache with every pole diagram in the background so
  // switching pole type / ground position later never shows a blank flash.
  useEffect(() => preloadImagesWhenIdle(ALL_DIAGRAM_IMAGES), []);
  const currentHeightOptions =
    heightOptionsByStandard[taperPoleStandard.poleType] ?? EMPTY_HEIGHT_OPTIONS;

  // In Embedment mode groundPosition is always forced to "underGL" (see
  // effect above) — that's only used to pick the embedment diagram/field.
  // The height list itself should stay the plain onGL values; the +0.3m
  // embedment allowance is entered separately via Embedment Length, not
  // baked into the dropdown.
  const heightLookupKey = !effectiveIsBaseplate
    ? "onGL"
    : taperPoleStandard.groundPosition;

  // Ground Position and Height require explicit user selection when changing
  // type or ground position; we intentionally do not auto-select height so that
  // stale dimension values from previous selections never linger.

  // If height is present but poleStandardHeightId is missing (e.g. from draft restoration),
  // sync the matching heightId from the loaded options
  useEffect(() => {
    if (
      taperPoleStandard.height &&
      !taperPoleStandard.poleStandardHeightId &&
      currentHeightOptions[heightLookupKey]?.length > 0
    ) {
      const match = currentHeightOptions[heightLookupKey].find(
        (opt) => String(opt.id) === String(taperPoleStandard.height),
      );
      if (match?.heightId) {
        onUpdate({ poleStandardHeightId: match.heightId });
      }
    }
  }, [
    taperPoleStandard.height,
    taperPoleStandard.poleStandardHeightId,
    heightLookupKey,
    currentHeightOptions,
    onUpdate,
  ]);

  // Reverse lookup: If poleStandardHeightId is present but poleType or height is missing (e.g. loaded from backend calculation draft),
  // resolve them from heightOptionsByStandard so the UI selects the correct type, ground position, and height
  useEffect(() => {
    const heightId = taperPoleStandard.poleStandardHeightId;
    if (!heightId || (taperPoleStandard.poleType && taperPoleStandard.height))
      return;

    if (
      !heightOptionsByStandard ||
      Object.keys(heightOptionsByStandard).length === 0
    )
      return;

    for (const [shortCode, groups] of Object.entries(heightOptionsByStandard)) {
      for (const [gPosKey, options] of Object.entries(groups)) {
        if (Array.isArray(options)) {
          const found = options.find((opt) => opt.heightId === heightId);
          if (found) {
            onUpdate({
              poleType: shortCode,
              groundPosition: gPosKey,
              height: found.id,
            });
            return;
          }
        }
      }
    }
  }, [
    taperPoleStandard.poleStandardHeightId,
    taperPoleStandard.poleType,
    taperPoleStandard.height,
    heightOptionsByStandard,
    onUpdate,
  ]);

  // Fetch Backend geometry specifications when poleStandardHeightId is selected
  const [geometryState, setGeometryState] = useState({
    heightId: null,
    data: null,
    isLoading: false,
  });

  const setBeGeometry = (val = null) =>
    setGeometryState({
      heightId: null,
      data: val,
      isLoading: false,
    });

  useEffect(() => {
    const heightId = taperPoleStandard?.poleStandardHeightId;
    if (!heightId) {
      setGeometryState({ heightId: null, data: null, isLoading: false });
      return;
    }

    // Reset immediately so stale geometry from previous height is not displayed while fetching
    setGeometryState({ heightId, data: null, isLoading: true });

    let isMounted = true;
    getMasterPoleStandardHeightGeometry(heightId)
      .then((data) => {
        if (isMounted) {
          setGeometryState({ heightId, data: data || null, isLoading: false });
        }
      })
      .catch(() => {
        // If BE geometry is not yet available for this height (e.g. non-calculable height),
        // gracefully fall back to local spec without throwing or crashing
        if (isMounted) {
          setGeometryState({ heightId, data: null, isLoading: false });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [taperPoleStandard?.poleStandardHeightId]);

  // Synchronously ensure stale geometry from previous height is never passed to getDiagramLabels
  const effectiveBeGeometry =
    geometryState.heightId === taperPoleStandard?.poleStandardHeightId
      ? geometryState.data
      : null;

  const currentImage =
    taperPoleStandard.poleType
      ? effectiveInstallation === "embedment"
        ? EMBED_IMAGE_MAP[taperPoleStandard.poleType]
        : effectiveInstallation === "baseplate" && taperPoleStandard.groundPosition
          ? (DIAGRAM_IMAGE_MAP[taperPoleStandard.poleType]?.[
            taperPoleStandard.groundPosition
          ] ?? null)
          : null
      : null;

  // Dimension texts drawn over the diagram (plain On/Under GL diagrams only,
  // not the Embedment variant). Prioritizes Backend geometry when available.
  const diagramLabels = effectiveIsBaseplate
    ? getDiagramLabels(
      taperPoleStandard.poleType,
      taperPoleStandard.groundPosition,
      taperPoleStandard.height,
      effectiveBeGeometry,
    )
    : getDiagramLabels(
      taperPoleStandard.poleType,
      "embedment",
      taperPoleStandard.height,
      effectiveBeGeometry,
    );

  // ── Highlight labels whose value just changed ──
  // When the Height changes, briefly flash only the labels that now read
  // differently, so the user sees exactly which dimensions followed. Not on
  // first appearance, and not when switching to a different diagram.
  // Uses React's "adjust state while rendering" pattern to compare with the
  // previous render's texts.
  const labelDiagramKey = `${taperPoleStandard.poleType}.${taperPoleStandard.groundPosition}`;
  const labelTexts = diagramLabels
    ? Object.fromEntries(diagramLabels.map((l) => [l.key, l.lines.join("|")]))
    : null;
  const labelSignature = labelTexts
    ? `${labelDiagramKey}:${JSON.stringify(labelTexts)}`
    : "";
  const [prevLabels, setPrevLabels] = useState({
    signature: labelSignature,
    diagramKey: labelDiagramKey,
    texts: labelTexts,
  });
  const [flashingLabels, setFlashingLabels] = useState([]);
  if (labelSignature !== prevLabels.signature) {
    const isSameDiagram =
      prevLabels.diagramKey === labelDiagramKey &&
      prevLabels.texts &&
      labelTexts;
    setFlashingLabels(
      isSameDiagram
        ? Object.keys(labelTexts).filter(
          (key) =>
            prevLabels.texts[key] !== undefined &&
            prevLabels.texts[key] !== labelTexts[key],
        )
        : [],
    );
    setPrevLabels({
      signature: labelSignature,
      diagramKey: labelDiagramKey,
      texts: labelTexts,
    });
  }

  // Clear flash state after animation duration so subsequent updates re-trigger cleanly
  useEffect(() => {
    if (flashingLabels.length > 0) {
      const timer = setTimeout(() => {
        setFlashingLabels([]);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [flashingLabels]);

  const diagramLayout = effectiveIsBaseplate
    ? DIAGRAM_LABEL_LAYOUT[
    `${taperPoleStandard.poleType}.${taperPoleStandard.groundPosition}`
    ]
    : DIAGRAM_LABEL_LAYOUT[`${taperPoleStandard.poleType}.embedment`];

  const showDiagram = !!currentImage;
  const isImageLoaded = currentImage ? loadedImages.has(currentImage) : false;

  const heightField = (
    <>
      <span className="block text-gray-600 text-xs md:text-sm font-medium mb-2">
        Select Height <span className="text-red-500 ml-1 font-semibold">*</span>
      </span>
      <FormSelect
        id="taperPoleStandard.height"
        value={taperPoleStandard.height}
        onChange={(val) => {
          const match = (currentHeightOptions[heightLookupKey] || []).find(
            (opt) => String(opt.id) === String(val),
          );
          onUpdate({
            height: val,
            poleStandardHeightId: match?.heightId || null,
          });
        }}
        options={(currentHeightOptions[heightLookupKey] || []).map((h) => ({
          value: h.id,
          label: h.label,
        }))}
        loading={poleStandardLoading}
        disabled={readOnly}
        hasError={!!errors.height}
        placeholder="Select Height"
      />
      <ErrorStyle show={errors.height} text={errors.height} />
    </>
  );

  return (
    <div className="bg-white px-4 md:px-6 pb-6 rounded-b-2xl hp:rounded-b-xl">
      {/* ── Section title ── */}
      <div className="mb-4">
        <SectionTitle>Pole Configuration</SectionTitle>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 hp:gap-3">
        {/* ── LEFT: Configuration Card ── */}
        <div
          id="taperPoleStandard.poleType"
          className={`border rounded-xl hp:rounded-lg bg-white shadow-sm overflow-hidden flex flex-col h-full ${errors.poleType || errors.installationPole || errors.groundPosition
            ? "border-red-300"
            : "border-slate-200"
            }`}
        >
          {/* Section 1: Pole Standard Type */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-xs md:text-sm font-medium text-slate-500">
              Select Pole Standard Type{" "}
              <span className="text-red-500 ml-1 font-semibold">*</span>
            </p>
          </div>

          <div className="p-4 pb-7 sm:pb-8 flex flex-col gap-2">
            {poleStandardLoading && poleStandardOptions.length === 0 ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-11 rounded-lg hp:rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse border border-slate-200/80 flex items-center justify-between px-4"
                  >
                    <div className="w-20 h-3.5 bg-slate-200/80 rounded" />
                    <div className="w-4 h-4 rounded-full bg-slate-200/80" />
                  </div>
                ))}
              </div>
            ) : !poleStandardLoading &&
              poleStandardError &&
              poleStandardOptions.length === 0 ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs sm:text-sm text-red-600">
                  Failed to load pole standard options.
                </p>
                <button
                  type="button"
                  onClick={refetchPoleStandard}
                  className="text-xs sm:text-sm font-medium text-red-600 underline hover:text-red-700 shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : (
              poleStandardOptions.map((option) => {
                const isActive = taperPoleStandard.poleType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      if (readOnly) return;
                      if (taperPoleStandard.poleType === option.id) return;
                      const nextGround =
                        effectiveInstallation === "embedment" ? "underGL" : "";
                      setBeGeometry(null);
                      onUpdate({
                        poleType: option.id,
                        groundPosition: nextGround,
                        height: "",
                        poleStandardHeightId: null,
                      });
                    }}
                    className={`w-full rounded-lg hp:rounded-md border px-4 py-2 lg:py-2.5 text-xs md:text-sm font-medium transition-all text-left
                  ${readOnly ? "cursor-default" : "cursor-pointer"}
                  ${isActive
                        ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                        : readOnly
                          ? "border-slate-100 text-slate-400 bg-slate-50/50"
                          : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
          {errors.poleType && (
            <div className="px-4 pb-4 -mt-4">
              <ErrorStyle show={errors.poleType} text={errors.poleType} />
            </div>
          )}

          {/* Section 2: Select Installation Pole */}
          <div className="px-4 py-3 border-y border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-xs md:text-sm font-medium text-slate-500">
              Select Installation Pole{" "}
              <span className="text-red-500 ml-1 font-semibold">*</span>
            </p>
          </div>

          <div
            id="taperPoleStandard.installationPole"
            className="p-4 pb-7 sm:pb-8 flex flex-col gap-2"
          >
            {[
              { id: "baseplate", label: "Baseplate" },
              { id: "embedment", label: "Embedment" },
            ].map((option) => {
              const isActive = effectiveInstallation === option.id;
              const isDisabled = !taperPoleStandard.poleType || readOnly;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectInstallation(option.id)}
                  className={`w-full rounded-lg hp:rounded-md border px-4 py-2 lg:py-2.5 text-xs md:text-sm font-medium transition-all text-left
                    ${readOnly || isDisabled ? "cursor-default" : "cursor-pointer"}
                    ${isDisabled
                      ? "bg-slate-100/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                      : isActive
                        ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
            {!taperPoleStandard.poleType && (
              <p className="text-[12px] md:text-[13px] text-slate-400 italic pt-0.5">
                Select a pole standard type first
              </p>
            )}
            {errors.installationPole && (
              <div className="pt-1">
                <ErrorStyle
                  show={errors.installationPole}
                  text={errors.installationPole}
                />
              </div>
            )}
          </div>

          {/* Section 3: Select Ground Position (Only visible when Baseplate is selected) */}
          {effectiveInstallation === "baseplate" && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-y border-slate-100 bg-slate-50 flex-shrink-0">
                <p className="text-xs md:text-sm font-medium text-slate-500">
                  Select Ground Position{" "}
                  <span className="text-red-500 ml-1 font-semibold">*</span>
                </p>
              </div>

              <div
                id="taperPoleStandard.groundPosition"
                className="p-4 pb-7 sm:pb-8 flex flex-col gap-2 transition-all duration-200"
              >
                {GROUND_POSITION_OPTIONS.map((option) => {
                  const isActive =
                    taperPoleStandard.groundPosition === option.id;
                  const isDisabled = !taperPoleStandard.poleType || readOnly;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        if (taperPoleStandard.groundPosition === option.id)
                          return;
                        setBeGeometry(null);
                        onUpdate({
                          groundPosition: option.id,
                          height: "",
                          poleStandardHeightId: null,
                        });
                      }}
                      className={`w-full rounded-lg hp:rounded-md border px-4 py-2 lg:py-2.5 text-xs md:text-sm font-medium transition-all text-left
                        ${readOnly || isDisabled ? "cursor-default" : "cursor-pointer"}
                        ${isDisabled
                          ? "bg-slate-100/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                          : isActive
                            ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {errors.groundPosition && (
                  <div className="pt-1">
                    <ErrorStyle
                      show={errors.groundPosition}
                      text={errors.groundPosition}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Diagram & Dimensions ── */}
        <div
          className="border rounded-xl hp:rounded-lg bg-white shadow-sm overflow-hidden flex flex-col border-slate-200 h-full"
        >
          {/* ── Diagram header ── */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0 min-h-[49px]">
            <p className="text-xs md:text-sm font-medium text-slate-600">
              Pole Diagram & Dimensions
            </p>

            {taperPoleStandard.poleType && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] md:text-sm font-medium px-2.5 py-1 rounded bg-blue-100 text-[#1d4ed8]">
                  Type: {taperPoleStandard.poleType}
                </span>
                {effectiveInstallation === "baseplate" && taperPoleStandard.groundPosition && (
                  <span className="text-[12px] md:text-sm font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {taperPoleStandard.groundPosition === "onGL" ? "On GL" : "Under GL"}
                  </span>
                )}
                {effectiveInstallation === "embedment" && (
                  <span className="text-[12px] md:text-sm font-medium px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Embedment
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Diagram area ──
              bg-white  → belum ada gambar
              bg-slate-50 → sudah ada gambar
              fixed height → SVG tinggi tidak merusak layout
          ── */}
          <div
            className={`
          relative flex items-center justify-center overflow-hidden
          transition-colors duration-300
          py-8 h-[520px] sm:h-[620px] md:h-[720px] lg:h-[820px] xl:h-[820px]
          ${showDiagram ? "bg-slate-50" : "bg-white"}
        `}
          >
            {/* Dimension texts are plain numbers (drawing convention), so
                state the unit once for the whole diagram. */}
            {showDiagram && isImageLoaded && diagramLabels?.length > 0 && (
              <span className="absolute bottom-3 right-4 text-xs md:text-sm font-medium text-slate-600 pointer-events-none">
                Unit: mm
              </span>
            )}
            {showDiagram ? (
              <div className="flex items-center justify-start xl:justify-center gap-4 w-full px-2 sm:px-3 xl:px-8 h-full">
                {/* Kiri: Height input — only as its own column for diagrams
                    without a mapped layout; mapped ones pin it to the
                    height dimension line inside the image wrapper below. */}
                {!diagramLayout && (
                  <div className="flex-shrink-0 w-[120px] sm:w-[150px] xl:w-[160px] -mr-2">
                    {heightField}
                  </div>
                )}

                {/* Kanan: Diagram image — gambar yang tentukan tinggi container.
                    Untuk diagram yang sudah punya layout, kolom ini yang punya
                    ukuran pasti (flex-1 + h-full) dan dijadikan size container
                    ([container-type:size]), supaya wrapper gambar di dalamnya
                    bisa dihitung murni dengan CSS pakai cqw / cqh. */}
                <div
                  className={`relative flex items-center h-full ${diagramLayout
                    ? "flex-1 min-w-0 justify-start xl:justify-center ml-[120px] sm:ml-[150px] xl:ml-[160px] [container-type:size]"
                    : "justify-center min-w-[80px] xl:flex-shrink-0"
                    }`}
                >
                  {/* Wrapper sized exactly to the rendered image, so the
                      %-positioned labels line up with the SVG's own
                      coordinates. For mapped diagrams the size is set by CSS
                      to the diagram's exact aspect ratio (its viewBox), as
                      large as fits in the stage; the image fills it edge to
                      edge, so there is no letterboxing that could shift the
                      % positions at any screen size. */}
                  <div
                    className={
                      diagramLayout
                        ? "relative"
                        : "relative flex max-w-full max-h-full"
                    }
                    style={
                      diagramLayout
                        ? {
                          width: `min(100cqw, calc(100cqh * ${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}))`,
                          aspectRatio: `${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}`,
                          flexShrink: 0,
                        }
                        : undefined
                    }
                  >
                    {!isImageLoaded && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <Loader2 className="w-8 h-8 animate-spin text-[#1d4ed8]" />
                          <span className="text-xs font-medium text-slate-400 tracking-wide select-none">
                            Loading schematic...
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Height select pinned against the overall-height
                        dimension line (its right edge 8px left of it),
                        vertically centred on it. The left margin on the
                        parent reserves room for it. */}
                    {diagramLayout && (
                      <div
                        style={{
                          left: `${(diagramLayout.heightLineX / diagramLayout.viewBox.width) * 100}%`,
                          // Shift the select left by its own width plus the gap, and centre it
                          // vertically on the dimension line. Kept inline (not Tailwind
                          // translate classes) so the per-layout gap can be applied.
                          transform: `translate(calc(-100% - ${diagramLayout.heightGap ?? DEFAULT_HEIGHT_GAP_PX
                            }px), -50%)`,
                        }}
                        className={`absolute z-10 w-[120px] sm:w-[150px] xl:w-[160px] ${!effectiveIsBaseplate && ["IS", "IA"].includes(taperPoleStandard.poleType) ? "top-[42%]" : "top-1/2"}`}
                      >
                        {heightField}
                      </div>
                    )}
                    <img
                      key={currentImage}
                      src={currentImage}
                      alt={`${taperPoleStandard.poleType} diagram`}
                      onLoad={() =>
                        setLoadedImages((prev) =>
                          new Set(prev).add(currentImage),
                        )
                      }
                      className={`${diagramLayout
                        ? "absolute inset-0 w-full h-full"
                        : "w-auto h-auto max-w-full max-h-full"
                        } object-contain transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    />

                    {/* Embedment Length input pinned against the bottom vertical line */}
                    {!effectiveIsBaseplate &&
                      diagramLayout &&
                      effectiveInstallation === "embedment" && (
                        <div
                          style={{
                            left: `${(diagramLayout.heightLineX / diagramLayout.viewBox.width) * 100}%`,
                            transform: `translate(calc(-100% - ${diagramLayout.heightGap ?? DEFAULT_HEIGHT_GAP_PX
                              }px), -50%)`,
                          }}
                          className={`absolute z-10 w-[120px] sm:w-[150px] xl:w-[160px] ${["IS", "IA"].includes(taperPoleStandard.poleType) ? "bottom-[5%]" : "bottom-[2%]"}`}
                        >
                          <span className="block text-gray-600 text-xs md:text-sm font-medium mb-2">
                            Embedment Length{" "}
                            <span className="text-red-500 ml-1 font-semibold">
                              *
                            </span>
                          </span>
                          <div className="relative">
                            <input
                              id="taperPoleStandard.embedmentLength"
                              type="number"
                              min="0"
                              value={taperPoleStandard.embedmentLength || ""}
                              onChange={(e) =>
                                onUpdate({ embedmentLength: e.target.value })
                              }
                              onWheel={(e) => e.target.blur()}
                              className={`w-full px-2 py-1.5 md:py-2 lg:py-2.5 border rounded-lg hp:rounded-md text-xs md:text-sm outline-none transition-all pr-8 md:pr-10 min-h-[34px] sm:min-h-[38px] lg:min-h-[42px] bg-white ${errors.embedmentLength
                                ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
                                : "border-gray-300 focus:border-[#1D4ED8]"
                                }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs md:text-sm pointer-events-none">
                              mm
                            </span>
                          </div>
                          <ErrorStyle
                            show={errors.embedmentLength}
                            text={errors.embedmentLength}
                          />
                        </div>
                      )}

                    {isImageLoaded &&
                      diagramLabels?.map((label) => {
                        const isFlashing = flashingLabels.includes(label.key);
                        return (
                          // Same size as the Height select's value text
                          // (FormSelect: text-xs md:text-sm) — keep in sync.
                          // Keyed by text too, so a changed value remounts and
                          // its flash animation replays on every change.
                          <div
                            key={`${label.key}:${label.lines.join("|")}`}
                            style={label.style}
                            className={`absolute pointer-events-none whitespace-nowrap text-xs md:text-sm [--label-lh:15px] md:[--label-lh:18px] leading-[var(--label-lh)] text-[#1d4ed8] ${label.isCentered ? "text-center" : ""
                              } ${isFlashing ? "z-20" : "z-10"}`}
                          >
                            <div
                              className={`transition-all duration-300 rounded-xs inline-block origin-center ${isFlashing
                                ? "animate-[spec-pop_0.85s_cubic-bezier(0.16,1,0.3,1)] font-semibold motion-reduce:animate-none"
                                : ""
                                }`}
                            >
                              {label.isLeader ? (
                                <>
                                  <div className="px-[3px]">{label.lines[0]}</div>
                                  {/* 1px gap where the SVG's leader line runs */}
                                  <div className="h-px" />
                                  <div className="px-[3px] pt-px">
                                    {label.lines[1]}
                                  </div>
                                </>
                              ) : (
                                label.lines.map((line) => (
                                  <div key={line}>{line}</div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-10">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl hp:rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                  <Box className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm md:text-base font-medium text-slate-500">
                  {!taperPoleStandard.poleType
                    ? "No pole standard selected"
                    : !effectiveInstallation
                      ? "No installation pole selected"
                      : "No ground position selected"}
                </p>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-[320px]">
                  {!taperPoleStandard.poleType
                    ? "Select a standard type to continue. Installation options and pole dimensions will become available."
                    : !effectiveInstallation
                      ? "Select an installation method (Baseplate or Embedment) to view the pole diagram."
                      : "Choose a ground position to view the pole diagram and fill in the height of structure."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer: Reset ── */}
      {!hideReset && !readOnly && (
        <div className="flex justify-between pt-5 border-t mt-6">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="flex justify-center items-center text-sm gap-2 px-5 py-2.5 sm:py-2.5 lg:py-2.5 md:px-6 bg-white text-red-500 border border-red-300 rounded-lg hp:rounded-md
            hover:bg-red-50 hover:text-red-600 transition-colors font-medium hp:text-xs"
          >
            <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
            Reset
          </button>
        </div>
      )}

      <ConfirmResetAllModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={() => {
          setBeGeometry(null);
          onUpdateCondition?.({ baseplateEnabled: false });
          onUpdate(EMPTY_POLE_STANDARD);
        }}
        title="Reset all inputs on this section?"
        description="This will clear all inputs entered in this section. This action cannot be undone."
      />

      <ConfirmSwitchInstallationModal
        open={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        onConfirm={() => applyInstallationSwitch("embedment")}
        title="Calculation Notice"
        description="Changing installation to Embedment will disable Baseplate calculation and require recalculating pole results. Do you want to continue?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
      />
    </div>
  );
}
