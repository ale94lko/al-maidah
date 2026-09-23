// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  typescript: {
    strict: true,
    typeCheck: true,
  },
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/": { redirect: "/admin/login" },
  },
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
        { name: "theme-color", content: "#2f9e44" },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560..700&family=Manrope:wght@400..800&display=swap",
        },
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
