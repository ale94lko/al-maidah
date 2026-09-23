<template>
  <div class="min-h-screen text-[var(--ink)]">
    <header class="shell-header">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <NuxtLink
          to="/admin/login"
          class="font-display text-xl font-bold tracking-tight text-[var(--ink)]"
        >
          Al-Maidah
        </NuxtLink>
        <nav class="flex items-center gap-5 text-sm font-bold">
          <NuxtLink
            to="/admin/login"
            class="text-[var(--herb-deep)] transition hover:text-[var(--chili)]"
          >
            Owner
          </NuxtLink>
          <NuxtLink
            to="/kitchen"
            class="text-[var(--herb-deep)] transition hover:text-[var(--chili)]"
          >
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
