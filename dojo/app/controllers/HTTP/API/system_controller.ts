import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import SystemService from '#services/system_service'

@inject()
export default class SystemController {
  constructor(private systemService: SystemService) {}

  public async getSnapshot({ response }: HttpContext) {
    const snapshot = this.systemService.getSnapshot()
    if (!snapshot) {
      return response.notFound({ message: 'System snapshot not yet available.' })
    }
    return response.json(snapshot)
  }

  public async refresh({ response }: HttpContext) {
    const snapshot = await this.systemService.refresh()
    return response.json(snapshot)
  }
}
