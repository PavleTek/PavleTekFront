import React from "react";
import { useNavigate } from "react-router-dom";
import { DocumentCurrencyDollarIcon } from "@heroicons/react/24/outline";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-700">Here you can build your main dashboard for the project</p>
      
      <div className="mt-8">
        <button
          onClick={() => navigate("/invoicing")}
          className="flex items-center gap-3 px-6 py-3 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors duration-200 font-medium"
        >
          <DocumentCurrencyDollarIcon className="h-6 w-6" />
          <span>Go to Invoicing</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
