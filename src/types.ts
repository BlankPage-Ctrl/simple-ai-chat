export interface OllamaOptions {
  num_ctx?: number;
  repeat_last_n?: number;
  repeat_penalty?: number;
  temperature?: number;
  seed?: number;
  stop?: string[];
  num_predict?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
}

export interface AIModel {
  name: string;
  baseURL: string;
  apiKey: string;
  modelId: string;
  options?: OllamaOptions;
  think?: boolean;
}
