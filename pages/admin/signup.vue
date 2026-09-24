<script setup lang="ts">
definePageMeta({
  layout: false,
})

// Public self-signup is disabled; only the platform superadmin can create accounts.
await navigateTo("/admin/login", { replace: true })
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-[var(--paper)] p-6 text-sm text-[var(--muted)]">
    Redirecting…
  </div>
</template>
