import React from "react";
import logoImage from "../Transparent_Image_5.png";
import "../invoice.css";
import "../pdf.css";
import type { Company, Contact } from "../../types";

export interface InvoiceItem {
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface PavletekInvoiceProps {
  date: string;
  invoiceNumber: string;
  fromCompany?: Company | null;
  fromContact?: Contact | null;
  toCompany?: Company | null;
  toContact?: Contact | null;
  items: InvoiceItem[];
  salesTax: number; // As a decimal (e.g., 0.08 for 8%, 0 for 0%)
}

const PavletekInvoice = React.forwardRef<HTMLDivElement, PavletekInvoiceProps>(({
  date,
  invoiceNumber,
  fromCompany,
  fromContact,
  toCompany,
  toContact,
  items,
  salesTax,
}, ref) => {
  // Generate description from date: "Software development services for [Month Year] for project STRD-0004"
  const generateDescription = (dateString: string): string => {
    try {
      // Parse date safely - handle MM/DD/YYYY format from toLocaleDateString
      let dateObj: Date;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        // MM/DD/YYYY format
        const [month, day, year] = dateString.split('/').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // YYYY-MM-DD format (ISO)
        const [year, month, day] = dateString.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(dateString);
      }
      const month = dateObj.toLocaleString('en-US', { month: 'long' });
      const year = dateObj.getFullYear();
      return `Software development services for ${month} ${year} for project STRD-0004`;
    } catch (error) {
      // Fallback if date parsing fails
      return "Software development services for project STRD-0004";
    }
  };

  const description = generateDescription(date);

  // Format phone number: remove all non-numbers and format as +x xxx xxx xxxx
  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "";
    const numbersOnly = phone.replace(/\D/g, "");
    if (numbersOnly.length === 0) return "";
    
    // Format as +x xxx xxx xxxx (1 digit + 3 + 3 + 4 = 11 digits total)
    // If we have 11+ digits, use first 11. If less, format what we have.
    const digits = numbersOnly.slice(0, 11);
    
    if (digits.length <= 1) {
      return `+${digits}`;
    } else if (digits.length <= 4) {
      return `+${digits.slice(0, 1)} ${digits.slice(1)}`;
    } else if (digits.length <= 7) {
      return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
    } else {
      return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
  };

  // Extract from company data
  const fromAddress = fromCompany?.address as any;
  const companyName = "PavleTek"; // Always PavleTek
  const companyAddress = fromAddress?.addressLine1 || "";
  const companyCity = fromAddress?.city || "";
  const companyState = fromAddress?.state || "";
  const companyZip = fromAddress?.zipCode || "";
  const companyPhone = formatPhoneNumber(fromContact?.phoneNumber);
  const companyEmail = fromContact?.email || "";

  // Extract to company data
  const toAddress = toCompany?.address as any;
  const invoiceToName = toCompany?.legalName || toCompany?.displayName || "";
  const invoiceToAddress = toAddress?.addressLine1 || "";
  const invoiceToCity = toAddress?.city || "";
  const invoiceToState = toAddress?.state || "";
  const invoiceToZip = toAddress?.zipCode || "";
  const invoiceToEmail = toContact?.email || "";

  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  // Calculate total from subtotal + sales tax
  const taxAmount = subtotal * salesTax;
  const total = subtotal + taxAmount;

  // Format sales tax for display
  const salesTaxDisplay = salesTax === 0 ? "0%" : `${(salesTax * 100).toFixed(0)}%`;

  // Format currency values
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div ref={ref} data-pdf-content className="pdf-page rounded shadow-sm">
      {/* Background layers */}
      <div className="top-background-line"></div>
      <div className="bottom-background-line"></div>

      {/* Actual content (above backgrounds) */}
      <div className="pdf-content flex-column">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#000000ff" }}>
          INVOICE
        </h1>
        <div className="grid grid-cols-3">
          <div className="flex-column justify-self-start">
            <div className="font-bold text-lg">DATE</div>
            <div className=" text-base">{date}</div>
          </div>
          <div className="flex-column justify-self-center">
            <div className="font-bold text-lg">Invoice Number</div>
            <div className="font-semibold text-base text-center">{invoiceNumber}</div>
          </div>
          <div className="flex-column justify-self-right">
            <div className="font-bold text-lg text-right">{companyName}</div>
            <div className=" text-base text-right leading-none">{companyAddress}</div>
            <div className=" text-base text-right leading-none">{companyCity}{companyCity && companyState ? ", " : ""}{companyState} {companyZip}</div>
            <div className=" text-base text-right leading-none">{companyPhone}</div>
            <div className=" text-base text-right leading-none">{companyEmail}</div>
          </div>
        </div>
        <div className="flex-column pt-6">
          <div className="font-bold text-lg text-left">Invoice to</div>
          <div className=" text-base text-left leading-none">{invoiceToName}</div>
          <div className=" text-base text-left leading-none">{invoiceToAddress}</div>
          <div className=" text-base text-left leading-none">{invoiceToCity}{invoiceToCity && invoiceToState ? ", " : ""}{invoiceToState} {invoiceToZip}</div>
          <div className=" text-base text-left leading-none">{invoiceToEmail}</div>
        </div>
        <div className="separator-20-mm" />
        <div className="flex-column pt-6 justify-center">
          <h3 className="font-bold text-2xl text-center kind-of-green-color">Invoice to</h3>
          <div className="text-base text-center">{description}</div>
        </div>
        <div className="grid grid-cols-4 pt-12">
          <div className="font-bold text-lg text-center kind-of-green-color">Quantity</div>
          <div className="font-bold text-lg text-center kind-of-green-color">Description</div>
          <div className="font-bold text-lg text-center kind-of-green-color">UnitPrice</div>
          <div className="font-bold text-lg text-center kind-of-green-color">Line Total</div>
          <div className="col-span-4 small-vertical-space"></div>
          <div className="col-span-4 horizontal-line-separator"></div>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <div className="text-center align-middle font-medium">{item.quantity}</div>
              <div className="text-center text-sm">{item.description}</div>
              <div className="text-center font-medium">{item.unitPrice}</div>
              <div className="text-center font-medium">{formatCurrency(item.total)}</div>
              <div className="col-span-4 h-6"></div>
            </React.Fragment>
          ))}
        </div>
        <div className="separator-20-mm" />
        <div className="grid grid-cols-2 w-1/4 ml-auto gap-x-4 gap-y-1">
          <div className="text-right">Subtotal:</div>
          <div className="text-left">{formatCurrency(subtotal)}</div>
          <div className="col-span-2 totals-horizontal-border"></div>
          <div className="text-right">Sales Tax:</div>
          <div className="text-left">{salesTaxDisplay}</div>
          <div className="col-span-2 totals-horizontal-border"></div>
          <div className="text-right font-bold">Total</div>
          <div className="text-left font-bold">{formatCurrency(total)}</div>
          <div className="col-span-2 totals-horizontal-border"></div>
        </div>
      </div>
      {/* Logo in bottom left corner */}
      <img src={logoImage} alt="Logo" className="invoice-logo" />
    </div>
  );
});

PavletekInvoice.displayName = "PavletekInvoice";

export default PavletekInvoice;

