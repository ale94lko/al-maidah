import type { AppLocale } from "~/i18n/messages"
import { LOCALE_STORAGE_KEY, messages } from "~/i18n/messages"

function readNested(tree: unknown, path: string): string | null {
  const parts = path.split(".")
  let current: unknown = tree
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return null
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : null
}

function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] === undefined ? `{${key}}` : String(params[key]),
  )
}

export function useAppI18n() {
  const locale = useState<AppLocale>("app-locale", () => "en")

  const dir = computed<"ltr" | "rtl">(() =>
    locale.value === "ar" ? "rtl" : "ltr",
  )

  const isRtl = computed(() => dir.value === "rtl")

  function applyDocumentLocale(next: AppLocale) {
    if (!import.meta.client) {
      return
    }
    const html = document.documentElement
    html.lang = next
    html.dir = next === "ar" ? "rtl" : "ltr"
  }

  function setLocale(next: AppLocale) {
    locale.value = next
    if (import.meta.client) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    }
    applyDocumentLocale(next)
  }

  function initLocale() {
    if (!import.meta.client) {
      return
    }
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === "en" || stored === "ar") {
      locale.value = stored
    }
    applyDocumentLocale(locale.value)
  }

  function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const fromActive = readNested(messages[locale.value], key)
    if (fromActive) {
      return formatMessage(fromActive, params)
    }
    const fromEn = readNested(messages.en, key)
    return fromEn ? formatMessage(fromEn, params) : key
  }

  return {
    locale,
    dir,
    isRtl,
    t,
    setLocale,
    initLocale,
  }
}
