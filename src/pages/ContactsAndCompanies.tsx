import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { contactService } from "../services/contactService";
import { companyService } from "../services/companyService";
import { bankAccountService } from "../services/bankAccountService";
import { currencyService } from "../services/currencyService";
import { languageService } from "../services/languageService";
import { countryService } from "../services/countryService";
import type { Contact, Company, BankAccount, Currency, Language, Country, CreateContactRequest, UpdateContactRequest, CreateCompanyRequest, UpdateCompanyRequest, CreateBankAccountRequest, UpdateBankAccountRequest, Address } from "../types";
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
    address: {
      addressLine1: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    countryId: undefined,
    languageId: undefined,
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
    address: {
      addressLine1: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
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
  
  // Address section expanded states
  const [contactAddressExpanded, setContactAddressExpanded] = useState(false);
  const [companyAddressExpanded, setCompanyAddressExpanded] = useState(false);

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
    setContactAddressExpanded(true);  // Open by default when creating
    setCompanyAddressExpanded(true);  // Open by default when creating
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
        address: {
          addressLine1: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
        countryId: undefined,
        languageId: undefined,
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
        address: {
          addressLine1: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
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
    setContactAddressExpanded(false);  // Closed by default when editing
    setCompanyAddressExpanded(false);  // Closed by default when editing
    if (activeTab === "contacts") {
      const contact = item as Contact;
      // Find country and language IDs from the names
      const countryId = contact.country 
        ? countries.find(c => c.name === contact.country)?.id 
        : undefined;
      const languageId = contact.language 
        ? languages.find(l => l.name === contact.language)?.id 
        : undefined;
      
      // Parse address - handle both structured Address and legacy JSON formats
      let parsedAddress: Address | null = null;
      if (contact.address) {
        if (typeof contact.address === 'object' && contact.address !== null) {
          parsedAddress = {
            addressLine1: (contact.address as any).addressLine1 || "",
            city: (contact.address as any).city || "",
            state: (contact.address as any).state || "",
            zipCode: (contact.address as any).zipCode || "",
            country: (contact.address as any).country || "",
          };
        }
      }
      if (!parsedAddress) {
        parsedAddress = {
          addressLine1: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        };
      }
      
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
        address: parsedAddress,
        countryId: countryId,
        languageId: languageId,
        currencyId: contact.currencyId || undefined,
        associatedCompanyId: contact.associatedCompanyId || undefined,
        defaultBankAccountId: contact.defaultBankAccountId || undefined,
      });
    } else if (activeTab === "companies") {
      const company = item as Company;
      
      // Parse address - handle both structured Address and legacy JSON formats
      let parsedAddress: Address | null = null;
      if (company.address) {
        if (typeof company.address === 'object' && company.address !== null) {
          parsedAddress = {
            addressLine1: (company.address as any).addressLine1 || "",
            city: (company.address as any).city || "",
            state: (company.address as any).state || "",
            zipCode: (company.address as any).zipCode || "",
            country: (company.address as any).country || "",
          };
        }
      }
      if (!parsedAddress) {
        parsedAddress = {
          addressLine1: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        };
      }
      
      setCompanyForm({
        displayName: company.displayName || "",
        legalName: company.legalName || "",
        taxId: company.taxId || "",
        website: company.website || "",
        businessType: company.businessType || "",
        color: company.color || "#7ad9c5",
        address: parsedAddress,
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
        // Validate and serialize address
        let addressData: Address | null = null;
        if (contactForm.address) {
          const addressLine1 = contactForm.address.addressLine1?.trim() || "";
          if (addressLine1.length === 0) {
            // If address section is expanded but addressLine1 is empty, show error
            if (contactAddressExpanded) {
              setError("Address Line 1 is required");
              return;
            }
            // If not expanded, set to null
            addressData = null;
          } else {
            // Build address object with only non-empty fields
            addressData = {
              addressLine1: addressLine1,
              ...(contactForm.address.city?.trim() && { city: contactForm.address.city.trim() }),
              ...(contactForm.address.state?.trim() && { state: contactForm.address.state.trim() }),
              ...(contactForm.address.zipCode?.trim() && { zipCode: contactForm.address.zipCode.trim() }),
              ...(contactForm.address.country?.trim() && { country: contactForm.address.country.trim() }),
            };
          }
        }
        
        const data: CreateContactRequest | UpdateContactRequest = {
          ...contactForm,
          address: addressData,
          countryId: contactForm.countryId || undefined,
          languageId: contactForm.languageId || undefined,
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
        // Validate and serialize address
        let addressData: Address | null = null;
        if (companyForm.address) {
          const addressLine1 = companyForm.address.addressLine1?.trim() || "";
          if (addressLine1.length === 0) {
            // If address section is expanded but addressLine1 is empty, show error
            if (companyAddressExpanded) {
              setError("Address Line 1 is required");
              return;
            }
            // If not expanded, set to null
            addressData = null;
          } else {
            // Build address object with only non-empty fields
            addressData = {
              addressLine1: addressLine1,
              ...(companyForm.address.city?.trim() && { city: companyForm.address.city.trim() }),
              ...(companyForm.address.state?.trim() && { state: companyForm.address.state.trim() }),
              ...(companyForm.address.zipCode?.trim() && { zipCode: companyForm.address.zipCode.trim() }),
              ...(companyForm.address.country?.trim() && { country: companyForm.address.country.trim() }),
            };
          }
        }
        
        const data: CreateCompanyRequest | UpdateCompanyRequest = {
          ...companyForm,
          address: addressData,
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

  const getContactInitials = (firstName?: string | null, lastName?: string | null): string => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
    return firstInitial + lastInitial || "C";
  };

  const getCompanyInitials = (displayName?: string | null, legalName?: string | null): string => {
    const name = displayName || legalName || "";
    return name.charAt(0)?.toUpperCase() || "C";
  };

  const renderContactTable = () => (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="relative min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 ">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Country
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 ">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {contacts.map((contact) => {
                  const contactColor = contact.color || "#7ad9c5";
                  const initials = getContactInitials(contact.firstName, contact.lastName);
                  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email || "Contact";
                  
                  return (
                    <tr key={contact.id}>
                      <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap ">
                        <div className="flex items-center">
                          <div className="size-11 shrink-0">
                            <div
                              className="size-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                              style={{ backgroundColor: contactColor }}
                            >
                              {initials}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{fullName}</div>
                            <div className="mt-1 text-gray-500">{contact.email || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {contact.phoneNumber || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {contact.associatedCompany?.displayName || contact.associatedCompany?.legalName || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {contact.country || "-"}
                      </td>
                      <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap ">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(contact)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-md cursor-pointer transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(contact)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

  const renderCompanyTable = () => (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="relative min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 ">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Legal Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Tax ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Country
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 ">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {companies.map((company) => {
                  const companyColor = company.color || "#7ad9c5";
                  const initials = getCompanyInitials(company.displayName, company.legalName);
                  const displayName = company.displayName || company.legalName || "Company";
                  
                  return (
                    <tr key={company.id}>
                      <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap ">
                        <div className="flex items-center">
                          <div className="size-11 shrink-0">
                            <div
                              className="size-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                              style={{ backgroundColor: companyColor }}
                            >
                              {initials}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{displayName}</div>
                            {company.legalName && company.legalName !== displayName && (
                              <div className="mt-1 text-gray-500">{company.legalName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {company.legalName || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {company.taxId || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {company.country || "-"}
                      </td>
                      <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap ">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(company)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-md cursor-pointer transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(company)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

  const renderBankAccountTable = () => (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="relative min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 ">
                    Bank Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Account Holder
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Account Number
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Currency
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Owner
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 ">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {bankAccounts.map((bankAccount) => {
                  const ownerName = bankAccount.ownerContact
                    ? `${bankAccount.ownerContact.firstName || ""} ${bankAccount.ownerContact.lastName || ""}`.trim() || bankAccount.ownerContact.email || "-"
                    : bankAccount.ownerCompany?.displayName || bankAccount.ownerCompany?.legalName || "-";
                  
                  return (
                    <tr key={bankAccount.id}>
                      <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap ">
                        <div className="font-medium text-gray-900">{bankAccount.bankName || "-"}</div>
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {bankAccount.accountHolder || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {bankAccount.accountNumber || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {bankAccount.currency?.abbreviation || "-"}
                      </td>
                      <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                        {ownerName}
                      </td>
                      <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap ">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(bankAccount)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-md cursor-pointer transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(bankAccount)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
            value={contactForm.countryId || ""}
            onChange={(e) => setContactForm({ ...contactForm, countryId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={contactForm.languageId || ""}
            onChange={(e) => setContactForm({ ...contactForm, languageId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Language</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Bank Account</label>
          <select
            value={contactForm.defaultBankAccountId || ""}
            onChange={(e) => setContactForm({ ...contactForm, defaultBankAccountId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Bank Account</option>
            {bankAccounts.filter((ba) => isEditMode && editingId ? ba.ownerContactId === editingId : false).map((bankAccount) => (
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
      </div>
      
      {/* Address Section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setContactAddressExpanded(!contactAddressExpanded)}
          className="flex items-center justify-between w-full text-left mb-2"
        >
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <ChevronDownIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${contactAddressExpanded ? 'rotate-180' : ''}`} />
        </button>
        {contactAddressExpanded && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactForm.address?.addressLine1 || ""}
                onChange={(e) => setContactForm({
                  ...contactForm,
                  address: {
                    addressLine1: e.target.value,
                    city: contactForm.address?.city || "",
                    state: contactForm.address?.state || "",
                    zipCode: contactForm.address?.zipCode || "",
                    country: contactForm.address?.country || "",
                  }
                })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={contactForm.address?.city || ""}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    address: {
                      addressLine1: contactForm.address?.addressLine1 || "",
                      city: e.target.value,
                      state: contactForm.address?.state || "",
                      zipCode: contactForm.address?.zipCode || "",
                      country: contactForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={contactForm.address?.state || ""}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    address: {
                      addressLine1: contactForm.address?.addressLine1 || "",
                      city: contactForm.address?.city || "",
                      state: e.target.value,
                      zipCode: contactForm.address?.zipCode || "",
                      country: contactForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={contactForm.address?.zipCode || ""}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    address: {
                      addressLine1: contactForm.address?.addressLine1 || "",
                      city: contactForm.address?.city || "",
                      state: contactForm.address?.state || "",
                      zipCode: e.target.value,
                      country: contactForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={contactForm.address?.country || ""}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    address: {
                      addressLine1: contactForm.address?.addressLine1 || "",
                      city: contactForm.address?.city || "",
                      state: contactForm.address?.state || "",
                      zipCode: contactForm.address?.zipCode || "",
                      country: e.target.value || undefined,
                    }
                  })}
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
          </div>
        )}
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
            type="text"
            value={companyForm.website}
            onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="https://example.com"
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Contact</label>
          <select
            value={companyForm.defaultContactId || ""}
            onChange={(e) => setCompanyForm({ ...companyForm, defaultContactId: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Contact</option>
            {contacts.filter((contact) => isEditMode && editingId ? contact.associatedCompanyId === editingId : false).map((contact) => (
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
      </div>
      
      {/* Address Section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setCompanyAddressExpanded(!companyAddressExpanded)}
          className="flex items-center justify-between w-full text-left mb-2"
        >
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <ChevronDownIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${companyAddressExpanded ? 'rotate-180' : ''}`} />
        </button>
        {companyAddressExpanded && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyForm.address?.addressLine1 || ""}
                onChange={(e) => setCompanyForm({
                  ...companyForm,
                  address: {
                    addressLine1: e.target.value,
                    city: companyForm.address?.city || "",
                    state: companyForm.address?.state || "",
                    zipCode: companyForm.address?.zipCode || "",
                    country: companyForm.address?.country || "",
                  }
                })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={companyForm.address?.city || ""}
                  onChange={(e) => setCompanyForm({
                    ...companyForm,
                    address: {
                      addressLine1: companyForm.address?.addressLine1 || "",
                      city: e.target.value,
                      state: companyForm.address?.state || "",
                      zipCode: companyForm.address?.zipCode || "",
                      country: companyForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={companyForm.address?.state || ""}
                  onChange={(e) => setCompanyForm({
                    ...companyForm,
                    address: {
                      addressLine1: companyForm.address?.addressLine1 || "",
                      city: companyForm.address?.city || "",
                      state: e.target.value,
                      zipCode: companyForm.address?.zipCode || "",
                      country: companyForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={companyForm.address?.zipCode || ""}
                  onChange={(e) => setCompanyForm({
                    ...companyForm,
                    address: {
                      addressLine1: companyForm.address?.addressLine1 || "",
                      city: companyForm.address?.city || "",
                      state: companyForm.address?.state || "",
                      zipCode: e.target.value,
                      country: companyForm.address?.country || "",
                    }
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={companyForm.address?.country || ""}
                  onChange={(e) => setCompanyForm({
                    ...companyForm,
                    address: {
                      addressLine1: companyForm.address?.addressLine1 || "",
                      city: companyForm.address?.city || "",
                      state: companyForm.address?.state || "",
                      zipCode: companyForm.address?.zipCode || "",
                      country: e.target.value || undefined,
                    }
                  })}
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
          </div>
        )}
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
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-base font-semibold text-gray-900">
                {activeTab === "contacts" ? "Contacts" : activeTab === "companies" ? "Companies" : "Bank Accounts"}
              </h1>
              <p className="mt-2 text-sm text-gray-700">
                {activeTab === "contacts"
                  ? "A list of all contacts in your account including their name, email, phone, and company."
                  : activeTab === "companies"
                  ? "A list of all companies in your account including their display name, legal name, and tax ID."
                  : "A list of all bank accounts in your account including bank name, account number, and owner."}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                onClick={handleCreate}
                className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Add {activeTab === "contacts" ? "Contact" : activeTab === "companies" ? "Company" : "Bank Account"}
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="px-4 sm:px-6 lg:px-8 pb-6 text-center py-8">Loading...</div>
        ) : (
          <>
            {activeTab === "contacts" && contacts.length === 0 && (
              <div className="px-4 sm:px-6 lg:px-8 pb-6 text-center py-8 text-gray-500">No contacts found. Create one to get started.</div>
            )}
            {activeTab === "companies" && companies.length === 0 && (
              <div className="px-4 sm:px-6 lg:px-8 pb-6 text-center py-8 text-gray-500">No companies found. Create one to get started.</div>
            )}
            {activeTab === "bankAccounts" && bankAccounts.length === 0 && (
              <div className="px-4 sm:px-6 lg:px-8 pb-6 text-center py-8 text-gray-500">No bank accounts found. Create one to get started.</div>
            )}
            {(activeTab === "contacts" && contacts.length > 0) || (activeTab === "companies" && companies.length > 0) || (activeTab === "bankAccounts" && bankAccounts.length > 0) ? (
              <div className="px-4 sm:px-6 lg:px-8 pb-6">
                {activeTab === "contacts" && contacts.length > 0 && renderContactTable()}
                {activeTab === "companies" && companies.length > 0 && renderCompanyTable()}
                {activeTab === "bankAccounts" && bankAccounts.length > 0 && renderBankAccountTable()}
              </div>
            ) : null}
          </>
        )}
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
