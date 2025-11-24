import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import React from "react";
import PavletekInvoice from "../assets/pdfTemplates/PavletekInvoice";
import KibernumAS from "../assets/pdfTemplates/KibernumAS";
import type { Invoice } from "../types";
import { getInvoicePreviewDataFromInvoice } from "../utils/invoiceUtils";

export const usePDFGeneration = () => {
  const generatePDFFromInvoice = async (invoice: Invoice, type: "invoice" | "as"): Promise<Blob | null> => {
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = "210mm";
    document.body.appendChild(tempContainer);

    let root: Root | null = null;

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      
      if (type === "as" && invoice.ASDocument && Array.isArray(invoice.ASDocument)) {
        const asItems = invoice.ASDocument.map((item) => ({
          executedBy: item.executedBy,
          hours: item.hours,
          image: item.image || "",
        }));
        
        root = createRoot(tempContainer);
        // Format date safely without timezone issues
        let formattedDate = "";
        if (invoice.date) {
          const date = /^\d{4}-\d{2}-\d{2}$/.test(invoice.date)
            ? (() => {
                const [year, month, day] = invoice.date.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()
            : new Date(invoice.date);
          formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        }
        root.render(
          React.createElement(KibernumAS, {
            date: formattedDate,
            items: asItems,
          })
        );
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const pages = tempContainer.querySelectorAll(".pdf-page");
        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();
          const canvas = await html2canvas(pages[i] as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        }
      } else {
        const invoiceData = getInvoicePreviewDataFromInvoice(invoice);
        root = createRoot(tempContainer);
        root.render(React.createElement(PavletekInvoice, invoiceData));
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
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

  return { generatePDFFromInvoice };
};

