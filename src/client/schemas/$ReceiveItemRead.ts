/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveItemRead = {
    properties: {
        receive_id: {
    type: 'number',
    isRequired: true,
},
        qualify_qty: {
    type: 'number',
    isRequired: true,
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        id: {
    type: 'number',
    isRequired: true,
},
        total_qty: {
    type: 'number',
    isRequired: true,
},
        material_idno: {
    type: 'string',
    isRequired: true,
},
    },
} as const;