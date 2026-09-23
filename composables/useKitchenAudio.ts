/**
 * Kitchen tablet audio: unlocks only after a user gesture ("Start shift"),
 * then plays a one-shot alert for each new ticket that enters the kanban.
 */
export function useKitchenAudio() {
  const shiftStarted = useState("kitchen-shift-started", () => false)
  const audioReady = useState("kitchen-audio-ready", () => false)
  const audioBlocked = useState("kitchen-audio-blocked", () => false)
  const visualAlertActive = useState("kitchen-visual-alert", () => false)
  const visualAlertMessage = useState("kitchen-visual-alert-msg", () => "")

  let audioContext: AudioContext | null = null
  let htmlAudio: HTMLAudioElement | null = null
  let visualTimer: ReturnType<typeof setTimeout> | null = null

  function getAudioContextCtor(): typeof AudioContext | null {
    if (!import.meta.client) {
      return null
    }
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ||
      null
    )
  }

  async function unlockAudioContext(): Promise<boolean> {
    const Ctor = getAudioContextCtor()
    if (!Ctor) {
      return false
    }
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new Ctor()
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }
    // Silent buffer proves the context is allowed to run after the gesture.
    const buffer = audioContext.createBuffer(1, 1, 22050)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start(0)
    return audioContext.state === "running"
  }

  async function playFileOnce(): Promise<boolean> {
    if (!import.meta.client) {
      return false
    }
    if (!htmlAudio) {
      htmlAudio = new Audio("/sounds/kitchen-new-order.wav")
      htmlAudio.preload = "auto"
    }
    htmlAudio.currentTime = 0
    try {
      await htmlAudio.play()
      return true
    } catch {
      return false
    }
  }

  function playOscillatorBeep(): boolean {
    if (!audioContext || audioContext.state !== "running") {
      return false
    }
    try {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = 880
      gain.gain.value = 0.1
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35)
      oscillator.stop(audioContext.currentTime + 0.4)
      return true
    } catch {
      return false
    }
  }

  function showVisualAlert(message: string, sticky: boolean) {
    visualAlertMessage.value = message
    visualAlertActive.value = true
    if (visualTimer) {
      clearTimeout(visualTimer)
      visualTimer = null
    }
    if (!sticky) {
      visualTimer = setTimeout(() => {
        visualAlertActive.value = false
      }, 8_000)
    }
  }

  function dismissVisualAlert() {
    visualAlertActive.value = false
    if (visualTimer) {
      clearTimeout(visualTimer)
      visualTimer = null
    }
  }

  /**
   * Must be called from a click/tap handler so browsers allow audio.
   */
  async function startShift(): Promise<void> {
    audioBlocked.value = false
    let unlocked = false
    try {
      unlocked = await unlockAudioContext()
    } catch {
      unlocked = false
    }

    const filePlayed = await playFileOnce()
    const beepPlayed = filePlayed ? true : playOscillatorBeep()
    const ok = unlocked && (filePlayed || beepPlayed)

    audioReady.value = ok
    audioBlocked.value = !ok
    shiftStarted.value = true

    if (!ok) {
      showVisualAlert("sound-blocked", true)
    }
  }

  async function alertNewOrder(count = 1): Promise<void> {
    if (!shiftStarted.value) {
      return
    }

    const stickyHint = audioBlocked.value || !audioReady.value
    showVisualAlert(count > 1 ? "new-orders" : "new-order", stickyHint)

    if (!audioReady.value || audioBlocked.value) {
      return
    }

    const filePlayed = await playFileOnce()
    if (filePlayed) {
      return
    }
    if (!playOscillatorBeep()) {
      audioBlocked.value = true
      audioReady.value = false
      showVisualAlert(count > 1 ? "new-orders" : "new-order", true)
    }
  }

  function disposeAudio() {
    dismissVisualAlert()
    if (htmlAudio) {
      htmlAudio.pause()
      htmlAudio = null
    }
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close()
    }
    audioContext = null
  }

  return {
    shiftStarted,
    audioReady,
    audioBlocked,
    visualAlertActive,
    visualAlertMessage,
    startShift,
    alertNewOrder,
    dismissVisualAlert,
    disposeAudio,
  }
}
