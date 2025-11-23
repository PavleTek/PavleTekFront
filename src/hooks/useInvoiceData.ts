import { useState, useEffect } from "react";
import { invoiceService } from "../services/invoiceService";
import { companyService } from "../services/companyService";
import { contactService } from "../services/contactService";
import { currencyService } from "../services/currencyService";
import { emailTemplateService } from "../services/emailTemplateService";
import type { Invoice, InvoiceTemplate, Company, Contact, Currency, EmailTemplate } from "../types";

export const useInvoiceData = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async () => {
    try {
      const { invoices: invoiceList } = await invoiceService.getAllInvoices();
      setInvoices(invoiceList.filter((inv) => !inv.isTemplate));
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    }
  };

  const loadTemplates = async () => {
    try {
      const { invoices: templates } = await invoiceService.getAllInvoiceTemplates();
      setInvoiceTemplates(templates);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
    }
  };

  const loadCompanies = async () => {
    try {
      const { companies: companyList } = await companyService.getAllCompanies();
      setCompanies(companyList);
    } catch (err: any) {
      setError(err.message || "Failed to load companies");
    }
  };

  const loadContacts = async () => {
    try {
      const { contacts: contactList } = await contactService.getAllContacts();
      setContacts(contactList);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
    }
  };

  const loadCurrencies = async () => {
    try {
      const { currencies: currencyList } = await currencyService.getAllCurrencies();
      setCurrencies(currencyList);
    } catch (err: any) {
      setError(err.message || "Failed to load currencies");
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const { emailTemplates: templateList } = await emailTemplateService.getAllEmailTemplates();
      setEmailTemplates(templateList);
    } catch (err: any) {
      setError(err.message || "Failed to load email templates");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadInvoices(),
        loadTemplates(), // Load templates immediately
        loadCompanies(),
        loadContacts(),
        loadCurrencies(),
        loadEmailTemplates(),
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    invoices,
    invoiceTemplates,
    companies,
    contacts,
    currencies,
    emailTemplates,
    loading,
    error,
    setError,
    loadInvoices,
    loadTemplates,
    loadCompanies,
    loadContacts,
    loadCurrencies,
    loadEmailTemplates,
  };
};

