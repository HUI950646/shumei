<template>
  <WelcomePage v-if="route.path === '/welcome'" />
  <LoginPage v-else-if="route.path === '/login'" />
  <Dashboard v-else-if="route.path === '/cockpit'" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import AppShell from '@/components/layout/AppShell.vue';
import Dashboard from '@/cockpit/Dashboard.vue';
import LoginPage from '@/views/auth/LoginPage.vue';
import WelcomePage from '@/views/auth/WelcomePage.vue';
import { useRoute } from 'vue-router';
const route = useRoute();
</script>
