/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // You can extend colors here if needed to match the previous design
                // relying on slate-900 etc. which are default in Tailwind.
            }
        },
    },
    plugins: [],
}
