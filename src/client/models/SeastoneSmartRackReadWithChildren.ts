/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SeastoneSmartRackCellRead } from './SeastoneSmartRackCellRead';

export type SeastoneSmartRackReadWithChildren = {
    id: number;
    server_address: string;
    rack_idno: string;
    wifi_ip?: (string | null);
    wifi_mac: string;
    eth_ip?: (string | null);
    eth_mac: string;
    dev_id: string;
    seastone_smart_rack_cells: (Array<SeastoneSmartRackCellRead> | null);
};
