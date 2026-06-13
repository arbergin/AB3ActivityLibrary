"use client";

import { useRef, useState } from "react";
import ActivityMetadataForm from "@/components/ActivityMetadataForm";

const MAX_FILE_SIZE_MB = 3;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ImportFlow() {
  const metadataSectionRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  function resetSelectedFile() {
    setSelectedFile(null);
    setSelectedFileName("");
    setSelectedFileType("");
    setPreviewDataUrl("");
    setFileError("");
    setShowMetadataForm(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileError("");
    setShowMetadataForm(false);
    setPreviewDataUrl("");
    setSelectedFileType("");
    setSelectedFile(null);

    if (!file) {
      setSelectedFileName("");
      return;
    }

    const isPng = file.type === "image/png";
    const isPdf = file.type === "application/pdf";

    if (!isPng && !isPdf) {
      setSelectedFileName("");
      setFileError("Only PNG and PDF files are accepted.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFileName("");
      setFileError(
        `File is too large. Please select a PNG or PDF under ${MAX_FILE_SIZE_MB} MB.`
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileType(file.type);

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewDataUrl(reader.result);
      }
    };

    reader.onerror = () => {
      setSelectedFile(null);
      setSelectedFileName("");
      setSelectedFileType("");
      setPreviewDataUrl("");
      setFileError("The selected file could not be read. Please try again.");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }

  function handleContinue() {
    if (!selectedFile || !selectedFileName) {
      setFileError("Select a PNG or PDF file before continuing.");
      return;
    }

    if (!previewDataUrl) {
      setFileError("The selected file is still loading. Please try again.");
      return;
    }

    setShowMetadataForm(true);

    window.setTimeout(() => {
      metadataSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleCancel() {
    resetSelectedFile();
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
          <p className="mt-1 text-xs text-slate-400">
            Maximum file size: {MAX_FILE_SIZE_MB} MB
          </p>

          <input
            ref={fileInputRef}
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

        {previewDataUrl && selectedFileType === "image/png" && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">
              PNG Preview
            </div>

            <img
              src={previewDataUrl}
              alt="Selected activity preview"
              className="max-h-96 w-full rounded-lg border border-slate-200 object-contain"
            />
          </div>
        )}

        {previewDataUrl && selectedFileType === "application/pdf" && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">
              PDF Preview
            </div>

            <iframe
              src={previewDataUrl}
              title="Selected activity PDF preview"
              className="h-[520px] w-full rounded-lg border border-slate-200"
            />
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
            className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </div>

      {showMetadataForm && selectedFile && (
        <div ref={metadataSectionRef} className="scroll-mt-6">
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <span className="font-semibold">Creating activity from:</span>{" "}
            {selectedFileName}
          </div>

          <ActivityMetadataForm
            mode="import"
            selectedFileName={selectedFileName}
            selectedFileType={selectedFileType}
            previewDataUrl={previewDataUrl}
            onCancel={resetSelectedFile}
          />
        </div>
      )}
    </div>
  );
}