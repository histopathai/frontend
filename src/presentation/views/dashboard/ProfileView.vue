<template>
  <main class="max-w-3xl mx-auto space-y-8">
    <UserProfile />
    <ChangePasswordForm />
  </main>
</template>

<script setup lang="ts">
import UserProfile from '@/presentation/components/user/UserProfile.vue';
import ChangePasswordForm from '@/presentation/components/user/ChangePasswordForm.vue';
</script>
