import { WorkflowService } from "@/client"
import type { WorkflowSummaryRead } from "@/client"

export type WorkflowSummaryDeps = {
  getSummaries: (params: { skip: number; limit: number }) => Promise<WorkflowSummaryRead[]>
}

export function createWorkflowSummaryDeps(
  overrides: Partial<WorkflowSummaryDeps> = {}
): WorkflowSummaryDeps {
  return {
    getSummaries: (params) => WorkflowService.getSummariesOfWorkflows(params),
    ...overrides,
  }
}
