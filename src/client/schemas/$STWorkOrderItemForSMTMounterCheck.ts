/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrderItemForSMTMounterCheck = {
    properties: {
        work_order_idno: {
    type: 'string',
    isRequired: true,
},
        material_idno: {
    type: 'string',
    isRequired: true,
},
        slot_side: {
    type: 'string',
    isRequired: true,
},
        slot_number: {
    type: 'number',
    isRequired: true,
},
    },
} as const;
