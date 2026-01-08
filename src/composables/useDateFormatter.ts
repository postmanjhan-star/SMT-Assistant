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
export function useDateFormatter(
    defaultOptions: FormatOptions = {}
) {
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

        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value
        }

        if (typeof value === 'number') {
            const d = new Date(value)
            return isNaN(d.getTime()) ? null : d
        }

        if (typeof value === 'string') {
            let v = value.trim()

            /**
             * 修正常見後端格式：
             * 2026-01-08 14:32:15
             * 2026-01-08T14:32:15.123
             */
            if (!v.endsWith('Z') && !v.includes('+')) {
                if (v.includes(' ')) {
                    v = v.replace(' ', 'T')
                }
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
    function format(
        value: DateInput,
        options: FormatOptions = {}
    ): string {
        const d = toDate(value)
        if (!d) return options.fallback ?? fallback

        return d.toLocaleString(options.locale ?? locale, {
            timeZone: options.timeZone ?? timeZone
        })
    }

    /**
     * 僅日期（YYYY/MM/DD）
     */
    function formatDate(
        value: DateInput,
        options: FormatOptions = {}
    ): string {
        const d = toDate(value)
        if (!d) return options.fallback ?? fallback

        return d.toLocaleDateString(options.locale ?? locale, {
            timeZone: options.timeZone ?? timeZone
        })
    }

    /**
     * 僅時間（HH:mm:ss）
     */
    function formatTime(
        value: DateInput,
        options: FormatOptions = {}
    ): string {
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
