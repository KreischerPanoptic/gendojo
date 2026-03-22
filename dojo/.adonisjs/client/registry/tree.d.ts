/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  dashboard: typeof routes['dashboard']
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  mfa: {
    create: typeof routes['mfa.create']
    store: typeof routes['mfa.store']
    setup: typeof routes['mfa.setup']
    enable: typeof routes['mfa.enable']
    disable: typeof routes['mfa.disable']
  }
  settings: typeof routes['settings'] & {
    theme: typeof routes['settings.theme'] & {
      change: typeof routes['settings.theme.change']
    }
    tokens: typeof routes['settings.tokens']
    token: typeof routes['settings.token'] & {
      save: typeof routes['settings.token.save']
      delete: typeof routes['settings.token.delete']
    }
    training: typeof routes['settings.training'] & {
      update: typeof routes['settings.training.update']
    }
    paths: typeof routes['settings.paths'] & {
      update: typeof routes['settings.paths.update']
    }
  }
  models: typeof routes['models'] & {
    list: typeof routes['models.list']
    options: typeof routes['models.options']
    refresh: typeof routes['models.refresh']
    model: typeof routes['models.model'] & {
      integrity: typeof routes['models.model.integrity']
    }
    delete: typeof routes['models.delete']
    architecture: {
      readiness: typeof routes['models.architecture.readiness']
    }
  }
  system: {
    snapshot: typeof routes['system.snapshot']
    refresh: typeof routes['system.refresh']
  }
}
