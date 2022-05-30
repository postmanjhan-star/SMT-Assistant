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

export { systemMenuOptions };
