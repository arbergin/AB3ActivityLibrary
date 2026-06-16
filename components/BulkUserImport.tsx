"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BulkUserRow = {
  rowNumber: number;
  name: string;
  email: string;
  password: string;
  mustChangePassword: boolean;
};

type BulkImportResult = {
  rowNumber: number;
  name?: string;
  email?: string;
  status: "created" | "skipped" | "error";
  message: string;
};

type BulkImportResponse = {
  summary?: {
    total: number;
    created: number;
    skipped: number;
    errors: number;
  };
  results?: BulkImportResult[];
  error?: string;
};

type BulkUserImportProps = {
  onImportComplete?: () => Promise<void> | void;
};

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseBoolean(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (["true", "yes", "y", "1", "required", "require"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "no", "n", "0", "complete", "completed", ""].includes(normalizedValue)) {
    return false;
  }

  throw new Error(
    `Password change flag "${value}" is not valid. Use true/false, yes/no, or 1/0.`
  );
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isInsideQuotes && nextCharacter === '"') {
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

  if (isInsideQuotes) {
    throw new Error("CSV has an opening quote without a matching closing quote.");
  }

  values.push(currentValue.trim());

  return values;
}

function parseCsv(csvText: string) {
  const normalizedText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one user row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const nameIndex = headers.findIndex((header) => header === "name");
  const emailIndex = headers.findIndex((header) => header === "email");
  const passwordIndex = headers.findIndex((header) => header === "password");
  const mustChangePasswordIndex = headers.findIndex((header) =>
    [
      "flagtorequirepasswordchangeatnextsignon",
      "requirepasswordchange",
      "requirepasswordchangeatnextsignon",
      "mustchangepassword",
      "mustchangepasswordatnextsignon",
      "passwordchange",
    ].includes(header)
  );

  if (nameIndex === -1 || emailIndex === -1 || passwordIndex === -1) {
    throw new Error("CSV headers must include Name, Email, and Password.");
  }

  if (mustChangePasswordIndex === -1) {
    throw new Error(
      "CSV headers must include a password change flag, such as Require Password Change."
    );
  }

  return lines.slice(1).map((line, rowIndex) => {
    const columns = parseCsvLine(line);
    const rowNumber = rowIndex + 2;
    const name = columns[nameIndex]?.trim() || "";
    const email = columns[emailIndex]?.trim().toLowerCase() || "";
    const password = columns[passwordIndex] || "";
    const mustChangePassword = parseBoolean(
      columns[mustChangePasswordIndex] || ""
    );

    return {
      rowNumber,
      name,
      email,
      password,
      mustChangePassword,
    };
  });
}

