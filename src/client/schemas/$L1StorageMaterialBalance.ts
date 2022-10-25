/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $L1StorageMaterialBalance = {
    properties: {
        l1_storage_id: {
    type: 'number',
    isRequired: true,
},
        l1_storage_idno: {
    type: 'string',
    isRequired: true,
},
        l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        l2_storage_idno: {
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
        balance: {
    type: 'number',
    isRequired: true,
},
    },
} as const;
