import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon, ScissorsIcon } from "@heroicons/react/24/outline";
import { parsePageRanges, splitPdfByRanges } from "../../utils/pdfDivider";
import SuccessBanner from "../SuccessBanner";
import ErrorBanner from "../ErrorBanner";

const PDFDivider: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangesInput, setRangesInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
      setFile(selectedFile);
      setPageCount(pdfDoc.getPageCount());
      setError(null);
      setSuccess(null);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Failed to load PDF. It might be corrupted or encrypted.");
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = () => {
    setFile(null);
    setPageCount(null);
    setRangesInput("");
    setError(null);
    setSuccess(null);
  };

  const splitAndDownload = async () => {
    if (!file || !pageCount) return;

    setIsSplitting(true);
    setError(null);
    setSuccess(null);

    try {
      const ranges = parsePageRanges(rangesInput, pageCount);
      const results = await splitPdfByRanges(file, ranges);

      for (const result of results) {
        const blob = new Blob([result.bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }

      setSuccess(`Successfully generated ${results.length} PDF(s).`);
    } catch (err: any) {
      setError(err.message || "An error occurred while splitting the PDF.");
    } finally {
      setIsSplitting(false);
    }
  };

  const fillIndividualPages = () => {
    if (!pageCount) return;
    const ranges = Array.from({ length: pageCount }, (_, i) => i + 1).join(", ");
    setRangesInput(ranges);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ScissorsIcon className="h-5 w-5 text-primary-600" />
          PDF Divider
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Split a PDF into multiple files by specifying page ranges. No quality loss.
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {!file ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
            ${isDragOver ? "border-primary-500 bg-primary-50 scale-[1.01]" : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"}
          `}
        >
          <DocumentTextIcon className={`h-16 w-16 mx-auto mb-4 ${isDragOver ? "text-primary-500" : "text-gray-400"}`} />
          <p className="text-lg font-medium text-gray-700 mb-1">
            {isDragOver ? "Drop your PDF here" : "Drag & drop your PDF file here"}
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer">
            <ArrowUpTrayIcon className="h-4 w-4" />
            Choose PDF
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={onFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-8 w-8 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)} • {pageCount} pages
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Remove file"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Ranges
              </label>
              <input
                type="text"
                value={rangesInput}
                onChange={(e) => setRangesInput(e.target.value)}
                placeholder="e.g. 1-3, 5, 7-9"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter comma-separated ranges or single pages. Example: <code>1-3, 5, 7-9</code>.
                <br />
                <span className="text-orange-600 font-medium">Note:</span> Your browser may ask for permission to download multiple files.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fillIndividualPages}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
              >
                Split each page into its own PDF
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={splitAndDownload}
                disabled={isSplitting || !rangesInput.trim()}
                className={`
                  w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer
                  ${(isSplitting || !rangesInput.trim()) ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {isSplitting ? "Processing..." : "Split & Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFDivider;
