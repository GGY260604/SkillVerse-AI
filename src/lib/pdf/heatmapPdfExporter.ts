/**
 * HeatMap PDF Export Service
 * Programmatically render and format team heatmap competency data directly into an executive PDF report.
 *
 * Requirements:
 * - High-resolution canvas rendering: Draw vector cards, tables, and typography via HTML Canvas 2D.
 * - Dynamic pagination: Calculate page splits for large candidate rosters (up to 13 on page 1, 18 on subsequent pages).
 * - Multi-language layout: Adapt typography and localized label metrics for export documents.
 *
 * Workflow:
 * 1. Load brand assets and initialize jsPDF landscape document.
 * 2. Calculate aggregate team metrics (average match score, top candidate, and counts).
 * 3. Partition evaluated candidates into distinct pages based on visual density constraints.
 * 4. Render canvas layers for each page (header, KPI cards, competency grid, footer).
 * 5. Embed generated JPEG canvases into PDF pages and trigger client file download.
 */

import type { TeamSkillMatrixResponse, TeamMemberAnalysis } from "@/components/page-shared/HeatMapView";
import { getAvatarInitials } from "@/lib/avatar";

// --- Schema ---
export interface HeatMapExportLabels {
  reportTitle: string;
  targetBenchmark: string;
  industry: string;
  generatedAt: string;
  teamAverageScore: string;
  totalCandidates: string;
  totalCompetencies: string;
  rank: string;
  usersColumn: string;
  overallScore: string;
  mastered: string;
  bridgeableGap: string;
  criticalDeficit: string;
  legendTitle: string;
  topCandidateLabel: string;
  confidentialNotice: string;
}

export interface HeatMapExportPayload {
  matrixData: TeamSkillMatrixResponse;
  candidates: TeamMemberAnalysis[];
  competencies: Array<{ name: string; localizedName: string }>;
  locale: string;
  filename: string;
  labels: HeatMapExportLabels;
}

// Curated palette of enterprise colors for member avatar badges.
const AVATAR_PALETTE = [
  { bg: "#0f766e", text: "#ffffff" },
  { bg: "#2563eb", text: "#ffffff" },
  { bg: "#7c3aed", text: "#ffffff" },
  { bg: "#c026d3", text: "#ffffff" },
  { bg: "#d97706", text: "#ffffff" },
  { bg: "#059669", text: "#ffffff" },
  { bg: "#db2777", text: "#ffffff" },
  { bg: "#4f46e5", text: "#ffffff" },
];

// Determine a deterministic avatar background color based on name string hash.
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// Asynchronously load the platform logo icon image from the public directory.
async function loadPlatformLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/favicon.ico";
  });
}

// Draw a filled and stroked rounded rectangle onto a standard 2D canvas context.
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

// Truncate text with ellipsis if it exceeds the specified maximum pixel width.
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + "...").width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str ? str + "..." : "";
}

