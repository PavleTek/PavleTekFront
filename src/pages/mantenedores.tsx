import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { currencyService } from "../services/currencyService";
import { languageService } from "../services/languageService";
import { countryService } from "../services/countryService";
import type { Currency, Language, Country, CreateCurrencyRequest, UpdateCurrencyRequest, CreateLanguageRequest, UpdateLanguageRequest, CreateCountryRequest, UpdateCountryRequest } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

type TabType = "currencies" | "languages" | "countries";

const Mantenedores: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("currencies");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: TabType; name: string } | null>(null);
  
  // Form states
  const [currencyForm, setCurrencyForm] = useState({ name: "", abbreviation: "" });
  const [languageForm, setLanguageForm] = useState({ name: "" });
  const [countryForm, setCountryForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currenciesData, languagesData, countriesData] = await Promise.all([
        currencyService.getAllCurrencies(),
        languageService.getAllLanguages(),
        countryService.getAllCountries(),
      ]);
      setCurrencies(currenciesData.currencies);
      setLanguages(languagesData.languages);
      setCountries(countriesData.countries);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    if (activeTab === "currencies") {
      setCurrencyForm({ name: "", abbreviation: "" });
    } else if (activeTab === "languages") {
      setLanguageForm({ name: "" });
    } else {
      setCountryForm({ name: "" });
    }
    setDialogOpen(true);
  };

  const handleEdit = (item: Currency | Language | Country) => {
    setIsEditMode(true);
    setEditingId(item.id);
    if (activeTab === "currencies") {
      const currency = item as Currency;
      setCurrencyForm({ name: currency.name, abbreviation: currency.abbreviation });
    } else if (activeTab === "languages") {
      const language = item as Language;
      setLanguageForm({ name: language.name });
    } else {
      const country = item as Country;
      setCountryForm({ name: country.name });
    }
    setDialogOpen(true);
  };

  const handleDeleteClick = (item: Currency | Language | Country) => {
    let name = "";
    if (activeTab === "currencies") {
      name = (item as Currency).name;
    } else if (activeTab === "languages") {
      name = (item as Language).name;
    } else {
      name = (item as Country).name;
    }
    setItemToDelete({ id: item.id, type: activeTab, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setError(null);
      if (itemToDelete.type === "currencies") {
        await currencyService.deleteCurrency(itemToDelete.id);
        setCurrencies(currencies.filter((c) => c.id !== itemToDelete.id));
      } else if (itemToDelete.type === "languages") {
        await languageService.deleteLanguage(itemToDelete.id);
        setLanguages(languages.filter((l) => l.id !== itemToDelete.id));
      } else {
        await countryService.deleteCountry(itemToDelete.id);
        setCountries(countries.filter((c) => c.id !== itemToDelete.id));
      }
      setSuccess(`${itemToDelete.type === "currencies" ? "Currency" : itemToDelete.type === "languages" ? "Language" : "Country"} deleted successfully`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (activeTab === "currencies") {
        if (!currencyForm.name || !currencyForm.abbreviation) {
          setError("Name and abbreviation are required");
          return;
        }
        if (isEditMode && editingId) {
          const data: UpdateCurrencyRequest = {
            name: currencyForm.name,
            abbreviation: currencyForm.abbreviation,
          };
          const updated = await currencyService.updateCurrency(editingId, data);
          setCurrencies(currencies.map((c) => (c.id === editingId ? updated.currency : c)));
          setSuccess("Currency updated successfully");
        } else {
          const data: CreateCurrencyRequest = {
            name: currencyForm.name,
            abbreviation: currencyForm.abbreviation,
          };
          const created = await currencyService.createCurrency(data);
          setCurrencies([...currencies, created.currency]);
          setSuccess("Currency created successfully");
        }
      } else if (activeTab === "languages") {
        if (!languageForm.name) {
          setError("Name is required");
          return;
        }
        if (isEditMode && editingId) {
          const data: UpdateLanguageRequest = { name: languageForm.name };
          const updated = await languageService.updateLanguage(editingId, data);
          setLanguages(languages.map((l) => (l.id === editingId ? updated.language : l)));
          setSuccess("Language updated successfully");
        } else {
          const data: CreateLanguageRequest = { name: languageForm.name };
          const created = await languageService.createLanguage(data);
          setLanguages([...languages, created.language]);
          setSuccess("Language created successfully");
        }
      } else {
        if (!countryForm.name) {
          setError("Name is required");
          return;
        }
        if (isEditMode && editingId) {
          const data: UpdateCountryRequest = { name: countryForm.name };
          const updated = await countryService.updateCountry(editingId, data);
          setCountries(countries.map((c) => (c.id === editingId ? updated.country : c)));
          setSuccess("Country updated successfully");
        } else {
          const data: CreateCountryRequest = { name: countryForm.name };
          const created = await countryService.createCountry(data);
          setCountries([...countries, created.country]);
          setSuccess("Country created successfully");
        }
      }
      setDialogOpen(false);
      setIsEditMode(false);
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setError(null);
  };

  const renderTable = () => {
    if (activeTab === "currencies") {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abbreviation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currencies.map((currency) => (
                <tr key={currency.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{currency.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{currency.abbreviation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(currency.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(currency)} className="text-primary-600 hover:text-primary-900 mr-4">
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(currency)} className="text-red-600 hover:text-red-900">
                      <TrashIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (activeTab === "languages") {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {languages.map((language) => (
                <tr key={language.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{language.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(language.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(language)} className="text-primary-600 hover:text-primary-900 mr-4">
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(language)} className="text-red-600 hover:text-red-900">
                      <TrashIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {countries.map((country) => (
                <tr key={country.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{country.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(country.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(country)} className="text-primary-600 hover:text-primary-900 mr-4">
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button onClick={() => handleDeleteClick(country)} className="text-red-600 hover:text-red-900">
                      <TrashIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const renderForm = () => {
    if (activeTab === "currencies") {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={currencyForm.name}
              onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Abbreviation</label>
            <input
              type="text"
              value={currencyForm.abbreviation}
              onChange={(e) => setCurrencyForm({ ...currencyForm, abbreviation: e.target.value.toUpperCase() })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              maxLength={3}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              {isEditMode ? "Update" : "Create"}
            </button>
          </div>
        </form>
      );
    } else if (activeTab === "languages") {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={languageForm.name}
              onChange={(e) => setLanguageForm({ name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              {isEditMode ? "Update" : "Create"}
            </button>
          </div>
        </form>
      );
    } else {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={countryForm.name}
              onChange={(e) => setCountryForm({ name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              {isEditMode ? "Update" : "Create"}
            </button>
          </div>
        </form>
      );
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mantenedores</h1>
        <p className="mt-1 text-sm text-gray-600">Manage currencies, languages, and countries</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("currencies")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "currencies"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Currencies
          </button>
          <button
            onClick={() => setActiveTab("languages")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "languages"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Languages
          </button>
          <button
            onClick={() => setActiveTab("countries")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "countries"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Countries
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === "currencies" ? "Currencies" : activeTab === "languages" ? "Languages" : "Countries"}
          </h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add {activeTab === "currencies" ? "Currency" : activeTab === "languages" ? "Language" : "Country"}
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {activeTab === "currencies" && currencies.length === 0 && (
                <div className="text-center py-8 text-gray-500">No currencies found. Create one to get started.</div>
              )}
              {activeTab === "languages" && languages.length === 0 && (
                <div className="text-center py-8 text-gray-500">No languages found. Create one to get started.</div>
              )}
              {activeTab === "countries" && countries.length === 0 && (
                <div className="text-center py-8 text-gray-500">No countries found. Create one to get started.</div>
              )}
              {(activeTab === "currencies" && currencies.length > 0) ||
              (activeTab === "languages" && languages.length > 0) ||
              (activeTab === "countries" && countries.length > 0) ? (
                renderTable()
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md w-full bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isEditMode ? `Edit ${activeTab === "currencies" ? "Currency" : activeTab === "languages" ? "Language" : "Country"}` : `Create ${activeTab === "currencies" ? "Currency" : activeTab === "languages" ? "Language" : "Country"}`}
              </DialogTitle>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {renderForm()}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${itemToDelete?.type === "currencies" ? "Currency" : itemToDelete?.type === "languages" ? "Language" : "Country"}?`}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        variant="red"
      />
    </div>
  );
};

export default Mantenedores;
