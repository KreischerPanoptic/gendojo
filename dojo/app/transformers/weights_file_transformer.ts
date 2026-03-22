import { BaseTransformer } from '@adonisjs/core/transformers'
import type WeightsFile from '#models/weights_file'

export default class WeightsFileTransformer extends BaseTransformer<WeightsFile> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'architecture',
      'category',
      'role',
      'name',
      'filename',
      'provider',
      'providerId',
      'relativePath',
      'sizeBytes',
      'status',
    ])
  }
}
