export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  lastName: string;
  chileanRutNumber?: string;
  color?: string;
  lastLogin?: string;
  createdAt?: string;
  createdBy?: number;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

export interface Role {
  id: number;
  name: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  name?: string;
  lastName?: string;
  chileanRutNumber?: string;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  name?: string;
  lastName?: string;
  chileanRutNumber?: string;
  color?: string;
}

export interface ChangePasswordRequest {
  password: string;
}

export interface ChangeUserRolesRequest {
  roleIds: number[];
}

export interface CreateRoleRequest {
  name: string;
}

export interface UpdateRoleRequest {
  name: string;
}

export interface ApiResponse {
  message: string;
  [key: string]: any;
}

export interface EmailSender {
  id: number;
  email: string;
  createdAt: string;
}

export interface CreateEmailRequest {
  email: string;
}

export interface Domain {
  id: number;
  domain: string;
  createdAt: string;
}

export interface CreateDomainRequest {
  domain: string;
}

export interface UpdateEmailRequest {
  email?: string;
}

export interface SendTestEmailRequest {
  fromEmail: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  content: string;
  attachments?: File[];
}

export interface Configuration {
  id: number;
  twoFactorEnabled: boolean;
  appName: string;
  recoveryEmailSenderId?: number | null;
  recoveryEmailSender?: {
    id: number;
    email: string;
  } | null;
  updatedAt: string;
}

export interface TwoFactorSetupResponse {
  message: string;
  secret: string;
  qrCode: string;
}

export interface TwoFactorVerifyRequest {
  tempToken: string;
  code: string;
}

export interface TwoFactorStatusResponse {
  message: string;
  enabled: boolean;
  userEnabled: boolean;
  systemEnabled: boolean;
}

export interface TwoFactorVerifySetupRequest {
  secret: string;
  code: string;
}

export interface TwoFactorVerifySetupResponse {
  message: string;
  token?: string;
  user?: User;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  requiresTwoFactorSetup?: boolean;
  tempToken?: string;
}

export interface RecoveryCodeRequest {
  tempToken: string;
}

export interface RecoveryCodeResponse {
  message: string;
}

export interface VerifyRecoveryCodeRequest {
  tempToken: string;
  code: string;
}

export interface VerifyRecoveryCodeResponse {
  message: string;
  token: string;
  user: User;
}

export interface Currency {
  id: number;
  name: string;
  abbreviation: string;
  createdAt: string;
}

export interface CreateCurrencyRequest {
  name: string;
  abbreviation: string;
}

export interface UpdateCurrencyRequest {
  name?: string;
  abbreviation?: string;
}

