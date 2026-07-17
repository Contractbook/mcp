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
}
