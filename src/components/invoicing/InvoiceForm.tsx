import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import type {
  CreateInvoiceRequest,
  InvoiceTemplate,
  Company,
  Contact,
  Currency,
  EmailTemplate,
  InvoiceItem,
  ASTemplateItem,
  SendTestEmailRequest,
} from "../../types";
import EmailDialog from "../EmailDialog";
import { sanitizeFilename, formatDateForFilename, formatInvoiceNumber, getInvoicePreviewData } from "../../utils/invoiceUtils";
import PavletekInvoice from "../../assets/pdfTemplates/PavletekInvoice";
import KibernumAS from "../../assets/pdfTemplates/KibernumAS";
import "../../assets/invoice.css";
import "../../assets/pdf.css";

interface InvoiceFormProps {
  invoiceForm: CreateInvoiceRequest;
  setInvoiceForm: React.Dispatch<React.SetStateAction<CreateInvoiceRequest>>;
  invoiceItems: InvoiceItem[];
  asItems: ASTemplateItem[];
  addASDocument: boolean;
  editingInvoiceId: number | null;
  selectedTemplateId: number | null;
  invoiceTemplates: InvoiceTemplate[];
  companies: Company[];
  contacts: Contact[];
  currencies: Currency[];
  emailTemplates: EmailTemplate[];
  onTemplateSelect: (templateId: number | null) => void;
  onAddInvoiceItem: () => void;
  onRemoveInvoiceItem: (index: number) => void;
  onUpdateInvoiceItem: (index: number, field: keyof InvoiceItem, value: any) => void;
  onAddASItem: () => void;
  onRemoveASItem: (index: number) => void;
  onUpdateASItem: (index: number, field: keyof ASTemplateItem, value: any) => void;
  onImageUpload: (index: number, file: File) => void;
  onSetAddASDocument: (value: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onSendEmail?: (emailData: SendTestEmailRequest) => Promise<void>;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoiceForm,
  setInvoiceForm,
  invoiceItems,
  asItems,
  addASDocument,
  editingInvoiceId,
  selectedTemplateId,
  invoiceTemplates,
  companies,
  contacts,
  currencies,
  emailTemplates,
  onTemplateSelect,
  onAddInvoiceItem,
  onRemoveInvoiceItem,
  onUpdateInvoiceItem,
  onAddASItem,
  onRemoveASItem,
  onUpdateASItem,
  onImageUpload,
  onSetAddASDocument,
  onCancel,
  onSave,
  onSendEmail,
}) => {
  // Expandable sections state - expand all by default when creating (except description)
  const [templateNameExpanded, setTemplateNameExpanded] = useState(invoiceForm.isTemplate);
  const [basicInfoExpanded, setBasicInfoExpanded] = useState(!selectedTemplateId && !editingInvoiceId);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [fromToExpanded, setFromToExpanded] = useState(!selectedTemplateId && !editingInvoiceId);
  const [emailTemplateExpanded, setEmailTemplateExpanded] = useState(!selectedTemplateId && !editingInvoiceId);
  const [invoiceItemsExpanded, setInvoiceItemsExpanded] = useState(true); // Always expanded
  const [taxRateExpanded, setTaxRateExpanded] = useState(!selectedTemplateId && !editingInvoiceId);
  const [totalsExpanded, setTotalsExpanded] = useState(!selectedTemplateId && !editingInvoiceId);
  const [asDocumentExpanded, setAsDocumentExpanded] = useState(addASDocument && asItems.length > 0);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewType, setPreviewType] = useState<"invoice" | "as">("invoice");

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const invoicePreviewRef = useRef<HTMLDivElement>(null);
  const asPreviewRef = useRef<HTMLDivElement>(null);

  // When a template is selected, collapse all sections except items and AS items
  useEffect(() => {
    if (selectedTemplateId) {
      setBasicInfoExpanded(false);
      setDescriptionExpanded(false);
      setFromToExpanded(false);
      setEmailTemplateExpanded(false);
      setTaxRateExpanded(false);
      setTotalsExpanded(false);
      setInvoiceItemsExpanded(true);
      if (addASDocument && asItems.length > 0) {
        setAsDocumentExpanded(true);
      } else {
        setAsDocumentExpanded(false);
      }
    }
  }, [selectedTemplateId, addASDocument, asItems.length]);

  // Expand template name when creating a template
  useEffect(() => {
    if (invoiceForm.isTemplate && !editingInvoiceId) {
      setTemplateNameExpanded(true);
    }
  }, [invoiceForm.isTemplate, editingInvoiceId]);

  // Update AS document expansion when items change or when addASDocument is toggled
  useEffect(() => {
    if (addASDocument) {
      // When AS document is enabled, expand the section
      setAsDocumentExpanded(true);
    } else {
      setAsDocumentExpanded(false);
    }
  }, [addASDocument]);

  // Wrapper handlers that sync invoice items with AS items when AS document is enabled
  const handleUpdateInvoiceItemSynced = (index: number, field: keyof InvoiceItem, value: any) => {
    onUpdateInvoiceItem(index, field, value);
    
    // If updating quantity and AS document is enabled, sync to AS item hours
    if (addASDocument && field === "quantity" && asItems[index]) {
      onUpdateASItem(index, "hours", value);
    }
  };

  const handleUpdateASItemSynced = (index: number, field: keyof ASTemplateItem, value: any) => {
    onUpdateASItem(index, field, value);
    
    // If updating hours and AS document is enabled, sync to invoice item quantity
    if (addASDocument && field === "hours" && invoiceItems[index]) {
      onUpdateInvoiceItem(index, "quantity", value);
    }
  };

  const handleAddInvoiceItemSynced = () => {
    onAddInvoiceItem();
    
    // If AS document is enabled, add corresponding AS item
    if (addASDocument) {
      const newQuantity = invoiceItems.length > 0 ? invoiceItems[invoiceItems.length - 1].quantity : 0;
      onAddASItem();
      // Set hours to match the new invoice item quantity (will be set after state updates)
      setTimeout(() => {
        if (asItems.length < invoiceItems.length) {
          const lastInvoiceItem = invoiceItems[invoiceItems.length - 1];
          if (lastInvoiceItem) {
            onUpdateASItem(asItems.length, "hours", lastInvoiceItem.quantity);
          }
        }
      }, 0);
    }
  };

  const handleRemoveInvoiceItemSynced = (index: number) => {
    onRemoveInvoiceItem(index);
    
    // If AS document is enabled, remove corresponding AS item
    if (addASDocument && asItems[index]) {
      onRemoveASItem(index);
    }
  };

  const handleAddASItemSynced = () => {
    const newIndex = asItems.length;
    // Get the quantity from the corresponding invoice item if it exists
    const correspondingQuantity = invoiceItems[newIndex]?.quantity || 0;
    
    onAddASItem();
    
    // Set hours to match the corresponding invoice item quantity
    setTimeout(() => {
      onUpdateASItem(newIndex, "hours", correspondingQuantity);
    }, 0);
  };

  // Track when we're initializing AS items to sync hours correctly
  const initializingASRef = useRef(false);
  const targetQuantitiesRef = useRef<number[]>([]);
  const updatedIndicesRef = useRef<Set<number>>(new Set());

  const handleSetAddASDocument = (value: boolean) => {
    onSetAddASDocument(value);
    
    // When enabling AS document, create AS items for existing invoice items with synced hours
    if (value && invoiceItems.length > 0) {
      initializingASRef.current = true;
      updatedIndicesRef.current.clear();
      // Store quantities in order
      targetQuantitiesRef.current = invoiceItems.map(item => item.quantity);
      
      // Add all AS items at once
      invoiceItems.forEach((item: any) => {
        onAddASItem(item.quantity);
      });
    } else {
      initializingASRef.current = false;
      targetQuantitiesRef.current = [];
      updatedIndicesRef.current.clear();
    }
  };

  // Sync hours when AS items are added during initialization
  useEffect(() => {
    if (initializingASRef.current && asItems.length > 0 && targetQuantitiesRef.current.length > 0) {
      // Only sync if we have the right number of items
      if (asItems.length === targetQuantitiesRef.current.length) {
        // Update hours sequentially, one item at a time
        // This ensures each update uses the latest state from the previous update
        let currentIndex = 0;
        const updateNextItem = () => {
          // Check if we still need to update more items
          if (currentIndex < targetQuantitiesRef.current.length) {
            // Verify the item exists at this index
            if (asItems[currentIndex] !== undefined && !updatedIndicesRef.current.has(currentIndex)) {
              const quantity = targetQuantitiesRef.current[currentIndex];
              const index = currentIndex;
              
              // Mark as updated before calling update
              updatedIndicesRef.current.add(index);
              
              // Update this item
              onUpdateASItem(index, "hours", quantity);
              
              // Move to next index
              currentIndex++;
              
              // Continue with next item after a delay to ensure state has updated
              if (currentIndex < targetQuantitiesRef.current.length) {
                setTimeout(updateNextItem, 150);
              } else {
                // All items updated, clear refs
                setTimeout(() => {
                  initializingASRef.current = false;
                  targetQuantitiesRef.current = [];
                  updatedIndicesRef.current.clear();
                }, 150);
              }
            } else {
              // Item doesn't exist yet or already updated, wait and retry
              setTimeout(updateNextItem, 100);
            }
          }
        };
        
        // Start updating after a delay to ensure all items have been added
        setTimeout(updateNextItem, 200);
      }
    }
  }, [asItems.length, asItems]);

  // Sync AS items array length and hours when invoice items change (only when AS document is enabled)
  useEffect(() => {
    if (!addASDocument) return;

    const currentAsLength = asItems.length;
    const currentInvoiceLength = invoiceItems.length;

    // Sync array lengths - only add items if we're not starting from scratch (asItems.length > 0 means items already exist)
    if (currentAsLength < currentInvoiceLength && currentAsLength > 0) {
      // Add missing AS items with hours matching quantities by index
      for (let i = currentAsLength; i < currentInvoiceLength; i++) {
        const quantity = invoiceItems[i]?.quantity || 0;
        const executedBy = asItems[i - 1]?.executedBy || "";
        const targetIndex = i; // Store the target index before async operations
        onAddASItem();
        // Update hours after adding - use the stored targetIndex to ensure correct mapping
        setTimeout(() => {
          onUpdateASItem(targetIndex, "hours", quantity);
          if (executedBy) {
            // Also copy executedBy from previous item if available
            setTimeout(() => {
              onUpdateASItem(targetIndex, "executedBy", executedBy);
            }, 10);
          }
        }, (i - currentAsLength) * 50); // Stagger updates based on position
      }
    } else if (currentAsLength > currentInvoiceLength) {
      // Remove extra AS items
      for (let i = currentAsLength - 1; i >= currentInvoiceLength; i--) {
        onRemoveASItem(i);
      }
    }

    // Sync hours to quantities for existing items (only if they don't match and items exist)
    // Only sync when arrays are the same length and both have items
    // Skip syncing if arrays are equal length and empty (initial state)
    if (currentAsLength === currentInvoiceLength && currentAsLength > 0) {
      invoiceItems.forEach((invoiceItem, index) => {
        // Only update if hours don't match quantity - this ensures correct index mapping
        if (asItems[index] && asItems[index].hours !== invoiceItem.quantity) {
          onUpdateASItem(index, "hours", invoiceItem.quantity);
        }
      });
    }
  }, [invoiceItems.length, addASDocument]);

  // Convert oklch colors to RGB for html2canvas compatibility
  const convertOklchToRgb = (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element);
    const allElements = element.querySelectorAll("*");

    const bgColor = computedStyle.backgroundColor;
    const color = computedStyle.color;

    if (bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)") {
      element.style.backgroundColor = bgColor;
    }
    if (color && color !== "transparent") {
      element.style.color = color;
    }

    allElements.forEach((el) => {
      const elStyle = window.getComputedStyle(el);
      const elBgColor = elStyle.backgroundColor;
      const elColor = elStyle.color;

      if (elBgColor && elBgColor !== "transparent" && elBgColor !== "rgba(0, 0, 0, 0)") {
        (el as HTMLElement).style.backgroundColor = elBgColor;
      }
      if (elColor && elColor !== "transparent") {
        (el as HTMLElement).style.color = elColor;
      }
    });
  };

  const generatePDF = async (type: "invoice" | "as"): Promise<Blob | null> => {
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = "210mm";
    document.body.appendChild(tempContainer);

    let root: Root | null = null;

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      
      if (type === "as") {
        const asItemsData = asItems.map((item) => ({
          executedBy: item.executedBy,
          hours: item.hours,
          image: item.image || "",
        }));
        
        root = createRoot(tempContainer);
        // Format date safely without timezone issues
        let formattedDate = "";
        if (invoiceForm.date) {
          const date = /^\d{4}-\d{2}-\d{2}$/.test(invoiceForm.date)
            ? (() => {
                const [year, month, day] = invoiceForm.date.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()
            : new Date(invoiceForm.date);
          formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        }
        root.render(
          React.createElement(KibernumAS, {
            date: formattedDate,
            items: asItemsData,
          })
        );
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const pages = tempContainer.querySelectorAll(".pdf-page");
        if (pages.length === 0) {
          const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.querySelector("[data-pdf-content]") as HTMLElement;
              if (clonedElement) {
                convertOklchToRgb(clonedElement);
              }
            },
          });
          const imgHeight = (canvas.height * 210) / canvas.width;
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, 210, imgHeight);
        } else {
          for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();
            const canvas = await html2canvas(pages[i] as HTMLElement, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
              onclone: (_clonedDoc, element) => {
                if (element) {
                  convertOklchToRgb(element);
                }
              },
            });
            const imgHeight = (canvas.height * 210) / canvas.width;
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", 0, 0, 210, imgHeight);
          }
        }
      } else {
        const invoiceData = getInvoicePreviewData(invoiceForm, companies, contacts, invoiceItems);
        root = createRoot(tempContainer);
        root.render(React.createElement(PavletekInvoice, invoiceData));
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector("[data-pdf-content]") as HTMLElement;
            if (clonedElement) {
              convertOklchToRgb(clonedElement);
            }
          },
        });
        const imgHeight = (canvas.height * 210) / canvas.width;
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, imgHeight);
      }

      if (root) {
        root.unmount();
      }

      return pdf.output("blob");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      if (root) {
        root.unmount();
      }
      return null;
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handlePreview = async (type: "invoice" | "as" = "invoice") => {
    setIsGeneratingPreview(true);
    setPreviewType(type);
    try {
      const pdfBlob = await generatePDF(type);
      if (pdfBlob) {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(pdfUrl);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleASPreview = async () => {
    await handlePreview("as");
  };

  const handleOpenEmailDialog = async () => {
    if (!onSendEmail) return;
    
    setIsGeneratingEmail(true);
    try {
      const attachments: File[] = [];
      
      // Get company names for filename
      const fromCompany = companies.find((c) => c.id === invoiceForm.fromCompanyId);
      const toCompany = companies.find((c) => c.id === invoiceForm.toCompanyId);
      const fromCompanyName = fromCompany?.displayName || fromCompany?.legalName || "Unknown";
      const toCompanyName = toCompany?.displayName || toCompany?.legalName || "Unknown";
      const sanitizedFrom = sanitizeFilename(fromCompanyName);
      const sanitizedTo = sanitizeFilename(toCompanyName);
      const dateFormatted = formatDateForFilename(invoiceForm.date);
      const invoiceNum = formatInvoiceNumber(invoiceForm.invoiceNumber);
      
      // Generate invoice PDF
      const invoiceBlob = await generatePDF("invoice");
      if (invoiceBlob) {
        const invoiceFileName = `invoice_${sanitizedFrom}_${sanitizedTo}_${dateFormatted}_${invoiceNum}.pdf`;
        const invoiceFile = new File([invoiceBlob], invoiceFileName, {
          type: "application/pdf",
        });
        attachments.push(invoiceFile);
      }

      // Generate AS PDF if exists
      if (addASDocument && asItems.length > 0) {
        const asBlob = await generatePDF("as");
        if (asBlob) {
          const asFileName = `as_${sanitizedFrom}_${sanitizedTo}_${dateFormatted}_${invoiceNum}.pdf`;
          const asFile = new File([asBlob], asFileName, {
            type: "application/pdf",
          });
          attachments.push(asFile);
        }
      }

      setEmailAttachments(attachments);
      setEmailDialogOpen(true);
    } catch (error) {
      console.error("Error generating PDFs for email:", error);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleSendEmail = async (emailData: SendTestEmailRequest) => {
    if (!onSendEmail) return;
    
    try {
      await onSendEmail({
        ...emailData,
        attachments: emailAttachments,
      });
      setEmailDialogOpen(false);
      setEmailAttachments([]);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  };

  const closePreviewDialog = () => {
    setPreviewDialogOpen(false);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {editingInvoiceId ? "Edit Invoice" : invoiceForm.isTemplate ? "Create Template" : "Create Invoice"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => handlePreview("invoice")}
            disabled={isGeneratingPreview}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeIcon className="h-5 w-5" />
            {isGeneratingPreview ? "Generating..." : "Preview Invoice"}
          </button>
          {addASDocument && asItems.length > 0 && (
            <button
              onClick={handleASPreview}
              disabled={isGeneratingPreview}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <EyeIcon className="h-5 w-5" />
              {isGeneratingPreview ? "Generating..." : "Preview AS"}
            </button>
          )}
          {onSendEmail && (
            <button
              onClick={handleOpenEmailDialog}
              disabled={isGeneratingEmail || isGeneratingPreview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <EnvelopeIcon className="h-5 w-5" />
              {isGeneratingEmail ? "Generating..." : "Email"}
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Template Name Field - First when creating templates */}
        {invoiceForm.isTemplate && (
          <div className="bg-white shadow rounded-lg p-6">
            <button
              type="button"
              onClick={() => setTemplateNameExpanded(!templateNameExpanded)}
              className="flex items-center justify-between w-full text-left cursor-pointer"
            >
              <label className="block text-sm font-medium text-gray-700">Template Name</label>
              {templateNameExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {templateNameExpanded && (
              <div className="mt-4">
                <input
                  type="text"
                  value={invoiceForm.name || ""}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, name: e.target.value })
                  }
                  placeholder="Enter a name for this template"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This name will be used to identify the template in dropdowns
                </p>
              </div>
            )}
          </div>
        )}

        {/* Template Selection - Hide when creating templates */}
        {!invoiceForm.isTemplate && (
          <div className="bg-white shadow rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template (Optional)
            </label>
            <select
              value={selectedTemplateId || ""}
              onChange={(e) => {
                const templateId = e.target.value ? parseInt(e.target.value) : null;
                onTemplateSelect(templateId);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Start from scratch</option>
              {invoiceTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name || template.templateName || `Template #${template.invoiceNumber}`}
                  {template.ASDocument && Array.isArray(template.ASDocument) && template.ASDocument.length > 0 ? " (with AS)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Invoice Items - FIRST, Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setInvoiceItemsExpanded(!invoiceItemsExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
            {invoiceItemsExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {invoiceItemsExpanded && (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleAddInvoiceItemSynced}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {invoiceItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateInvoiceItemSynced(index, "quantity", parseInt(e.target.value) || 0)
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateInvoiceItemSynced(index, "description", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateInvoiceItemSynced(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total: {item.total.toLocaleString()}</span>
                      <button
                        onClick={() => handleRemoveInvoiceItemSynced(index)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AS Document Section - SECOND, Expandable - Always visible */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setAsDocumentExpanded(!asDocumentExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">AS Document</h3>
            {asDocumentExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {asDocumentExpanded && (
            <>
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addASDocument"
                    checked={addASDocument}
                    onChange={(e) => {
                      handleSetAddASDocument(e.target.checked);
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="addASDocument" className="ml-2 block text-sm font-medium text-gray-700">
                    {invoiceForm.isTemplate ? "Add AS Document Template" : "Add AS Document"}
                  </label>
                </div>
                {invoiceForm.isTemplate && (
                  <p className="mt-1 text-sm text-gray-500">
                    Check this box to include an AS (Activity Statement) template with this invoice template
                  </p>
                )}
              </div>
              {addASDocument && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-gray-900">AS Items</h4>
                    <button
                      onClick={handleAddASItemSynced}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {asItems.map((item, index) => {
                      // Ensure item exists and has default values
                      if (!item) return null;
                      const safeItem = {
                        executedBy: item.executedBy || "",
                        hours: item.hours ?? 0,
                        image: item.image,
                      };
                      return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Executed By</label>
                            <input
                              type="text"
                              value={safeItem.executedBy}
                              onChange={(e) => handleUpdateASItemSynced(index, "executedBy", e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                            <input
                              type="number"
                              value={safeItem.hours}
                              onChange={(e) => handleUpdateASItemSynced(index, "hours", parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                        {/* Image upload - Only for real invoices, not templates */}
                        {!invoiceForm.isTemplate && (
                          <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Image (Optional)</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onImageUpload(index, file);
                                }
                              }}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                            {safeItem.image && (
                              <div className="mt-2">
                                <img
                                  src={safeItem.image}
                                  alt={`AS item ${index + 1}`}
                                  className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => onUpdateASItem(index, "image", undefined)}
                                  className="mt-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                                >
                                  Remove image
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => onRemoveASItem(index)}
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Invoice Number, Date, Currency - Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setBasicInfoExpanded(!basicInfoExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <label className="block text-sm font-medium text-gray-700">Basic Information</label>
            {basicInfoExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {basicInfoExpanded && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="number"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, invoiceNumber: parseInt(e.target.value) || 0 })
                  }
                  disabled={!!editingInvoiceId}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Display: {formatInvoiceNumber(invoiceForm.invoiceNumber)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={invoiceForm.date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={invoiceForm.currencyId || ""}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      currencyId: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.abbreviation} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Description - Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <label className="block text-sm font-medium text-gray-700">Description</label>
            {descriptionExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {descriptionExpanded && (
            <div className="mt-4">
              <textarea
                value={invoiceForm.description || ""}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                rows={3}
                placeholder="Enter invoice description"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* From and To Company/Contact - Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setFromToExpanded(!fromToExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <label className="block text-sm font-medium text-gray-700">From & To</label>
            {fromToExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {fromToExpanded && (
            <div className="mt-4 grid grid-cols-2 gap-6">
              {/* From */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">From</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <select
                      value={invoiceForm.fromCompanyId || ""}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          fromCompanyId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.displayName || company.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                    <select
                      value={invoiceForm.fromContactId || ""}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          fromContactId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Contact</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* To */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">To</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <select
                      value={invoiceForm.toCompanyId || ""}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          toCompanyId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.displayName || company.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                    <select
                      value={invoiceForm.toContactId || ""}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          toContactId: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Contact</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Template - Only for templates, Expandable */}
        {invoiceForm.isTemplate && (
          <div className="bg-white shadow rounded-lg p-6">
            <button
              type="button"
              onClick={() => setEmailTemplateExpanded(!emailTemplateExpanded)}
              className="flex items-center justify-between w-full text-left cursor-pointer"
            >
              <label className="block text-sm font-medium text-gray-700">Email Template</label>
              {emailTemplateExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {emailTemplateExpanded && (
              <div className="mt-4">
                <select
                  value={invoiceForm.emailTemplateId || ""}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      emailTemplateId: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Email Template (Optional)</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.description || template.subject || `Template #${template.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tax Rate - Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setTaxRateExpanded(!taxRateExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
            {taxRateExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {taxRateExpanded && (
            <div className="mt-4">
              <input
                type="number"
                value={invoiceForm.taxRate}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, taxRate: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Totals - Expandable */}
        <div className="bg-white shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setTotalsExpanded(!totalsExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <label className="block text-sm font-medium text-gray-700">Totals</label>
            {totalsExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {totalsExpanded && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-medium">{invoiceForm.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Tax Amount:</span>
                <span className="font-medium">{invoiceForm.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{invoiceForm.total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>



        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer"
          >
            {editingInvoiceId ? "Update Invoice" : invoiceForm.isTemplate ? "Save Template" : "Save Invoice"}
          </button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={closePreviewDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-6xl w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {previewType === "as" ? "AS Document Preview" : "Invoice Preview"}
              </DialogTitle>
              <button onClick={closePreviewDialog} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewPdfUrl && (
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-0"
                  title="Invoice Preview"
                  style={{ minHeight: "600px" }}
                />
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Email Dialog */}
      {onSendEmail && (
        <EmailDialog
          open={emailDialogOpen}
          onClose={() => {
            setEmailDialogOpen(false);
            setEmailAttachments([]);
          }}
          onSend={handleSendEmail}
          initialData={
            invoiceForm.emailTemplateId
              ? (() => {
                  const emailTemplate = emailTemplates.find((t) => t.id === invoiceForm.emailTemplateId);
                  if (emailTemplate) {
                    return {
                      subject: emailTemplate.subject || "",
                      content: emailTemplate.content || "",
                      fromEmail: emailTemplate.fromEmail || undefined,
                      toEmails: Array.isArray(emailTemplate.destinationEmail)
                        ? emailTemplate.destinationEmail
                        : emailTemplate.destinationEmail
                        ? [emailTemplate.destinationEmail]
                        : undefined,
                      ccEmails: Array.isArray(emailTemplate.ccEmail)
                        ? emailTemplate.ccEmail
                        : emailTemplate.ccEmail
                        ? [emailTemplate.ccEmail]
                        : undefined,
                      bccEmails: Array.isArray(emailTemplate.bccEmail)
                        ? emailTemplate.bccEmail
                        : emailTemplate.bccEmail
                        ? [emailTemplate.bccEmail]
                        : undefined,
                    };
                  }
                  return undefined;
                })()
              : undefined
          }
          attachments={emailAttachments}
          title="Send Invoice via Email"
        />
      )}
    </div>
  );
};

export default InvoiceForm;