// Render a single high-definition landscape page canvas for the heatmap report.
function renderReportPage(
  payload: HeatMapExportPayload,
  pageIndex: number,
  totalPages: number,
  pageCandidates: TeamMemberAnalysis[],
  averageScore: string,
  topCandidate: TeamMemberAnalysis | undefined,
  logoImg: HTMLImageElement | null
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const canvasWidth = 2100;
  const canvasHeight = 1485;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const fontSans =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Noto Sans", sans-serif';

  // Fill pure white report canvas background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const marginX = 65;
  const contentWidth = canvasWidth - marginX * 2;
  let currentY = 50;

  const targetRoleTitle =
    payload.matrixData.targetRoleTitleLocalized?.[payload.locale] ||
    payload.matrixData.targetRoleTitle;

  const industryTitle =
    payload.matrixData.industryLocalized?.[payload.locale] ||
    payload.matrixData.industry;

  // --- Document Header ---
  if (pageIndex === 0) {
    // 1. SkillVerse Platform Logo Icon & Badge
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(marginX + 16, currentY + 12, 16, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, marginX, currentY - 4, 32, 32);
      ctx.restore();

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(marginX + 16, currentY + 12, 16, 0, Math.PI * 2);
      ctx.stroke();

      drawRoundRect(ctx, marginX + 44, currentY, 130, 24, 4, "#059669");
      ctx.font = `bold 11px ${fontSans}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("SKILLVERSE AI", marginX + 44 + 65, currentY + 16);

      ctx.font = `600 11px ${fontSans}`;
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";
      ctx.fillText("WORKFORCE INTELLIGENCE PLATFORM", marginX + 186, currentY + 16);
    } else {
      drawRoundRect(ctx, marginX, currentY, 130, 24, 4, "#059669");
      ctx.font = `bold 11px ${fontSans}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("SKILLVERSE AI", marginX + 65, currentY + 16);

      ctx.font = `600 11px ${fontSans}`;
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";
      ctx.fillText("WORKFORCE INTELLIGENCE PLATFORM", marginX + 142, currentY + 16);
    }

    // 2. Right Meta Timestamp Information
    ctx.font = `11px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    const dateStr = new Date().toLocaleString(
      payload.locale === "zh" ? "zh-CN" : payload.locale === "ms" ? "ms-MY" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
    ctx.fillText(`${payload.labels.generatedAt}: ${dateStr}`, canvasWidth - marginX, currentY + 16);

    currentY += 40;

    // 3. Main Report Title
    ctx.font = `900 28px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.fillText(payload.labels.reportTitle, marginX, currentY + 24);

    currentY += 34;

    // 4. Header Horizontal Border Divider
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(marginX, currentY);
    ctx.lineTo(canvasWidth - marginX, currentY);
    ctx.stroke();

    currentY += 22;

    // --- Prominent Benchmark Role and Industry Display (Free-flowing large text, no box) ---
    ctx.font = `bold 11px ${fontSans}`;
    ctx.fillStyle = "#059669";
    ctx.textAlign = "left";
    ctx.fillText(payload.labels.targetBenchmark.toUpperCase(), marginX, currentY + 12);

    ctx.font = `900 26px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(truncateText(ctx, targetRoleTitle, contentWidth - 400), marginX, currentY + 44);

    ctx.font = `600 13px ${fontSans}`;
    ctx.fillStyle = "#475569";
    const industryDisplayText = `${payload.labels.industry}: ${industryTitle}`;
    ctx.fillText(truncateText(ctx, industryDisplayText, contentWidth - 400), marginX, currentY + 68);

    currentY += 86;

    // --- Executive Metric Summary Cards (3 Cards Evenly Distributed) ---
    const cardGap = 18;
    const cardWidth = (contentWidth - cardGap * 2) / 3;
    const cardHeight = 82;

    // Card 1: Team Average Score
    const card1X = marginX;
    drawRoundRect(ctx, card1X, currentY, cardWidth, cardHeight, 8, "#f8fafc", "#e2e8f0");
    ctx.font = `bold 10px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.fillText(payload.labels.teamAverageScore.toUpperCase(), card1X + 18, currentY + 24);
    ctx.font = `900 24px ${fontSans}`;
    ctx.fillStyle = "#059669";
    ctx.fillText(`${averageScore}%`, card1X + 18, currentY + 54);
    ctx.font = `11px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    const avgSubtext =
      payload.locale === "zh"
        ? `共 ${payload.candidates.length} 位团队参评成员`
        : payload.locale === "ms"
        ? `Merentasi ${payload.candidates.length} ahli pasukan dinilai`
        : `Across ${payload.candidates.length} evaluated team members`;
    ctx.fillText(avgSubtext, card1X + 18, currentY + 71);

    // Card 2: Target Competencies Count
    const card2X = marginX + cardWidth + cardGap;
    drawRoundRect(ctx, card2X, currentY, cardWidth, cardHeight, 8, "#f8fafc", "#e2e8f0");
    ctx.font = `bold 10px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText(payload.labels.totalCompetencies.toUpperCase(), card2X + 18, currentY + 24);
    ctx.font = `900 24px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`${payload.competencies.length}`, card2X + 18, currentY + 54);
    ctx.font = `11px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    const compSubtext =
      payload.locale === "zh"
        ? "对标核心标准技能项"
        : payload.locale === "ms"
        ? "Kompetensi teras piawai dinilai"
        : "Standard core competencies";
    ctx.fillText(compSubtext, card2X + 18, currentY + 71);

    // Card 3: Top Ranked Candidate
    const card3X = marginX + (cardWidth + cardGap) * 2;
    drawRoundRect(ctx, card3X, currentY, cardWidth, cardHeight, 8, "#f8fafc", "#e2e8f0");
    ctx.font = `bold 10px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText(payload.labels.topCandidateLabel.toUpperCase(), card3X + 18, currentY + 24);
    ctx.font = `bold 16px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(truncateText(ctx, topCandidate?.name || "-", cardWidth - 36), card3X + 18, currentY + 50);
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = "#059669";
    const topMatchPct = Math.round(
      topCandidate?.matchPercentage || (topCandidate?.overallMatchScore || 0) * 100
    );
    const topMatchSubtext =
      topCandidate
        ? payload.locale === "zh"
          ? `${topMatchPct}% 综合匹配率`
          : payload.locale === "ms"
          ? `${topMatchPct}% Skor Padanan`
          : `${topMatchPct}% Match Score`
        : "-";
    ctx.fillText(topMatchSubtext, card3X + 18, currentY + 68);

    currentY += cardHeight + 18;

    // --- Legend Bar ---
    drawRoundRect(ctx, marginX, currentY, contentWidth, 36, 6, "#f8fafc", "#e2e8f0");
    ctx.font = `bold 11px ${fontSans}`;
    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.fillText(`${payload.labels.legendTitle}:`, marginX + 16, currentY + 22);

    let legendX = marginX + 110;
    // Legend 1: Mastered
    drawRoundRect(ctx, legendX, currentY + 11, 14, 14, 3, "#d1fae5", "#10b981");
    ctx.font = `600 11px ${fontSans}`;
    ctx.fillStyle = "#065f46";
    ctx.fillText(`${payload.labels.mastered} (≥ 70%)`, legendX + 22, currentY + 22);
    legendX += 170;

    // Legend 2: Bridgeable Gap
    drawRoundRect(ctx, legendX, currentY + 11, 14, 14, 3, "#fef3c7", "#f59e0b");
    ctx.font = `600 11px ${fontSans}`;
    ctx.fillStyle = "#92400e";
    ctx.fillText(`${payload.labels.bridgeableGap} (40% - 69%)`, legendX + 22, currentY + 22);
    legendX += 210;

    // Legend 3: Critical Deficit
    drawRoundRect(ctx, legendX, currentY + 11, 14, 14, 3, "#ffe4e6", "#f43f5e");
    ctx.font = `600 11px ${fontSans}`;
    ctx.fillStyle = "#9f1239";
    ctx.fillText(`${payload.labels.criticalDeficit} (< 40%)`, legendX + 22, currentY + 22);

    currentY += 50;
  } else {
    // Compact Header for Page 2 and subsequent pages
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(marginX + 14, currentY + 11, 14, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, marginX, currentY - 3, 28, 28);
      ctx.restore();

      drawRoundRect(ctx, marginX + 38, currentY, 120, 22, 4, "#059669");
      ctx.font = `bold 10px ${fontSans}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("SKILLVERSE AI", marginX + 38 + 60, currentY + 15);

      ctx.font = `bold 16px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.fillText(`${payload.labels.reportTitle} (Continued)`, marginX + 170, currentY + 16);
    } else {
      drawRoundRect(ctx, marginX, currentY, 130, 22, 4, "#059669");
      ctx.font = `bold 10px ${fontSans}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("SKILLVERSE AI", marginX + 65, currentY + 15);

      ctx.font = `bold 16px ${fontSans}`;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.fillText(`${payload.labels.reportTitle} (Continued)`, marginX + 145, currentY + 16);
    }

    ctx.font = `11px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText(`${payload.labels.targetBenchmark}: ${targetRoleTitle}`, canvasWidth - marginX, currentY + 16);

    currentY += 36;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, currentY);
    ctx.lineTo(canvasWidth - marginX, currentY);
    ctx.stroke();

    currentY += 20;
  }

  // --- HeatMap Matrix Table Layout ---
  const memberColWidth = 340;
  const overallColWidth = 110;
  const competenciesCount = Math.max(1, payload.competencies.length);
  const compColWidth = (contentWidth - memberColWidth - overallColWidth) / competenciesCount;
  const headerRowHeight = 44;
  const dataRowHeight = 56;

  // 1. Table Header Row
  drawRoundRect(ctx, marginX, currentY, contentWidth, headerRowHeight, 6, "#0f172a");

  ctx.font = `bold 11px ${fontSans}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(
    `${payload.labels.usersColumn.toUpperCase()} (${payload.candidates.length})`,
    marginX + 16,
    currentY + 26
  );

  ctx.textAlign = "center";
  ctx.fillText(payload.labels.overallScore.toUpperCase(), marginX + memberColWidth + overallColWidth / 2, currentY + 26);

  payload.competencies.forEach((comp, idx) => {
    const colX = marginX + memberColWidth + overallColWidth + idx * compColWidth;
    ctx.textAlign = "center";
    ctx.font = `bold 11px ${fontSans}`;
    ctx.fillStyle = "#ffffff";
    const titleText = truncateText(ctx, comp.localizedName, compColWidth - 12);
    ctx.fillText(titleText, colX + compColWidth / 2, currentY + 26);
  });

  currentY += headerRowHeight;

  // 2. Table Data Rows
  pageCandidates.forEach((cand, rowIdx) => {
    const rowY = currentY;
    const isEven = rowIdx % 2 === 0;

    // Row alternating background
    ctx.fillStyle = isEven ? "#ffffff" : "#f8fafc";
    ctx.fillRect(marginX, rowY, contentWidth, dataRowHeight);

    // Row bottom separator line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, rowY + dataRowHeight);
    ctx.lineTo(canvasWidth - marginX, rowY + dataRowHeight);
    ctx.stroke();

    // Member Identity Column: Avatar Circle + Name + Email
    const avatarRadius = 16;
    const avatarCenterX = marginX + 16 + avatarRadius;
    const avatarCenterY = rowY + dataRowHeight / 2;

    const avatarInitial = getAvatarInitials(cand.name || cand.email);
    const avatarColor = getAvatarColor(cand.name || cand.email || "User");

    // Draw user avatar circle with custom palette
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = avatarColor.bg;
    ctx.fill();

    // Draw initials inside avatar circle
    ctx.font = `bold 11px ${fontSans}`;
    ctx.fillStyle = avatarColor.text;
    ctx.textAlign = "center";
    ctx.fillText(avatarInitial, avatarCenterX, avatarCenterY + 4);

    const textStartX = marginX + 16 + avatarRadius * 2 + 12;
    const maxTextWidth = memberColWidth - (avatarRadius * 2 + 38);

    // Candidate Name
    ctx.font = `bold 13px ${fontSans}`;
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    const nameStr = truncateText(ctx, cand.name, maxTextWidth);
    ctx.fillText(nameStr, textStartX, rowY + 24);

    // Candidate Email
    ctx.font = `11px ${fontSans}`;
    ctx.fillStyle = "#64748b";
    const emailStr = truncateText(ctx, cand.email || "-", maxTextWidth);
    ctx.fillText(emailStr, textStartX, rowY + 43);

    // Vertical Divider
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(marginX + memberColWidth, rowY);
    ctx.lineTo(marginX + memberColWidth, rowY + dataRowHeight);
    ctx.stroke();

    // Overall Score Column (Σ %)
    const matchPct = Math.round(cand.matchPercentage || cand.overallMatchScore * 100);
    const scorePillBg = matchPct >= 70 ? "#d1fae5" : matchPct >= 40 ? "#fef3c7" : "#ffe4e6";
    const scorePillText = matchPct >= 70 ? "#065f46" : matchPct >= 40 ? "#92400e" : "#9f1239";
    const scorePillBorder = matchPct >= 70 ? "#10b981" : matchPct >= 40 ? "#f59e0b" : "#f43f5e";

    const scorePillWidth = 56;
    const scorePillHeight = 26;
    const scorePillX = marginX + memberColWidth + (overallColWidth - scorePillWidth) / 2;
    const scorePillY = rowY + (dataRowHeight - scorePillHeight) / 2;

    drawRoundRect(ctx, scorePillX, scorePillY, scorePillWidth, scorePillHeight, 6, scorePillBg, scorePillBorder, 1);
    ctx.font = `bold 12px ${fontSans}`;
    ctx.fillStyle = scorePillText;
    ctx.textAlign = "center";
    ctx.fillText(`${matchPct}%`, scorePillX + scorePillWidth / 2, scorePillY + 17);

    // Vertical Divider
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(marginX + memberColWidth + overallColWidth, rowY);
    ctx.lineTo(marginX + memberColWidth + overallColWidth, rowY + dataRowHeight);
    ctx.stroke();

    // Competency Tiles Columns
    payload.competencies.forEach((comp, colIdx) => {
      const colX = marginX + memberColWidth + overallColWidth + colIdx * compColWidth;
      const skillEval = cand.skillsStatus?.[comp.name] || cand.skillsStatus?.[comp.localizedName];
      const score = Math.round((skillEval?.score || 0) * 100);
      const status = skillEval?.status;

      let cellBg = "#f1f5f9";
      let cellBorder = "#e2e8f0";
      let textColor = "#64748b";
      let statusText = "-";

      if (skillEval) {
        if (status === "mastered" || score >= 70) {
          cellBg = "#ecfdf5";
          cellBorder = "#a7f3d0";
          textColor = "#065f46";
          statusText = payload.labels.mastered;
        } else if (status === "gap" || score >= 40) {
          cellBg = "#fffbeb";
          cellBorder = "#fde68a";
          textColor = "#92400e";
          statusText = payload.labels.bridgeableGap;
        } else {
          cellBg = "#fff1f2";
          cellBorder = "#fecdd3";
          textColor = "#9f1239";
          statusText = payload.labels.criticalDeficit;
        }
      }

      // Draw heat cell tile
      const cellMargin = 3;
      drawRoundRect(
        ctx,
        colX + cellMargin,
        rowY + cellMargin,
        compColWidth - cellMargin * 2,
        dataRowHeight - cellMargin * 2,
        4,
        cellBg,
        cellBorder,
        1
      );

      ctx.textAlign = "center";
      ctx.font = `bold 12px ${fontSans}`;
      ctx.fillStyle = textColor;
      ctx.fillText(`${score}%`, colX + compColWidth / 2, rowY + 24);

      ctx.font = `500 10px ${fontSans}`;
      ctx.fillStyle = textColor;
      const truncatedStatus = truncateText(ctx, statusText, compColWidth - 14);
      ctx.fillText(truncatedStatus, colX + compColWidth / 2, rowY + 41);
    });

    currentY += dataRowHeight;
  });

  // Table Outer Border Frame
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    marginX,
    currentY - headerRowHeight - dataRowHeight * pageCandidates.length,
    contentWidth,
    headerRowHeight + dataRowHeight * pageCandidates.length
  );

  // --- Document Footer ---
  const footerY = canvasHeight - 45;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, footerY);
  ctx.lineTo(canvasWidth - marginX, footerY);
  ctx.stroke();

  ctx.font = `10px ${fontSans}`;
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText(payload.labels.confidentialNotice, marginX, footerY + 22);

  ctx.textAlign = "right";
  ctx.fillText(`Page ${pageIndex + 1} of ${totalPages}`, canvasWidth - marginX, footerY + 22);

  return canvas;
}

// Generate an executive landscape PDF document directly from raw heatmap benchmark records.
export async function exportHeatmapToPdf(
  payload: HeatMapExportPayload,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    onProgress?.("generating");

    // ==========================================
    // Step 1: Load Brand Assets and Initialize PDF Document
    // ==========================================
    // Load platform logo asset asynchronously.
    const logoImg = await loadPlatformLogo();

    // Dynamically import jsPDF to maintain optimal bundle performance.
    const { jsPDF } = await import("jspdf");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 297;
    const pageHeight = 210;

    // ==========================================
    // Step 2: Calculate Aggregate Team Match Metrics
    // ==========================================
    // Calculate team average match score across all candidates.
    const totalCandidates = payload.candidates.length;
    const averageScore =
      totalCandidates > 0
        ? (
            payload.candidates.reduce(
              (sum, c) => sum + (c.matchPercentage || c.overallMatchScore * 100),
              0
            ) / totalCandidates
          ).toFixed(1)
        : "0.0";

    const topCandidate = payload.candidates[0];

    // ==========================================
    // Step 3: Partition Candidates Across Visual Density Limits
    // ==========================================
    // Partition candidates across pages (first page fits up to 13 candidates with executive cards).
    const firstPageLimit = 13;
    const subsequentPageLimit = 18;
    const pagesList: TeamMemberAnalysis[][] = [];

    if (totalCandidates <= firstPageLimit) {
      pagesList.push(payload.candidates);
    } else {
      pagesList.push(payload.candidates.slice(0, firstPageLimit));
      let offset = firstPageLimit;
      while (offset < totalCandidates) {
        pagesList.push(payload.candidates.slice(offset, offset + subsequentPageLimit));
        offset += subsequentPageLimit;
      }
    }

    const totalPages = pagesList.length;

    // ==========================================
    // Step 4: Render High-Resolution Canvas Pages and Embed in Document
    // ==========================================
    // Render and append each formatted page canvas to the PDF document.
    pagesList.forEach((pageCandidates, idx) => {
      const pageCanvas = renderReportPage(
        payload,
        idx,
        totalPages,
        pageCandidates,
        averageScore,
        topCandidate,
        logoImg
      );

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);

      if (idx > 0) {
        pdf.addPage("a4", "landscape");
      }

      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    });

    // ==========================================
    // Step 5: Save PDF File and Trigger Automatic Download
    // ==========================================
    // Save and trigger automatic download of the PDF file.
    pdf.save(payload.filename);
    onProgress?.("done");
    return true;
  } catch (err) {
    console.error("[HeatMap PDF Exporter] Programmatic PDF generation failed:", err);
    onProgress?.("error");
    return false;
  }
}
