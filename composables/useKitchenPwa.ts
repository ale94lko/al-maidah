/**
 * Kitchen tablet PWA: dedicated manifest (start_url /kitchen) and a minimal
 * service worker so Chrome can install the board fullscreen.
 */
export function useKitchenPwa() {
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  }

  const installAvailable = ref(false)
  const installed = ref(false)
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  function applyKitchenHead() {
    useHead({
      title: "Al-Maidah Kitchen",
      meta: [
        { name: "theme-color", content: "#09090b" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "Kitchen" },
      ],
      link: [
        { rel: "manifest", href: "/kitchen.webmanifest" },
        { rel: "apple-touch-icon", href: "/icons/kitchen-192.png" },
      ],
    })
  }

  async function registerServiceWorker() {
    if (!import.meta.client || !("serviceWorker" in navigator)) {
      return
    }
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    } catch {
      // Installability may still work without SW on some builds; ignore.
    }
  }

  function onBeforeInstallPrompt(event: Event) {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    installAvailable.value = true
  }

  function onAppInstalled() {
    installed.value = true
    installAvailable.value = false
    deferredPrompt = null
  }

  function listenForInstall() {
    if (!import.meta.client) {
      return
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      installed.value = true
    }
  }

  function stopListening() {
    if (!import.meta.client) {
      return
    }
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.removeEventListener("appinstalled", onAppInstalled)
  }

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) {
      return false
    }
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    installAvailable.value = false
    return choice.outcome === "accepted"
  }

  return {
    installAvailable,
    installed,
    applyKitchenHead,
    registerServiceWorker,
    listenForInstall,
    stopListening,
    promptInstall,
  }
}
