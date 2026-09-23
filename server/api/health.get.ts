export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  return {
    name: "al-maidah",
    status: "ok",
    appUrl: config.public.appUrl,
    surfaces: ["guest", "kitchen", "admin"] as const,
  }
})
