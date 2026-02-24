import React, { useRef, useState, useEffect, useCallback } from "react";
import { marked } from "marked";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  SwatchIcon,
  CloudArrowUpIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { strideDocService } from "../services/strideDocService";
import type { StrideDocument } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

interface ColorSettings {
  h1: string;
  h2: string;
  h3: string;
  body: string;
  link: string;
  codeBg: string;
  codeText: string;
}

interface ColorPalette {
  name: string;
  colors: ColorSettings;
}

const COLOR_PALETTES: ColorPalette[] = [
  {
    name: "Professional",
    colors: { h1: "#1a1a2e", h2: "#16213e", h3: "#0f3460", body: "#333333", link: "#e94560", codeBg: "#f4f4f8", codeText: "#e94560" },
  },
  {
    name: "Ocean",
    colors: { h1: "#006994", h2: "#0d98ba", h3: "#40b5ad", body: "#2c3e50", link: "#1abc9c", codeBg: "#ecf0f1", codeText: "#2980b9" },
  },
  {
    name: "Forest",
    colors: { h1: "#2d6a4f", h2: "#40916c", h3: "#52b788", body: "#1b4332", link: "#95d5b2", codeBg: "#f0f7f4", codeText: "#2d6a4f" },
  },
  {
    name: "Sunset",
    colors: { h1: "#9b2226", h2: "#bb3e03", h3: "#ca6702", body: "#3d405b", link: "#ee9b00", codeBg: "#fff8f0", codeText: "#9b2226" },
  },
  {
    name: "Royal",
    colors: { h1: "#220070", h2: "#3d19a8", h3: "#5321e0", body: "#2b2d42", link: "#7ad9c5", codeBg: "#f2e8ff", codeText: "#5321e0" },
  },
  {
    name: "Monochrome",
    colors: { h1: "#000000", h2: "#333333", h3: "#555555", body: "#444444", link: "#0066cc", codeBg: "#f5f5f5", codeText: "#333333" },
  },
];

const DEFAULT_COLORS: ColorSettings = COLOR_PALETTES[0].colors;

const FONT_SIZE_OPTIONS = [
  { label: "Extra Small (8pt)", value: "8pt" },
  { label: "Small (9pt)", value: "9pt" },
  { label: "Medium (10pt)", value: "10pt" },
  { label: "Large (11pt)", value: "11pt" },
  { label: "Extra Large (12pt)", value: "12pt" },
  { label: "Huge (14pt)", value: "14pt" },
];

