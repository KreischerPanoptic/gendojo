export type QrData = {
  qrCode: string // data:image/png;base64,...
  secret: string // raw base32 secret for manual entry
  url: string // otpauth:// URI
}

export type MfaData = {
  isMfaEnabled: boolean
  qrData: QrData | null
}
