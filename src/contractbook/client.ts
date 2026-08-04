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

export interface UploadedFileContent {
  id?: string;
  text_markup?: string | null;
  ocr_status?: string | null;
}

export interface DocumentContentResponse {
  document?: {
    markdown?: string;
    uploaded_files?: UploadedFileContent[];
  };
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

export interface DocumentCreateSignee {
  full_name?: string;
  email?: string;
  title?: string;
  order?: number;
  signature_verification_methods?: string[];
}

export interface DocumentCreateParty {
  type?: string;
  name?: string;
  reference?: string;
  address?: string;
  number?: string;
  signees?: DocumentCreateSignee[];
}

export interface DocumentCreateDataField {
  name: string;
  type: string;
  value: string;
  id?: string;
  description?: string;
  required?: boolean;
  config?: Record<string, unknown>;
}

export interface DocumentCreateAttachment {
  original: string;
  filename?: string;
  preview?: string[];
}

export interface DocumentCreateDynamicTable {
  attrs: {
    id: string;
    columns: string[];
    rows: string[][];
  };
}

export interface DocumentCreateAttributes {
  title?: string;
  language?: string;
  tags?: string[];
  parties?: DocumentCreateParty[];
  data_fields?: DocumentCreateDataField[];
  message?: { content?: string };
  attachments?: DocumentCreateAttachment[];
  attachments_signed_separately?: boolean;
  company_logo_url?: string;
  signing_order_mode?: string;
  to_be_signed_by?: string;
  dynamic_tables?: DocumentCreateDynamicTable[];
}

export interface CreateDocumentRequest {
  document: DocumentCreateAttributes;
}

export interface CreatedDocumentSignee {
  full_name?: string | null;
  email?: string | null;
  title?: string | null;
  order?: number;
}

export interface CreatedDocumentParty {
  type?: string;
  name?: string | null;
  reference?: string | null;
  signees?: CreatedDocumentSignee[];
}

export interface CreatedDocument {
  id?: string;
  title?: string;
  state?: string;
  type?: string;
  language?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  signing_order_mode?: string;
  to_be_signed_by?: string;
  source_template_id?: string;
  parties?: CreatedDocumentParty[];
  data_fields?: TemplateDataField[];
}

export interface CreateDocumentResponse {
  document?: CreatedDocument;
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

  async getDocumentContent(id: string): Promise<DocumentContentResponse> {
    const response = await this.request<DocumentContentResponse>({
      url: `documents/${id}/markdown`,
      method: "GET",
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
      url: `v3/templates/${id}`,
      method: "GET",
    });
    return response.data;
  }

  async createDocumentFromTemplate(
    id: string,
    body: CreateDocumentRequest,
  ): Promise<CreateDocumentResponse> {
    const response = await this.request<CreateDocumentResponse>({
      url: `v3/templates/${id}/create_document`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.data;
  }
}
