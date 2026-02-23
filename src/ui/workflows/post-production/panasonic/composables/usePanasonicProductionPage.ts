import {
  usePanasonicProductionWorkflow,
  type PanasonicProductionWorkflowOptions,
} from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionWorkflow"

export type PanasonicProductionPageOptions = PanasonicProductionWorkflowOptions

export function usePanasonicProductionPage(options: PanasonicProductionPageOptions) {
  return usePanasonicProductionWorkflow(options)
}
