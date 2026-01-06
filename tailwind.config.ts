import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'h-32',
    'h-36',
    'h-40',
    'h-48',
    'sm:h-48',
    '-mt-12',
    '-mt-13',
    '-mt-14',
    '-mt-15',
    '-mt-16',
    '-mt-18',
    '-mt-20',
    '-mt-22',
    'sm:-mt-18',
    'sm:-mt-20',
    'sm:-mt-22',
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        destructive: "hsl(var(--destructive))",
      },
    },
  },
  plugins: [],
};
export default config;

