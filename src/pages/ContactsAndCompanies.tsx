import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { contactService } from "../services/contactService";
import { companyService } from "../services/companyService";
import { bankAccountService } from "../services/bankAccountService";
import { currencyService } from "../services/currencyService";
import { languageService } from "../services/languageService";
import { countryService } from "../services/countryService";
import type { Contact, Company, BankAccount, Currency, Language, Country, CreateContactRequest, UpdateContactRequest, CreateCompanyRequest, UpdateCompanyRequest, CreateBankAccountRequest, UpdateBankAccountRequest } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

type TabType = "contacts" | "companies" | "bankAccounts";

const ContactsAndCompanies: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
  const [contactForm, setContactForm] = useState<CreateContactRequest>({
    firstName: "",
    lastName: "",
    chileanRutNumber: "",
    phoneNumber: "",
    email: "",
    color: "#7ad9c5",
    notes: "",
    taxID: "",
    roleInCompany: "",
    address: null,
    country: undefined,
    language: undefined,
    currencyId: undefined,
    associatedCompanyId: undefined,
    defaultBankAccountId: undefined,
  });
  
  const [companyForm, setCompanyForm] = useState<CreateCompanyRequest>({
    displayName: "",
    legalName: "",
    taxId: "",
    website: "",
    businessType: "",
    color: "#7ad9c5",
    address: null,
    country: undefined,
    language: undefined,
    currencyId: undefined,
    defaultContactId: undefined,
  });
  
  const [bankAccountForm, setBankAccountForm] = useState<CreateBankAccountRequest>({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    accountType: "",
    swiftCode: "",
    ibanCode: "",
    routingNumber: "",
    bankCode: "",
    branchName: "",
    email: "",
    notes: "",
    currencyId: undefined,
    country: undefined,
    ownerContactId: undefined,
    ownerCompanyId: undefined,
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        contactsData,
        companiesData,
        bankAccountsData,
        currenciesData,
        languagesData,
        countriesData,
      ] = await Promise.all([
        contactService.getAllContacts(),
        companyService.getAllCompanies(),
        bankAccountService.getAllBankAccounts(),
        currencyService.getAllCurrencies(),
        languageService.getAllLanguages(),
        countryService.getAllCountries(),
      ]);
      setContacts(contactsData.contacts);
      setCompanies(companiesData.companies);
      setBankAccounts(bankAccountsData.bankAccounts);
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
    if (activeTab === "contacts") {
      setContactForm({
        firstName: "",
        lastName: "",
        chileanRutNumber: "",
        phoneNumber: "",
        email: "",
        color: "#7ad9c5",
        notes: "",
        taxID: "",
        roleInCompany: "",
        address: null,
        country: undefined,
        language: undefined,
        currencyId: undefined,
        associatedCompanyId: undefined,
        defaultBankAccountId: undefined,
      });
    } else if (activeTab === "companies") {
      setCompanyForm({
        displayName: "",
        legalName: "",
        taxId: "",
        website: "",
        businessType: "",
        color: "#7ad9c5",
        address: null,
        country: undefined,
        language: undefined,
        currencyId: undefined,
        defaultContactId: undefined,
      });
    } else {
      setBankAccountForm({
        bankName: "",
        accountHolder: "",
        accountNumber: "",
        accountType: "",
        swiftCode: "",
        ibanCode: "",
        routingNumber: "",
        bankCode: "",
        branchName: "",
        email: "",
        notes: "",
        currencyId: undefined,
        country: undefined,
        ownerContactId: undefined,
        ownerCompanyId: undefined,
      });
    }
    setDialogOpen(true);
  };

  const handleEdit = (item: Contact | Company | BankAccount) => {
    setIsEditMode(true);
    setEditingId(item.id);
    if (activeTab === "contacts") {
      const contact = item as Contact;
      setContactForm({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        chileanRutNumber: contact.chileanRutNumber || "",
        phoneNumber: contact.phoneNumber || "",
        email: contact.email || "",
        color: contact.color || "#7ad9c5",
        notes: contact.notes || "",
        taxID: contact.taxID || "",
        roleInCompany: contact.roleInCompany || "",
        address: contact.address || null,
        country: contact.country || undefined,
        language: contact.language || undefined,
        currencyId: contact.currencyId || undefined,
        associatedCompanyId: contact.associatedCompanyId || undefined,
        defaultBankAccountId: contact.defaultBankAccountId || undefined,
      });
    } else if (activeTab === "companies") {
      const company = item as Company;
      setCompanyForm({
        displayName: company.displayName || "",
        legalName: company.legalName || "",
        taxId: company.taxId || "",
        website: company.website || "",
        businessType: company.businessType || "",
        color: company.color || "#7ad9c5",
        address: company.address || null,
        country: company.country || undefined,
        language: company.language || undefined,
        currencyId: company.currencyId || undefined,
        defaultContactId: company.defaultContactId || undefined,
      });
    } else {
      const bankAccount = item as BankAccount;
      setBankAccountForm({
        bankName: bankAccount.bankName || "",
        accountHolder: bankAccount.accountHolder || "",
        accountNumber: bankAccount.accountNumber || "",
        accountType: bankAccount.accountType || "",
        swiftCode: bankAccount.swiftCode || "",
        ibanCode: bankAccount.ibanCode || "",
        routingNumber: bankAccount.routingNumber || "",
        bankCode: bankAccount.bankCode || "",
        branchName: bankAccount.branchName || "",
        email: bankAccount.email || "",
        notes: bankAccount.notes || "",
        currencyId: bankAccount.currencyId || undefined,
        country: bankAccount.country || undefined,
        ownerContactId: bankAccount.ownerContactId || undefined,
        ownerCompanyId: bankAccount.ownerCompanyId || undefined,
      });
    }
    setDialogOpen(true);
  };

  const handleDeleteClick = (item: Contact | Company | BankAccount) => {
    let name = "";
    if (activeTab === "contacts") {
      const contact = item as Contact;
      name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Contact";
    } else if (activeTab === "companies") {
      const company = item as Company;
      name = company.displayName || company.legalName || "Company";
    } else {
      const bankAccount = item as BankAccount;
      name = bankAccount.bankName || bankAccount.accountNumber || "Bank Account";
    }
    setItemToDelete({ id: item.id, type: activeTab, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setError(null);
      if (itemToDelete.type === "contacts") {
        await contactService.deleteContact(itemToDelete.id);
        setContacts(contacts.filter((c) => c.id !== itemToDelete.id));
        setSuccess("Contact deleted successfully");
      } else if (itemToDelete.type === "companies") {
        await companyService.deleteCompany(itemToDelete.id);
        setCompanies(companies.filter((c) => c.id !== itemToDelete.id));
        setSuccess("Company deleted successfully");
      } else {
        await bankAccountService.deleteBankAccount(itemToDelete.id);
        setBankAccounts(bankAccounts.filter((b) => b.id !== itemToDelete.id));
        setSuccess("Bank account deleted successfully");
      }
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
      if (activeTab === "contacts") {
        const data: CreateContactRequest | UpdateContactRequest = {
          ...contactForm,
          country: contactForm.country || undefined,
          language: contactForm.language || undefined,
          currencyId: contactForm.currencyId || undefined,
          associatedCompanyId: contactForm.associatedCompanyId || undefined,
          defaultBankAccountId: contactForm.defaultBankAccountId || undefined,
        };
        if (isEditMode && editingId) {
          const updated = await contactService.updateContact(editingId, data as UpdateContactRequest);
          setContacts(contacts.map((c) => (c.id === editingId ? updated.contact : c)));
          setSuccess("Contact updated successfully");
        } else {
          const created = await contactService.createContact(data as CreateContactRequest);
          setContacts([...contacts, created.contact]);
          setSuccess("Contact created successfully");
        }
      } else if (activeTab === "companies") {
        const data: CreateCompanyRequest | UpdateCompanyRequest = {
          ...companyForm,
          country: companyForm.country || undefined,
          language: companyForm.language || undefined,
          currencyId: companyForm.currencyId || undefined,
          defaultContactId: companyForm.defaultContactId || undefined,
        };
        if (isEditMode && editingId) {
          const updated = await companyService.updateCompany(editingId, data as UpdateCompanyRequest);
          setCompanies(companies.map((c) => (c.id === editingId ? updated.company : c)));
          setSuccess("Company updated successfully");
        } else {
          const created = await companyService.createCompany(data as CreateCompanyRequest);
          setCompanies([...companies, created.company]);
          setSuccess("Company created successfully");
        }
      } else {
        const data: CreateBankAccountRequest | UpdateBankAccountRequest = {
          ...bankAccountForm,
          currencyId: bankAccountForm.currencyId || undefined,
          country: bankAccountForm.country || undefined,
          ownerContactId: bankAccountForm.ownerContactId || undefined,
          ownerCompanyId: bankAccountForm.ownerCompanyId || undefined,
        };
        if (isEditMode && editingId) {
          const updated = await bankAccountService.updateBankAccount(editingId, data as UpdateBankAccountRequest);
          setBankAccounts(bankAccounts.map((b) => (b.id === editingId ? updated.bankAccount : b)));
          setSuccess("Bank account updated successfully");
        } else {
          const created = await bankAccountService.createBankAccount(data as CreateBankAccountRequest);
          setBankAccounts([...bankAccounts, created.bankAccount]);
          setSuccess("Bank account created successfully");
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

  const renderContactTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phoneNumber || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {contact.associatedCompany?.displayName || contact.associatedCompany?.legalName || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.country || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleEdit(contact)} className="text-primary-600 hover:text-primary-900 mr-4">
                  <PencilIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => handleDeleteClick(contact)} className="text-red-600 hover:text-red-900">
                  <TrashIcon className="h-5 w-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCompanyTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Legal Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {companies.map((company) => (
            <tr key={company.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.displayName || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.legalName || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.taxId || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.country || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleEdit(company)} className="text-primary-600 hover:text-primary-900 mr-4">
                  <PencilIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => handleDeleteClick(company)} className="text-red-600 hover:text-red-900">
                  <TrashIcon className="h-5 w-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBankAccountTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Holder</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bankAccounts.map((bankAccount) => (
            <tr key={bankAccount.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bankAccount.bankName || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bankAccount.accountHolder || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bankAccount.accountNumber || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bankAccount.currency?.abbreviation || "-"}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {bankAccount.ownerContact
                  ? `${bankAccount.ownerContact.firstName || ""} ${bankAccount.ownerContact.lastName || ""}`.trim() || bankAccount.ownerContact.email
                  : bankAccount.ownerCompany?.displayName || bankAccount.ownerCompany?.legalName || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleEdit(bankAccount)} className="text-primary-600 hover:text-primary-900 mr-4">
                  <PencilIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => handleDeleteClick(bankAccount)} className="text-red-600 hover:text-red-900">
                  <TrashIcon className="h-5 w-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContactForm = () => (
    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={contactForm.firstName}
            onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={contactForm.lastName}
            onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="text"
            value={contactForm.phoneNumber}
            onChange={(e) => setContactForm({ ...contactForm, phoneNumber: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chilean RUT Number</label>
          <input
            type="text"
            value={contactForm.chileanRutNumber}
            onChange={(e) => setContactForm({ ...contactForm, chileanRutNumber: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
          <input
            type="text"
            value={contactForm.taxID}
            onChange={(e) => setContactForm({ ...contactForm, taxID: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select
            value={contactForm.country || ""}
            onChange={(e) => setContactForm({ ...contactForm, country: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={contactForm.language || ""}
            onChange={(e) => setContactForm({ ...contactForm, language: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Language</option>
            {languages.map((language) => (
              <option key={language.id} value={language.name}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={contactForm.currencyId || ""}
            onChange={(e) => setContactForm({ ...contactForm, currencyId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Currency</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.abbreviation} - {currency.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Associated Company</label>
          <select
            value={contactForm.associatedCompanyId || ""}
            onChange={(e) => setContactForm({ ...contactForm, associatedCompanyId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName || company.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role in Company</label>
          <input
            type="text"
            value={contactForm.roleInCompany}
            onChange={(e) => setContactForm({ ...contactForm, roleInCompany: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Default Bank Account</label>
        <select
          value={contactForm.defaultBankAccountId || ""}
          onChange={(e) => setContactForm({ ...contactForm, defaultBankAccountId: e.target.value ? parseInt(e.target.value) : undefined })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select Bank Account</option>
          {bankAccounts.filter((ba) => ba.ownerContactId === editingId || !editingId).map((bankAccount) => (
            <option key={bankAccount.id} value={bankAccount.id}>
              {bankAccount.bankName} - {bankAccount.accountNumber}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <input
          type="color"
          value={contactForm.color}
          onChange={(e) => setContactForm({ ...contactForm, color: e.target.value })}
          className="w-full h-10 rounded-md border border-gray-300"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={contactForm.notes}
          onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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

  const renderCompanyForm = () => (
    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input
            type="text"
            value={companyForm.displayName}
            onChange={(e) => setCompanyForm({ ...companyForm, displayName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Legal Name</label>
          <input
            type="text"
            value={companyForm.legalName}
            onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
          <input
            type="text"
            value={companyForm.taxId}
            onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="url"
            value={companyForm.website}
            onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
        <input
          type="text"
          value={companyForm.businessType}
          onChange={(e) => setCompanyForm({ ...companyForm, businessType: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select
            value={companyForm.country || ""}
            onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={companyForm.language || ""}
            onChange={(e) => setCompanyForm({ ...companyForm, language: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Language</option>
            {languages.map((language) => (
              <option key={language.id} value={language.name}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={companyForm.currencyId || ""}
            onChange={(e) => setCompanyForm({ ...companyForm, currencyId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Currency</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.abbreviation} - {currency.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Default Contact</label>
        <select
          value={companyForm.defaultContactId || ""}
          onChange={(e) => setCompanyForm({ ...companyForm, defaultContactId: e.target.value ? parseInt(e.target.value) : undefined })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select Contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <input
          type="color"
          value={companyForm.color}
          onChange={(e) => setCompanyForm({ ...companyForm, color: e.target.value })}
          className="w-full h-10 rounded-md border border-gray-300"
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

  const renderBankAccountForm = () => (
    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
          <input
            type="text"
            value={bankAccountForm.bankName}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder</label>
          <input
            type="text"
            value={bankAccountForm.accountHolder}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountHolder: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
          <input
            type="text"
            value={bankAccountForm.accountNumber}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
          <input
            type="text"
            value={bankAccountForm.accountType}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountType: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SWIFT Code</label>
          <input
            type="text"
            value={bankAccountForm.swiftCode}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, swiftCode: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">IBAN Code</label>
          <input
            type="text"
            value={bankAccountForm.ibanCode}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, ibanCode: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number</label>
          <input
            type="text"
            value={bankAccountForm.routingNumber}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, routingNumber: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Code</label>
          <input
            type="text"
            value={bankAccountForm.bankCode}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankCode: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
          <input
            type="text"
            value={bankAccountForm.branchName}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, branchName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={bankAccountForm.email}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, email: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={bankAccountForm.currencyId || ""}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, currencyId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Currency</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.abbreviation} - {currency.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select
            value={bankAccountForm.country || ""}
            onChange={(e) => setBankAccountForm({ ...bankAccountForm, country: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Owner Contact</label>
          <select
            value={bankAccountForm.ownerContactId || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              setBankAccountForm({ ...bankAccountForm, ownerContactId: value, ownerCompanyId: undefined });
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Owner Company</label>
          <select
            value={bankAccountForm.ownerCompanyId || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              setBankAccountForm({ ...bankAccountForm, ownerCompanyId: value, ownerContactId: undefined });
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.displayName || company.legalName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={bankAccountForm.notes}
          onChange={(e) => setBankAccountForm({ ...bankAccountForm, notes: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contacts & Companies</h1>
        <p className="mt-1 text-sm text-gray-600">Manage contacts, companies, and bank accounts</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "contacts"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "companies"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => setActiveTab("bankAccounts")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "bankAccounts"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Bank Accounts
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === "contacts" ? "Contacts" : activeTab === "companies" ? "Companies" : "Bank Accounts"}
          </h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add {activeTab === "contacts" ? "Contact" : activeTab === "companies" ? "Company" : "Bank Account"}
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {activeTab === "contacts" && contacts.length === 0 && (
                <div className="text-center py-8 text-gray-500">No contacts found. Create one to get started.</div>
              )}
              {activeTab === "companies" && companies.length === 0 && (
                <div className="text-center py-8 text-gray-500">No companies found. Create one to get started.</div>
              )}
              {activeTab === "bankAccounts" && bankAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">No bank accounts found. Create one to get started.</div>
              )}
              {activeTab === "contacts" && contacts.length > 0 && renderContactTable()}
              {activeTab === "companies" && companies.length > 0 && renderCompanyTable()}
              {activeTab === "bankAccounts" && bankAccounts.length > 0 && renderBankAccountTable()}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isEditMode
                  ? `Edit ${activeTab === "contacts" ? "Contact" : activeTab === "companies" ? "Company" : "Bank Account"}`
                  : `Create ${activeTab === "contacts" ? "Contact" : activeTab === "companies" ? "Company" : "Bank Account"}`}
              </DialogTitle>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {activeTab === "contacts" && renderContactForm()}
            {activeTab === "companies" && renderCompanyForm()}
            {activeTab === "bankAccounts" && renderBankAccountForm()}
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
        title={`Delete ${itemToDelete?.type === "contacts" ? "Contact" : itemToDelete?.type === "companies" ? "Company" : "Bank Account"}?`}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        variant="red"
      />
    </div>
  );
};

export default ContactsAndCompanies;
