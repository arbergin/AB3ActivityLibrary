"use client";

import { useState } from "react";
import ActivityMetadataForm from "@/components/ActivityMetadataForm";

export default function ImportFlow() {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileError("");
    setShowMetadataForm(false);

    if (!file) {
      setSelectedFileName("");
      return;
    }

    const isPng = file.type === "image/png";
    const isPdf = file.type === "application/pdf";

    if (!isPng && !isPdf) {
      setSelectedFileName("");
      setFileError("Only PNG and PDF files are accepted.");
      return;
    }

    setSelectedFileName(file.name);
  }

  function handleContinue() {
    if (!selectedFileName) {
      setFileError("Select a PNG or PDF file before continuing.");
      return;
    }

    setShowMetadataForm(true);
  }

  function handleCancel() {
    setSelectedFileName("");
    setFileError("");
    setShowMetadataForm(false);
  }

  return (
    <div className="grid gap-8">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Import Activity File</h2>

        <label className="mt-4 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:bg-slate-100">
          <p className="font-semibold text-slate-700">Drop PNG/PDF here</p>
          <p className="mt-1 text-sm text-slate-500">or click to browse</p>
          <p className="mt-4 text-xs text-slate-400">
            Accepted formats: .png, .pdf
          </p>

          <input
            type="file"
            accept=".png,.pdf,image/png,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {selectedFileName && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <span className="font-semibold">Selected file:</span>{" "}
            {selectedFileName}
          </div>
        )}

        {fileError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {fileError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </div>

      {showMetadataForm && (
        <div>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <span className="font-semibold">Creating activity from:</span>{" "}
            {selectedFileName}
          </div>

          <ActivityMetadataForm />
        </div>
      )}
    </div>
  );
}