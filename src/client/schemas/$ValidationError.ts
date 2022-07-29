/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ValidationError = {
    properties: {
        loc: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        msg: {
            type: 'string',
            isRequired: true,
        },
        type: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;