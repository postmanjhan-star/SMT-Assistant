/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeRole = {
    description: `Represents a EmployeeRole record`,
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        employee: {
    type: 'Employee',
},
        role: {
    type: 'EmployeeRoleEnum',
    isRequired: true,
},
    },
} as const;