/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        idno: {
    type: 'string',
    isRequired: true,
},
        parent_material_inventory_id: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'null',
}],
    isRequired: true,
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material_idno: {
    type: 'string',
    isRequired: true,
},
        material_name: {
    type: 'string',
    isRequired: true,
},
        l1_storage_id: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'null',
}],
    isRequired: true,
},
        l1_storage_idno: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        l2_storage_id: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'null',
}],
    isRequired: true,
},
        l2_storage_idno: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        latest_qty: {
    type: 'string',
    isRequired: true,
},
        receive_item_id: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'null',
}],
    isRequired: true,
},
        issuing_locked: {
    type: 'boolean',
    isRequired: true,
},
        date_of_expiry: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        st_barcode: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
    },
} as const;
