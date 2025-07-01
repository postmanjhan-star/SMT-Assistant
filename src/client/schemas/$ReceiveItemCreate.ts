/* generated using openapi-typescript-codegen -- do no edit */
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
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
    isRequired: true,
},
        qualify_qty: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
    isRequired: true,
},
        st_barcodes: {
    type: 'array',
    contains: {
    type: 'string',
},
},
    },
} as const;
