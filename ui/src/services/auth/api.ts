import { authControllerEnableMfa, authControllerLogin, authControllerSetupMfa, authControllerVerifyMfa } from "@api/sdk.gen"
import type { LoginDto, LoginResponseDto, MfaEnableResponseDto, MfaSetupResponseDto, MfaTokenDto, MfaVerifyResponseDto } from "./types"

export const authApi = {
  login: (credentials: LoginDto): Promise<LoginResponseDto> =>
    authControllerLogin({ body: credentials }).then(r => {
      if (r.data)
        return r.data
      throw new Error("Login failed")
    }),

  mfaSetup: (): Promise<MfaSetupResponseDto> =>
    authControllerSetupMfa().then(r => {
      if (r.data)
        return r.data
      throw new Error("MFA setup failed")
    }),

  mfaEnable: (token: MfaTokenDto): Promise<MfaEnableResponseDto> =>
    authControllerEnableMfa({ body: token }).then(r => {
      if (r.data)
        return r.data
      throw new Error("MFA enable failed")
    }),

  mfaVerify: (token: MfaTokenDto): Promise<MfaVerifyResponseDto> =>
    authControllerVerifyMfa({ body: token }).then(r => {
      if (r.data)
        return r.data
      throw new Error("MFA verify failed")
    }),
}