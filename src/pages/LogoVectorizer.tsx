import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import { vectorizeService } from "../services/vectorizeService";
import { sanitizeFilename } from "../utils/invoiceUtils";
import type { VectorizeResult } from "../types";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp";

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getBaseName(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  const rawName = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  return sanitizeFilename(rawName) || "logo";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: mime }), filename);
}

function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}

const LogoVectorizer: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VectorizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorPrecision, setColorPrecision] = useState(8);
  const [filterSpeckle, setFilterSpeckle] = useState(0);
  const [cornerThreshold, setCornerThreshold] = useState(110);
  const [paletteColors, setPaletteColors] = useState(4);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const resetPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const handleFile = (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase();
    const hasValidType =
      ACCEPTED_TYPES.includes(selectedFile.type) ||
      [".png", ".jpg", ".jpeg", ".webp"].some((suffix) => ext.endsWith(suffix));

    if (!hasValidType) {
      setError("Please upload a PNG, JPEG, or WebP image.");
      return;
    }

    resetPreviewUrl();
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    previewUrlRef.current = nextPreviewUrl;

    setFile(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    setResult(null);
    setError(null);
    setSuccess(null);
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      handleFile(event.target.files[0]);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (event.dataTransfer.files?.[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    resetPreviewUrl();
    setFile(null);
    setResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVectorize = async () => {
    if (!file) return;

    setIsVectorizing(true);
    setError(null);
    setSuccess(null);

    try {
      const vectorized = await vectorizeService.vectorize(file, {
        colorPrecision,
        filterSpeckle,
        cornerThreshold,
        paletteColors,
      });
      setResult(vectorized);
      setSuccess("Image vectorized successfully. You can download SVG, PNG, or JPG.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        "Failed to vectorize image.";
      setError(message);
    } finally {
      setIsVectorizing(false);
    }
  };

  const baseName = file ? getBaseName(file.name) : "logo";

  const handleDownloadSvg = () => {
    if (!result) return;
    downloadSvg(result.svg, `${baseName}-vectorized.svg`);
  };

  const handleDownloadPng = () => {
    if (!result) return;
    downloadBase64(result.pngBase64, `${baseName}-vectorized.png`, "image/png");
  };

  const handleDownloadJpg = () => {
    if (!result) return;
    downloadBase64(result.jpgBase64, `${baseName}-vectorized.jpg`, "image/jpeg");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logo Vectorizer</h1>
        <p className="mt-1 text-sm text-gray-600">
          Convert raster logos into vector SVG, then download as SVG, transparent PNG, or JPG with a white background.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary-600" />
            Vectorize Logo
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload a flat logo image for best results. JPEG uploads are cleaned and posterized before tracing.
          </p>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

        {!file ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
              ${isDragOver ? "border-primary-500 bg-primary-50 scale-[1.01]" : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"}
            `}
          >
            <PhotoIcon className={`h-16 w-16 mx-auto mb-4 ${isDragOver ? "text-primary-500" : "text-gray-400"}`} />
            <p className="text-lg font-medium text-gray-700 mb-1">
              {isDragOver ? "Drop your image here" : "Drag & drop your logo here"}
            </p>
            <p className="text-sm text-gray-500 mb-4">PNG, JPEG, or WebP up to 10 MB</p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer">
              <ArrowUpTrayIcon className="h-4 w-4" />
              Choose Image
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={onFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center gap-3">
                <PhotoIcon className="h-8 w-8 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
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

            <div className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <span>Advanced settings</span>
                {settingsOpen ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {settingsOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color precision: {colorPrecision}
                    </label>
                    <input
                      type="range"
                      min={4}
                      max={8}
                      value={colorPrecision}
                      onChange={(event) => setColorPrecision(Number(event.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher values preserve more colors and finer detail. 8 is best for logos.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speckle filter: {filterSpeckle}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={filterSpeckle}
                      onChange={(event) => setFilterSpeckle(Number(event.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Removes tiny artifacts. Keep at 0 for logos unless the source image is very noisy.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Palette colors: {paletteColors}
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={8}
                      value={paletteColors}
                      onChange={(event) => setPaletteColors(Number(event.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Reduces the image to flat colors before tracing. Use 4 for logos with black, one green, and gray text.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corner threshold: {cornerThreshold}
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={140}
                      value={cornerThreshold}
                      onChange={(event) => setCornerThreshold(Number(event.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher values produce smoother curves. 110 is the default for clean logo arcs.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleVectorize}
              disabled={isVectorizing}
              className={`
                w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer
                ${isVectorizing ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isVectorizing ? "Vectorizing..." : "Vectorize"}
            </button>

            {(previewUrl || result) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Original</h3>
                  <div className="flex items-center justify-center min-h-[220px] bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] rounded-md p-4">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Original upload preview"
                        className="max-h-64 max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Vectorized</h3>
                  <div className="flex items-center justify-center min-h-[220px] bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] rounded-md p-4">
                    {result ? (
                      <img
                        src={`data:image/png;base64,${result.pngBase64}`}
                        alt="Vectorized preview"
                        className="max-h-64 max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-500">Vector preview will appear here after processing.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadSvg}
                disabled={!result}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 cursor-pointer ${!result ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download SVG
              </button>
              <button
                onClick={handleDownloadPng}
                disabled={!result}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer ${!result ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download PNG
              </button>
              <button
                onClick={handleDownloadJpg}
                disabled={!result}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer ${!result ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download JPG
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoVectorizer;
