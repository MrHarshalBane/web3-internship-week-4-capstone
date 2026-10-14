import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/web3-internship-week-4-capstone/",
  server: {
    port: 3000,
    open: false,
  },
});
