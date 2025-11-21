import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, EyeIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { emailService } from "../services/emailService";
import type { SendTestEmailRequest } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import EmailDialog from "../components/EmailDialog";
import logoImage from "../assets/Transparent_Image_5.png";
import "../assets/invoice.css";

const PDFGenerator: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState<string>("My Document");
  const [content, setContent] = useState<string>("Enter your content here...");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Email functionality state
  const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

  // PDF Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);


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

    // Capture the content as canvas with onclone to fix oklch colors
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

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
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
        pdf.save(`${title || "document"}.pdf`);
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
      link.download = `${title || "document"}.pdf`;
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
    const pdfFile = new File([generatedPdfBlob], `${title || "document"}.pdf`, {
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

  const invoiceItems: any = [
    { quantity: 100, description: "Software development hours by Vittorio Gambi", unitPrice: 30, total: 3000 },
    { quantity: 200, description: "Software development hours by Pavle Markovic", unitPrice: 35, total: 7000 },
  ];

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">PDF Generator</h1>
        <p className="mt-1 text-sm text-gray-600">Create PDF documents from your content using html2canvas and jsPDF</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Settings</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter your content here..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={previewPDF}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <EyeIcon className="h-5 w-5" />
                    {isGenerating ? "Generating..." : "Preview PDF"}
                  </button>
                  <button
                    onClick={() => generatePDF(false)}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    {isGenerating ? "Generating..." : "Download PDF"}
                  </button>
                </div>
                <button
                  onClick={() => generatePDF(true)}
                  disabled={isGenerating}
                  className="w-full bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? "Generating..." : "Generate & Email PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-auto">
              <div ref={contentRef} data-pdf-content className="invoice-page rounded shadow-sm">
                {/* Background layers */}
                <div className="top-background-line"></div>
                <div className="bottom-background-line"></div>

                {/* Actual content (above backgrounds) */}
                <div className="invoice-content flex-column">
                  <h1 className="text-3xl font-bold mb-8" style={{ color: "#000000ff" }}>
                    INVOICE
                  </h1>
                  {/* <div className="flex justify-between">
                    <div className="flex-column">
                      <div className="font-bold text-lg">DATE</div>
                      <div className=" text-base">28/10/2025</div>
                    </div>
                    <div className="flex-column">
                      <div className="font-bold text-lg">Invoice Number</div>
                      <div className="font-semibold text-base text-center">00042</div>
                    </div>
                    <div className="flex-column">
                      <div className="font-bold text-lg text-right">PavleTek</div>
                      <div className=" text-base text-right leading-none">7601 Churchill Way 1338</div>
                      <div className=" text-base text-right leading-none">Dallas, TX, 75251</div>
                      <div className=" text-base text-right leading-none">+1 940 603 9449</div>
                      <div className=" text-base text-right leading-none">Pavle@PavleTek.com</div>
                    </div>
                  </div> */}
                  <div className="grid grid-cols-3">
                    <div className="flex-column justify-self-start">
                      <div className="font-bold text-lgl">DATE</div>
                      <div className=" text-base">28/10/2025</div>
                    </div>
                    <div className="flex-column justify-self-center">
                      <div className="font-bold text-lg">Invoice Number</div>
                      <div className="font-semibold text-base text-center">00042</div>
                    </div>
                    <div className="flex-column justify-self-right">
                      <div className="font-bold text-lg text-right">PavleTek</div>
                      <div className=" text-base text-right leading-none">7601 Churchill Way 1338</div>
                      <div className=" text-base text-right leading-none">Dallas, TX, 75251</div>
                      <div className=" text-base text-right leading-none">+1 940 603 9449</div>
                      <div className=" text-base text-right leading-none">Pavle@PavleTek.com</div>
                    </div>
                  </div>
                  <div className="flex-column pt-6">
                    <div className="font-bold text-lg text-left">Invoice to</div>
                    <div className=" text-base text-left leading-none">Kibernum USA LLC</div>
                    <div className=" text-base text-left leading-none">5700 Granite Parkway STE 200</div>
                    <div className=" text-base text-left leading-none">Plano, TX, 75024</div>
                    <div className=" text-base text-left leading-none">Gvozden.Mladenovic@kibernum.com</div>
                  </div>
                  <div className="separator-20-mm" />
                  <div className="flex-column pt-6 justify-center">
                    <h3 className="font-bold text-2xl text-center kind-of-green-color">Invoice to</h3>
                    <div className="text-base text-center">Software development services for October 2025 for the project STRD-0004</div>
                  </div>
                  <div className="grid grid-cols-4 pt-12">
                    <div className="font-bold text-lg text-center kind-of-green-color">Quantity</div>
                    <div className="font-bold text-lg text-center kind-of-green-color">Description</div>
                    <div className="font-bold text-lg text-center kind-of-green-color">UnitPrice</div>
                    <div className="font-bold text-lg text-center kind-of-green-color">Line Total</div>
                    <div className="col-span-4 small-vertical-space"></div>
                    <div className="col-span-4 horizontal-line-separator"></div>
                    {invoiceItems.map((item: any, index: any) => (
                      <React.Fragment key={index}>
                        <div className="text-center align-middle font-medium">{item.quantity}</div>
                        <div className="text-center text-sm">{item.description}</div>
                        <div className="text-center font-medium">{item.unitPrice}</div>
                        <div className="text-center font-medium">{item.total}</div>
                        <div className="col-span-4 h-6"></div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="separator-20-mm" />
                  <div className="grid grid-cols-2 w-1/4 ml-auto gap-x-4 gap-y-1">
                    <div className="text-right">Subtotal:</div>
                    <div className="text-left">5,000</div>
                    <div className="col-span-2 totals-horizontal-border"></div>
                    <div className="text-right">Sales Tax:</div>
                    <div className="text-left">0%</div>
                    <div className="col-span-2 totals-horizontal-border"></div>
                    <div className="text-right font-bold">Total</div>
                    <div className="text-left font-bold">5,000</div>
                    <div className="col-span-2 totals-horizontal-border"></div>
                  </div>
                </div>
                {/* Logo in bottom left corner */}
                <img src={logoImage} alt="Logo" className="invoice-logo" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={closeEmailDialog}
        onSend={handleSendEmail}
        initialData={{
          subject: title || "PDF Document",
          content: `Please find attached the PDF document: ${title || "document"}.pdf`,
        }}
        title="Send PDF via Email"
      />

      {/* PDF Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={closePreviewDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-6xl w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">PDF Preview - {title || "document"}</DialogTitle>
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
