/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WorkflowSummaryRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'any-of',
    contains: [{
    type: 'string',
    format: 'date-time',
}, {
    type: 'null',
}],
    isRequired: true,
},
        production_id: {
    type: 'string',
    isRequired: true,
},
        operator_id: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
},
        workflow_spec_name: {
    type: 'string',
    isRequired: true,
},
        last_task: {
    type: 'any-of',
    contains: [{
    type: 'dictionary',
    contains: {
    properties: {
    },
},
}, {
    type: 'null',
}],
},
        mounter_type: {
    type: 'any-of',
    contains: [{
    type: 'MounterTypeEnum',
}, {
    type: 'null',
}],
},
        mounter: {
    type: 'any-of',
    contains: [{
    type: 'WorkflowSummaryMounterRead',
}, {
    type: 'null',
}],
},
    },
} as const;
