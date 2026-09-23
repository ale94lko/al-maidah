// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  typescript: {
    strict: true,
    typeCheck: true,
  },
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Al-Maidah",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        {
          name: "description",
          content:
            "QR digital menu, kitchen ticket board, and owner panel for restaurants in the UAE.",
        },
        { name: "theme-color", content: "#0f766e" },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      ],
    },
  },
  runtimeConfig: {
    // Mapped from .env.example private names at build/runtime.
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    public: {
      // Auto-mapped from NUXT_PUBLIC_* in .env.example
      supabaseUrl: "",
      supabaseAnonKey: "",
      stripePublishableKey: "",
      appUrl: "http://localhost:3000",
    },
  },
})
