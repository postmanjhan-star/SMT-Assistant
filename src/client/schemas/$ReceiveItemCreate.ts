/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveItemCreate = {
    properties: {
        material_id: {
    type: 'number',
    isRequired: true,
},
        total_qty: {
    type: 'number',
},
        qualify_qty: {
    type: 'number',
},
        st_barcodes: {
    type: 'array',
    contains: {
    type: 'string',
},
},
    },
} as const;