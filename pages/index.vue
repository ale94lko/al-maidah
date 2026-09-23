<template>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:py-16">
    <section class="relative max-w-2xl overflow-hidden">
      <p class="font-display text-5xl font-semibold tracking-tight text-[var(--espresso)] sm:text-6xl">
        Al-Maidah
      </p>
      <h1 class="mt-5 max-w-xl text-2xl font-medium leading-snug text-[var(--ink)] sm:text-3xl">
        The digital table for restaurants in the UAE
      </h1>
      <p class="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Guests scan a QR code, the kitchen receives the order live, and owners
        manage the menu and revenue from one place.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink to="/admin/login" class="btn-primary">
          Owner sign in
        </NuxtLink>
        <NuxtLink to="/m/demo?table=1" class="btn-secondary">
          Try the demo menu
        </NuxtLink>
      </div>
    </section>

    <section class="mt-16 grid gap-8 border-t border-[var(--espresso)]/10 pt-12 sm:grid-cols-3">
      <article
        v-for="surface in surfaces"
        :key="surface.title"
        class="min-w-0"
      >
        <p class="eyebrow">
          {{ surface.audience }}
        </p>
        <h2 class="font-display mt-2 text-xl font-semibold text-[var(--espresso)]">
          {{ surface.title }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {{ surface.description }}
        </p>
        <p class="mt-4 font-mono text-xs text-[var(--olive)]">
          {{ surface.route }}
        </p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ProductSurface } from "~/types"

useSeoMeta({
  title: "Al-Maidah",
  description:
    "QR digital menu, kitchen ticket board, and owner panel for restaurants in the UAE.",
})

const surfaces: ProductSurface[] = [
  {
    audience: "Guest · mobile",
    title: "Table menu",
    description:
      "Scan the QR code, browse the menu, and send the order from the table.",
    route: "/m/{slug}?table={n}",
  },
  {
    audience: "Kitchen · tablet",
    title: "Ticket board",
    description:
      "See pending, preparing, and ready tickets as they arrive in realtime.",
    route: "/kitchen",
  },
  {
    audience: "Owner · desktop",
    title: "Admin panel",
    description:
      "Manage the menu, printable QR codes, and revenue statistics.",
    route: "/admin",
  },
]
</script>
