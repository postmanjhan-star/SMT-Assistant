import { ref } from 'vue'
import { stopPanasonicProduction } from '@/application/panasonic/production/StopPanasonicProduction'

export function useProductionState() {
    const productionStarted = ref(false)
    const productionUuid = ref('')

    function start(uuid: string) {
        productionStarted.value = true
        productionUuid.value = uuid
    }

    async function stop() {
        if (!productionUuid.value) return
        await stopPanasonicProduction(productionUuid.value)
        productionStarted.value = false
    }

    return {
        productionStarted,
        productionUuid,
        start,
        stop,
    }
}
