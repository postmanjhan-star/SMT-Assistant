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
