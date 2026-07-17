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

export class ContractbookClient extends HttpClient {
  async listDocuments(params: Record<string, string | string[]>): Promise<ListDocumentsResponse> {
    const response = await this.request<ListDocumentsResponse>({
      url: "v3/documents",
      method: "GET",
      params,
    });
    return response.data;
  }
}
