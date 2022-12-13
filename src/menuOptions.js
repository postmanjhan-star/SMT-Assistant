import { h } from "vue";
import { RouterLink } from "vue-router";

const systemMenuOptions = [
  { label: () => h( RouterLink, { to: "/wms/accounts" }, { default: () => "帳號管理" } ), key: "accounts", },
  { label: () => h( RouterLink, { to: "/wms/seastone_racks" }, { default: () => "智慧料架管理" } ), key: "seastone_racks", },
];



const materialMenuOptions = [
  { label: () => h( RouterLink, { to: '/wms/receives' }, { default: () => '收料作業' } ), key: 'receives' },
  { label: () => h( RouterLink, { to: '/wms/transfers' }, { default: () => '調撥作業' } ), key: 'transfers' },
  { label: () => h( RouterLink, { to: '/wms/issuances' }, { default: () => '發料備料作業' } ), key: 'issuances' },
  { label: () => h( RouterLink, { to: '/wms/issuance_returns' }, { default: () => '發料退回作業' } ), key: 'issuance_returns' },
  { label: () => h( RouterLink, { to: '/wms/st_erp_receives' }, { default: () => '舊 ERP 收料紀錄' } ), key: 'st_erp_receives' },
  { label: () => h( RouterLink, { to: '/wms/epicor_receives' }, { default: () => 'Epicor 收料紀錄' } ), key: 'epicor_receives' },
  { label: () => h( RouterLink, { to: '/wms/st_erp_work_orders' }, { default: () => '舊 ERP 工單紀錄' } ), key: 'st_erp_work_orders' },
];



const purchaseMenuOptions = [
  { label: () => h( RouterLink, { to: '/wms/vendors' }, { default: () => '供應商管理' } ), key: 'vendors' },
  { label: () => h( RouterLink, { to: '/wms/storages' }, { default: () => '倉位管理' } ), key: 'storages' },
  { label: () => h( RouterLink, { to: '/wms/materials' }, { default: () => '物料管理' } ), key: 'materials' },
];

export { systemMenuOptions, materialMenuOptions, purchaseMenuOptions };
