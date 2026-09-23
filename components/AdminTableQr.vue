<script setup lang="ts">
const props = defineProps<{
  value: string
  size?: number
}>()

const dataUrl = ref("")
const failed = ref(false)

watch(
  () => [props.value, props.size] as const,
  async ([value, size]) => {
    failed.value = false
    dataUrl.value = ""
    if (!value || !import.meta.client) {
      return
    }
    try {
      const QRCode = await import("qrcode")
      dataUrl.value = await QRCode.toDataURL(value, {
        width: size ?? 220,
        margin: 1,
        errorCorrectionLevel: "M",
      })
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="inline-flex items-center justify-center bg-white p-2">
    <img
      v-if="dataUrl"
      :src="dataUrl"
      :alt="value"
      class="h-auto w-full"
      :width="size ?? 220"
      :height="size ?? 220"
    >
    <p v-else-if="failed" class="text-xs text-red-700">
      QR unavailable
    </p>
    <p v-else class="text-xs text-stone-400">
      …
    </p>
  </div>
</template>
