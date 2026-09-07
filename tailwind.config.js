/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#080B14',           // Deep Obsidian / PS5 Background
          surface: '#111726',      // Card Surface
          surfaceHover: '#1A2338', // Card Hover / Highlight
          border: '#1E293B',       // Card Border
          accent: '#0070D1',       // PlayStation Signature Blue
          neon: '#00D2FF',         // Cyan Glow
          danger: '#FF3B30',       // Padlock / Revoked license
          dangerMuted: '#3A1418',  // Danger container
          warning: '#FF9F0A',      // Expiring soon
          warningMuted: '#3A260E', // Warning container
          success: '#30D158',      // Active warranty
          successMuted: '#0E2E1A', // Success container
          text: '#F8FAFC',         // Primary text
          secondary: '#94A3B8',    // Secondary text
          muted: '#64748B',        // Muted labels
        }
      }
    },
  },
  plugins: [],
};
