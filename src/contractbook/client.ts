import { HttpClient } from "./base-client.js";

export interface DocumentSignee {
  full_name?: string | null;
  email?: string | null;
  signed_at?: string | null;
}

export interface DocumentParty {
  name?: string | null;
  reference?: string | null;
  signees?: DocumentSignee[];
}

export interface DocumentOwner {
  id?: string;
  full_name?: string;
  email?: string;
}

export interface DocumentPreview {
  id?: string;
  title?: string;
  state?: string;
  type?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  signed_at?: string | null;
  owner?: DocumentOwner;
  parties?: DocumentParty[];
}

export interface PaginationMeta {
  cursor?: string | null;
}

export interface ListDocumentsResponse {
  documents?: DocumentPreview[];
  pagination_meta?: PaginationMeta;
}

export interface SearchParty {
  full_name?: string | null;
  email?: string | null;
  signed_at?: string | null;
}

export interface SearchSnippets {
  snippets?: string[];
  remaining_count?: string;
}

export interface SearchDocument {
  id?: string;
  title?: string;
  state?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  owner?: DocumentOwner;
  parties?: SearchParty[];
  search_snippets?: SearchSnippets;
  search_matched_attachments?: unknown[];
}

export interface SearchDocumentsResponse {
  documents?: SearchDocument[];
  pagination_meta?: PaginationMeta;
}

export interface TemplateLocation {
  id?: string;
  name?: string;
  type?: string;
}

export interface TemplatePreview {
  id?: string;
  title?: string | null;
  description?: string;
  language?: string;
  slug?: string | null;
  owned?: boolean;
  owner_id?: string;
  location?: TemplateLocation;
  created_at?: string;
  updated_at?: string;
}

export interface ListTemplatesResponse {
  templates?: TemplatePreview[];
}

export interface TemplateDataFieldConfig {
  label?: string | null;
  options?: string[];
}

export interface TemplateDataField {
  id?: string;
  name?: string;
  type?: string;
  value?: string | null;
  description?: string | null;
  required?: boolean;
  config?: TemplateDataFieldConfig;
}

export interface TemplateAttachment {
  original?: string;
  preview?: string[];
}

export interface TemplateDetails extends TemplatePreview {
  data_fields?: TemplateDataField[];
  default_message?: string;
  attachments?: TemplateAttachment[];
  company_logo_url?: string | null;
}

export interface GetTemplateResponse {
  template?: TemplateDetails;
}

export class ContractbookClient extends HttpClient {
  async listDocuments(params: Record<string, string | string[]>): Promise<ListDocumentsResponse> {
    const response = await this.request<ListDocumentsResponse>({
      url: "v3/documents",
      method: "GET",
      params,
    });
    return response.data;
  }

  async searchDocuments(
    params: Record<string, string | string[]>,
  ): Promise<SearchDocumentsResponse> {
    const response = await this.request<SearchDocumentsResponse>({
      url: "documents/search",
      method: "GET",
      params,
    });
    return response.data;
  }

  async listTemplates(params: Record<string, string | string[]>): Promise<ListTemplatesResponse> {
    const response = await this.request<ListTemplatesResponse>({
      url: "v3/templates",
      method: "GET",
      params,
    });
    return response.data;
  }

  async getTemplate(id: string): Promise<GetTemplateResponse> {
    const response = await this.request<GetTemplateResponse>({
      url: `v3/templates/${encodeURIComponent(id)}`,
      method: "GET",
    });
    return response.data;
  }
}
