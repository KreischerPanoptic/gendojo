import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import env from '#start/env'

export default class extends BaseSeeder {
  async run() {
    const username = env.get('AUTH_USERNAME', 'admin').trim()
    const password = env.get('AUTH_PASSWORD', 'gendojo').trim()
    if (!username || !password) {
      return
    }
    const existing = await User.findBy('username', username)
    if (existing) return
    await User.create({ username, password })
  }
}
