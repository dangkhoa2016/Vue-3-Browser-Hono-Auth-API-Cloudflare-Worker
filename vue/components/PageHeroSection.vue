<template>
  <section :class="sectionClass">
    <div v-if="topBlobClass" :class="topBlobClass"></div>
    <div v-if="bottomBlobClass" :class="bottomBlobClass"></div>

    <div :class="contentClass">
      <div>
        <slot name="left" />
      </div>
      <div v-if="$slots.right">
        <slot name="right" />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'PageHeroSection',
  props: {
    sectionClass: {
      type: String,
      required: true
    },
    topBlobClass: {
      type: String,
      default: ''
    },
    bottomBlobClass: {
      type: String,
      default: ''
    },
    contentClass: {
      type: String,
      default: 'relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center'
    }
  }
};
</script>