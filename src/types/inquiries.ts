export type InquiryStatus = 'new' | 'contacted' | 'qualified' | 'archived';
export type MeetingStatus = 'new' | 'scheduled' | 'done' | 'archived';

export interface QuoteAttachment {
  id: string;
  inquiryId: string;
  fileName: string;
  contentType: string;
  size: number;
  r2Key: string;
  createdAt: string;
}

export interface QuoteInquirySummary {
  id: string;
  status: InquiryStatus;
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  projectType: string;
  projectCategory: string;
  projectName: string;
  budgetRange: string;
  urgency: string;
  ndaRequested: boolean;
  createdAt: string;
  _count: { attachments: number };
}

export interface QuoteInquiry extends QuoteInquirySummary {
  role: string | null;
  timezone: string | null;
  contactMethod: string;
  contactTime: string | null;
  description: string;
  goals: string;
  users: string | null;
  metrics: string | null;
  keyFeatures: string[];
  technologyIds: string[];
  startDate: string | null;
  endDate: string | null;
  deadlineHard: boolean;
  fundingSource: string | null;
  engineerCount: number | null;
  seniorityJunior: number;
  seniorityMid: number;
  senioritySenior: number;
  seniorityLead: number;
  requiredSkills: string | null;
  repoUrl: string | null;
  currentStack: string | null;
  painPoints: string | null;
  referral: string | null;
  notes: string | null;
  adminNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  updatedAt: string;
  attachments: QuoteAttachment[];
}

export interface MeetingRequest {
  id: string;
  status: MeetingStatus;
  fullName: string;
  email: string;
  message: string | null;
  adminNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
