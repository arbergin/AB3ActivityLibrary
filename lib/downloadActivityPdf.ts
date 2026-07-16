import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { Activity } from "@/types/activity";
import { getActivityCreatorFrames } from "@/lib/activityCreatorFrames";
import { getUserDisplayName } from "@/lib/userProfile";
import { parseActivityDetailsMarkdown } from "@/lib/activityDetailsMarkdown";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 54;

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


function formatActivityVisibility(value?: Activity["visibility"]) {
  if (value === "club") return "My Club";
  if (value === "everyone") return "Everyone";
  return "Private";
}

function dataUrlToArrayBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];

  if (!base64) {
    throw new Error("Invalid file data.");
  }

  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes.buffer;
}

async function fileSourceToArrayBuffer(fileSource: string) {
  if (fileSource.startsWith("data:")) {
    return dataUrlToArrayBuffer(fileSource);
  }

  const response = await fetch(fileSource);

  if (!response.ok) {
    throw new Error("The activity file could not be downloaded.");
  }

  return response.arrayBuffer();
}

function normalizeLineBreaks(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
) {
  const normalizedText = normalizeLineBreaks(text || "—");
  const paragraphs = normalizedText.split("\n");
  const lines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const trimmedParagraph = paragraph.trim();

    if (!trimmedParagraph) {
      lines.push("");
      return;
    }

    const words = trimmedParagraph.split(/[ \t]+/);
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    if (paragraphIndex < paragraphs.length - 1 && !trimmedParagraph) {
      return;
    }
  });

  return lines.length > 0 ? lines : ["—"];
}

function drawSectionLabel({
  page,
  label,
  x,
  y,
  font,
}: {
  page: PDFPage;
  label: string;
  x: number;
  y: number;
  font: PDFFont;
}) {
  page.drawText(label, {
    x,
    y,
    size: 10,
    font,
    color: rgb(0.36, 0.42, 0.5),
  });
}

function drawSectionValue({
  page,
  value,
  x,
  y,
  font,
  maxWidth,
  fontSize = 12,
  lineHeight = 16,
}: {
  page: PDFPage;
  value: string;
  x: number;
  y: number;
  font: PDFFont;
  maxWidth: number;
  fontSize?: number;
  lineHeight?: number;
}) {
  const lines = wrapText(value || "—", font, fontSize, maxWidth);

  let nextY = y;

  lines.forEach((line) => {
    if (line) {
      page.drawText(line, {
        x,
        y: nextY,
        size: fontSize,
        font,
        color: rgb(0.1, 0.15, 0.22),
      });
    }

    nextY -= lineHeight;
  });

  return nextY;
}

function drawMetadataBox({
  page,
  label,
  value,
  x,
  y,
  width,
  height,
  labelFont,
  valueFont,
}: {
  page: PDFPage;
  label: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelFont: PDFFont;
  valueFont: PDFFont;
}) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.86, 0.88, 0.91),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1),
  });

  drawSectionLabel({
    page,
    label,
    x: x + 10,
    y: y + height - 14,
    font: labelFont,
  });

  drawSectionValue({
    page,
    value,
    x: x + 10,
    y: y + height - 29,
    font: valueFont,
    maxWidth: width - 20,
    fontSize: 11,
    lineHeight: 12,
  });
}

async function addPngPage(pdfDocument: PDFDocument, activity: Activity) {
  if (!activity.previewDataUrl) {
    throw new Error("No file data available for this activity.");
  }

  const imageBytes = await fileSourceToArrayBuffer(activity.previewDataUrl);
  const image = await pdfDocument.embedPng(imageBytes);

  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  const title = activity.activityName || "Untitled Activity";
  const titleX = PAGE_MARGIN;
  const titleY = PAGE_HEIGHT - PAGE_MARGIN;
  const titleSize = 16;

  page.drawText(title, {
    x: titleX,
    y: titleY,
    size: titleSize,
    font: titleFont,
    color: rgb(0.05, 0.13, 0.25),
  });

  const imageTopY = titleY - 24;
  const availableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const availableHeight = imageTopY - PAGE_MARGIN;

  const imageScale = Math.min(
    availableWidth / image.width,
    availableHeight / image.height
  );

  const imageWidth = image.width * imageScale;
  const imageHeight = image.height * imageScale;

  const x = (PAGE_WIDTH - imageWidth) / 2;
  const y = PAGE_MARGIN + (availableHeight - imageHeight) / 2;

  page.drawImage(image, {
    x,
    y,
    width: imageWidth,
    height: imageHeight,
  });
}

async function addOriginalPdfPages(pdfDocument: PDFDocument, activity: Activity) {
  if (!activity.previewDataUrl) {
    throw new Error("No file data available for this activity.");
  }

  const sourcePdfBytes = await fileSourceToArrayBuffer(activity.previewDataUrl);
  const sourcePdf = await PDFDocument.load(sourcePdfBytes);

  const copiedPages = await pdfDocument.copyPages(
    sourcePdf,
    sourcePdf.getPageIndices()
  );

  copiedPages.forEach((page) => {
    pdfDocument.addPage(page);
  });
}

