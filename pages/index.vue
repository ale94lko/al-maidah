<template>
  <div class="relative overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    >
      <div
        class="absolute -left-24 top-10 h-72 w-72 rounded-[40%] bg-[var(--chili)]/15 blur-2xl"
      />
      <div
        class="absolute right-[-4rem] top-32 h-80 w-80 rounded-[45%] bg-[var(--herb)]/20 blur-2xl"
      />
      <div
        class="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-[var(--citrus)]/25 blur-3xl"
      />
    </div>

    <section
      class="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-6xl flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-16"
    >
      <div class="max-w-xl flex-1">
        <div class="accent-bar max-w-[9rem]" aria-hidden="true">
          <span /><span /><span />
        </div>
        <p
          class="font-display mt-6 text-5xl font-bold leading-[0.95] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl"
        >
          Al-Maidah
        </p>
        <h1
          class="mt-5 text-xl font-semibold leading-snug text-[var(--ink)] sm:text-2xl"
        >
          Fresh orders from table to kitchen — built for UAE restaurants
        </h1>
        <p class="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Guests scan a QR, browse a vibrant menu, and send the ticket live.
          Kitchen and owners stay in sync without paper pads.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink to="/admin/login" class="btn-primary">
            Owner sign in
          </NuxtLink>
          <NuxtLink to="/m/demo?table=1" class="btn-secondary">
            Try the demo menu
          </NuxtLink>
        </div>
      </div>

      <div
        class="relative w-full max-w-md flex-1 lg:max-w-lg"
        aria-hidden="true"
      >
        <div
          class="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-[var(--chili)] via-[var(--herb)] to-[var(--citrus)] opacity-90"
        />
        <div
          class="relative m-1 overflow-hidden rounded-[1.75rem] bg-[var(--ink)] p-6 text-[var(--paper)] shadow-2xl sm:p-8"
        >
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--citrus)]">
            Tonight’s service
          </p>
          <p class="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Table ready.<br />Kitchen live.
          </p>
          <ul class="mt-8 space-y-4">
            <li
              v-for="item in highlights"
              :key="item.label"
              class="flex items-start gap-3"
            >
              <span
                class="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                :style="{ background: item.color }"
              />
              <div>
                <p class="text-sm font-bold">{{ item.label }}</p>
                <p class="text-sm text-[var(--paper)]/65">{{ item.detail }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section
      class="border-t border-[var(--ink)]/8 bg-white/60 backdrop-blur-sm"
    >
      <div
        class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-14"
      >
        <article
          v-for="surface in surfaces"
          :key="surface.title"
          class="min-w-0"
        >
          <p class="eyebrow" :style="{ color: surface.accent }">
            {{ surface.audience }}
          </p>
          <h2 class="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {{ surface.title }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {{ surface.description }}
          </p>
          <p
            class="mt-4 font-mono text-xs font-semibold"
            :style="{ color: surface.accent }"
          >
            {{ surface.route }}
          </p>
        </article>
      </div>
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

const highlights = [
  {
    label: "Guest menu",
    detail: "Photo-forward dishes, filters, cart in one tap",
    color: "var(--chili)",
  },
  {
    label: "Kitchen board",
    detail: "Pending → preparing → ready on tablet",
    color: "var(--citrus)",
  },
  {
    label: "Owner panel",
    detail: "Menu, QR tables, and paid revenue stats",
    color: "var(--herb)",
  },
]

const surfaces: (ProductSurface & { accent: string })[] = [
  {
    audience: "Guest · mobile",
    title: "Table menu",
    description:
      "Scan the QR code, browse the menu, and send the order from the table.",
    route: "/m/{slug}?table={n}",
    accent: "var(--chili)",
  },
  {
    audience: "Kitchen · tablet",
    title: "Ticket board",
    description:
      "See pending, preparing, and ready tickets as they arrive in realtime.",
    route: "/kitchen",
    accent: "var(--citrus-deep)",
  },
  {
    audience: "Owner · desktop",
    title: "Admin panel",
    description:
      "Manage the menu, printable QR codes, and revenue statistics.",
    route: "/admin",
    accent: "var(--herb)",
  },
]
</script>
