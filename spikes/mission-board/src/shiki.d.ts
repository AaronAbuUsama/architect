declare module "shiki/dist/langs/*.mjs" { const lang: import("shiki/core").LanguageRegistration[]; export default lang; }
declare module "shiki/dist/themes/*.mjs" { const theme: import("shiki/core").ThemeRegistration; export default theme; }
