<template>
  <div class="min-h-screen text-[var(--ink)]">
    <header class="shell-header">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <NuxtLink
          to="/"
          class="font-display text-xl font-semibold tracking-tight text-[var(--espresso)]"
        >
          Al-Maidah
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm font-medium text-[var(--olive)]">
          <NuxtLink to="/admin/login" class="hover:text-[var(--espresso)]">
            Owner
          </NuxtLink>
          <NuxtLink to="/kitchen" class="hover:text-[var(--espresso)]">
            Kitchen
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
