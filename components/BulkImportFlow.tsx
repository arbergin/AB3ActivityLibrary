"use client";

import { useMemo, useState } from "react";
import { createSupabaseActivity } from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";

type CsvActivityRow = {
  rowNumber: number;
  activityName: string;
  fieldLocation: string;
  gamePhase: string;
  category: string;
  positionsInvolved: string;
  numberOfPlayers: string;
  activityDetails: string;
  filePath: string;
};

type ValidatedActivityRow = CsvActivityRow & {
  file?: File;
  errors: string[];
};

const expectedHeaders = [
  "Activity Name",
  "Field Location",
  "Game Phase",
  "Category",
  "Positions Involved",
  "Number of Players",
  "Activity Details",
  "Path to file",
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
}

function parseCsvText(csvText: string) {
  const normalizedText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const nonEmptyLines = normalizedText
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (nonEmptyLines.length < 2) {
    throw new Error("CSV must include a header row and at least one activity.");
  }

  const headers = parseCsvLine(nonEmptyLines[0]).map((header) =>
    header.trim()
  );

  const headerErrors = expectedHeaders.filter(
    (expectedHeader, index) => headers[index] !== expectedHeader
  );

  if (headerErrors.length > 0 || headers.length !== expectedHeaders.length) {
    throw new Error(
      `CSV headers must be exactly: ${expectedHeaders.join(", ")}`
    );
  }

  return nonEmptyLines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);

    return {
      rowNumber: index + 2,
      activityName: values[0] || "",
      fieldLocation: values[1] || "",
      gamePhase: values[2] || "",
      category: values[3] || "",
      positionsInvolved: values[4] || "",
      numberOfPlayers: values[5] || "",
      activityDetails: values[6] || "",
      filePath: values[7] || "",
    };
  });
}

function getFileNameFromPath(filePath: string) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const parts = normalizedPath.split("/");
  return parts[parts.length - 1]?.trim().toLowerCase() || "";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("File could not be read."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("File could not be read."));
    };

    reader.readAsDataURL(file);
  });
}

function isValidNumberOfPlayers(value: string) {
  if (!value.trim()) return false;

  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0;
}

function validateRows(rows: CsvActivityRow[], selectedFiles: File[]) {
  const selectedFileMap = new Map<string, File>();

  selectedFiles.forEach((file) => {
    selectedFileMap.set(file.name.toLowerCase(), file);
  });

  return rows.map((row) => {
    const errors: string[] = [];

    if (!row.activityName.trim()) {
      errors.push("Activity Name is required.");
    }

    if (
      row.fieldLocation &&
      !fieldLocationOptions.includes(
        row.fieldLocation as (typeof fieldLocationOptions)[number]
      )
    ) {
      errors.push(
        `Field Location must be one of: ${fieldLocationOptions.join(", ")}.`
      );
    }

    if (
      row.gamePhase &&
      !gamePhaseOptions.includes(
        row.gamePhase as (typeof gamePhaseOptions)[number]
      )
    ) {
      errors.push(`Game Phase must be one of: ${gamePhaseOptions.join(", ")}.`);
    }

    if (
      row.category &&
      !categoryOptions.includes(row.category as (typeof categoryOptions)[number])
    ) {
      errors.push(`Category must be one of: ${categoryOptions.join(", ")}.`);
    }

    if (!isValidNumberOfPlayers(row.numberOfPlayers)) {
      errors.push("Number of Players must be a whole number greater than 0.");
    }

    if (!row.filePath.trim()) {
      errors.push("Path to file is required.");
    }

    const fileName = getFileNameFromPath(row.filePath);
    const matchingFile = selectedFileMap.get(fileName);

    if (!matchingFile) {
      errors.push(
        `No selected file matches "${fileName}". Select the matching PNG/PDF file.`
      );
    }

    if (
      matchingFile &&
      matchingFile.type !== "image/png" &&
      matchingFile.type !== "application/pdf"
    ) {
      errors.push("Matched file must be a PNG or PDF.");
    }

    return {
      ...row,
      file: matchingFile,
      errors,
    };
  });
}

