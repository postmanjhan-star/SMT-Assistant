/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceReturnRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        idno: {
    type: 'string',
    isRequired: true,
},
        date: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        employee_idno: {
    type: 'string',
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
        material_inventory_id: {
    type: 'number',
    isRequired: true,
},
        material_inventory_idno: {
    type: 'string',
    isRequired: true,
},
        return_quantity: {
    type: 'number',
    isRequired: true,
},
        issuance_return_items: {
    type: 'array',
    contains: {
        type: 'IssuanceReturnItemRead',
    },
},
    },
} as const;
