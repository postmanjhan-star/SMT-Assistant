import { SmtService } from "@/client"

export type SwitchUserResult = {
  access_token: string
  token_type: string
  employee?: { idno: string; full_name: string }
  expires_in?: number | null
}

export type SwitchUserFn = (payload: {
  work_id: string
  signature?: string
}) => Promise<SwitchUserResult>

export type ScanLoginDeps = {
  switchUser: SwitchUserFn
}

export function createDefaultScanLoginDeps(): ScanLoginDeps {
  return {
    switchUser: (payload) =>
      SmtService.operatorSwitchUser({ requestBody: payload }),
  }
}
