/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STPartPack = {
    properties: {
        pack_idno: {
    type: 'string',
    isRequired: true,
},
        pack_qty: {
    type: 'number',
    isRequired: true,
},
        total_qualify_qty: {
    type: 'number',
    isRequired: true,
},
        pack_sequence_idno: {
    type: 'number',
    isRequired: true,
},
        total_pack_sequence_idno: {
    type: 'number',
    isRequired: true,
},
        receive_id: {
    type: 'string',
    isRequired: true,
},
        part_idno: {
    type: 'string',
    isRequired: true,
},
        unit: {
    type: 'string',
    isRequired: true,
},
        vendor_idno: {
    type: 'string',
    isRequired: true,
},
        receive_date: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
    },
} as const;
