import { h } from 'vue';
import { RouterLink } from 'vue-router';

const systemMenuOptions = [
    {
        label: () => h( RouterLink, { to: '/accounts' }, { default: () => '帳號管理' } ),
        key: 'accounts'
    },
];

const materialMenuOptions = [
    {
        label: () => h( RouterLink, { to: '/storages' }, { default: () => '倉位管理' } ),
        key: 'storages'
    },
    {
        label: () => h( RouterLink, { to: '/materials' }, { default: () => '物料管理' } ),
        key: 'materials'
    },
    {
        label: () => h( RouterLink, { to: '/receives' }, { default: () => '收料管理' } ),
        key: 'receives'
    },
    {
        label: () => h( RouterLink, { to: '/epicor_receives' }, { default: () => 'Epicor 收料紀錄' } ),
        key: 'epicor_receives'
    },
];

const purchaseMenuOptions = [
    {
        label: () => h( RouterLink, { to: '/vendors' }, { default: () => '供應商管理' } ),
        key: 'vendors'
    },
];

export {
    systemMenuOptions,
    materialMenuOptions,
    purchaseMenuOptions,
};
