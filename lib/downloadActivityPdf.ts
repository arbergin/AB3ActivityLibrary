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

function drawWrappedText({
  page,
  label,
  value,
  x,
  y,
  maxWidth,
  labelFont,
  valueFont,
}: {
  page: PDFPage;
  label: string;
  value: string;
  x: number;
  y: number;
  maxWidth: number;
  labelFont: PDFFont;
  valueFont: PDFFont;
}) {
  const labelSize = 11;
  const valueSize = 11;
  const lineHeight = 16;

  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: labelFont,
    color: rgb(0.05, 0.13, 0.25),
  });

  const valueLines = wrapText(value || "—", valueFont, valueSize, maxWidth);

  let nextY = y - lineHeight;

  valueLines.forEach((line) => {
    page.drawText(line, {
      x,
      y: nextY,
      size: valueSize,
      font: valueFont,
      color: rgb(0.2, 0.25, 0.33),
    });

    nextY -= lineHeight;
  });

  return nextY - 8;
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

  const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  page.drawText("Activity Metadata", {
    x: PAGE_MARGIN,
    y,
    size: 22,
    font: titleFont,
    color: rgb(0.05, 0.13, 0.25),
  });

  y -= 38;

  y = drawWrappedText({
    page,
    label: "Activity Name",
    value: activity.activityName,
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Field Location",
    value: activity.fieldLocation || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Game Phase",
    value: activity.gamePhase || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Category",
    value: activity.category || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Number of Players",
    value: activity.numberOfPlayers ? String(activity.numberOfPlayers) : "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Positions Involved",
    value: activity.positionsInvolved || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Created Date",
    value: formatDate(activity.createdAt),
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Last Updated",
    value: formatDate(activity.updatedAt),
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Created By",
    value: activity.createdBy || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  y = drawWrappedText({
    page,
    label: "Imported File",
    value: activity.fileName || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
    labelFont,
    valueFont,
  });

  drawWrappedText({
    page,
    label: "Activity Details",
    value: activity.activityDetails || "—",
    x: PAGE_MARGIN,
    y,
    maxWidth,
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