import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Dourado — acento principal (extraído da paleta oficial do Cheiro Novo).
        gold: {
          50: "#fbf3e4",
          100: "#f6e8cc",
          200: "#f0dcae", // acento claro, itálicos, hover mais forte
          300: "#e8cc9e", // foco em inputs / hover secundário
          400: "#d8bd85", // hover de botões/links
          500: "#c8a86b", // dourado principal (botões, bordas de destaque)
          600: "#a8874f",
          700: "#815f34",
          800: "#5c4222",
          900: "#3a2914",
        },
        // Fundo/superfícies — quase-preto quente extraído do design (não é
        // um cinza neutro), com camadas para fundo de página, cartões e bordas.
        ink: {
          50: "#f2ede4", // texto de destaque / títulos
          100: "#d5cec4", // texto secundário forte
          200: "#b9b1a6", // links de navegação, texto médio
          300: "#a29a8f", // parágrafos
          400: "#8b8378", // rótulos uppercase, placeholders
          500: "#6f6860", // texto bem discreto (timestamps, rodapé)
          600: "#322f2a", // bordas de inputs/avatares
          700: "#241f1b", // bordas de cartões/seções
          800: "#171514", // fundo de cartões
          900: "#131211", // fundo da página
          950: "#0d0c0b", // fundo mais escuro (barras de topo) / texto sobre dourado
        },
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: [
          "var(--font-body)",
          "ui-sans-serif",
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        // Fallback com fontes monoespaçadas nomeadas (não só o genérico
        // "monospace", que no Windows costuma virar Courier New e fica
        // bem mais grosseiro nos rótulos pequenos em caixa alta).
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      // Estética de joalheria: cantos quase retos em vez de arredondados.
      borderRadius: {
        none: "0px",
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "3px",
        "2xl": "3px",
        full: "9999px",
      },
      backgroundImage: {
        "radial-fade": "radial-gradient(circle at 50% 0%, var(--tw-gradient-stops))",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          // A lista é renderizada duplicada, então andar 50% da largura
          // total é exatamente uma volta completa — o loop fica sem costura.
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
