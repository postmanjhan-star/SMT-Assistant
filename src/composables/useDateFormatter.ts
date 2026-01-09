// composables/useDateFormatter.ts
export type DateInput = string | number | Date | null | undefined

export interface FormatOptions {
    locale?: string
    timeZone?: string
    fallback?: string
}

/**
 * 統一處理後端時間字串，避免 Invalid Date 與時區混亂
 */
export function useDateFormatter(defaultOptions: FormatOptions = {}) {
    const {
        locale = 'zh-TW',
        timeZone = 'Asia/Taipei',
        fallback = ''
    } = defaultOptions

    /**
     * 將各種時間輸入轉為 Date
     */
    function toDate(value: DateInput): Date | null {
        if (!value) return null

        if (value instanceof Date) return isNaN(value.getTime()) ? null : value
        if (typeof value === 'number') return isNaN(new Date(value).getTime()) ? null : new Date(value)

        if (typeof value === 'string') {
            let v = value.trim()

            // 將空格換成 T，方便 Date 解析
            if (v.includes(' ') && !v.includes('T')) {
                v = v.replace(' ', 'T')
            }

            // 如果沒有時區資訊，假設 +08:00（台北時間）
            if (!v.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(v)) {
                v = `${v}+08:00`
            }

            const d = new Date(v)
            return isNaN(d.getTime()) ? null : d
        }

        return null
    }

    /**
     * 顯示用（AG Grid / Table）
     */
    function format(value: DateInput, options: FormatOptions = {}): string {
        const d = toDate(value)
        if (!d) return options.fallback ?? fallback

        return d.toLocaleString(options.locale ?? locale, {
            timeZone: options.timeZone ?? timeZone
        })
    }

    /**
     * 僅日期（YYYY/MM/DD）
     */
    function formatDate(value: DateInput, options: FormatOptions = {}): string {
        const d = toDate(value)
        if (!d) return options.fallback ?? fallback

        return d.toLocaleDateString(options.locale ?? locale, {
            timeZone: options.timeZone ?? timeZone
        })
    }

    /**
     * 僅時間（HH:mm:ss）
     */
    function formatTime(value: DateInput, options: FormatOptions = {}): string {
        const d = toDate(value)
        if (!d) return options.fallback ?? fallback

        return d.toLocaleTimeString(options.locale ?? locale, {
            timeZone: options.timeZone ?? timeZone
        })
    }

    /**
     * 產生 API 用的 ISO（UTC）
     */
    function toISOStringUTC(date: Date = new Date()): string {
        return date.toISOString()
    }

    return {
        toDate,
        format,
        formatDate,
        formatTime,
        toISOStringUTC
    }
}
