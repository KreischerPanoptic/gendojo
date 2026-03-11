export interface TokensSettings {
  /** HuggingFace API token — used for gated model downloads */
  hfToken: string | null;
  /** CivitAI API token — used for CivitAI model downloads */
  civitaiToken: string | null;
}

export type UpdateTokensDto = Partial<TokensSettings>;

/**
 * Response shape: tokens are masked unless explicitly requested.
 * The UI never receives the raw token — only a presence flag and a hint.
 */
export interface TokensResponse {
  hfToken: {
    set: boolean;
    /** Last 4 characters of the token, null if not set */
    hint: string | null;
  };
  civitaiToken: {
    set: boolean;
    hint: string | null;
  };
}