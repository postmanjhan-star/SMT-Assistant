/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SeastoneSmartRackReadWithoutChildren = {
    properties: {
        id: {
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
    type: 'string',
    format: 'ipvanyaddress',
},
        wifi_mac: {
    type: 'string',
    isRequired: true,
},
        eth_ip: {
    type: 'string',
    format: 'ipvanyaddress',
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
