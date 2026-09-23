<template>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:py-16">
    <section class="max-w-2xl">
      <p class="text-sm font-medium uppercase tracking-[0.18em] text-teal-800/80">
        Al-Maidah
      </p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
        The digital table for restaurants in the UAE
      </h1>
      <p class="mt-4 text-lg leading-relaxed text-stone-700">
        Guests scan a QR code, the kitchen receives the order live, and owners
        manage the menu and revenue from one place.
      </p>
    </section>

    <section class="mt-12 grid gap-4 sm:grid-cols-3">
      <article
        v-for="surface in surfaces"
        :key="surface.title"
        class="rounded-2xl border border-teal-900/10 bg-white/80 p-5 shadow-sm"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800/70">
          {{ surface.audience }}
        </p>
        <h2 class="mt-2 text-xl font-semibold text-stone-900">
          {{ surface.title }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-stone-600">
          {{ surface.description }}
        </p>
        <p class="mt-4 font-mono text-xs text-teal-900/80">
          {{ surface.route }}
        </p>
      </article>
    </section>

    <section class="mt-12 rounded-2xl border border-dashed border-teal-900/20 bg-teal-950/[0.03] p-5">
      <h2 class="text-base font-semibold text-stone-900">
        Scaffold ready
      </h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        This release only ships the Nuxt 3 application shell. Ordering, kitchen
        realtime, payments, and admin tools arrive in the later MVP issues.
      </p>
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
