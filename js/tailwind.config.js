// Tailwind Play CDN theme (must load right after cdn.tailwindcss.com)
tailwind.config = {
    theme: {
        extend: {
            colors: {
                navy: {
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617'
                },
                amberAccent: {
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c'
                }
            },
            fontFamily: {
                sans: ['"Noto Sans Georgian"', 'sans-serif']
            }
        }
    }
};
