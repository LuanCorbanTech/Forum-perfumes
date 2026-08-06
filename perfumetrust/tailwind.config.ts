import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Dourado — acento (paleta clara/azul-marinho/dourado do novo brief).
        gold: {
          50: "#fbf3e0",
          100: "#f5e6c4",
          200: "#ebd9a5",
          300: "#e3c687",
          400: "#d4af37",
          500: "#c5a059", // dourado principal (acentos, badges, bordas)
          600: "#a9853f",
          700: "#8a6b31",
          800: "#6b5326",
          900: "#4a3a1b",
        },
        // Azul-marinho/grafite — texto e superfícies escuras sobre fundo claro.
        // (tema anterior — mantido só para as telas que ainda não passaram
        // pelo redesign "handoff"; não usar em código novo.)
        navy: {
          50: "#f8f9fa", // fundo de página
          100: "#f1f3f5",
          200: "#eef0f2", // bordas de cartões/seções
          300: "#cbd3dc",
          400: "#94a3b8", // texto discreto, placeholders
          500: "#64748b", // texto secundário
          600: "#475569", // texto de corpo
          700: "#334155",
          800: "#1e293b", // títulos, texto principal
          900: "#0f172a", // botões primários, texto mais escuro
        },

        // ==== Tokens do redesign "handoff" (design_handoff_cheiro_novo) ====
        // Obsidiana — header, footer, painéis e cartões escuros.
        obsidian: {
          950: "#0b0e11",
          900: "#12161a", // fundo escuro principal (header, footer, cabeçalho do card)
          800: "#1a2026", // pílulas sociais, cartões de estatística do perfil
          700: "#1e242b", // fundo do avatar de iniciais
          600: "#23282e", // borda em fundo escuro (header/footer)
          500: "#2c3238", // borda dos cartões escuros
          400: "#333a42", // borda do avatar / moldura do iPhone
        },
        // Creme/areia — fundo da página e bordas em fundo claro.
        sand: {
          DEFAULT: "#faf8f5", // fundo da página
          100: "#f1ede6", // avatar de iniciais na linha do tempo
          200: "#efebe3", // divisórias internas dos cards
          300: "#e6e1d8", // borda principal em fundo claro
          400: "#d9d2c6", // borda de inputs
        },
        // Dourado/âmbar — acento (equivalente ao "gold" do redesign anterior,
        // mas com os hex exatos do handoff).
        dourado: {
          DEFAULT: "#c59b27",
          hover: "#d8ae38",
          dark: "#8a6b31", // texto sobre fundo âmbar-tênue
          tint: "#fbf6e9", // fundo âmbar tênue
          "tint-border": "#ebd9a5",
        },
        // Esmeralda — selo "verificado" e estados de sucesso.
        verde: {
          DEFAULT: "#15803d",
          light: "#6fcf8f", // texto claro sobre fundo escuro
          dark: "#16241b", // fundo do selo em contexto escuro
          "dark-border": "#2c4634",
          tint: "#f0f7f2", // fundo tênue em contexto claro
          "tint-border": "#cbe3d4",
        },
        // Vermelho — erro / denúncia procedente.
        crimson: {
          DEFAULT: "#b42318",
          tint: "#fdf2f2",
          "tint-border": "#f3cfcf",
        },
      },
      fontFamily: {
        // Cormorant Garamond — logotipo, h1 de tela e notas de destaque grandes.
        serif: ["var(--font-display)", "Georgia", "Cambria", "Times New Roman", "serif"],
        // Montserrat — todo o resto: corpo, UI, botões, tags, h2, números.
        sans: [
          "var(--font-body)",
          "ui-sans-serif",
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-body)",
          "ui-sans-serif",
          "-apple-system",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        // Raio de 10px usado nos cards/painéis do redesign "handoff"
        // (não existe na escala padrão do Tailwind, que pula de 8 pra 12).
        card: "10px",
      },
      backgroundImage: {
        "radial-fade": "radial-gradient(circle at 50% 0%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
