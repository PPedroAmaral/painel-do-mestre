/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // <-- Isso faz o nosso botão de Modo Escuro funcionar!
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};