const Documenta: React.FC = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [documentTitle, setDocumentTitle] = useState<string>("document");
  const [colors, setColors] = useState<ColorSettings>(DEFAULT_COLORS);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activePalette, setActivePalette] = useState<string>("Professional");
  const [fontSize, setFontSize] = useState<string>("10pt");

  // StrideDoc states
  const [activeTab, setActiveTab] = useState<'generate' | 'list'>('generate');
  const [documents, setDocuments] = useState<StrideDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [docToDelete, setDocToDelete] = useState<StrideDocument | null>(null);
  const menuRef = useRef<Menu>(null);
  const [selectedDocForMenu, setSelectedDocForMenu] = useState<StrideDocument | null>(null);

  const actionMenuItems = [
    {
      label: 'Download PDF',
      icon: 'pi pi-file-pdf',
      template: (item: any, options: any) => {
        return (
          <button 
            onClick={(e) => options.onClick(e)} 
            className={`${options.className} flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer`}
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </button>
        );
      },
      command: () => {
        if (selectedDocForMenu) {
          strideDocService.downloadFile(selectedDocForMenu.id, 'pdf', selectedDocForMenu.name);
        }
      }
    },
    {
      label: 'Download Markdown',
      icon: 'pi pi-file-edit',
      template: (item: any, options: any) => {
        return (
          <button 
            onClick={(e) => options.onClick(e)} 
            className={`${options.className} flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer`}
          >
            <DocumentTextIcon className="h-4 w-4 text-secondary-600" />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </button>
        );
      },
      command: () => {
        if (selectedDocForMenu) {
          strideDocService.downloadFile(selectedDocForMenu.id, 'md', selectedDocForMenu.name);
        }
      }
    },
    {
      separator: true,
      template: () => <div className="border-t border-gray-100 my-1" />
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      template: (item: any, options: any) => {
        return (
          <button 
            onClick={(e) => options.onClick(e)} 
            className={`${options.className} flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-red-50 transition-colors cursor-pointer`}
          >
            <TrashIcon className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-600">{item.label}</span>
          </button>
        );
      },
      command: () => {
        if (selectedDocForMenu) {
          setDocToDelete(selectedDocForMenu);
          setDeleteConfirmOpen(true);
        }
      }
    }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const response = await strideDocService.getAll();
      setDocuments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const saveToCloud = async () => {
    if (!markdownContent || !documentTitle) return;
    setIsSaving(true);
    setError(null);
    try {
      await strideDocService.create({
        name: documentTitle,
        markdownContent,
        colors,
        fontSize
      });
      setSuccess("Document saved to StrideDoc successfully");
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save document to cloud");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      await strideDocService.deleteDocument(docToDelete.id);
      setSuccess("Document deleted successfully");
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete document");
    } finally {
      setDeleteConfirmOpen(false);
      setDocToDelete(null);
    }
  };

  const formatSize = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (markdownContent) {
      const parsed = marked.parse(markdownContent);
      if (typeof parsed === "string") {
        setHtmlContent(parsed);
      } else {
        parsed.then((result) => setHtmlContent(result));
      }
    } else {
      setHtmlContent("");
    }
  }, [markdownContent]);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const handleFileRead = useCallback((file: File) => {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown")) {
      return;
    }
    setFileName(file.name);
    const baseName = file.name.replace(/\.(md|markdown)$/, "");
    setDocumentTitle(baseName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdownContent(text);
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileRead(files[0]);
      }
    },
    [handleFileRead]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileRead(files[0]);
      }
    },
    [handleFileRead]
  );

  const clearFile = () => {
    setMarkdownContent("");
    setHtmlContent("");
    setFileName("");
    setDocumentTitle("document");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const applyPalette = (palette: ColorPalette) => {
    setColors(palette.colors);
    setActivePalette(palette.name);
  };

  const updateColor = (key: keyof ColorSettings, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setActivePalette("");
  };

  const downloadPDF = async () => {
    if (!htmlContent) return;
    setIsGenerating(true);
    try {
      const pdfBlob = await strideDocService.generatePdf({
        markdownContent,
        colors,
        fontSize
      });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${documentTitle || "document"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPDF = async () => {
    if (!htmlContent) return;
    setIsGenerating(true);
    try {
      const pdfBlob = await strideDocService.generatePdf({
        markdownContent,
        colors,
        fontSize
      });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(pdfUrl);
      setPreviewDialogOpen(true);
    } catch (err) {
      console.error("Error generating PDF preview:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const closePreviewDialog = () => {
    setPreviewDialogOpen(false);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const downloadFromPreview = () => {
    if (previewPdfUrl) {
      const link = document.createElement("a");
      link.href = previewPdfUrl;
      link.download = `${documentTitle || "document"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getPreviewStyles = (): string => {
    return `
      .documenta-preview { overflow-wrap: break-word; word-break: break-word; }
      .documenta-preview * { max-width: 100%; box-sizing: border-box; }
      .documenta-preview h1 { color: ${colors.h1}; font-size: 1.75em; font-weight: 700; margin: 0.67em 0; border-bottom: 2px solid ${colors.h1}20; padding-bottom: 0.3em; }
      .documenta-preview h2 { color: ${colors.h2}; font-size: 1.35em; font-weight: 600; margin: 0.83em 0; border-bottom: 1px solid ${colors.h2}15; padding-bottom: 0.25em; }
      .documenta-preview h3 { color: ${colors.h3}; font-size: 1.15em; font-weight: 600; margin: 1em 0; }
      .documenta-preview h4, .documenta-preview h5, .documenta-preview h6 { color: ${colors.h3}; font-weight: 600; margin: 1em 0; }
      .documenta-preview p { color: ${colors.body}; line-height: 1.6; margin: 0.6em 0; }
      .documenta-preview li { color: ${colors.body}; line-height: 1.6; }
      .documenta-preview a { color: ${colors.link}; text-decoration: underline; }
      .documenta-preview code { background-color: ${colors.codeBg}; color: ${colors.codeText}; padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.85em; font-family: 'Courier New', Courier, monospace; }
      .documenta-preview pre { background-color: ${colors.codeBg}; border-radius: 6px; padding: 0.8em; margin: 0.8em 0; border: 1px solid #e0e0e0; white-space: pre-wrap; word-break: break-all; overflow: hidden; }
      .documenta-preview pre code { background: none; padding: 0; color: ${colors.codeText}; white-space: pre-wrap; word-break: break-all; }
      .documenta-preview blockquote { border-left: 4px solid ${colors.h2}; padding-left: 1em; margin: 1em 0; color: ${colors.body}99; font-style: italic; }
      .documenta-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; table-layout: fixed; }
      .documenta-preview th { background-color: ${colors.h1}10; color: ${colors.h2}; padding: 0.4em 0.6em; border: 1px solid #ddd; text-align: left; font-weight: 600; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; word-break: break-word; }
      .documenta-preview td { padding: 0.4em 0.6em; border: 1px solid #ddd; color: ${colors.body}; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; word-break: break-word; }
      .documenta-preview tr:nth-child(even) { background-color: #f9f9f9; }
      .documenta-preview img { max-width: 100%; height: auto; border-radius: 4px; }
      .documenta-preview hr { border: none; border-top: 2px solid #e0e0e0; margin: 1.5em 0; }
      .documenta-preview ul, .documenta-preview ol { padding-left: 1.5em; margin: 0.6em 0; }
      .documenta-preview strong { font-weight: 700; }
      .documenta-preview em { font-style: italic; }
    `;
  };

  const colorFields: { key: keyof ColorSettings; label: string; description: string }[] = [
    { key: "h1", label: "H1 Titles", description: "Main headings" },
    { key: "h2", label: "H2 Subtitles", description: "Section headings" },
    { key: "h3", label: "H3 Headings", description: "Sub-section headings" },
    { key: "body", label: "Body Text", description: "Paragraphs & lists" },
    { key: "link", label: "Links", description: "Hyperlinks" },
    { key: "codeBg", label: "Code Background", description: "Code block background" },
    { key: "codeText", label: "Code Text", description: "Code text color" },
  ];

  return (
    <div className="space-y-6">
      {/* Banners */}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">Convert Markdown files to beautifully styled PDFs and store them</p>
        </div>
        
        {activeTab === 'generate' && (
          <div className="flex gap-3">
            <button
              onClick={previewPDF}
              disabled={isGenerating || !htmlContent}
              className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <EyeIcon className="h-5 w-5" />
              {isGenerating ? "Generating..." : "Preview PDF"}
            </button>
            <button
              onClick={saveToCloud}
              disabled={isSaving || isGenerating || !htmlContent || !documentTitle}
              className="flex items-center justify-center gap-2 bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {isSaving ? "Saving..." : "Save to Cloud"}
            </button>
            <button
              onClick={downloadPDF}
              disabled={isGenerating || !htmlContent}
              className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {isGenerating ? "Generating..." : "Download PDF"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer
              ${activeTab === 'generate' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Generate Document
            </div>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer
              ${activeTab === 'list' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              My Documents
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'generate' ? (
        <>
          {/* File Upload Area */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpTrayIcon className="h-5 w-5" />
              Upload Markdown File
            </h2>
            {!fileName ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
                  ${isDragOver ? "border-primary-500 bg-primary-50 scale-[1.01]" : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"}
                `}
              >
                <DocumentTextIcon className={`h-16 w-16 mx-auto mb-4 ${isDragOver ? "text-primary-500" : "text-gray-400"}`} />
                <p className="text-lg font-medium text-gray-700 mb-1">
                  {isDragOver ? "Drop your file here" : "Drag & drop your .md file here"}
                </p>
                <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Choose File
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-8 w-8 text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900">{fileName}</p>
                    <p className="text-sm text-gray-500">{markdownContent.length} characters</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                >
                  <TrashIcon className="h-4 w-4" />
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Document Settings */}
          {htmlContent && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Title</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter the PDF file name..."
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">File name: <strong>{documentTitle || "document"}.pdf</strong></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  >
                    {FONT_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-400">Affects body text, headings scale proportionally</p>
                </div>
              </div>
            </div>
          )}

          {/* Color Settings */}
          {htmlContent && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SwatchIcon className="h-5 w-5" />
                Color Settings
              </h2>

              {/* Palette Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Color Palettes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => applyPalette(palette)}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left cursor-pointer
                        ${activePalette === palette.name ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-200 hover:border-gray-300"}
                      `}
                    >
                      <div className="flex gap-1 mb-2">
                        {[palette.colors.h1, palette.colors.h2, palette.colors.h3, palette.colors.body].map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Color Pickers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Custom Colors</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {colorFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="color"
                        value={colors[field.key]}
                        onChange={(e) => updateColor(field.key, e.target.value)}
                        className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer p-0.5 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{field.label}</p>
                        <p className="text-xs text-gray-500 truncate">{field.description}</p>
                        <input
                          type="text"
                          value={colors[field.key]}
                          onChange={(e) => updateColor(field.key, e.target.value)}
                          className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded font-mono bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Markdown Preview */}
          {htmlContent && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
              <div className="border border-gray-200 rounded-lg bg-white overflow-auto" style={{ maxHeight: "800px" }}>
                <style>{getPreviewStyles()}</style>
                <div
                  ref={previewRef}
                  className="documenta-preview"
                  style={{
                    width: "8.5in",
                    minHeight: "11in",
                    margin: "0 auto",
                    padding: "0.75in 1in",
                    backgroundColor: "#ffffff",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontSize: fontSize,
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        /* List Tab Content */
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              Saved Documents
            </h2>
            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <InputText
                  value={globalFilterValue}
                  onChange={(e) => setGlobalFilterValue(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 w-64"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <DataTable
              value={documents}
              loading={loadingDocs}
              globalFilter={globalFilterValue}
              emptyMessage="No documents found."
              className="p-datatable-sm"
              rowHover
              responsiveLayout="scroll"
              pt={{
                thead: { className: 'text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50' },
                tbody: { className: 'text-sm text-gray-700' },
              }}
            >
              <Column 
                field="name" 
                header="Name" 
                className="font-medium"
                pt={{
                  headerCell: { className: 'py-3 px-4 border-b border-gray-200' },
                  bodyCell: { className: 'py-4 px-4 border-b border-gray-100' }
                }}
              />
              <Column 
                header="PDF Size" 
                body={(rowData: StrideDocument) => formatSize(rowData.pdfFileSize)} 
                pt={{
                  headerCell: { className: 'py-3 px-4 border-b border-gray-200' },
                  bodyCell: { className: 'py-4 px-4 border-b border-gray-100' }
                }}
              />
              <Column 
                header="MD Size" 
                body={(rowData: StrideDocument) => formatSize(rowData.mdFileSize)} 
                pt={{
                  headerCell: { className: 'py-3 px-4 border-b border-gray-200' },
                  bodyCell: { className: 'py-4 px-4 border-b border-gray-100' }
                }}
              />
              <Column 
                header="Created" 
                body={(rowData: StrideDocument) => new Date(rowData.createdAt).toLocaleDateString()} 
                pt={{
                  headerCell: { className: 'py-3 px-4 border-b border-gray-200' },
                  bodyCell: { className: 'py-4 px-4 border-b border-gray-100' }
                }}
              />
            <Column
              header="Actions"
              headerStyle={{ width: '5rem', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'center', overflow: 'visible' }}
              pt={{
                headerCell: { className: 'py-3 px-4 border-b border-gray-200' },
                bodyCell: { className: 'py-4 px-4 border-b border-gray-100' }
              }}
              body={(rowData: StrideDocument) => (
                <div className="flex justify-center">
                  <button
                    onClick={(e) => {
                      setSelectedDocForMenu(rowData);
                      menuRef.current?.toggle(e);
                    }}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                    title="Actions"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            />
            </DataTable>
          </div>
          <Menu 
            model={actionMenuItems} 
            popup 
            ref={menuRef} 
            id="action_menu" 
            pt={{
              root: { className: 'border-0 shadow-lg rounded-lg overflow-hidden py-1 bg-white ring-1 ring-black ring-opacity-5' },
              menu: { className: 'p-0 list-none' },
              menuitem: { className: 'p-0' },
              content: { className: 'p-0' }
            }}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDocToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${docToDelete?.name}"? This will remove both the PDF and Markdown files from the cloud.`}
        variant="red"
        confirmButtonText="Delete"
      />

      {/* PDF Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={closePreviewDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-6xl w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                PDF Preview &mdash; {documentTitle || "document"}.pdf
              </DialogTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadFromPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm cursor-pointer"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </button>
                <button onClick={closePreviewDialog} className="text-gray-400 hover:text-gray-500 cursor-pointer">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewPdfUrl && (
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                  style={{ minHeight: "600px" }}
                />
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default Documenta;