export default function BulkUserImport({
  onImportComplete,
}: BulkUserImportProps) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [pendingUsers, setPendingUsers] = useState<BulkUserRow[]>([]);
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const seenEmails = new Set<string>();

    pendingUsers.forEach((user) => {
      if (!user.name) {
        errors.push(`Row ${user.rowNumber}: Name is required.`);
      }

      if (!user.email) {
        errors.push(`Row ${user.rowNumber}: Email is required.`);
      }

      if (user.email && seenEmails.has(user.email)) {
        errors.push(`Row ${user.rowNumber}: Email is duplicated in this CSV.`);
      }

      if (user.email) {
        seenEmails.add(user.email);
      }

      if (!user.password) {
        errors.push(`Row ${user.rowNumber}: Password is required.`);
      }

      if (user.password && user.password.length < 6) {
        errors.push(`Row ${user.rowNumber}: Password must be at least 6 characters.`);
      }
    });

    return errors;
  }, [pendingUsers]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setPendingUsers([]);
    setResults([]);
    setMessage("");

    if (!file) {
      setSelectedFileName("");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFileName("");
      setMessage("Select a .csv file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const parsedUsers = parseCsv(text);

      setSelectedFileName(file.name);
      setPendingUsers(parsedUsers);
      setMessage(`${parsedUsers.length} user row${parsedUsers.length === 1 ? "" : "s"} loaded.`);
    } catch (error) {
      console.error("Unable to parse bulk user CSV.", error);
      setSelectedFileName("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to parse the selected CSV file."
      );
      event.target.value = "";
    }
  }

  function handleClear() {
    setSelectedFileName("");
    setPendingUsers([]);
    setResults([]);
    setMessage("");
  }

  async function handleImport() {
    if (isImporting) {
      return;
    }

    if (pendingUsers.length === 0) {
      setMessage("Select a CSV file first.");
      return;
    }

    if (validationErrors.length > 0) {
      setMessage("Fix the CSV validation errors before importing.");
      return;
    }

    setIsImporting(true);
    setResults([]);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setMessage("You must be logged in as an admin to bulk import users.");
        return;
      }

      const response = await fetch("/api/admin/bulk-create-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          users: pendingUsers.map((user) => ({
            name: user.name,
            email: user.email,
            password: user.password,
            mustChangePassword: user.mustChangePassword,
          })),
        }),
      });

      const result = (await response.json()) as BulkImportResponse;

      if (!response.ok) {
        setMessage(result.error || "Bulk import failed.");
        return;
      }

      setResults(result.results || []);

      if (result.summary) {
        setMessage(
          `Bulk import complete. Created: ${result.summary.created}. Skipped: ${result.summary.skipped}. Errors: ${result.summary.errors}.`
        );
      } else {
        setMessage("Bulk import complete.");
      }

      await onImportComplete?.();
    } catch (error) {
      console.error("Unable to bulk import users.", error);
      setMessage("Unexpected error while bulk importing users.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="font-bold">Bulk Import Users</h4>
          <p className="mt-1 text-sm text-slate-600">
            Upload a CSV with columns: Name, Email, Password, Require Password
            Change.
          </p>
        </div>

        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            "Name,Email,Password,Require Password Change\nCoach Name,coach@example.com,TempPass123!,true\n"
          )}`}
          download="bulk-user-import-template.csv"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Download Template
        </a>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <label className="grid gap-1">
          <span className="text-sm font-semibold">CSV File</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={isImporting}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={
              isImporting ||
              pendingUsers.length === 0 ||
              validationErrors.length > 0
            }
            className="w-full rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? "Importing..." : "Import Users"}
          </button>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={isImporting}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </div>

      {selectedFileName && (
        <div className="mt-3 text-sm text-slate-600">
          Selected: <span className="font-semibold">{selectedFileName}</span>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-bold">CSV validation errors</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationErrors.slice(0, 10).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>

          {validationErrors.length > 10 && (
            <div className="mt-2">
              Showing first 10 of {validationErrors.length} errors.
            </div>
          )}
        </div>
      )}

      {pendingUsers.length > 0 && validationErrors.length === 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1.2fr_0.7fr] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>Name</div>
            <div>Email</div>
            <div>Password Reset</div>
          </div>

          {pendingUsers.slice(0, 5).map((user) => (
            <div
              key={`${user.rowNumber}-${user.email}`}
              className="grid grid-cols-[1fr_1.2fr_0.7fr] border-t border-slate-200 px-4 py-3 text-sm"
            >
              <div>{user.name}</div>
              <div className="break-words">{user.email}</div>
              <div>{user.mustChangePassword ? "Required" : "Complete"}</div>
            </div>
          ))}

          {pendingUsers.length > 5 && (
            <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
              Showing first 5 of {pendingUsers.length} users.
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[0.4fr_1.2fr_0.7fr_1.5fr] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>Row</div>
            <div>Email</div>
            <div>Status</div>
            <div>Message</div>
          </div>

          {results.map((result) => (
            <div
              key={`${result.rowNumber}-${result.email}-${result.status}`}
              className="grid grid-cols-[0.4fr_1.2fr_0.7fr_1.5fr] border-t border-slate-200 px-4 py-3 text-sm"
            >
              <div>{result.rowNumber}</div>
              <div className="break-words">{result.email || "—"}</div>
              <div>
                <span
                  className={
                    result.status === "created"
                      ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700"
                      : result.status === "skipped"
                        ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700"
                        : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700"
                  }
                >
                  {result.status}
                </span>
              </div>
              <div>{result.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
