import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, EyeIcon, ArrowDownTrayIcon, EnvelopeIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { emailService } from "../services/emailService";
import type { SendTestEmailRequest } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import EmailDialog from "../components/EmailDialog";
import PavletekInvoice, { type InvoiceItem } from "../assets/pdfTemplates/PavletekInvoice";
import RegularInvoice from "../assets/pdfTemplates/RegularInvoice";
import KibernumAS, { type KibernumASItem } from "../assets/pdfTemplates/KibernumAS";
import "../assets/invoice.css";

type TemplateType = "pavletek" | "kibernum" | "regular";

const PDFGenerator: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("pavletek");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(true);

  // Email functionality state
  const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

  // PDF Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // PavletekInvoice state
  const [pavletekData, setPavletekData] = useState({
    date: "28/10/2025",
    invoiceNumber: "00042",
    companyName: "PavleTek",
    companyAddress: "7601 Churchill Way 1338",
    companyCity: "Dallas",
    companyState: "TX",
    companyZip: "75251",
    companyPhone: "+1 940 603 9449",
    companyEmail: "Pavle@PavleTek.com",
    invoiceToName: "Kibernum USA LLC",
    invoiceToAddress: "5700 Granite Parkway STE 200",
    invoiceToCity: "Plano",
    invoiceToState: "TX",
    invoiceToZip: "75024",
    invoiceToEmail: "Gvozden.Mladenovic@kibernum.com",
    description: "Software development services for October 2025 for the project STRD-0004",
    items: [
      { quantity: 100, description: "Software development hours by Vittorio Gambi", unitPrice: 30, total: 3000 },
      { quantity: 200, description: "Software development hours by Pavle Markovic", unitPrice: 35, total: 7000 },
    ] as InvoiceItem[],
    salesTax: 0,
  });

  // RegularInvoice state (same as PavletekInvoice plus fromCompanyName)
  const [regularData, setRegularData] = useState({
    date: "28/10/2025",
    invoiceNumber: "00042",
    fromCompanyName: "PavleTek",
    companyName: "PavleTek",
    companyAddress: "7601 Churchill Way 1338",
    companyCity: "Dallas",
    companyState: "TX",
    companyZip: "75251",
    companyPhone: "+1 940 603 9449",
    companyEmail: "Pavle@PavleTek.com",
    invoiceToName: "Kibernum USA LLC",
    invoiceToAddress: "5700 Granite Parkway STE 200",
    invoiceToCity: "Plano",
    invoiceToState: "TX",
    invoiceToZip: "75024",
    invoiceToEmail: "Gvozden.Mladenovic@kibernum.com",
    description: "Software development services for October 2025 for the project STRD-0004",
    items: [
      { quantity: 100, description: "Software development hours by Vittorio Gambi", unitPrice: 30, total: 3000 },
      { quantity: 200, description: "Software development hours by Pavle Markovic", unitPrice: 35, total: 7000 },
    ] as InvoiceItem[],
    salesTax: 0,
  });

  // KibernumAS state
  const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${month}/${day}/${year}`; // US format: MM/DD/YYYY
  };

  const [kibernumData, setKibernumData] = useState({
    date: getCurrentDate(),
    items: [] as KibernumASItem[],
  });

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

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

  const createPDF = async () => {
    if (!contentRef.current) {
      return null;
    }

    // Special handling for KibernumAS - capture each page separately
    if (selectedTemplate === "kibernum") {
      try {
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210; // A4 width in mm
        
        // contentRef.current IS the [data-pdf-content] element
        const mainContainer = contentRef.current;
        if (!mainContainer) {
          console.error("Main container not found");
          return null;
        }

        // Get all page containers (first page + item pages)
        const pageContainers = mainContainer.querySelectorAll(".pdf-page");
        console.log(`Found ${pageContainers.length} page containers`);
        
        if (pageContainers.length === 0) {
          console.log("No page containers found, falling back to full capture");
          // Fallback: capture the whole container
          const canvas = await html2canvas(mainContainer, {
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
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
          return pdf;
        }
        
        for (let i = 0; i < pageContainers.length; i++) {
          const pageContainer = pageContainers[i] as HTMLElement;
          console.log(`Capturing page ${i + 1} of ${pageContainers.length}`);
          
          // Ensure the page container is visible and properly positioned
          const originalDisplay = pageContainer.style.display;
          const originalPosition = pageContainer.style.position;
          pageContainer.style.display = "block";
          pageContainer.style.position = "relative";
          
          try {
            // Capture this page as canvas
            const canvas = await html2canvas(pageContainer, {
              scale: 2,
              useCORS: true,
              logging: true, // Enable logging to see what's happening
              backgroundColor: "#ffffff",
              windowWidth: pageContainer.scrollWidth,
              windowHeight: pageContainer.scrollHeight,
              onclone: (_clonedDoc, element) => {
                // Convert colors for the cloned page
                if (element) {
                  convertOklchToRgb(element);
                }
              },
            });

            // Restore original styles
            pageContainer.style.display = originalDisplay;
            pageContainer.style.position = originalPosition;

            if (!canvas || canvas.width === 0 || canvas.height === 0) {
              console.error(`Failed to capture page ${i + 1}: canvas is empty`);
              continue;
            }

            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const imgData = canvas.toDataURL("image/png");

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
          } catch (pageError) {
            console.error(`Error capturing page ${i + 1}:`, pageError);
            // Restore original styles even on error
            pageContainer.style.display = originalDisplay;
            pageContainer.style.position = originalPosition;
            throw pageError;
          }
        }

        return pdf;
      } catch (error) {
        console.error("Error generating KibernumAS PDF:", error);
        throw error;
      }
    }

    // Standard PDF generation for other templates
    const canvas = await html2canvas(contentRef.current, {
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

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    // Create PDF
    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;

    // Convert canvas to image
    const imgData = canvas.toDataURL("image/png");

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages only if there's significant content remaining (more than 5mm)
    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  };

  const getTemplateName = () => {
    switch (selectedTemplate) {
      case "pavletek":
        return "PavletekInvoice";
      case "regular":
        return "RegularInvoice";
      case "kibernum":
        return "KibernumAS";
      default:
        return "document";
    }
  };

  const generatePDF = async (forEmail: boolean = false) => {
    if (!contentRef.current) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const pdf = await createPDF();
      if (!pdf) {
        setError("Failed to generate PDF");
        return;
      }

      if (forEmail) {
        // Convert PDF to blob for email attachment
        const pdfBlob = pdf.output("blob");
        setGeneratedPdfBlob(pdfBlob);
        setEmailDialogOpen(true);
      } else {
        // Save the PDF
        pdf.save(`${getTemplateName()}.pdf`);
        setSuccess("PDF generated successfully!");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPDF = async () => {
    if (!contentRef.current) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const pdf = await createPDF();
      if (!pdf) {
        setError("Failed to generate PDF");
        return;
      }

      // Convert PDF to blob and create URL for preview
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Clean up previous URL if exists
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }

      setPreviewPdfUrl(pdfUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      setError("Failed to generate PDF preview. Please try again.");
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
      link.download = `${getTemplateName()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("PDF downloaded successfully!");
    }
  };

  const handleSendEmail = async (emailData: SendTestEmailRequest) => {
    if (!generatedPdfBlob) {
      throw new Error("PDF blob is required");
    }

    // Convert blob to File for attachment
    const pdfFile = new File([generatedPdfBlob], `${getTemplateName()}.pdf`, {
      type: "application/pdf",
    });

    const emailDataWithAttachment: SendTestEmailRequest = {
      ...emailData,
      attachments: [pdfFile],
    };

    await emailService.sendTestEmail(emailDataWithAttachment);
    setSuccess("Email sent successfully!");
    setGeneratedPdfBlob(null);
  };

  const closeEmailDialog = () => {
    setEmailDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  // Handle file upload for KibernumAS items
  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newItems = [...kibernumData.items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], image: dataUrl };
      } else {
        newItems[index] = { executedBy: "", hours: 0, image: dataUrl };
      }
      setKibernumData({ ...kibernumData, items: newItems });
    };
    reader.readAsDataURL(file);
  };

  // Add new KibernumAS item
  const addKibernumItem = () => {
    setKibernumData({
      ...kibernumData,
      items: [...kibernumData.items, { executedBy: "", hours: 0, image: "" }],
    });
  };

  // Remove KibernumAS item
  const removeKibernumItem = (index: number) => {
    setKibernumData({
      ...kibernumData,
      items: kibernumData.items.filter((_, i) => i !== index),
    });
  };

  // Render template component based on selection
  const renderTemplate = () => {
    switch (selectedTemplate) {
      case "pavletek":
        // Create mock Company/Contact objects from form data
        const fromCompanyMock = {
          id: 0,
          address: {
            addressLine1: pavletekData.companyAddress,
            city: pavletekData.companyCity,
            state: pavletekData.companyState,
            zipCode: pavletekData.companyZip,
          },
        };
        const fromContactMock = {
          id: 0,
          phoneNumber: pavletekData.companyPhone,
          email: pavletekData.companyEmail,
        };
        const toCompanyMock = {
          id: 0,
          legalName: pavletekData.invoiceToName,
          displayName: pavletekData.invoiceToName,
          address: {
            addressLine1: pavletekData.invoiceToAddress,
            city: pavletekData.invoiceToCity,
            state: pavletekData.invoiceToState,
            zipCode: pavletekData.invoiceToZip,
          },
        };
        const toContactMock = {
          id: 0,
          email: pavletekData.invoiceToEmail,
        };
        
        return (
          <PavletekInvoice
            ref={contentRef}
            date={pavletekData.date}
            invoiceNumber={pavletekData.invoiceNumber}
            fromCompany={fromCompanyMock as any}
            fromContact={fromContactMock as any}
            toCompany={toCompanyMock as any}
            toContact={toContactMock as any}
            items={pavletekData.items}
            salesTax={pavletekData.salesTax}
          />
        );
      case "regular":
        return <RegularInvoice ref={contentRef} {...regularData} />;
      case "kibernum":
        return <KibernumAS ref={contentRef} {...kibernumData} />;
      default:
        return null;
    }
  };

  // Render form inputs based on selected template
  const renderFormInputs = () => {
    switch (selectedTemplate) {
      case "pavletek":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="text"
                  value={pavletekData.date}
                  onChange={(e) => setPavletekData({ ...pavletekData, date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={pavletekData.invoiceNumber}
                  onChange={(e) => setPavletekData({ ...pavletekData, invoiceNumber: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={pavletekData.companyName}
                onChange={(e) => setPavletekData({ ...pavletekData, companyName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
              <input
                type="text"
                value={pavletekData.companyAddress}
                onChange={(e) => setPavletekData({ ...pavletekData, companyAddress: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={pavletekData.companyCity}
                  onChange={(e) => setPavletekData({ ...pavletekData, companyCity: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={pavletekData.companyState}
                  onChange={(e) => setPavletekData({ ...pavletekData, companyState: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                <input
                  type="text"
                  value={pavletekData.companyZip}
                  onChange={(e) => setPavletekData({ ...pavletekData, companyZip: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={pavletekData.companyPhone}
                  onChange={(e) => setPavletekData({ ...pavletekData, companyPhone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={pavletekData.companyEmail}
                  onChange={(e) => setPavletekData({ ...pavletekData, companyEmail: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Name</label>
              <input
                type="text"
                value={pavletekData.invoiceToName}
                onChange={(e) => setPavletekData({ ...pavletekData, invoiceToName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Address</label>
              <input
                type="text"
                value={pavletekData.invoiceToAddress}
                onChange={(e) => setPavletekData({ ...pavletekData, invoiceToAddress: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To City</label>
                <input
                  type="text"
                  value={pavletekData.invoiceToCity}
                  onChange={(e) => setPavletekData({ ...pavletekData, invoiceToCity: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To State</label>
                <input
                  type="text"
                  value={pavletekData.invoiceToState}
                  onChange={(e) => setPavletekData({ ...pavletekData, invoiceToState: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To ZIP</label>
                <input
                  type="text"
                  value={pavletekData.invoiceToZip}
                  onChange={(e) => setPavletekData({ ...pavletekData, invoiceToZip: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Email</label>
              <input
                type="email"
                value={pavletekData.invoiceToEmail}
                onChange={(e) => setPavletekData({ ...pavletekData, invoiceToEmail: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={pavletekData.description}
                onChange={(e) => setPavletekData({ ...pavletekData, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Tax (%)</label>
              <input
                type="number"
                step="0.01"
                value={pavletekData.salesTax * 100}
                onChange={(e) => setPavletekData({ ...pavletekData, salesTax: parseFloat(e.target.value) / 100 })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {pavletekData.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...pavletekData.items];
                          const quantity = parseInt(e.target.value) || 0;
                          newItems[index] = { ...item, quantity, total: quantity * item.unitPrice };
                          setPavletekData({ ...pavletekData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...pavletekData.items];
                          newItems[index] = { ...item, description: e.target.value };
                          setPavletekData({ ...pavletekData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...pavletekData.items];
                          const unitPrice = parseFloat(e.target.value) || 0;
                          newItems[index] = { ...item, unitPrice, total: item.quantity * unitPrice };
                          setPavletekData({ ...pavletekData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Total: {item.total}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "regular":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Company Name</label>
              <input
                type="text"
                value={regularData.fromCompanyName}
                onChange={(e) => setRegularData({ ...regularData, fromCompanyName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="text"
                  value={regularData.date}
                  onChange={(e) => setRegularData({ ...regularData, date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={regularData.invoiceNumber}
                  onChange={(e) => setRegularData({ ...regularData, invoiceNumber: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={regularData.companyName}
                onChange={(e) => setRegularData({ ...regularData, companyName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
              <input
                type="text"
                value={regularData.companyAddress}
                onChange={(e) => setRegularData({ ...regularData, companyAddress: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={regularData.companyCity}
                  onChange={(e) => setRegularData({ ...regularData, companyCity: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={regularData.companyState}
                  onChange={(e) => setRegularData({ ...regularData, companyState: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                <input
                  type="text"
                  value={regularData.companyZip}
                  onChange={(e) => setRegularData({ ...regularData, companyZip: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={regularData.companyPhone}
                  onChange={(e) => setRegularData({ ...regularData, companyPhone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={regularData.companyEmail}
                  onChange={(e) => setRegularData({ ...regularData, companyEmail: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Name</label>
              <input
                type="text"
                value={regularData.invoiceToName}
                onChange={(e) => setRegularData({ ...regularData, invoiceToName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Address</label>
              <input
                type="text"
                value={regularData.invoiceToAddress}
                onChange={(e) => setRegularData({ ...regularData, invoiceToAddress: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To City</label>
                <input
                  type="text"
                  value={regularData.invoiceToCity}
                  onChange={(e) => setRegularData({ ...regularData, invoiceToCity: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To State</label>
                <input
                  type="text"
                  value={regularData.invoiceToState}
                  onChange={(e) => setRegularData({ ...regularData, invoiceToState: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To ZIP</label>
                <input
                  type="text"
                  value={regularData.invoiceToZip}
                  onChange={(e) => setRegularData({ ...regularData, invoiceToZip: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice To Email</label>
              <input
                type="email"
                value={regularData.invoiceToEmail}
                onChange={(e) => setRegularData({ ...regularData, invoiceToEmail: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={regularData.description}
                onChange={(e) => setRegularData({ ...regularData, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Tax (%)</label>
              <input
                type="number"
                step="0.01"
                value={regularData.salesTax * 100}
                onChange={(e) => setRegularData({ ...regularData, salesTax: parseFloat(e.target.value) / 100 })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {regularData.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...regularData.items];
                          const quantity = parseInt(e.target.value) || 0;
                          newItems[index] = { ...item, quantity, total: quantity * item.unitPrice };
                          setRegularData({ ...regularData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...regularData.items];
                          newItems[index] = { ...item, description: e.target.value };
                          setRegularData({ ...regularData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...regularData.items];
                          const unitPrice = parseFloat(e.target.value) || 0;
                          newItems[index] = { ...item, unitPrice, total: item.quantity * unitPrice };
                          setRegularData({ ...regularData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Total: {item.total}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "kibernum":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="text"
                value={kibernumData.date}
                onChange={(e) => setKibernumData({ ...kibernumData, date: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Items</label>
                <button
                  type="button"
                  onClick={addKibernumItem}
                  className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Item
                </button>
              </div>
              {kibernumData.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Executed By</label>
                      <input
                        type="text"
                        value={item.executedBy}
                        onChange={(e) => {
                          const newItems = [...kibernumData.items];
                          newItems[index] = { ...item, executedBy: e.target.value };
                          setKibernumData({ ...kibernumData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
                      <input
                        type="number"
                        value={item.hours}
                        onChange={(e) => {
                          const newItems = [...kibernumData.items];
                          newItems[index] = { ...item, hours: parseFloat(e.target.value) || 0 };
                          setKibernumData({ ...kibernumData, items: newItems });
                        }}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(index, file);
                        }
                      }}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    {item.image && (
                      <img src={item.image} alt={`${item.executedBy}`} className="mt-2 w-32 h-32 object-cover rounded" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKibernumItem(index)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {/* Header with title and buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDF Generator</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={previewPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <EyeIcon className="h-5 w-5" />
            {isGenerating ? "Generating..." : "Preview"}
          </button>
          <button
            onClick={() => generatePDF(false)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {isGenerating ? "Generating..." : "Download"}
          </button>
          <button
            onClick={() => generatePDF(true)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <EnvelopeIcon className="h-5 w-5" />
            {isGenerating ? "Generating..." : "Email"}
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="pavletek">Pavletek Invoice</option>
          <option value="regular">Regular Invoice</option>
          <option value="kibernum">Kibernum AS</option>
        </select>
      </div>

      {/* Form Inputs */}
      <div className="bg-white shadow rounded-lg p-6">
        <button
          type="button"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className="w-full flex items-center justify-between mb-4 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">Template Settings</h2>
          {isFormExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
        {isFormExpanded && <div>{renderFormInputs()}</div>}
      </div>

      {/* Preview Section - Full Width */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="overflow-hidden" style={{ width: '210mm', margin: '0 auto' }}>
            {renderTemplate()}
          </div>
        </div>
      </div>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={closeEmailDialog}
        onSend={handleSendEmail}
        initialData={{
          subject: `${getTemplateName()} Document`,
          content: `Please find attached the PDF document: ${getTemplateName()}.pdf`,
        }}
        title="Send PDF via Email"
      />

      {/* PDF Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={closePreviewDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-6xl w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">PDF Preview - {getTemplateName()}</DialogTitle>
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
              {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full border-0" title="PDF Preview" style={{ minHeight: "600px" }} />}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default PDFGenerator;
