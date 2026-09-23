<template>
  <div class="landing-shell relative min-h-dvh overflow-hidden text-white">
    <div class="absolute inset-0">
      <img
        src="/images/hero-dining.jpg"
        alt=""
        class="h-full w-full scale-105 object-cover"
      >
      <div class="absolute inset-0 bg-[var(--ink)]/35" />
      <div
        class="absolute inset-y-0 start-0 w-full bg-gradient-to-r from-[var(--ink)]/88 via-[var(--ink)]/55 to-transparent lg:w-[62%]"
      />
    </div>

    <div class="relative z-10 flex min-h-dvh flex-col">
      <header>
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <p class="font-display landing-ink text-2xl font-extrabold tracking-tight">
            Al-Maidah
          </p>
          <nav class="flex items-center gap-5 text-sm font-bold">
            <NuxtLink to="/admin/login" class="landing-ink text-white/90 transition hover:text-[var(--citrus)]">
              Owner
            </NuxtLink>
            <NuxtLink to="/kitchen" class="landing-ink text-white/90 transition hover:text-[var(--citrus)]">
              Kitchen
            </NuxtLink>
          </nav>
        </div>
        <div class="accent-bar" aria-hidden="true">
          <span /><span /><span />
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-14 pt-16 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24">
        <div class="max-w-xl">
          <p class="landing-ink text-[11px] font-extrabold uppercase tracking-[0.24em] text-[var(--citrus)]">
            UAE table ordering
          </p>
          <h1 class="font-display landing-ink mt-4 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Al-Maidah
          </h1>
          <p class="landing-ink mt-5 max-w-md text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
            Guests scan, kitchen cooks, owners grow — one fresh digital table.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink to="/m/demo?table=621d0a8a93454e9d8e07bbcad5915f42eb189a3ba80a7f82d1de1d66d3e39dae" class="btn-primary">
              Try the demo menu
            </NuxtLink>
            <NuxtLink
              to="/admin/login"
              class="btn-success"
            >
              Owner sign in
            </NuxtLink>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: "Al-Maidah",
  description:
    "QR digital menu, kitchen ticket board, and owner panel for restaurants in the UAE.",
})
</script>
