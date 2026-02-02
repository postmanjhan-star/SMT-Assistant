/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountCreate = {
    properties: {
        role: {
    type: 'any-of',
    contains: [{
    type: 'prisma__enums__EmployeeRoleEnum',
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
    },
} as const;
