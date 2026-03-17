/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SeastoneSmartRackCreate = {
    properties: {
        l1_storage_id: {
            type: 'number',
            isRequired: true,
        },
        server_address: {
            type: 'string',
            isRequired: true,
            format: 'uri',
            maxLength: 2083,
            minLength: 1,
        },
        rack_idno: {
            type: 'string',
            isRequired: true,
        },
        wifi_ip: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'ipvanyaddress',
            }, {
                type: 'null',
            }],
        },
        wifi_mac: {
            type: 'string',
            isRequired: true,
        },
        eth_ip: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'ipvanyaddress',
            }, {
                type: 'null',
            }],
        },
        eth_mac: {
            type: 'string',
            isRequired: true,
        },
        dev_id: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
