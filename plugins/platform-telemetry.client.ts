const VISITOR_KEY = "alma_visitor_id"
const PAGE_THROTTLE_MS = 2500
const ERROR_THROTTLE_MS = 4000

function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing && existing.length <= 80) {
      return existing
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return `anon-${Date.now()}`
  }
}

function shouldSkipPath(path: string): boolean {
  return (
    path.startsWith("/api/") ||
    path.includes("/platform/events") ||
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".map")
  )
}

/**
 * Anonymous platform telemetry for the superadmin dashboard.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  let lastPagePath = ""
  let lastPageAt = 0
  let lastErrorKey = ""
  let lastErrorAt = 0

  async function send(
    kind: "page_view" | "error",
    path: string,
    message?: string,
  ) {
    if (shouldSkipPath(path)) {
      return
    }
    const now = Date.now()
    if (kind === "page_view") {
      if (path === lastPagePath && now - lastPageAt < PAGE_THROTTLE_MS) {
        return
      }
      lastPagePath = path
      lastPageAt = now
    } else {
      const key = `${path}|${message || ""}`
      if (key === lastErrorKey && now - lastErrorAt < ERROR_THROTTLE_MS) {
        return
      }
      lastErrorKey = key
      lastErrorAt = now
    }

    try {
      await $fetch("/api/platform/events", {
        method: "POST",
        body: {
          kind,
          path: path.slice(0, 300),
          message: message?.slice(0, 500),
          visitor_id: visitorId(),
        },
      })
    } catch {
      // Telemetry must never break navigation.
    }
  }

  function currentPath(): string {
    try {
      return useRoute().fullPath || window.location.pathname || "/"
    } catch {
      return window.location.pathname || "/"
    }
  }

  const router = useRouter()
  router.afterEach((to) => {
    void send("page_view", to.fullPath || to.path || "/")
  })

  void send("page_view", currentPath())

  window.addEventListener("error", (event) => {
    const message =
      event.message ||
      (event.error instanceof Error ? event.error.message : "Script error")
    void send("error", currentPath(), String(message))
  })

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection"
    void send("error", currentPath(), String(message))
  })

  nuxtApp.hook("vue:error", (error) => {
    const message = error instanceof Error ? error.message : String(error)
    void send("error", currentPath(), message)
  })
})
