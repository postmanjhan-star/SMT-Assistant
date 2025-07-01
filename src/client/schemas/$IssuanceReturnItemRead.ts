/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceReturnItemRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        issuance_return_id: {
    type: 'number',
    isRequired: true,
},
        material_inventory_records: {
    type: 'any-of',
    contains: [{
    type: 'array',
    contains: {
        type: 'MaterialInventoryRecordRead',
    },
}, {
    type: 'null',
}],
    isRequired: true,
},
        from_l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        to_l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        quantity: {
    type: 'string',
    isRequired: true,
},
    },
} as const;
