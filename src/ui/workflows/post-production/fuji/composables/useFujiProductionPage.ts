import {
  useFujiProductionWorkflow,
  type FujiProductionWorkflowOptions,
} from "@/ui/workflows/post-production/fuji/composables/useFujiProductionWorkflow"

export function useFujiProductionPage(options: FujiProductionWorkflowOptions = {}) {
  return useFujiProductionWorkflow(options)
}
