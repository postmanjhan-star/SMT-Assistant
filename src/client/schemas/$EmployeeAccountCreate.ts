/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountCreate = {
    properties: {
        role: {
            type: 'any-of',
            description: `Employee role name (default: Operator).`,
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        password: {
            type: 'string',
            isRequired: true,
        },
        username: {
            type: 'string',
            isRequired: true,
        },
        full_name: {
            type: 'any-of',
            description: `Employee full name (required for CSV import).`,
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        department: {
            type: 'any-of',
            description: `Department code/abbreviation (required for CSV import).`,
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        idno: {
            type: 'any-of',
            description: `Employee ID number (distinct from account username; required for CSV import).`,
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        level: {
            type: 'any-of',
            description: `Employee level as integer (required for CSV import).`,
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
