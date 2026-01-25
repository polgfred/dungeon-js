import { createTheme } from "@mui/material";
import { pigment } from "@pigment-css/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    pigment({
      transformLibraries: ["@mui/material"],
      theme: createTheme({ cssVariables: true }),
    }),
    react(),
  ],
  server: {
    host: true,
  },
});
