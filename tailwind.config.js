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
            // colors: {
            //     'dark': '#222',
            //     'dark-2': '#666',
            //     'gray': '#e3e3e3',
            //     'yellow': '#fdf4db',
            //     'cyan': '#66afe9',
            //     'white': '#fff',
            //     'red': '#f03434',
            //     'green': '#26a65b',
            //     'blue': '#428bca',
            //     'background': '#f2f3f5',
            //     'placeholder': '#aaa',
            //   },
        },
    },

    plugins: [forms],
};
