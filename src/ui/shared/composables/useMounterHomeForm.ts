/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { ref, watch, nextTick, type Ref } from 'vue'
import { type FormInst, type FormItemRule, type FormRules, useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, StErpService } from '@/client'

export interface MounterHomeFormBase {
    workOrderIdno: string
    productIdno: string
    mounterIdno: string
    workSheetSide: 'TOP' | 'BOTTOM' | 'DUPLEX' | null
}

export interface MounterHomeFormConfig<T extends MounterHomeFormBase> {
    initialFormValue: T
    testingDefaults: Partial<T>
    /** 品牌特有的額外驗證規則（Panasonic 傳入 machineSide rule） */
    extraRules?: FormRules
    findMounterIdnosByProductIdno: (productIdno: string) => Promise<string[]>
    /** 呼叫品牌 API 並跳轉頁面；ApiError 404/503 由 composable 統一 catch */
    submitAndNavigate: (
        formValue: T,
        meta: { testingMode: boolean; testingProductIdno: string | null }
    ) => Promise<void>
}

export const WORK_SHEET_SIDE_OPTIONS = [
    { label: 'TOP面', value: 'TOP' },
    { label: 'BOT面', value: 'BOTTOM' },
    { label: 'B+T面', value: 'DUPLEX' },
] as const

export function useMounterHomeForm<T extends MounterHomeFormBase>(config: MounterHomeFormConfig<T>) {
    const route = useRoute()
    const router = useRouter()
    const message = useMessage()

    const isTestingMode = ref(route.query.testing_mode === '1')
    const formRef = ref<FormInst | null>(null)
    const formValue = ref({ ...config.initialFormValue }) as Ref<T>
    const mounterOptions = ref<{ label: string; value: string }[]>([])

    const baseRules: FormRules = {
        workOrderIdno: { required: true, message: '請輸入工單號', trigger: ['blur'] },
        productIdno: { required: true, message: '請輸入成品料號', trigger: ['blur', 'input'] },
        mounterIdno: { required: true, message: '請輸入線別', trigger: ['input', 'blur'] },
        workSheetSide: {
            required: true,
            message: '請選擇工件正反面',
            trigger: ['change'],
            validator: (_rule: FormItemRule, value: string) => value != null,
        },
    }
    const rules: FormRules = { ...baseRules, ...config.extraRules }

    async function onToggleTestingMode(val: boolean) {
        const newQuery = { ...route.query }
        if (val) {
            newQuery.testing_mode = '1'
            newQuery.testing_product_idno =
                formValue.value.productIdno?.trim() || (config.testingDefaults.productIdno as string)
        } else {
            delete newQuery.testing_mode
            delete newQuery.testing_product_idno
        }
        await router.replace({ query: newQuery })
        message.info(val ? '🧪 試產生產模式已開啟' : '✅ 正式生產模式已開啟')
    }

    watch(
        () => route.query.testing_mode,
        async (newVal) => {
            if (newVal === '1') {
                Object.assign(formValue.value, config.testingDefaults)
                await nextTick()
                const input = document.querySelector('#productIdnoInput') as HTMLInputElement | null
                if (input) {
                    setTimeout(() => {
                        input.focus()
                        input.select()
                    }, 100)
                }
            } else {
                Object.keys(formValue.value).forEach(
                    (key) => ((formValue.value as Record<string, unknown>)[key] = '')
                )
            }
        },
        { immediate: true }
    )

    watch(
        () => formValue.value.productIdno,
        async (newVal) => {
            if (route.query.testing_mode === '1') {
                const newQuery = { ...route.query }
                if (newVal && newVal.trim()) {
                    newQuery.testing_product_idno = newVal.trim()
                } else {
                    delete newQuery.testing_product_idno
                }
                await router.replace({ query: newQuery })
            }

            if (newVal && newVal.trim()) {
                try {
                    const mounterIdnos = await config.findMounterIdnosByProductIdno(newVal.trim())
                    mounterOptions.value = mounterIdnos.map((id) => ({ label: id, value: id }))
                    if (
                        mounterOptions.value.length > 0 &&
                        !mounterOptions.value.some((opt) => opt.value === formValue.value.mounterIdno)
                    ) {
                        formValue.value.mounterIdno = mounterOptions.value[0].value
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        }
    )

    watch(
        () => formValue.value.workOrderIdno,
        async (newVal) => {
            if (isTestingMode.value || !newVal) return
            try {
                const stWorkOrder = await StErpService.getStWorkOrder({ workOrderIdno: newVal.trim() })
                if (stWorkOrder?.product_idno) {
                    formValue.value.productIdno = stWorkOrder.product_idno
                    message.success(`已自動帶入成品料號：${stWorkOrder.product_idno}`)
                }
            } catch (error) {
                console.error(error)
            }
        }
    )

    async function onClickSubmitButton(_event: Event) {
        try {
            await formRef.value?.validate(async (error) => { if (error) throw error })
        } catch {
            message.error('請輸入必填欄位')
            return false
        }

        try {
            const meta = {
                testingMode: route.query.testing_mode === '1',
                testingProductIdno: route.query.testing_product_idno
                    ? route.query.testing_product_idno.toString()
                    : null,
            }
            await config.submitAndNavigate(formValue.value, meta)
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                message.error('查無資料')
                return false
            }
            if (error instanceof ApiError && error.status === 503) {
                message.error('ERP 工單查詢失敗')
                return false
            }
        }
    }

    return {
        isTestingMode,
        formRef,
        formValue,
        mounterOptions,
        rules,
        workSheetSideOptions: WORK_SHEET_SIDE_OPTIONS,
        onToggleTestingMode,
        onClickSubmitButton,
    }
}
