import React from "react";
import "../pdf.css";

export interface KibernumASItem {
  executedBy: string;
  hours: number;
  image: string; // data URL
}

export interface KibernumASProps {
  date: string;
  items: KibernumASItem[];
}

const KibernumAS = React.forwardRef<HTMLDivElement, KibernumASProps>(({ date, items }, ref) => {
  // Format date to MM/DD/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    
    // Check if already in MM/DD/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    try {
      let dateObj: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // YYYY-MM-DD format (ISO)
        const [year, month, day] = dateString.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        // MM/DD/YYYY format
        return dateString;
      } else {
        // Try to parse other formats
        dateObj = new Date(dateString);
      }

      if (isNaN(dateObj.getTime())) {
        return dateString; // Return original if invalid date
      }

      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Fallback to original string on error
    }
  };

  // Parse date and get month name
  // Handles both MM/DD/YYYY and DD/MM/YYYY formats
  const getMonthName = (dateString: string): string => {
    if (!dateString) return "";
    
    const parts = dateString.split("/");
    if (parts.length !== 3) {
      // Try parsing as ISO format
      try {
        const dateObj = new Date(dateString);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleString("en-US", { month: "long" });
        }
      } catch {
        return "";
      }
      return "";
    }

    const part1 = parseInt(parts[0]);
    const part2 = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    // Determine format: if first part > 12, it's DD/MM/YYYY, otherwise assume MM/DD/YYYY
    let month: number;
    if (part1 > 12) {
      // DD/MM/YYYY format
      month = part2;
    } else {
      // MM/DD/YYYY format
      month = part1;
    }

    if (month < 1 || month > 12) return "";

    // Create date object using local time to avoid timezone issues
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleString("en-US", { month: "long" });
  };

  const formattedDate = formatDate(date);
  const monthName = getMonthName(date);

  // Calculate total hours
  const totalHours = items.reduce((sum, item) => sum + item.hours, 0);

  return (
    <div ref={ref} data-pdf-content className="rounded shadow-sm">
      {/* First page: Header, table, and approval text */}
      <div className="pdf-page">
        <div className="pdf-content flex-column" style={{ minHeight: "297mm" }}>
        <div className="flex justify-between">
          <div className="flex-column">
            <div className="text-base">For Mr.</div>
            <div className="text-base">Gvozden Mladenovic</div>
            <div className="text-base">KIBERNUM USA LLC</div>
          </div>
          <div className="flex-column">
            <div className="text-base text-right">Dallas TX</div>
            <div className="text-base text-right">{formattedDate}</div>
            <div className="text-base text-right">PavleTek</div>
          </div>
        </div>
        <div className="separator-20-mm" />
        <div>
          We are informing you on the services competed during the month of <span className="font-semibold">{monthName}</span> for the project STRD-0004
        </div>
        <div className="separator-20-mm" />

        <div className="grid grid-cols-3 border-t border-l border-r border-black">
          <div className="font-bold text-base text-left border-r border-b border-black p-2">Activities Completed</div>
          <div className="font-bold text-base text-left border-r border-b border-black p-2">Executed By</div>
          <div className="font-bold text-base text-left border-b border-black p-2">Hours Worked</div>

          {items.map((item, index) => (
            <React.Fragment key={index}>
              <div className="text-sm text-left border-r border-b border-black p-2">Software development</div>
              <div className="text-sm text-left border-r border-b border-black p-2">{item.executedBy}</div>
              <div className="text-sm text-left border-b border-black p-2">{item.hours}</div>
            </React.Fragment>
          ))}
          <div className="text-sm text-left col-span-2 border-r border-b border-black p-2">TOTAL</div>
          <div className="text-sm text-left border-b border-black p-2">{totalHours}</div>
        </div>

        <div className="separator-20-mm" />
        <div>
          Approval of this document assumes acceptance of deliverables and hours worked to achieve them. The same hours worked will also be contained in the
          invoice issued after the AS document approval.
        </div>
        </div>
      </div>

      {/* Separate page for each item */}
      {items.map((item, index) => (
        <div key={`item-${index}`} className="pdf-page" style={{ minHeight: "297mm" }}>
          <div className="pdf-content flex-column" style={{ padding: "15mm" }}>
            <div className="text-sm text-left mb-2">{item.executedBy} Timesheets</div>
            {item.image && (
              <img 
                src={item.image} 
                alt={`${item.executedBy}`} 
                className="mb-4 rounded"
                style={{
                  maxHeight: "148.5mm", // Half of A4 page height (297mm / 2)
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block"
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

KibernumAS.displayName = "KibernumAS";

export default KibernumAS;
