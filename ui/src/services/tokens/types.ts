// Mirror of api/src/system/tokens/entities/tokens.types.ts

export interface TokenInfo {
  set: boolean;
  /** e.g. "...f4ab" — last 4 chars, null if not set */
  hint: string | null;
}

export interface TokensResponse {
  hfToken: TokenInfo;
  civitaiToken: TokenInfo;
}

export interface UpdateTokensDto {
  hfToken?: string | null;
  civitaiToken?: string | null;
}