export interface Language {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateLanguageRequest {
  name: string;
}

export interface UpdateLanguageRequest {
  name: string;
}

export interface Country {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateCountryRequest {
  name: string;
}

export interface UpdateCountryRequest {
  name: string;
}

export interface Address {
  addressLine1: string;  // Mandatory
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Contact {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  chileanRutNumber?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  color?: string;
  notes?: string | null;
  taxID?: string | null;
  roleInCompany?: string | null;
  address?: Address | null;
  country?: string | null;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
  currencyId?: number | null;
  currency?: Currency | null;
  associatedCompanyId?: number | null;
  associatedCompany?: Company | null;
  defaultBankAccountId?: number | null;
  defaultBankAccount?: BankAccount | null;
  createdById?: number | null;
  createdBy?: User | null;
  bankAccounts?: BankAccount[];
}

export interface CreateContactRequest {
  firstName?: string;
  lastName?: string;
  chileanRutNumber?: string;
  phoneNumber?: string;
  email?: string;
  color?: string;
  notes?: string;
  taxID?: string;
  roleInCompany?: string;
  address?: any;
  countryId?: number;
  languageId?: number;
  currencyId?: number;
  associatedCompanyId?: number;
  defaultBankAccountId?: number;
}

export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  chileanRutNumber?: string;
  phoneNumber?: string;
  email?: string;
  color?: string;
  notes?: string;
  taxID?: string;
  roleInCompany?: string;
  address?: any;
  countryId?: number;
  languageId?: number;
  currencyId?: number;
  associatedCompanyId?: number;
  defaultBankAccountId?: number;
}

export interface Company {
  id: number;
  displayName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  website?: string | null;
  businessType?: string | null;
  color?: string;
  address?: Address | null;
  country?: string | null;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
  currencyId?: number | null;
  currency?: Currency | null;
  defaultContactId?: number | null;
  defaultContact?: Contact | null;
  createdById?: number | null;
  createdBy?: User | null;
  associatedContacts?: Contact[];
  bankAccounts?: BankAccount[];
}

export interface CreateCompanyRequest {
  displayName?: string;
  legalName?: string;
  taxId?: string;
  website?: string;
  businessType?: string;
  color?: string;
  address?: any;
  country?: string;
  language?: string;
  currencyId?: number;
  defaultContactId?: number;
}

export interface UpdateCompanyRequest {
  displayName?: string;
  legalName?: string;
  taxId?: string;
  website?: string;
  businessType?: string;
  color?: string;
  address?: any;
  country?: string;
  language?: string;
  currencyId?: number;
  defaultContactId?: number;
}

export interface BankAccount {
  id: number;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  swiftCode?: string | null;
  ibanCode?: string | null;
  routingNumber?: string | null;
  bankCode?: string | null;
  branchName?: string | null;
  email?: string | null;
  notes?: string | null;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
  currencyId?: number | null;
  currency?: Currency | null;
  ownerContactId?: number | null;
  ownerContact?: Contact | null;
  ownerCompanyId?: number | null;
  ownerCompany?: Company | null;
}

export interface CreateBankAccountRequest {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  accountType?: string;
  swiftCode?: string;
  ibanCode?: string;
  routingNumber?: string;
  bankCode?: string;
  branchName?: string;
  email?: string;
  notes?: string;
  currencyId?: number;
  country?: string;
  ownerContactId?: number;
  ownerCompanyId?: number;
}

export interface UpdateBankAccountRequest {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  accountType?: string;
  swiftCode?: string;
  ibanCode?: string;
  routingNumber?: string;
  bankCode?: string;
  branchName?: string;
  email?: string;
  notes?: string;
  currencyId?: number;
  country?: string;
  ownerContactId?: number;
  ownerCompanyId?: number;
}

export interface EmailTemplate {
  id: number;
  description?: string | null;
  subject?: string | null;
  content?: string | null;
  destinationEmail?: any | null;
  ccEmail?: any | null;
  bccEmail?: any | null;
  fromEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
  createdBy?: User | null;
}

export interface CreateEmailTemplateRequest {
  description?: string;
  subject?: string;
  content?: string;
  destinationEmail?: any;
  ccEmail?: any;
  bccEmail?: any;
  fromEmail?: string;
}

export interface UpdateEmailTemplateRequest {
  description?: string;
  subject?: string;
  content?: string;
  destinationEmail?: any;
  ccEmail?: any;
  bccEmail?: any;
  fromEmail?: string;
}

export interface PasswordResetRequest {
  username: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}

export interface PasswordResetVerifyRequest {
  username: string;
  code: string;
  newPassword: string;
}

export interface PasswordResetVerifyResponse {
  message: string;
}

export type Product = {
  name: string;
  description: string;
  unitPrice: number;
  currency: Currency;
  unit?: string;
  sku: string;
};

export type Invoice = {
  invoiceNumber: number;
  date: string;
  fromCompany?: Company;
  fromContact?: Contact;
  toCompany?: Company;
  toContact?: Contact;
  items?: JSON;
  subtotal: number;
  taxRate: number;
  taxAmmount: number;
  total: number;
  currency?: Currency;
  isTemplate: boolean;
  templateName: string;
  sent: boolean;
};

