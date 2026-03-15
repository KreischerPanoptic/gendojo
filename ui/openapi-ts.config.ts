import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: 'http://localhost:3000/api/docs-json', // NestJS Swagger JSON endpoint
  output: {
    path: 'src/generated/api',
    format: 'prettier',
  },
  plugins: [
    {
      name: '@hey-api/client-axios',
      runtimeConfigPath: '@root/hey-api.ts',
    },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
})