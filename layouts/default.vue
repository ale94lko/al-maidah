<template>
  <div class="min-h-screen">
    <header class="border-b border-teal-900/10 bg-white/70 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-teal-900">
          Al-Maidah
        </NuxtLink>
        <span class="text-xs uppercase tracking-[0.2em] text-teal-800/70">
          UAE table ordering
        </span>
      </div>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
