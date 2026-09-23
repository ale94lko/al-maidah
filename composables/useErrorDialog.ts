/**
 * Shared modal for user-facing errors (admin, kitchen, guest).
 */
export function useErrorDialog() {
  const open = ref(false)
  const title = ref("")
  const message = ref("")

  function showError(nextMessage: string, nextTitle = "") {
    const text = nextMessage.trim()
    if (!text) {
      return
    }
    title.value = nextTitle
    message.value = text
    open.value = true
  }

  function dismissError() {
    open.value = false
  }

  return {
    errorOpen: open,
    errorTitle: title,
    errorMessage: message,
    showError,
    dismissError,
  }
}
