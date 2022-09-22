import { h } from 'vue';
import { RouterLink } from 'vue-router';

const systemMenuOptions = [
    { label: () => h( RouterLink, { to: '/accounts' }, { default: () => '帳號管理' } ), key: 'accounts' },
];

const materialMenuOptions = [
    { label: () => h( RouterLink, { to: '/storages' }, { default: () => '倉位管理' } ), key: 'storages' },
    { label: () => h( RouterLink, { to: '/materials' }, { default: () => '物料管理' } ), key: 'materials' },
    { label: () => h( RouterLink, { to: '/receives' }, { default: () => '收料作業' } ), key: 'receives' },
    { label: () => h( RouterLink, { to: '/transfers' }, { default: () => '調撥作業' } ), key: 'transfers' },
    { label: () => h( RouterLink, { to: '/issuances' }, { default: () => '發料備料作業' } ), key: 'issuances' },
    { label: () => h( RouterLink, { to: '/issuance_returns' }, { default: () => '發料退回作業' } ), key: 'issuance_returns' },
    { label: () => h( RouterLink, { to: '/st_erp_receives' }, { default: () => '舊 ERP 收料紀錄' } ), key: 'st_erp_receives' },
    { label: () => h( RouterLink, { to: '/epicor_receives' }, { default: () => 'Epicor 收料紀錄' } ), key: 'epicor_receives' },
];

const purchaseMenuOptions = [
    { label: () => h( RouterLink, { to: '/vendors' }, { default: () => '供應商管理' } ), key: 'vendors' },
];

export {
    systemMenuOptions,
    materialMenuOptions,
    purchaseMenuOptions,
};
