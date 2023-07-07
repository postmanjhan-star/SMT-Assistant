/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $L2StorageBatchMove = {
    properties: {
        move_to_l1_id: {
    type: 'number',
    isRequired: true,
},
        l2_id_list: {
    type: 'array',
    contains: {
    type: 'number',
},
    isRequired: true,
},
    },
} as const;
