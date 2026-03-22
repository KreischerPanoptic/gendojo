import { defineConfig, drivers } from '@adonisjs/core/hash'

/**
 * Hashing configuration.
 *
 * This starter uses Node.js scrypt under the hood.
 * Node.js reference: https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback
 */
const hashConfig = defineConfig({
  /**
   * Default hasher used by the application.
   */
  default: 'argon',

  list: {
    /**
     * Uncomment after installing: npm i argon2
     */
    argon: drivers.argon2({
      version: 0x13,
      variant: 'id',
      iterations: 3,
      memory: 65536,
      parallelism: 4,
      saltSize: 16,
      hashLength: 32,
    }),
  },
})

export default hashConfig

/**
 * Inferring types for the list of hashers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
