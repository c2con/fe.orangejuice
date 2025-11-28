// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
    rules: {

        'vue/html-indent': 'off',
        'vue/block-tag-newline': 'off',
        'vue/html-self-closing': 'off',
        'vue/padding-line-between-blocks': 'off',

        '@stylistic/indent': 'off',
        '@stylistic/no-multi-spaces': 'off',
        '@stylistic/comma-dangle': 'off',
        '@stylistic/brace-style': 'off',
        '@stylistic/quotes': 'off',
        '@stylistic/no-multiple-empty-lines': 'off',

        '@typescript-eslint/no-unused-vars': 'off',
        // 👉 HTML 한 줄 내부 줄바꿈 강제 끄기
        'vue/singleline-html-element-content-newline': 'off',

        // 👉 파일 마지막에 빈 줄 강제 끄기
        '@stylistic/eol-last': 'off',

        // 전에도 보이던 것들도 같이 끌 수 있음
        '@stylistic/operator-linebreak': 'off',
        '@stylistic/indent-binary-ops': 'off',
    },
})
