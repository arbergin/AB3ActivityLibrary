import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { Activity } from "@/types/activity";

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

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
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

  return lines;
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
    page.drawText(line, {
      x,
      y: nextY,
      size: fontSize,
      font,
      color: rgb(0.1, 0.15, 0.22),
    });

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
    x: x + 12,
    y: y + height - 18,
    font: labelFont,
  });

  drawSectionValue({
    page,
    value,
    x: x + 12,
    y: y + height - 38,
    font: valueFont,
    maxWidth: width - 24,
    fontSize: 12,
    lineHeight: 15,
  });
}

async function addPngPage(pdfDocument: PDFDocument, activity: Activity) {
  if (!activity.previewDataUrl) {
    throw new Error("No file data available for this activity.");
  }

  const imageBytes = await fileSourceToArrayBuffer(activity.previewDataUrl);
  const image = await pdfDocument.embedPng(imageBytes);

  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const availableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const availableHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;

  const imageScale = Math.min(
    availableWidth / image.width,
    availableHeight / image.height
  );

  const imageWidth = image.width * imageScale;
  const imageHeight = image.height * imageScale;

  const x = (PAGE_WIDTH - imageWidth) / 2;
  const y = (PAGE_HEIGHT - imageHeight) / 2;

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
  const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const titleFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const labelFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const valueFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  page.drawText(activity.activityName || "Untitled Activity", {
    x: PAGE_MARGIN,
    y,
    size: 22,
    font: titleFont,
    color: rgb(0.05, 0.13, 0.25),
  });

  y -= 42;

  const columnGap = 12;
  const threeColumnWidth = (contentWidth - columnGap * 2) / 3;
  const threeColumnHeight = 74;

  drawMetadataBox({
    page,
    label: "Phase",
    value: activity.gamePhase || "—",
    x: PAGE_MARGIN,
    y: y - threeColumnHeight,
    width: threeColumnWidth,
    height: threeColumnHeight,
    labelFont,
    valueFont,
  });

  drawMetadataBox({
    page,
    label: "Category",
    value: activity.category || "—",
    x: PAGE_MARGIN + threeColumnWidth + columnGap,
    y: y - threeColumnHeight,
    width: threeColumnWidth,
    height: threeColumnHeight,
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
    y: y - threeColumnHeight,
    width: threeColumnWidth,
    height: threeColumnHeight,
    labelFont,
    valueFont,
  });

  y -= threeColumnHeight + 32;

  drawSectionLabel({
    page,
    label: "Details",
    x: PAGE_MARGIN,
    y,
    font: labelFont,
  });

  y -= 20;

  const detailsText = activity.activityDetails || "—";
  const detailsLines = wrapText(detailsText, valueFont, 12, contentWidth);
  const detailsLineHeight = 16;

  detailsLines.forEach((line) => {
    if (y < 120) {
      return;
    }

    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: valueFont,
      color: rgb(0.1, 0.15, 0.22),
    });

    y -= detailsLineHeight;
  });

  y -= 20;

  const twoColumnWidth = (contentWidth - columnGap) / 2;
  const twoColumnHeight = 64;

  drawMetadataBox({
    page,
    label: "Created By",
    value: activity.createdBy || "—",
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
    throw new Error("No imported file is available for this activity.");
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