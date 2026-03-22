import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ModelsService } from '#services/models_service'
import WeightsFileTransformer from '#transformers/weights_file_transformer'

@inject()
export default class ModelsController {
  constructor(private modelsService: ModelsService) {}

  async list({ inertia }: HttpContext) {
    const models = await this.modelsService.list()
    return inertia.render('models', { models: WeightsFileTransformer.transform(models) })
  }
}
