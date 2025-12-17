/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WorkflowSummaryRead = {
    id: number;
    created_at: string;
    updated_at: (string | null);
    production_id: string;
    operator_id?: (string | null);
    workflow_spec_name: string;
    last_task?: (Record<string, any> | null);
};
