import { ref } from 'vue'

export function useProductionState(stopProductionFn: (uuid: string) => Promise<unknown>) {
    const productionStarted = ref(false)
    const productionUuid = ref('')

    function start(uuid: string) {
        productionStarted.value = true
        productionUuid.value = uuid
    }

    async function stop() {
        if (!productionUuid.value) return
        await stopProductionFn(productionUuid.value)
        productionStarted.value = false
    }

    return {
        productionStarted,
        productionUuid,
        start,
        stop,
    }
}
