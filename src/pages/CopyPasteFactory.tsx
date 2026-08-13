import React, { useState } from "react";
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ErrorBanner from "../components/ErrorBanner";

interface CopyItem {
  id: string;
  label: string;
  value: string;
}

const CopyPasteFactory: React.FC = () => {
  const [items, setItems] = useState<CopyItem[]>([]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError("Enter a value to copy.");
      return;
    }

    const trimmedLabel = label.trim();
    const newItem: CopyItem = {
      id: crypto.randomUUID(),
      label: trimmedLabel || trimmedValue.slice(0, 40),
      value: trimmedValue,
    };

    setItems((current) => [...current, newItem]);
    setLabel("");
    setValue("");
    setError(null);
  };

  const handleCopy = async (item: CopyItem) => {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopiedId(item.id);
      setError(null);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1500);
    } catch {
      setError("Could not copy to clipboard. Check browser permissions.");
    }
  };

  const handleRemove = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    if (copiedId === id) {
      setCopiedId(null);
    }
  };

  const handleClearAll = () => {
    setItems([]);
    setCopiedId(null);
    setError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Copy & Paste Factory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add snippets for this session, then click a card to copy it. Nothing is saved after you leave this page.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 self-start rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <TrashIcon className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PlusIcon className="h-5 w-5 text-primary-600" />
          Add item
        </h2>
        <p className="mt-1 text-sm text-gray-600">The label is what you see on the button. The value is what gets copied.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label htmlFor="copy-item-label" className="block text-sm font-medium text-gray-700">
              Label
            </label>
            <input
              id="copy-item-label"
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Company RUT"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="copy-item-value" className="block text-sm font-medium text-gray-700">
              Value
            </label>
            <textarea
              id="copy-item-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Text that will be copied to the clipboard"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Press Ctrl+Enter or Cmd+Enter to add.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No items yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add a few snippets above, then click a card to copy and paste into forms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className={`relative rounded-lg border bg-white p-4 shadow-sm transition ${
                  isCopied ? "border-secondary ring-2 ring-secondary/40" : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 cursor-pointer"
                  aria-label={`Remove ${item.label}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  className="w-full pr-6 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    {isCopied ? (
                      <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary-700" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5 text-primary-600" />
                    )}
                    {item.label}
                  </span>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600 line-clamp-4">{item.value}</p>
                  <p className={`mt-3 text-xs font-medium ${isCopied ? "text-primary-700" : "text-gray-400"}`}>
                    {isCopied ? "Copied to clipboard" : "Click to copy"}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CopyPasteFactory;
