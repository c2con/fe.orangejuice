// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config"

export default defineNuxtConfig({

    modules: [
        "@pinia/nuxt",
        "@nuxt/ui",
    ],

    css: ["~/assets/css/LeftAccordion.css"],
    srcDir: "app",

    // 굳이 alias 안 건드려도 됨. (Nuxt가 ~, @ 를 srcDir 기준으로 잡아줌)
})
