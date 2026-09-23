<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    points: Array<{ label: string; value: number }>
    mode?: "combo" | "bar"
  }>(),
  { mode: "combo" },
)

const width = 720
const height = 260
const padL = 36
const padR = 12
const padT = 16
const padB = 28

const max = computed(() => Math.max(1, ...props.points.map((point) => point.value)))

const slots = computed(() => {
  const count = Math.max(props.points.length, 1)
  const inner = width - padL - padR
  return props.points.map((point, index) => {
    const x =
      count === 1
        ? padL + inner / 2
        : padL + (index / (count - 1)) * inner
    const barW = Math.max(3, Math.min(18, inner / count - 4))
    const h = (point.value / max.value) * (height - padT - padB)
    const y = height - padB - h
    return { ...point, x, y, h, barW, index }
  })
})

const linePoints = computed(() =>
  slots.value.map((slot) => `${slot.x},${height - padB - slot.h}`).join(" "),
)

const areaPath = computed(() => {
  const points = slots.value
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) {
    return ""
  }
  const baseline = height - padB
  const line = points
    .map((slot) => `L ${slot.x} ${baseline - slot.h}`)
    .join(" ")
  return `M ${first.x} ${baseline} ${line} L ${last.x} ${baseline} Z`
})

const yTicks = computed(() => {
  return [0, 0.5, 1].map((ratio) => ({
    value: Math.round(max.value * ratio),
    y: height - padB - ratio * (height - padT - padB),
  }))
})

const xLabels = computed(() => {
  const step = Math.ceil(slots.value.length / 6)
  return slots.value.filter((_, index) => index % step === 0 || index === slots.value.length - 1)
})
</script>

<template>
  <figure class="w-full overflow-x-auto">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      class="h-64 w-full min-w-[36rem]"
      role="img"
    >
      <line
        v-for="tick in yTicks"
        :key="tick.y"
        :x1="padL"
        :x2="width - padR"
        :y1="tick.y"
        :y2="tick.y"
        stroke="rgba(27,39,64,0.08)"
      />
      <text
        v-for="tick in yTicks"
        :key="`l-${tick.y}`"
        :x="4"
        :y="tick.y + 4"
        fill="#5c6b80"
        font-size="10"
      >
        {{ tick.value }}
      </text>

      <rect
        v-for="slot in slots"
        :key="`bar-${slot.index}`"
        :x="slot.x - slot.barW / 2"
        :y="height - padB - slot.h"
        :width="slot.barW"
        :height="Math.max(slot.h, 0)"
        rx="3"
        fill="#8ea394"
        opacity="0.9"
      >
        <title>{{ slot.label }}: {{ slot.value }}</title>
      </rect>

      <template v-if="mode === 'combo' && slots.length">
        <path :d="areaPath" fill="rgba(27,39,64,0.08)" />
        <polyline
          :points="linePoints"
          fill="none"
          stroke="#1b2740"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="slot in slots"
          :key="`dot-${slot.index}`"
          :cx="slot.x"
          :cy="height - padB - slot.h"
          r="3.5"
          fill="#1b2740"
        >
          <title>{{ slot.label }}: {{ slot.value }}</title>
        </circle>
      </template>

      <text
        v-for="slot in xLabels"
        :key="`x-${slot.index}`"
        :x="slot.x"
        :y="height - 8"
        text-anchor="middle"
        fill="#5c6b80"
        font-size="10"
      >
        {{ slot.label }}
      </text>
    </svg>
  </figure>
</template>
