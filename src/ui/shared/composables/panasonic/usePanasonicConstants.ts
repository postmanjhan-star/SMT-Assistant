export const PANASONIC_MODE_NAME_TESTING = "🧪 試產生產模式"
export const PANASONIC_MODE_NAME_NORMAL = "✅ 正式生產模式"

export const PANASONIC_HOME_PATH = "/smt/panasonic-mounter/"
export const PANASONIC_DETAIL_BASE_PATH = "/smt/panasonic-mounter"
export const PANASONIC_PRODUCTION_BASE_PATH = "/smt/panasonic-mounter-production"

export const PANASONIC_NOT_FOUND_PATH = "/http-status/404"

export const PANASONIC_MACHINE_SIDE_VALUES = ["1", "2", "1+2"] as const
export const PANASONIC_BOARD_SIDE_VALUES = ["TOP", "BOTTOM", "DUPLEX"] as const

export type PanasonicMachineSide = (typeof PANASONIC_MACHINE_SIDE_VALUES)[number]
export type PanasonicBoardSide = (typeof PANASONIC_BOARD_SIDE_VALUES)[number]
