import { h } from 'vue';
import { RouterLink } from 'vue-router';

const systemMenuOptions = [
    {
        label: () =>
            h(
                RouterLink,
                {
                    to: '/accounts',
                },
                { default: () => '帳號管理' },
            ),
        key: 'accounts'
    },
];

const materialMenuOptions = [
    {
        label: () =>
            h(
                RouterLink,
                { to: '/storages' },
                { default: () => '倉位管理' },
            ),
        key: 'storages'
    },
];


export {
    systemMenuOptions,
    materialMenuOptions,
};
