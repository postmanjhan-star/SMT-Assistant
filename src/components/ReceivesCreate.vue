<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui';
import { NA, NH1 } from 'naive-ui';
import { NSpace } from 'naive-ui';
import { NForm, NFormItemGi, NInput, NButton, NGrid } from 'naive-ui';

const formValue = ref( { username: null, password: null } );

</script>


<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-image: url('/pattern.svg'); background-repeat: repeat-x; background-position: center; background-size: cover;">
    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>物料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/receives" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">收料管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>建立收料單</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">建立收料單</n-h1>
      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">
        <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">
          <n-grid cols="1 s:2" responsive="screen" x-gap="20">

            <n-form-item-gi show-require-mark label="收料單號" path="username">
              <n-input v-model:value.lazy=" formValue.username " :disabled=" true "
                :input-props=" { autocomplete: 'username' } ">
              </n-input>
            </n-form-item-gi>

            <n-form-item-gi show-require-mark label="收料日期" path="password" autofocus>
              <n-input type="password" v-model:value.lazy=" formValue.password " autofocus
                :input-props=" { autocomplete: 'new-password' } "></n-input>
            </n-form-item-gi>

            <n-form-item-gi span="2">
              <n-button type="primary" block @click=" handleCreateAccountButtonClick( $event ) " attr-type="submit">
                建立收料單
              </n-button>
            </n-form-item-gi>

          </n-grid>
        </n-form>
      </n-space>
    </div>
  </main>
</template>
