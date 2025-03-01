import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            spacing: {
                '1px': '1px',
                '2px': '2px',
            },
            boxShadow: {
                'invoice': '0 0 17px 0 rgba(16, 40, 73, 0.09)',
            },
            textIndent: {
                '-9999em': '-9999em',
            },
            clipPath: {
                'rect-0': 'rect(0, 0, 0, 0)',
            },
        },
    },

    plugins: [forms],
};
