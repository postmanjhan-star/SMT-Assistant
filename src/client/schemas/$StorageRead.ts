/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $StorageRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        type: {
            type: 'StorageTypeEnum',
            isRequired: true,
        },
        l2_storages: {
            type: 'array',
            contains: {
                type: 'L2StorageRead',
            },
            isRequired: true,
        },
    },
} as const;
