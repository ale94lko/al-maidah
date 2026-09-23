<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js"

const props = defineProps<{
  orderId: string
  returnUrl: string
}>()

const emit = defineEmits<{
  ready: []
  cancelled: []
}>()

const { stripePublishableKey } = usePublicRuntime()
const { t } = useAppI18n()

const loading = ref(true)
const errorMessage = ref("")
const cardReady = ref(false)
const expressReady = ref(false)
const confirming = ref(false)

const expressMount = ref<HTMLElement | null>(null)
const paymentMount = ref<HTMLElement | null>(null)

let stripe: Stripe | null = null
let elements: StripeElements | null = null

onMounted(async () => {
  const publishableKey = stripePublishableKey.value
  if (!publishableKey) {
    // Shown once here; do not also emit to the parent (avoids duplicate copy).
    errorMessage.value = t("guest.stripeUnavailable")
    loading.value = false
    return
  }

  try {
    const intent = await $fetch<{
      clientSecret: string | null
      paymentIntentId: string
      amountFils: number
      currency: string
    }>("/api/payments/intent", {
      method: "POST",
      body: { orderId: props.orderId },
    })

    if (!intent.clientSecret) {
      throw new Error("Missing PaymentIntent client secret")
    }

    stripe = await loadStripe(publishableKey)
    if (!stripe) {
      throw new Error("Stripe.js failed to load")
    }

    elements = stripe.elements({
      clientSecret: intent.clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#e03131",
          borderRadius: "16px",
        },
      },
    })

    const expressCheckout = elements.create("expressCheckout", {
      buttonHeight: 48,
    })
    expressCheckout.mount(expressMount.value!)
    expressCheckout.on("ready", ({ availablePaymentMethods }) => {
      expressReady.value = Boolean(
        availablePaymentMethods &&
          Object.values(availablePaymentMethods).some(Boolean),
      )
    })
    expressCheckout.on("click", ({ resolve }) => {
      resolve()
    })
    expressCheckout.on("confirm", async () => {
      await confirmPayment()
    })
    expressCheckout.on("cancel", () => {
      emit("cancelled")
    })

    const paymentElement = elements.create("payment", {
      layout: "tabs",
    })
    paymentElement.mount(paymentMount.value!)
    paymentElement.on("ready", () => {
      cardReady.value = true
    })

    emit("ready")
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : t("guest.stripeUnavailable")
  } finally {
    loading.value = false
  }
})

async function confirmPayment() {
  if (!stripe || !elements || confirming.value) {
    return
  }
  confirming.value = true
  errorMessage.value = ""
  try {
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: props.returnUrl,
      },
    })
    if (error) {
      if (error.type === "validation_error") {
        errorMessage.value = error.message || t("guest.paymentCancelled")
      } else {
        errorMessage.value = error.message || t("guest.paymentCancelled")
        emit("cancelled")
      }
    }
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <AppLoadingState v-if="loading" :label="t('common.loading')" />
    <p v-else-if="errorMessage" class="text-sm font-medium text-rose-900">
      {{ errorMessage }}
    </p>
    <template v-else>
      <div
        ref="expressMount"
        class="min-h-[48px]"
        :class="{ hidden: !expressReady }"
      />
      <p
        v-if="expressReady"
        class="text-center text-xs uppercase tracking-[0.14em] text-[var(--muted)]"
      >
        {{ t("guest.orPayWithCard") }}
      </p>
      <div ref="paymentMount" class="rounded-2xl bg-white p-1" />
      <button
        type="button"
        class="w-full rounded-2xl bg-[var(--chili)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="!cardReady || confirming"
        @click="confirmPayment"
      >
        {{ confirming ? t("guest.placingOrder") : t("guest.payNow") }}
      </button>
    </template>
  </div>
</template>
