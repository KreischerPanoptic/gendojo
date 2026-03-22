import { BaseTransformer } from '@adonisjs/core/transformers'
import type Token from '#models/token'

export default class TokenTransformer extends BaseTransformer<Token> {
  toObject() {
    return this.pick(this.resource, ['hint', 'type'])
  }
}
