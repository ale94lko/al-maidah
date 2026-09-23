<template>
  <div class="min-h-screen">
    <header class="border-b border-teal-900/10 bg-white/70 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-teal-900">
          Al-Maidah
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm text-teal-900/80">
          <NuxtLink to="/admin/login" class="hover:text-teal-950">
            Owner
          </NuxtLink>
          <NuxtLink to="/kitchen" class="hover:text-teal-950">
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
