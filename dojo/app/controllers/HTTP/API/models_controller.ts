import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ModelsService } from '#services/models_service'
import { filtersValidator } from '#validators/models'

@inject()
export default class ModelsController {
  constructor(private modelsService: ModelsService) {}

  async list({ request, response }: HttpContext) {
    const payload = await request.validateUsing(filtersValidator)
    const models = await this.modelsService.list(
      payload.arch || payload.category || payload.role
        ? { arch: payload.arch, category: payload.category, role: payload.role }
        : undefined
    )
    return response.json({ models })
  }

  async refresh({ response }: HttpContext) {
    console.log('refresh')
    const models = await this.modelsService.refresh()
    return response.ok({ message: 'Models refreshed', models })
  }

  async getOne({ params, response }: HttpContext) {
    const model = await this.modelsService.getById(params.id)
    return response.json({ model })
  }

  async deleteOne({ params, response }: HttpContext) {
    await this.modelsService.deleteOne(params.id)
    return response.ok({ message: 'Model file deleted' })
  }

  async integrity({ params, response }: HttpContext) {
    const check = await this.modelsService.checkFileIntegrity(params.id)
    return response.json({ status: check })
  }

  async readiness({ params, response }: HttpContext) {
    const ready = await this.modelsService.checkArchReadiness(params.arch)
    return response.json({ status: ready })
  }

  async options({ response }: HttpContext) {
    const options = await this.modelsService.getOptions()
    return response.json(options)
  }
}
