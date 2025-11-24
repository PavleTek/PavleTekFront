import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, EyeIcon, ArrowDownTrayIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { invoiceService } from "../services/invoiceService";
import { emailTemplateService } from "../services/emailTemplateService";
import { emailService } from "../services/emailService";
import { companyService } from "../services/companyService";
import { contactService } from "../services/contactService";
import { currencyService } from "../services/currencyService";
import EmailDialog from "../components/EmailDialog";
import ConfirmationDialog from "../components/ConfirmationDialog";
import type { SendTestEmailRequest } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import PavletekInvoice from "../assets/pdfTemplates/PavletekInvoice";
import KibernumAS from "../assets/pdfTemplates/KibernumAS";
import "../assets/invoice.css";
import type { Invoice, InvoiceTemplate, EmailTemplate, Company, Contact, Currency, CreateInvoiceRequest, InvoiceItem, ASItem } from "../types";

type ViewType = "list" | "createInvoice" | "createTemplate";

const Invoicing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("list");
  
  // Separate state for current invoice and template
  const [currentInvoice, setCurrentInvoice] = useState<CreateInvoiceRequest | null>(null);
  const [currentInvoiceTemplate, setCurrentInvoiceTemplate] = useState<CreateInvoiceRequest | null>(null);
  
  // Separate state for invoice items and AS items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [asItems, setAsItems] = useState<ASItem[]>([]);
  const [templateInvoiceItems, setTemplateInvoiceItems] = useState<InvoiceItem[]>([]);
  const [templateAsItems, setTemplateAsItems] = useState<ASItem[]>([]);
  const [addASDocument, setAddASDocument] = useState<boolean>(false);
  const [templateAddASDocument, setTemplateAddASDocument] = useState<boolean>(false);
  
  // Template selection for invoice
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // Description collapsed state
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);
  
  // Basic info collapsed state (for invoice form when template is selected)
  const [basicInfoExpanded, setBasicInfoExpanded] = useState<boolean>(false);

  // PDF Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"invoice" | "as">("invoice");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  const asPdfRef = useRef<HTMLDivElement>(null);

  // Email Dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false);
  const [isGeneratingEmailPdfs, setIsGeneratingEmailPdfs] = useState<boolean>(false);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [emailInitialData, setEmailInitialData] = useState<{
    fromEmail?: string;
    toEmails?: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    subject?: string;
    content?: string;
  } | undefined>(undefined);

  // Table view state
  const [activeTab, setActiveTab] = useState<"invoices" | "templates">("invoices");
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState<boolean>(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [
        invoicesResponse,
        templatesResponse,
        emailTemplatesResponse,
        companiesResponse,
        contactsResponse,
        currenciesResponse,
      ] = await Promise.all([
        invoiceService.getAllInvoices(),
        invoiceService.getAllInvoiceTemplates(),
        emailTemplateService.getAllEmailTemplates(),
        companyService.getAllCompanies(),
        contactService.getAllContacts(),
        currencyService.getAllCurrencies(),
      ]);

      setInvoices(invoicesResponse.invoices);
      setInvoiceTemplates(templatesResponse.invoices);
      setEmailTemplates(emailTemplatesResponse.emailTemplates);
      setCompanies(companiesResponse.companies);
      setContacts(contactsResponse.contacts);
      setCurrencies(currenciesResponse.currencies);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.message || "Failed to load invoices and templates");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals when invoice items or tax rate change
  useEffect(() => {
    if (currentInvoice) {
      const subtotal = invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const taxRate = currentInvoice.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      setCurrentInvoice((prev) => ({
        ...prev!,
        subtotal,
        taxAmount,
        total,
        items: invoiceItems,
        hasASDocument: addASDocument && asItems.length > 0,
        ASDocument: addASDocument && asItems.length > 0 ? asItems : undefined,
      }));
    }
  }, [invoiceItems, asItems, addASDocument]);

  // Update totals when tax rate changes for invoice
  useEffect(() => {
    if (currentInvoice) {
      const subtotal = invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const taxRate = currentInvoice.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      setCurrentInvoice((prev) => ({
        ...prev!,
        taxAmount,
        total,
      }));
    }
  }, [currentInvoice?.taxRate, invoiceItems]);

  // Sync invoice AS item hours with invoice item quantities
  useEffect(() => {
    if (addASDocument && currentInvoice && invoiceItems.length > 0 && asItems.length > 0) {
      // Update hours to match quantities, preserving executedBy and image values
      const updatedASItems = invoiceItems.map((invoiceItem, index) => {
        const existingASItem = asItems[index];
        return {
          executedBy: existingASItem?.executedBy || "",
          hours: invoiceItem.quantity || 0,
          image: existingASItem?.image,
        };
      });

      // Check if any hours need updating
      const needsUpdate = updatedASItems.some((item, index) => 
        item.hours !== asItems[index]?.hours
      ) || updatedASItems.length !== asItems.length;

      if (needsUpdate) {
        setAsItems(updatedASItems);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceItems, addASDocument]);

  // Calculate totals when template items or tax rate change
  useEffect(() => {
    if (currentInvoiceTemplate) {
      const subtotal = templateInvoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const taxRate = currentInvoiceTemplate.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      setCurrentInvoiceTemplate((prev) => ({
        ...prev!,
        subtotal,
        taxAmount,
        total,
        items: templateInvoiceItems,
        hasASDocument: templateAddASDocument && templateAsItems.length > 0,
        ASDocument: templateAddASDocument && templateAsItems.length > 0 ? templateAsItems : undefined,
      }));
    }
  }, [templateInvoiceItems, templateAsItems, templateAddASDocument]);

  // Update totals when tax rate changes for template
  useEffect(() => {
    if (currentInvoiceTemplate) {
      const subtotal = templateInvoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const taxRate = currentInvoiceTemplate.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      setCurrentInvoiceTemplate((prev) => ({
        ...prev!,
        taxAmount,
        total,
      }));
    }
  }, [currentInvoiceTemplate?.taxRate, templateInvoiceItems]);

  // Sync template AS item hours with invoice item quantities
  useEffect(() => {
    if (templateAddASDocument && currentInvoiceTemplate) {
      syncTemplateASHoursWithQuantities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateInvoiceItems, templateAddASDocument]);

  // Invoice Items Management Functions
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { quantity: 1, description: "", unitPrice: 0, total: 0 }]);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unitPrice || 0;
      updated[index].total = quantity * unitPrice;
    }
    setInvoiceItems(updated);
  };

  // Template Invoice Items Management Functions
  const addTemplateInvoiceItem = () => {
    setTemplateInvoiceItems([...templateInvoiceItems, { quantity: 1, description: "", unitPrice: 0, total: 0 }]);
  };

  const removeTemplateInvoiceItem = (index: number) => {
    setTemplateInvoiceItems(templateInvoiceItems.filter((_, i) => i !== index));
  };

  const updateTemplateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...templateInvoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unitPrice || 0;
      updated[index].total = quantity * unitPrice;
    }
    setTemplateInvoiceItems(updated);
  };

  // AS Items Management Functions
  const addASItem = () => {
    setAsItems([...asItems, { executedBy: "", hours: 0 }]);
  };

  const removeASItem = (index: number) => {
    setAsItems(asItems.filter((_, i) => i !== index));
  };

  const updateASItem = (index: number, field: keyof ASItem, value: any) => {
    const updated = [...asItems];
    updated[index] = { ...updated[index], [field]: value };
    setAsItems(updated);
  };

  // Helper function to compress image with file size checking
  const compressImage = (
    file: File, 
    maxWidth: number = 1200, 
    quality: number = 0.7,
    maxFileSizeMB: number = 2
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // If original file is very large, use more aggressive compression from the start
          const originalSizeMB = file.size / (1024 * 1024);
          let currentMaxWidth = maxWidth;
          let currentQuality = quality;

          if (originalSizeMB > 5) {
            // Very large files (>5MB): reduce dimensions and quality more aggressively
            currentMaxWidth = 800;
            currentQuality = 0.5;
          } else if (originalSizeMB > 3) {
            // Large files (>3MB): reduce quality
            currentMaxWidth = 1000;
            currentQuality = 0.6;
          }

          // Try compression with iterative quality/dimension reduction if needed
          const tryCompress = (attemptQuality: number, attemptWidth: number): void => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if larger than attemptWidth
            if (width > attemptWidth) {
              height = (height * attemptWidth) / width;
              width = attemptWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', attemptQuality);
            
            // Calculate approximate size of base64 string (base64 is ~33% larger than binary)
            const base64SizeMB = (compressedBase64.length * 3) / (4 * 1024 * 1024);
            
            if (base64SizeMB <= maxFileSizeMB) {
              // Acceptable size
              resolve(compressedBase64);
            } else if (attemptQuality > 0.3) {
              // Still too large, reduce quality by 0.1
              tryCompress(Math.max(0.3, attemptQuality - 0.1), attemptWidth);
            } else if (attemptWidth > 400) {
              // Quality is at minimum, reduce dimensions
              tryCompress(0.3, Math.max(400, attemptWidth - 200));
            } else {
              // Minimum compression reached, accept the result
              resolve(compressedBase64);
            }
          };

          tryCompress(currentQuality, currentMaxWidth);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      // Check file size first
      const fileSizeMB = file.size / (1024 * 1024);
      
      // Compress image before storing (max 2MB target size)
      // If original is very large, compression will be more aggressive
      const compressedBase64 = await compressImage(file, 1200, 0.7, 2);
      
      // Verify final size
      const finalSizeMB = (compressedBase64.length * 3) / (4 * 1024 * 1024);
      console.log(`Image compressed: ${fileSizeMB.toFixed(2)}MB -> ${finalSizeMB.toFixed(2)}MB`);
      
      updateASItem(index, "image", compressedBase64);
    } catch (error) {
      console.error("Error compressing image:", error);
      setError("Failed to compress image. Please try a smaller image.");
      // Don't fallback to original if compression fails - user should try again with smaller image
    }
  };

  // Sync template AS items with invoice items
  const syncTemplateASItemsWithInvoiceItems = () => {
    if (templateInvoiceItems.length === 0) {
      setTemplateAsItems([]);
      return;
    }

    // Create AS items matching invoice items
    const newASItems = templateInvoiceItems.map((invoiceItem) => ({
      executedBy: "",
      hours: invoiceItem.quantity || 0,
    }));

    setTemplateAsItems(newASItems);
  };

  // Sync AS item hours when invoice item quantities change
  const syncTemplateASHoursWithQuantities = () => {
    if (!templateAddASDocument) {
      return;
    }

    if (templateInvoiceItems.length === 0) {
      setTemplateAsItems([]);
      return;
    }

    // Update hours to match quantities, preserving executedBy values
    // If items were added/removed, create new AS items or remove extras
    const updatedASItems = templateInvoiceItems.map((invoiceItem, index) => {
      const existingASItem = templateAsItems[index];
      return {
        executedBy: existingASItem?.executedBy || "",
        hours: invoiceItem.quantity || 0,
      };
    });

    setTemplateAsItems(updatedASItems);
  };

  // Template AS Items Management Functions
  const addTemplateASItem = () => {
    setTemplateAsItems([...templateAsItems, { executedBy: "", hours: 0 }]);
  };

  const removeTemplateASItem = (index: number) => {
    setTemplateAsItems(templateAsItems.filter((_, i) => i !== index));
  };

  const updateTemplateASItem = (index: number, field: keyof ASItem, value: any) => {
    const updated = [...templateAsItems];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateAsItems(updated);
  };

  const handleCreateInvoice = () => {
    // Initialize new invoice form
    const newInvoice: CreateInvoiceRequest = {
      invoiceNumber: 0,
      date: new Date().toISOString().split("T")[0],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      items: [],
      isTemplate: false,
      sent: false,
      hasASDocument: false,
      description: "",
    };
    setCurrentInvoice(newInvoice);
    setCurrentInvoiceTemplate(null);
    setInvoiceItems([]);
    setAsItems([]);
    setAddASDocument(false);
    setSelectedTemplateId(null);
    setBasicInfoExpanded(true); // Expanded by default when creating new invoice
    setView("createInvoice");
  };

  const handleTemplateSelect = async (templateId: number | null) => {
    setSelectedTemplateId(templateId);
    
    // If no template selected, expand basic info section
    if (!templateId) {
      setBasicInfoExpanded(true);
      return;
    }
    
    if (!currentInvoice) {
      return;
    }

    try {
      const { invoice: template } = await invoiceService.getInvoiceTemplateById(templateId);
      
      // Get next invoice number from fetched invoices (not templates, only actual invoices)
      let nextInvoiceNumber = 1;
      if (template.toCompanyId) {
        // Filter invoices for this company (excluding templates)
        const companyInvoices = invoices.filter(
          inv => inv.toCompanyId === template.toCompanyId && !inv.isTemplate
        );
        
        if (companyInvoices.length > 0) {
          // Find the highest invoice number
          const maxInvoiceNumber = Math.max(...companyInvoices.map(inv => inv.invoiceNumber));
          nextInvoiceNumber = maxInvoiceNumber + 1;
        } else {
          nextInvoiceNumber = 1;
        }
      }

      // Populate invoice form from template
      setCurrentInvoice({
        invoiceNumber: nextInvoiceNumber,
        date: new Date().toISOString().split("T")[0], // Always use current date
        subtotal: template.subtotal,
        taxRate: template.taxRate,
        taxAmount: template.taxAmount,
        total: template.total,
        items: template.items || [],
        isTemplate: false,
        sent: false,
        hasASDocument: template.hasASDocument || false,
        description: template.description || "",
        fromCompanyId: template.fromCompanyId || undefined,
        fromContactId: template.fromContactId || undefined,
        toCompanyId: template.toCompanyId || undefined,
        toContactId: template.toContactId || undefined,
        currencyId: template.currencyId || undefined,
        emailTemplateId: template.emailTemplateId || undefined, // Save email template from template
      });

      // Collapse basic info section when template is selected
      setBasicInfoExpanded(false);

      // Set invoice items
      if (template.items && Array.isArray(template.items)) {
        setInvoiceItems(template.items as InvoiceItem[]);
      } else {
        setInvoiceItems([]);
      }

      // Set AS items if template has AS document
      if (template.hasASDocument && template.ASDocument && Array.isArray(template.ASDocument)) {
        // For invoices, copy AS items and allow hours/images to be set
        const asItemsFromTemplate = template.ASDocument.map((item, index) => {
          const invoiceItem = template.items && Array.isArray(template.items) 
            ? (template.items as InvoiceItem[])[index] 
            : null;
          return {
            executedBy: item.executedBy,
            hours: invoiceItem?.quantity || item.hours || 0, // Use invoice item quantity as hours
            image: undefined, // Allow image upload for invoices
          };
        });
        setAsItems(asItemsFromTemplate);
        setAddASDocument(true);
      } else {
        setAsItems([]);
        setAddASDocument(false);
      }
    } catch (err: any) {
      console.error("Failed to load template:", err);
      setError(err.message || "Failed to load template");
    }
  };

  const handleCreateTemplate = () => {
    // Initialize new template form
    const newTemplate: CreateInvoiceRequest = {
      invoiceNumber: 0, // Templates don't need invoice numbers
      date: new Date().toISOString().split("T")[0],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      items: [],
      isTemplate: true, // Always true for templates
      sent: false,
      hasASDocument: false,
      description: "",
      name: "", // Template name
    };
    setCurrentInvoiceTemplate(newTemplate);
    setCurrentInvoice(null);
    setTemplateInvoiceItems([]);
    setTemplateAsItems([]);
    setTemplateAddASDocument(false);
    setView("createTemplate");
  };

  const handleSaveTemplate = async () => {
    if (!currentInvoiceTemplate) return;

    try {
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!currentInvoiceTemplate.name || currentInvoiceTemplate.name.trim() === "") {
        setError("Template name is required");
        return;
      }

      // Prepare ASDocument: for templates, remove hours (keep only executedBy)
      let ASDocument: ASItem[] | undefined = undefined;
      if (templateAddASDocument && templateAsItems.length > 0) {
        ASDocument = templateAsItems
          .filter(item => item.executedBy)
          .map(item => ({
            executedBy: item.executedBy,
            hours: 0, // Templates don't store hours
          }));
      }

      // Prepare the data for API call
      const templateData: CreateInvoiceRequest = {
        invoiceNumber: 0, // Templates don't need invoice numbers
        date: currentInvoiceTemplate.date || new Date().toISOString().split("T")[0],
        subtotal: currentInvoiceTemplate.subtotal || 0,
        taxRate: currentInvoiceTemplate.taxRate || 0,
        taxAmount: currentInvoiceTemplate.taxAmount || 0,
        total: currentInvoiceTemplate.total || 0,
        isTemplate: true,
        name: currentInvoiceTemplate.name,
        description: currentInvoiceTemplate.description || undefined,
        hasASDocument: templateAddASDocument && templateAsItems.length > 0,
        ASDocument: ASDocument,
        items: templateInvoiceItems,
        fromCompanyId: currentInvoiceTemplate.fromCompanyId,
        fromContactId: currentInvoiceTemplate.fromContactId,
        toCompanyId: currentInvoiceTemplate.toCompanyId,
        toContactId: currentInvoiceTemplate.toContactId,
        currencyId: currentInvoiceTemplate.currencyId,
        emailTemplateId: currentInvoiceTemplate.emailTemplateId,
        sent: false,
      };

      await invoiceService.createInvoice(templateData);
      
      // Reload templates
      const templatesResponse = await invoiceService.getAllInvoiceTemplates();
      setInvoiceTemplates(templatesResponse.invoices);
      
      // Show success message and navigate after a brief delay
      setSuccess("Template created successfully");
      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to save template:", err);
      setError(err.response?.data?.error || err.message || "Failed to save template");
    }
  };

  const handleCancel = () => {
    setCurrentInvoice(null);
    setCurrentInvoiceTemplate(null);
    setInvoiceItems([]);
    setAsItems([]);
    setTemplateInvoiceItems([]);
    setTemplateAsItems([]);
    setAddASDocument(false);
    setTemplateAddASDocument(false);
    setSelectedTemplateId(null);
    setDescriptionExpanded(false);
    setBasicInfoExpanded(true); // Reset to expanded when canceling
    setSuccess(null);
    setError(null);
    setPreviewDialogOpen(false);
    setPreviewPdfUrl(null);
    setView("list");
  };

  // Convert oklch colors to RGB for html2canvas compatibility
  const convertOklchToRgb = (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element);
    const allElements = element.querySelectorAll("*");

    // Process the element itself
    const bgColor = computedStyle.backgroundColor;
    const color = computedStyle.color;

    // If colors are transparent or already RGB, skip
    if (bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)") {
      element.style.backgroundColor = bgColor;
    }
    if (color && color !== "transparent") {
      element.style.color = color;
    }

    // Process all child elements
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

  // Create PDF from invoice template
  const createInvoicePDF = async () => {
    if (!invoicePdfRef.current) {
      return null;
    }

    const canvas = await html2canvas(invoicePdfRef.current, {
      scale: 1.5, // Reduced from 2 to 1.5 for smaller file size while maintaining good quality
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

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;

    // Use JPEG with high quality (0.85) instead of PNG for smaller file size
    // This maintains good visual quality while significantly reducing file size
    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  };

  // Create PDF from AS document template
  const createASPDF = async () => {
    if (!asPdfRef.current) {
      return null;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      
      const mainContainer = asPdfRef.current;
      if (!mainContainer) {
        console.error("Main container not found");
        return null;
      }

      const pageContainers = mainContainer.querySelectorAll(".pdf-page");
      
      if (pageContainers.length === 0) {
        const canvas = await html2canvas(mainContainer, {
          scale: 1, // Reduced from 2 to 1 for smaller file size
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
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        // Use JPEG with lower quality for smaller file size
        const imgData = canvas.toDataURL("image/jpeg", 0.7);
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        return pdf;
      }
      
      for (let i = 0; i < pageContainers.length; i++) {
        const pageContainer = pageContainers[i] as HTMLElement;
        
        const originalDisplay = pageContainer.style.display;
        const originalPosition = pageContainer.style.position;
        pageContainer.style.display = "block";
        pageContainer.style.position = "relative";
        
        try {
          const canvas = await html2canvas(pageContainer, {
            scale: 1, // Reduced from 2 to 1 for smaller file size
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: pageContainer.scrollWidth,
            windowHeight: pageContainer.scrollHeight,
            onclone: (_clonedDoc, element) => {
              if (element) {
                convertOklchToRgb(element);
              }
            },
          });

          pageContainer.style.display = originalDisplay;
          pageContainer.style.position = originalPosition;

          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.error(`Failed to capture page ${i + 1}: canvas is empty`);
            continue;
          }

          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          // Use JPEG with lower quality for smaller file size (0.7 for AS documents with images)
          const imgData = canvas.toDataURL("image/jpeg", 0.7);

          if (i > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        } catch (pageError) {
          console.error(`Error capturing page ${i + 1}:`, pageError);
          pageContainer.style.display = originalDisplay;
          pageContainer.style.position = originalPosition;
          throw pageError;
        }
      }

      return pdf;
    } catch (error) {
      console.error("Error generating AS PDF:", error);
      throw error;
    }
  };

  // Preview PDF
  const previewPDF = async (type: "invoice" | "as") => {
    setIsGeneratingPreview(true);
    setError(null);

    try {
      let pdf;
      if (type === "invoice") {
        pdf = await createInvoicePDF();
      } else {
        pdf = await createASPDF();
      }

      if (!pdf) {
        setError("Failed to generate PDF");
        return;
      }

      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }

      setPreviewPdfUrl(pdfUrl);
      setPreviewType(type);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      setError("Failed to generate PDF preview. Please try again.");
    } finally {
      setIsGeneratingPreview(false);
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
      link.download = previewType === "invoice" ? "Invoice.pdf" : "AS_Document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("PDF downloaded successfully!");
    }
  };

  // Check if from company is PavleTek
  const isPavleTekCompany = (): boolean => {
    if (!currentInvoice?.fromCompanyId) return false;
    const fromCompany = companies.find(c => c.id === currentInvoice.fromCompanyId);
    if (!fromCompany) return false;
    const name = (fromCompany.displayName || fromCompany.legalName || "").toLowerCase();
    return name.includes("pavletek");
  };

  // Helper function to sanitize company name for file names
  const sanitizeCompanyName = (name: string | null | undefined): string => {
    if (!name) return "Unknown";
    // Replace spaces and special characters with underscores, remove multiple underscores
    return name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim();
  };

  // Helper function to format date as month_year (MonthName_YYYY)
  const formatDateForFileName = (dateString: string | undefined): string => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (!dateString) {
      const now = new Date();
      const monthName = monthNames[now.getMonth()];
      const year = now.getFullYear();
      return `${monthName}_${year}`;
    }

    try {
      let dateObj: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // YYYY-MM-DD format (ISO)
        const [year, month, day] = dateString.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        // MM/DD/YYYY format
        const [month, day, year] = dateString.split('/').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(dateString);
      }

      if (isNaN(dateObj.getTime())) {
        const now = new Date();
        const monthName = monthNames[now.getMonth()];
        const year = now.getFullYear();
        return `${monthName}_${year}`;
      }

      const monthName = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${monthName}_${year}`;
    } catch (error) {
      const now = new Date();
      const monthName = monthNames[now.getMonth()];
      const year = now.getFullYear();
      return `${monthName}_${year}`;
    }
  };

  // Handle opening email dialog
  const handleOpenEmailDialog = async () => {
    if (!currentInvoice) return;

    setIsGeneratingEmailPdfs(true);
    setError(null);

    try {
      // Get company display names
      const fromCompany = companies.find(c => c.id === currentInvoice.fromCompanyId);
      const toCompany = companies.find(c => c.id === currentInvoice.toCompanyId);
      const fromCompanyName = sanitizeCompanyName(fromCompany?.displayName || fromCompany?.legalName);
      const toCompanyName = sanitizeCompanyName(toCompany?.displayName || toCompany?.legalName);
      const dateFormatted = formatDateForFileName(currentInvoice.date);

      // Generate PDFs
      const attachments: File[] = [];

      // Generate invoice PDF if PavleTek company
      if (isPavleTekCompany()) {
        const invoicePdf = await createInvoicePDF();
        if (invoicePdf) {
          const invoiceBlob = invoicePdf.output("blob");
          const invoiceNumber = String(currentInvoice.invoiceNumber || "").padStart(5, '0');
          const invoiceFileName = `Invoice_${fromCompanyName}_${toCompanyName}_N${invoiceNumber}_${dateFormatted}.pdf`;
          const invoiceFile = new File([invoiceBlob], invoiceFileName, {
            type: "application/pdf",
          });
          attachments.push(invoiceFile);
        }
      }

      // Generate AS PDF if available
      if (addASDocument && asItems.length > 0) {
        const asPdf = await createASPDF();
        if (asPdf) {
          const asBlob = asPdf.output("blob");
          const asFileName = `AS_${fromCompanyName}_${toCompanyName}_${dateFormatted}.pdf`;
          const asFile = new File([asBlob], asFileName, {
            type: "application/pdf",
          });
          attachments.push(asFile);
        }
      }

      // Get email template if available
      let emailSubject = "";
      let emailContent = "";
      let emailFromEmail: string | undefined = undefined;
      let emailToEmails: string[] = [];
      let emailCcEmails: string[] = [];
      let emailBccEmails: string[] = [];

      if (currentInvoice.emailTemplateId) {
        try {
          // Fetch the full email template to get all merged emails
          const { emailTemplate } = await emailTemplateService.getEmailTemplateById(currentInvoice.emailTemplateId);
          
          emailSubject = emailTemplate.subject || "";
          emailContent = emailTemplate.content || "";
          emailFromEmail = emailTemplate.fromEmail || undefined;
          
          // Use merged emails from template (includes both hard-typed and contact emails)
          // Handle both array and single string/null cases
          if (emailTemplate.destinationEmail) {
            emailToEmails = Array.isArray(emailTemplate.destinationEmail) 
              ? emailTemplate.destinationEmail.filter((email): email is string => typeof email === 'string' && email.length > 0)
              : typeof emailTemplate.destinationEmail === 'string' 
                ? [emailTemplate.destinationEmail] 
                : [];
          }
          
          if (emailTemplate.ccEmail) {
            emailCcEmails = Array.isArray(emailTemplate.ccEmail) 
              ? emailTemplate.ccEmail.filter((email): email is string => typeof email === 'string' && email.length > 0)
              : typeof emailTemplate.ccEmail === 'string' 
                ? [emailTemplate.ccEmail] 
                : [];
          }
          
          if (emailTemplate.bccEmail) {
            emailBccEmails = Array.isArray(emailTemplate.bccEmail) 
              ? emailTemplate.bccEmail.filter((email): email is string => typeof email === 'string' && email.length > 0)
              : typeof emailTemplate.bccEmail === 'string' 
                ? [emailTemplate.bccEmail] 
                : [];
          }
        } catch (err) {
          console.error("Failed to load email template:", err);
          // Fallback: if template loading fails, don't populate template data
        }
      }

      // Store attachments for email dialog
      setEmailAttachments(attachments);
      setEmailInitialData({
        fromEmail: emailFromEmail,
        toEmails: emailToEmails,
        ccEmails: emailCcEmails.length > 0 ? emailCcEmails : undefined,
        bccEmails: emailBccEmails.length > 0 ? emailBccEmails : undefined,
        subject: emailSubject,
        content: emailContent,
      });

      setEmailDialogOpen(true);
    } catch (error) {
      console.error("Error preparing email:", error);
      setError("Failed to prepare email. Please try again.");
    } finally {
      setIsGeneratingEmailPdfs(false);
    }
  };

  // Helper function to save invoice data (without auto-cancel)
  const saveInvoiceData = async (): Promise<void> => {
    if (!currentInvoice) {
      throw new Error("No invoice data to save");
    }

    // Validate required fields
    if (!currentInvoice.invoiceNumber || currentInvoice.invoiceNumber <= 0) {
      throw new Error("Invoice number is required");
    }

    if (!currentInvoice.toCompanyId) {
      throw new Error("To Company is required");
    }

    // Prepare ASDocument: for invoices, include hours and images
    let ASDocument: ASItem[] | undefined = undefined;
    if (addASDocument && asItems.length > 0) {
      ASDocument = asItems.map(item => ({
        executedBy: item.executedBy || "",
        hours: item.hours || 0,
        image: item.image, // Include image for invoices
      }));
    }

    // Prepare the data for API call
    const invoiceData: CreateInvoiceRequest = {
      invoiceNumber: currentInvoice.invoiceNumber,
      date: currentInvoice.date || new Date().toISOString().split("T")[0],
      subtotal: currentInvoice.subtotal || 0,
      taxRate: currentInvoice.taxRate || 0,
      taxAmount: currentInvoice.taxAmount || 0,
      total: currentInvoice.total || 0,
      isTemplate: false,
      description: currentInvoice.description || undefined,
      hasASDocument: addASDocument && asItems.length > 0,
      ASDocument: ASDocument,
      items: invoiceItems,
      fromCompanyId: currentInvoice.fromCompanyId,
      fromContactId: currentInvoice.fromContactId,
      toCompanyId: currentInvoice.toCompanyId,
      toContactId: currentInvoice.toContactId,
      currencyId: currentInvoice.currencyId,
      emailTemplateId: currentInvoice.emailTemplateId,
      sent: false,
    };

    await invoiceService.createInvoice(invoiceData);
    
    // Reload invoices
    const invoicesResponse = await invoiceService.getAllInvoices();
    setInvoices(invoicesResponse.invoices);
  };

  // Handle sending email
  const handleSendEmail = async (emailData: SendTestEmailRequest) => {
    try {
      setError(null);
      
      // Save the invoice first before sending email
      await saveInvoiceData();
      
      // Include attachments in email data
      const emailDataWithAttachments: SendTestEmailRequest = {
        ...emailData,
        attachments: emailAttachments,
      };
      
      await emailService.sendTestEmail(emailDataWithAttachments);
      setSuccess("Invoice saved and email sent successfully!");
      setEmailDialogOpen(false);
      setEmailAttachments([]);
      setEmailInitialData(undefined);
      
      // Navigate back to list after a brief delay
      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to save invoice or send email:", err);
      setError(err.response?.data?.error || err.message || "Failed to save invoice or send email");
      throw err;
    }
  };

  const closeEmailDialog = () => {
    setEmailDialogOpen(false);
    setEmailAttachments([]);
    setEmailInitialData(undefined);
  };

  // Handle edit invoice/template
  const handleEditInvoice = (invoice: Invoice) => {
    // Load invoice data into form
    setCurrentInvoice({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      isTemplate: false,
      description: invoice.description || "",
      hasASDocument: invoice.hasASDocument || false,
      fromCompanyId: invoice.fromCompanyId || undefined,
      fromContactId: invoice.fromContactId || undefined,
      toCompanyId: invoice.toCompanyId || undefined,
      toContactId: invoice.toContactId || undefined,
      currencyId: invoice.currencyId || undefined,
      emailTemplateId: invoice.emailTemplateId || undefined,
      sent: invoice.sent || false,
    });
    setInvoiceItems((invoice.items as InvoiceItem[]) || []);
    if (invoice.hasASDocument && invoice.ASDocument && Array.isArray(invoice.ASDocument)) {
      setAsItems(invoice.ASDocument);
      setAddASDocument(true);
    } else {
      setAsItems([]);
      setAddASDocument(false);
    }
    setView("createInvoice");
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    // Load template data into form
    setCurrentInvoiceTemplate({
      invoiceNumber: 0,
      date: template.date,
      subtotal: template.subtotal,
      taxRate: template.taxRate,
      taxAmount: template.taxAmount,
      total: template.total,
      isTemplate: true,
      name: template.name || "",
      description: template.description || "",
      hasASDocument: template.hasASDocument || false,
      fromCompanyId: template.fromCompanyId || undefined,
      fromContactId: template.fromContactId || undefined,
      toCompanyId: template.toCompanyId || undefined,
      toContactId: template.toContactId || undefined,
      currencyId: template.currencyId || undefined,
      emailTemplateId: template.emailTemplateId || undefined,
      sent: false,
    });
    setTemplateInvoiceItems((template.items as InvoiceItem[]) || []);
    if (template.hasASDocument && template.ASDocument && Array.isArray(template.ASDocument)) {
      setTemplateAsItems(template.ASDocument.map(item => ({
        executedBy: item.executedBy,
        hours: 0,
      })));
      setTemplateAddASDocument(true);
    } else {
      setTemplateAsItems([]);
      setTemplateAddASDocument(false);
    }
    setView("createTemplate");
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: number) => {
    setInvoiceToDelete(id);
    setDeleteConfirmationOpen(true);
  };

  // Handle actual delete
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await invoiceService.deleteInvoice(invoiceToDelete);
      setSuccess("Invoice deleted successfully");
      setDeleteConfirmationOpen(false);
      setInvoiceToDelete(null);
      
      // Reload data
      await loadData();
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      setError(err.response?.data?.error || err.message || "Failed to delete invoice");
      setDeleteConfirmationOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Handle save invoice
  const handleSaveInvoice = async () => {
    if (!currentInvoice) return;

    try {
      setError(null);
      setSuccess(null);

      await saveInvoiceData();
      
      // Show success message and navigate after a brief delay
      setSuccess("Invoice created successfully");
      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to save invoice:", err);
      setError(err.response?.data?.error || err.message || "Failed to save invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Render Create Invoice Form
  const renderCreateInvoiceForm = () => {
    if (!currentInvoice) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Invoice</h2>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Template (Optional)</label>
          <select
            value={selectedTemplateId || ""}
            onChange={(e) => handleTemplateSelect(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">No Template</option>
            {invoiceTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name || `Template ${template.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Basic Info Section - Collapsible when template is selected */}
        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={() => setBasicInfoExpanded(!basicInfoExpanded)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-4"
          >
            <span>Invoice Details</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${basicInfoExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {basicInfoExpanded && (
            <div className="space-y-4">
              {/* Invoice Number, Date, Currency, Tax Rate - Second Line */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input
              type="number"
              value={currentInvoice.invoiceNumber || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, invoiceNumber: parseInt(e.target.value) || 0 })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={currentInvoice.date || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, date: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currentInvoice.currencyId || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, currencyId: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Currency</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.name} ({currency.abbreviation})
                </option>
              ))}
            </select>
          </div>

          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={currentInvoice.taxRate || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, taxRate: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* From Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Company</label>
            <select
              value={currentInvoice.fromCompanyId || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, fromCompanyId: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName || company.legalName || `Company ${company.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* From Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Contact</label>
            <select
              value={currentInvoice.fromContactId || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, fromContactId: e.target.value ? parseInt(e.target.value) : undefined })}
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

          {/* To Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Company</label>
            <select
              value={currentInvoice.toCompanyId || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, toCompanyId: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName || company.legalName || `Company ${company.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* To Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Contact</label>
            <select
              value={currentInvoice.toContactId || ""}
              onChange={(e) => setCurrentInvoice({ ...currentInvoice, toContactId: e.target.value ? parseInt(e.target.value) : undefined })}
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
          )}
        </div>

        {/* Description - Collapsible */}
        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Description</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {descriptionExpanded && (
            <div className="mt-2">
              <textarea
                value={currentInvoice.description || ""}
                onChange={(e) => setCurrentInvoice({ ...currentInvoice, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Invoice Items Section */}
        <div className="md:col-span-2 pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Invoice Items</h3>
            <button
              onClick={addInvoiceItem}
              className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium cursor-pointer"
            >
              Add Item
            </button>
          </div>
          <div className="space-y-3">
            {invoiceItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-md">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity || ""}
                    onChange={(e) => updateInvoiceItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateInvoiceItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.total || ""}
                    readOnly
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => removeInvoiceItem(index)}
                    className="w-full px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {invoiceItems.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No items added yet. Click "Add Item" to start.</p>
            )}
          </div>
        </div>

        {/* AS Document Section - Only shown if template has AS document */}
        {addASDocument && (
          <div className="md:col-span-2 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">AS Document</h3>
              <button
                onClick={addASItem}
                className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium cursor-pointer"
              >
                Add AS Item
              </button>
            </div>
            <div className="space-y-3">
              {asItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-md">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Executed By</label>
                    <input
                      type="text"
                      value={item.executedBy || ""}
                      onChange={(e) => updateASItem(index, "executedBy", e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.hours || ""}
                      onChange={(e) => updateASItem(index, "hours", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(index, file);
                      }}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removeASItem(index)}
                      className="w-full px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {asItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No AS items added yet. Click "Add AS Item" to start.</p>
              )}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoice.subtotal || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoice.taxAmount || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoice.total || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Hidden PDF templates for preview */}
        {currentInvoice && (
          <>
            {/* Invoice PDF Template */}
            {isPavleTekCompany() && (
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
                <PavletekInvoice
                  ref={invoicePdfRef}
                  date={currentInvoice.date || new Date().toISOString().split("T")[0]}
                  invoiceNumber={String(currentInvoice.invoiceNumber || "")}
                  fromCompany={companies.find(c => c.id === currentInvoice.fromCompanyId) || null}
                  fromContact={contacts.find(c => c.id === currentInvoice.fromContactId) || null}
                  toCompany={companies.find(c => c.id === currentInvoice.toCompanyId) || null}
                  toContact={contacts.find(c => c.id === currentInvoice.toContactId) || null}
                  items={invoiceItems.map(item => ({
                    quantity: item.quantity || 0,
                    description: item.description || "",
                    unitPrice: item.unitPrice || 0,
                    total: item.total || 0,
                  }))}
                  salesTax={(currentInvoice.taxRate || 0) / 100}
                />
              </div>
            )}
            
            {/* AS Document PDF Template */}
            {addASDocument && asItems.length > 0 && (
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
                <KibernumAS
                  ref={asPdfRef}
                  date={currentInvoice.date || new Date().toISOString().split("T")[0]}
                  items={asItems.map(item => ({
                    executedBy: item.executedBy,
                    hours: item.hours,
                    image: item.image || "",
                  }))}
                />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium cursor-pointer"
          >
            Cancel
          </button>
          {isPavleTekCompany() && (
            <button
              onClick={() => previewPDF("invoice")}
              disabled={isGeneratingPreview}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <EyeIcon className="h-5 w-5" />
              {isGeneratingPreview ? "Generating..." : "Preview Invoice"}
            </button>
          )}
          {addASDocument && asItems.length > 0 && (
            <button
              onClick={() => previewPDF("as")}
              disabled={isGeneratingPreview}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <EyeIcon className="h-5 w-5" />
              {isGeneratingPreview ? "Generating..." : "Preview AS"}
            </button>
          )}
          <button
            onClick={handleOpenEmailDialog}
            disabled={isGeneratingEmailPdfs || !currentInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EnvelopeIcon className="h-5 w-5" />
            {isGeneratingEmailPdfs ? "Preparing..." : "Send Email"}
          </button>
          <button
            onClick={handleSaveInvoice}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium cursor-pointer"
          >
            Save Invoice
          </button>
        </div>
      </div>
    );
  };

  // Render Create Template Form
  const renderCreateTemplateForm = () => {
    if (!currentInvoiceTemplate) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Template</h2>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Template Name - Full Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
          <input
            type="text"
            value={currentInvoiceTemplate.name || ""}
            onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, name: e.target.value } : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Enter template name"
          />
        </div>

        {/* Date, Currency, Tax Rate, Email Template - Second Line */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={currentInvoiceTemplate.date || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, date: e.target.value } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currentInvoiceTemplate.currencyId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, currencyId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Currency</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.name} ({currency.abbreviation})
                </option>
              ))}
            </select>
          </div>

          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={currentInvoiceTemplate.taxRate || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, taxRate: parseFloat(e.target.value) || 0 } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Email Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Template</label>
            <select
              value={currentInvoiceTemplate.emailTemplateId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, emailTemplateId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Email Template</option>
              {emailTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.description || `Template ${template.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* From Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Company</label>
            <select
              value={currentInvoiceTemplate.fromCompanyId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, fromCompanyId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName || company.legalName || `Company ${company.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* From Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Contact</label>
            <select
              value={currentInvoiceTemplate.fromContactId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, fromContactId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
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

          {/* To Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Company</label>
            <select
              value={currentInvoiceTemplate.toCompanyId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, toCompanyId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.displayName || company.legalName || `Company ${company.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* To Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Contact</label>
            <select
              value={currentInvoiceTemplate.toContactId || ""}
              onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, toContactId: e.target.value ? parseInt(e.target.value) : undefined } : null)}
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

        {/* Description - Collapsible */}
        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Description</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {descriptionExpanded && (
            <div className="mt-2">
              <textarea
                value={currentInvoiceTemplate.description || ""}
                onChange={(e) => setCurrentInvoiceTemplate((prev) => prev ? { ...prev, description: e.target.value } : null)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Invoice Items Section */}
        <div className="md:col-span-2 pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Invoice Items</h3>
            <button
              onClick={addTemplateInvoiceItem}
              className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium cursor-pointer"
            >
              Add Item
            </button>
          </div>
          <div className="space-y-3">
            {templateInvoiceItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-md">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity || ""}
                    onChange={(e) => updateTemplateInvoiceItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => updateTemplateInvoiceItem(index, "description", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateTemplateInvoiceItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.total || ""}
                    readOnly
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-gray-100"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => removeTemplateInvoiceItem(index)}
                    className="w-full px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {templateInvoiceItems.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No items added yet. Click "Add Item" to start.</p>
            )}
          </div>
        </div>

        {/* AS Document Section */}
        <div className="md:col-span-2 pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={templateAddASDocument}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setTemplateAddASDocument(isChecked);
                  if (isChecked) {
                    // Create AS items from invoice items when checkbox is checked
                    syncTemplateASItemsWithInvoiceItems();
                  } else {
                    setTemplateAsItems([]);
                  }
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <h3 className="text-lg font-medium">AS Document</h3>
            </div>
            {templateAddASDocument && (
              <button
                onClick={addTemplateASItem}
                className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium cursor-pointer"
              >
                Add AS Item
              </button>
            )}
          </div>
          {templateAddASDocument && (
            <div className="space-y-3">
              {templateAsItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-md">
                  <div className="col-span-8">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Executed By</label>
                    <input
                      type="text"
                      value={item.executedBy || ""}
                      onChange={(e) => updateTemplateASItem(index, "executedBy", e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.hours || ""}
                      onChange={(e) => updateTemplateASItem(index, "hours", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removeTemplateASItem(index)}
                      className="w-full px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {templateAsItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No AS items added yet. Click "Add AS Item" to start.</p>
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoiceTemplate!.subtotal || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoiceTemplate!.taxAmount || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input
                type="number"
                step="0.01"
                value={currentInvoiceTemplate!.total || ""}
                readOnly
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium cursor-pointer"
          >
            Save Template
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}
      
      {view === "list" && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-base font-semibold text-gray-900">Invoices</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage your invoices and invoice templates.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
              <button
                onClick={handleCreateTemplate}
                className="block rounded-md bg-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-300 cursor-pointer"
              >
                Create Template
              </button>
              <button
                onClick={handleCreateInvoice}
                className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-primary-700 cursor-pointer"
              >
                Create Invoice
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("invoices")}
                className={`${
                  activeTab === "invoices"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium cursor-pointer`}
              >
                Invoices
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`${
                  activeTab === "templates"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium cursor-pointer`}
              >
                Templates
              </button>
            </nav>
          </div>

          {/* Invoices Table */}
          {activeTab === "invoices" && (
            <div className="mt-8 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                    <table className="relative min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Invoice Number
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Date
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            From Company
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            To Company
                          </th>
                          <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6 text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {invoices.filter(inv => !inv.isTemplate).map((invoice) => {
                          const fromCompany = companies.find(c => c.id === invoice.fromCompanyId);
                          const toCompany = companies.find(c => c.id === invoice.toCompanyId);
                          return (
                            <tr key={invoice.id}>
                              <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                                {String(invoice.invoiceNumber).padStart(5, '0')}
                              </td>
                              <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                                {new Date(invoice.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                                {fromCompany?.displayName || fromCompany?.legalName || "—"}
                              </td>
                              <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                                {toCompany?.displayName || toCompany?.legalName || "—"}
                              </td>
                              <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                                <div className="flex justify-end gap-3">
                                  <button
                                    onClick={() => handleEditInvoice(invoice)}
                                    className="text-primary-600 hover:text-primary-900 cursor-pointer"
                                  >
                                    Edit<span className="sr-only">, Invoice {invoice.invoiceNumber}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(invoice.id)}
                                    className="text-red-600 hover:text-red-900 cursor-pointer"
                                  >
                                    Delete<span className="sr-only">, Invoice {invoice.invoiceNumber}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {invoices.filter(inv => !inv.isTemplate).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                              No invoices found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Templates Table */}
          {activeTab === "templates" && (
            <div className="mt-8 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                    <table className="relative min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Template Name
                          </th>
                          <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6 text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {invoiceTemplates.map((template) => (
                          <tr key={template.id}>
                            <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                              {template.name || `Template ${template.id}`}
                            </td>
                            <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => handleEditTemplate(template)}
                                  className="text-primary-600 hover:text-primary-900 cursor-pointer"
                                >
                                  Edit<span className="sr-only">, {template.name}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(template.id)}
                                  className="text-red-600 hover:text-red-900 cursor-pointer"
                                >
                                  Delete<span className="sr-only">, {template.name}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {invoiceTemplates.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 text-center text-sm text-gray-500">
                              No templates found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "createInvoice" && renderCreateInvoiceForm()}
      {view === "createTemplate" && renderCreateTemplateForm()}

      {/* PDF Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={closePreviewDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-6xl w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                PDF Preview - {previewType === "invoice" ? "Invoice" : "AS Document"}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadFromPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </button>
                <button onClick={closePreviewDialog} className="text-gray-400 hover:text-gray-500">
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

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={closeEmailDialog}
        onSend={handleSendEmail}
        initialData={emailInitialData}
        attachments={emailAttachments}
        title="Send Invoice Email"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onClose={() => {
          setDeleteConfirmationOpen(false);
          setInvoiceToDelete(null);
        }}
        variant="red"
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
};

export default Invoicing;