export default function BulkImportFlow() {
  const [csvFile, setCsvFile] = useState<File | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parsedRows, setParsedRows] = useState<CsvActivityRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<ValidatedActivityRow[]>(
    []
  );

  const [validationMessage, setValidationMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successfulUploadCount, setSuccessfulUploadCount] = useState(0);

  const validRows = useMemo(
    () => validatedRows.filter((row) => row.errors.length === 0),
    [validatedRows]
  );

  const hasValidationErrors = validatedRows.some(
    (row) => row.errors.length > 0
  );

  async function handleValidate() {
    setValidationMessage("");
    setUploadMessage("");
    setValidatedRows([]);
    setParsedRows([]);
    setSuccessfulUploadCount(0);

    if (!csvFile) {
      setValidationMessage("Select a CSV file first.");
      return;
    }

    if (selectedFiles.length === 0) {
      setValidationMessage("Select the PNG/PDF activity files first.");
      return;
    }

    setIsValidating(true);

    try {
      const csvText = await csvFile.text();
      const rows = parseCsvText(csvText);
      const validationResults = validateRows(rows, selectedFiles);

      setParsedRows(rows);
      setValidatedRows(validationResults);

      const errorCount = validationResults.filter(
        (row) => row.errors.length > 0
      ).length;

      if (errorCount > 0) {
        setValidationMessage(
          `${errorCount} row${errorCount === 1 ? "" : "s"} need correction before upload.`
        );
        return;
      }

      setValidationMessage(
        `${validationResults.length} activities validated successfully.`
      );
    } catch (error) {
      console.error("CSV validation failed.", error);

      if (error instanceof Error) {
        setValidationMessage(error.message);
      } else {
        setValidationMessage("CSV validation failed.");
      }
    } finally {
      setIsValidating(false);
    }
  }

  async function handleUpload() {
    if (validRows.length === 0 || hasValidationErrors) {
      setUploadMessage("Validate the CSV successfully before uploading.");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");
    setSuccessfulUploadCount(0);

    try {
      for (let index = 0; index < validRows.length; index += 1) {
        const row = validRows[index];

        if (!row.file) {
          throw new Error(`Missing file for row ${row.rowNumber}.`);
        }

        const previewDataUrl = await fileToDataUrl(row.file);

        const activity: Activity = {
          id: crypto.randomUUID(),
          activityName: row.activityName.trim(),
          fieldLocation: row.fieldLocation as Activity["fieldLocation"],
          gamePhase: row.gamePhase as Activity["gamePhase"],
          category: row.category as Activity["category"],
          positionsInvolved: row.positionsInvolved.trim(),
          numberOfPlayers: Number(row.numberOfPlayers),
          activityDetails: row.activityDetails.trim(),
          createdBy: "Coach User",
          hidden: false,
          fileName: row.file.name,
          fileType: row.file.type,
          previewDataUrl,
        };

        await createSupabaseActivity(activity);

        const nextCount = index + 1;
        setSuccessfulUploadCount(nextCount);
        setUploadMessage(
          `${nextCount}/${validRows.length} activities successfully uploaded.`
        );
      }

      setUploadMessage(
        `${validRows.length}/${validRows.length} activities successfully uploaded.`
      );
    } catch (error) {
      console.error("Bulk upload failed.", error);
      setUploadMessage(
        `Upload stopped after ${successfulUploadCount}/${validRows.length} successful uploads.`
      );
    } finally {
      setIsUploading(false);
    }
  }

  const progressPercent =
    validRows.length === 0
      ? 0
      : Math.round((successfulUploadCount / validRows.length) * 100);

  return (
    <div className="grid gap-6">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Bulk Upload Files</h3>

        <p className="mt-2 text-sm text-slate-600">
          The CSV path column is used to match against the files you select.
          Browsers cannot open local paths directly, so you must select the
          activity files here too.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">CSV Metadata File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setCsvFile(event.target.files?.[0]);
                setValidatedRows([]);
                setValidationMessage("");
                setUploadMessage("");
                setSuccessfulUploadCount(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Activity Files</span>
            <input
              type="file"
              accept="image/png,application/pdf"
              multiple
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files || []));
                setValidatedRows([]);
                setValidationMessage("");
                setUploadMessage("");
                setSuccessfulUploadCount(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">
            CSV column order must be:
          </div>
          <div className="mt-2 break-words">
            Activity Name, Field Location, Game Phase, Category, Positions
            Involved, Number of Players, Activity Details, Path to file
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || isUploading}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isValidating ? "Validating..." : "Validate"}
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              isUploading || validatedRows.length === 0 || hasValidationErrors
            }
            className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {validationMessage && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {validationMessage}
          </div>
        )}

        {uploadMessage && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {uploadMessage}
          </div>
        )}

        {(isUploading || successfulUploadCount > 0) && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm font-semibold text-slate-700">
              <span>Upload Progress</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-[#0d2140] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {validatedRows.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Validation Results</h3>

          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[0.4fr_1.2fr_1fr_1fr_1fr] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 lg:grid">
              <div>Row</div>
              <div>Activity</div>
              <div>File</div>
              <div>Status</div>
              <div>Errors</div>
            </div>

            {validatedRows.map((row) => (
              <div
                key={`${row.rowNumber}-${row.activityName}`}
                className="border-t border-slate-200 px-4 py-4 text-sm first:border-t-0 lg:grid lg:grid-cols-[0.4fr_1.2fr_1fr_1fr_1fr] lg:items-start"
              >
                <div className="font-semibold text-slate-700">
                  Row {row.rowNumber}
                </div>

                <div className="mt-2 break-words text-slate-700 lg:mt-0">
                  {row.activityName || "—"}
                </div>

                <div className="mt-2 break-words text-slate-600 lg:mt-0">
                  {row.file?.name || getFileNameFromPath(row.filePath) || "—"}
                </div>

                <div className="mt-2 lg:mt-0">
                  {row.errors.length === 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Valid
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                      Error
                    </span>
                  )}
                </div>

                <div className="mt-2 text-slate-600 lg:mt-0">
                  {row.errors.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="list-disc pl-5">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}