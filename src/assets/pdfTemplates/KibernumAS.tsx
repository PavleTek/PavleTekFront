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
  return (
    <div ref={ref} data-pdf-content className="pdf-page rounded shadow-sm">
      <div className="invoice-content flex-column">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "#000000ff" }}>
          KIBERNUM AS
        </h1>

        <div className="flex-column pt-6">
          <div className="font-bold text-lg text-left">Date: {date}</div>
        </div>

        <div className="separator-20-mm" />

        <div className="grid grid-cols-3 pt-6 gap-4">
          {items.map((item, index) => (
            <div key={index} className="flex-column border border-gray-300 p-4 rounded">
              {item.image && <img src={item.image} alt={`${item.executedBy}`} className="w-full h-48 object-cover mb-2 rounded" />}
              <div className="font-bold text-base text-center">{item.executedBy}</div>
              <div className="text-sm text-center mt-1">Hours: {item.hours}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

KibernumAS.displayName = "KibernumAS";

export default KibernumAS;
