// O Flue é construído com o Vite. O plugin lê o flue.config.ts, encontra os agentes
// marcados com 'use agent' e gera o servidor.
import { flue } from '@flue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [flue()],
});