async function addMetadataPage(pdfDocument: PDFDocument, activity: Activity) {
  const creatorDisplayName = await getUserDisplayName(activity.createdBy);
  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const titleFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const labelFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const valueFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldValueFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const italicValueFont = await pdfDocument.embedFont(StandardFonts.HelveticaOblique);

  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  page.drawText(activity.activityName || "Untitled Activity", {
    x: PAGE_MARGIN,
    y,
    size: 22,
    font: titleFont,
    color: rgb(0.05, 0.13, 0.25),
  });

  y -= 34;

  const columnGap = 12;
  const rowGap = 10;
  const threeColumnWidth = (contentWidth - columnGap * 2) / 3;
  const compactBoxHeight = 44;

  drawMetadataBox({
    page,
    label: "Field Location",
    value: activity.fieldLocation || "—",
    x: PAGE_MARGIN,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Game Phase",
    value: activity.gamePhase || "—",
    x: PAGE_MARGIN + threeColumnWidth + columnGap,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Category",
    value: activity.category || "—",
    x: PAGE_MARGIN + threeColumnWidth * 2 + columnGap * 2,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  y -= compactBoxHeight + rowGap;

  const twoColumnWidth = (contentWidth - columnGap) / 2;
  const twoColumnHeight = compactBoxHeight;

  drawMetadataBox({
    page,
    label: "Positions Involved",
    value: activity.positionsInvolved || "—",
    x: PAGE_MARGIN,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Activity Visibility",
    value: formatActivityVisibility(activity.visibility),
    x: PAGE_MARGIN + threeColumnWidth + columnGap,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Number of Players",
    value:
      activity.numberOfPlayers === ""
        ? "—"
        : String(activity.numberOfPlayers),
    x: PAGE_MARGIN + threeColumnWidth * 2 + columnGap * 2,
    y: y - compactBoxHeight,
    width: threeColumnWidth,
    height: compactBoxHeight,
    labelFont,
    valueFont,
  });

  y -= compactBoxHeight + 18;

  const creatorFrames = getActivityCreatorFrames(activity.creatorState);
  if (activity.creatorState && creatorFrames.length > 0) {
    drawSectionLabel({
      page,
      label: "Activity Tabs",
      x: PAGE_MARGIN,
      y,
      font: labelFont,
    });

    y -= 18;
    y = drawSectionValue({
      page,
      value: creatorFrames.map((frame, index) => `${index + 1}. ${frame.name}`).join(" • "),
      x: PAGE_MARGIN,
      y,
      font: valueFont,
      maxWidth: contentWidth,
      fontSize: 11,
      lineHeight: 14,
    });
    y -= 10;
  }

  drawSectionLabel({
    page,
    label: "Activity Details",
    x: PAGE_MARGIN,
    y,
    font: labelFont,
  });

  y -= 20;

  const detailsBlocks = parseActivityDetailsMarkdown(activity.activityDetails || "—");
  const detailsFontSize = 12;
  const detailsLineHeight = 16;

  for (const block of detailsBlocks) {
    if (y < 120) break;
    if (block.type === "blank") { y -= detailsLineHeight / 2; continue; }
    const bulletIndent = block.type === "bullet" ? 14 : 0;
    if (block.type === "bullet") {
      page.drawText("•", { x: PAGE_MARGIN, y, size: detailsFontSize, font: valueFont, color: rgb(0.1, 0.15, 0.22) });
    }
    let currentX = PAGE_MARGIN + bulletIndent;
    for (const run of block.runs) {
      const runFont = run.bold ? boldValueFont : run.italic ? italicValueFont : valueFont;
      for (const word of run.text.split(/(\s+)/)) {
        const wordWidth = runFont.widthOfTextAtSize(word, detailsFontSize);
        if (currentX + wordWidth > PAGE_MARGIN + contentWidth && currentX > PAGE_MARGIN + bulletIndent) {
          y -= detailsLineHeight; currentX = PAGE_MARGIN + bulletIndent; if (y < 120) break;
        }
        if (word && y >= 120) {
          page.drawText(word, { x: currentX, y, size: detailsFontSize, font: runFont, color: rgb(0.1, 0.15, 0.22) });
          if (run.underline && word.trim()) {
            page.drawLine({ start: { x: currentX, y: y - 1.5 }, end: { x: currentX + wordWidth, y: y - 1.5 }, thickness: 0.7, color: rgb(0.1, 0.15, 0.22) });
          }
        }
        currentX += wordWidth;
      }
    }
    y -= detailsLineHeight;
  }

  y -= 14;

  drawMetadataBox({
    page,
    label: "Created By",
    value: creatorDisplayName,
    x: PAGE_MARGIN,
    y: y - twoColumnHeight,
    width: twoColumnWidth,
    height: twoColumnHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Last Updated",
    value: formatDate(activity.updatedAt),
    x: PAGE_MARGIN + twoColumnWidth + columnGap,
    y: y - twoColumnHeight,
    width: twoColumnWidth,
    height: twoColumnHeight,
    labelFont,
    valueFont,
  });
}

export async function downloadActivityAsPdf(activity: Activity) {
  if (!activity.previewDataUrl) {
    throw new Error("No activity preview is available for this activity.");
  }

  const pdfDocument = await PDFDocument.create();

  if (activity.fileType === "application/pdf") {
    await addOriginalPdfPages(pdfDocument, activity);
  } else if (activity.fileType === "image/png") {
    await addPngPage(pdfDocument, activity);
  } else {
    throw new Error("Only PNG and PDF activities can be exported.");
  }

  await addMetadataPage(pdfDocument, activity);

  const pdfBytes = await pdfDocument.save();
  const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
    type: "application/pdf",
  });

  const pdfUrl = window.URL.createObjectURL(pdfBlob);

  const fileNameBase = sanitizeFileName(activity.activityName || "activity");
  const downloadLink = document.createElement("a");

  downloadLink.href = pdfUrl;
  downloadLink.download = `${fileNameBase || "activity"}_with_metadata.pdf`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  window.URL.revokeObjectURL(pdfUrl);
}