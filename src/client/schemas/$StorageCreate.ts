/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $StorageCreate = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        name: {
    type: 'string',
    isRequired: true,
},
        type: {
    type: 'all-of',
    contains: [{
    type: 'StorageTypeEnum',
}],
},
        l2_storages: {
    type: 'array',
    contains: {
        type: 'L2StorageCreate',
    },
    isRequired: true,
},
    },
} as const;
