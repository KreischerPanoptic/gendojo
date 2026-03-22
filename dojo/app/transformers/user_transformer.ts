import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    // password and mfaSecret are excluded via serializeAs: null on the model.
    // Explicitly picking fields here is a second layer of protection.
    return this.pick(this.resource, ['id', 'username', 'isMfaEnabled', 'createdAt', 'updatedAt'])
  }
}
