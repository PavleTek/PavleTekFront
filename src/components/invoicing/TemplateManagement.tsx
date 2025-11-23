import React from "react";
import { PencilIcon, PlusIcon, DocumentTextIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { InvoiceTemplate } from "../../types";

interface TemplateManagementProps {
  templates: InvoiceTemplate[];
  onEdit: (id: number) => void;
  onUseTemplate: (id: number) => void;
  onCreateNew: () => void;
  onDelete: (id: number) => void;
}

const TemplateManagement: React.FC<TemplateManagementProps> = ({
  templates,
  onEdit,
  onUseTemplate,
  onCreateNew,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Templates</h1>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          Create Template
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {template.name || template.templateName || `Template #${template.invoiceNumber}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(template.id!)}
                      className="text-primary-600 hover:text-primary-900 cursor-pointer p-2"
                      title="Edit Template"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onUseTemplate(template.id!)}
                      className="text-primary-600 hover:text-primary-900 cursor-pointer p-2"
                      title="Use Template"
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onDelete(template.id!)}
                      className="text-red-600 hover:text-red-900 cursor-pointer p-2"
                      title="Delete Template"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TemplateManagement;

