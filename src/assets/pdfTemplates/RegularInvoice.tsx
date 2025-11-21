import React from "react";
import logoImage from "../Transparent_Image_5.png";
import "../invoice.css";

export interface InvoiceItem {
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface RegularInvoiceProps {
  date: string;
  invoiceNumber: string;
  fromCompanyName: string;
  companyName: string;
  companyAddress: string;
  companyCityStateZip: string;
  companyPhone: string;
  companyEmail: string;
  invoiceToName: string;
  invoiceToAddress: string;
  invoiceToCityStateZip: string;
  invoiceToEmail: string;
  description: string;
  items: InvoiceItem[];
  salesTax: number; // As a decimal (e.g., 0.08 for 8%, 0 for 0%)
}

const RegularInvoice = React.forwardRef<HTMLDivElement, RegularInvoiceProps>(({
  date,
  invoiceNumber,
  fromCompanyName,
  companyName,
  companyAddress,
  companyCityStateZip,
  companyPhone,
  companyEmail,
  invoiceToName,
  invoiceToAddress,
  invoiceToCityStateZip,
  invoiceToEmail,
  description,
  items,
  salesTax,
}, ref) => {
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
    <div ref={ref} data-pdf-content className="invoice-page rounded shadow-sm">
      {/* Background layers */}
      <div className="top-background-line"></div>
      <div className="bottom-background-line"></div>

      {/* Actual content (above backgrounds) */}
      <div className="invoice-content flex-column">
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
            <div className="font-bold text-lg text-right">{fromCompanyName}</div>
            <div className=" text-base text-right leading-none">{companyAddress}</div>
            <div className=" text-base text-right leading-none">{companyCityStateZip}</div>
            <div className=" text-base text-right leading-none">{companyPhone}</div>
            <div className=" text-base text-right leading-none">{companyEmail}</div>
          </div>
        </div>
        <div className="flex-column pt-6">
          <div className="font-bold text-lg text-left">Invoice to</div>
          <div className=" text-base text-left leading-none">{invoiceToName}</div>
          <div className=" text-base text-left leading-none">{invoiceToAddress}</div>
          <div className=" text-base text-left leading-none">{invoiceToCityStateZip}</div>
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

RegularInvoice.displayName = "RegularInvoice";

export default RegularInvoice;

