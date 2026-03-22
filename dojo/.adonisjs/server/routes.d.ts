import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'mfa.create': { paramsTuple?: []; params?: {} }
    'mfa.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'models': { paramsTuple?: []; params?: {} }
    'system.snapshot': { paramsTuple?: []; params?: {} }
    'system.refresh': { paramsTuple?: []; params?: {} }
    'mfa.setup': { paramsTuple?: []; params?: {} }
    'mfa.enable': { paramsTuple?: []; params?: {} }
    'mfa.disable': { paramsTuple?: []; params?: {} }
    'settings.theme': { paramsTuple?: []; params?: {} }
    'settings.theme.change': { paramsTuple?: []; params?: {} }
    'settings.tokens': { paramsTuple?: []; params?: {} }
    'settings.token': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.token.save': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.token.delete': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.training': { paramsTuple?: []; params?: {} }
    'settings.training.update': { paramsTuple?: []; params?: {} }
    'settings.paths': { paramsTuple?: []; params?: {} }
    'settings.paths.update': { paramsTuple?: []; params?: {} }
    'models.list': { paramsTuple?: []; params?: {} }
    'models.options': { paramsTuple?: []; params?: {} }
    'models.refresh': { paramsTuple?: []; params?: {} }
    'models.model': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.model.integrity': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.architecture.readiness': { paramsTuple: [ParamValue]; params: {'arch': ParamValue} }
  }
  GET: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'mfa.create': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'models': { paramsTuple?: []; params?: {} }
    'system.snapshot': { paramsTuple?: []; params?: {} }
    'settings.theme': { paramsTuple?: []; params?: {} }
    'settings.tokens': { paramsTuple?: []; params?: {} }
    'settings.token': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.training': { paramsTuple?: []; params?: {} }
    'settings.paths': { paramsTuple?: []; params?: {} }
    'models.list': { paramsTuple?: []; params?: {} }
    'models.options': { paramsTuple?: []; params?: {} }
    'models.model': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.model.integrity': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.architecture.readiness': { paramsTuple: [ParamValue]; params: {'arch': ParamValue} }
  }
  HEAD: {
    'dashboard': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'mfa.create': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'models': { paramsTuple?: []; params?: {} }
    'system.snapshot': { paramsTuple?: []; params?: {} }
    'settings.theme': { paramsTuple?: []; params?: {} }
    'settings.tokens': { paramsTuple?: []; params?: {} }
    'settings.token': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.training': { paramsTuple?: []; params?: {} }
    'settings.paths': { paramsTuple?: []; params?: {} }
    'models.list': { paramsTuple?: []; params?: {} }
    'models.options': { paramsTuple?: []; params?: {} }
    'models.model': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.model.integrity': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'models.architecture.readiness': { paramsTuple: [ParamValue]; params: {'arch': ParamValue} }
  }
  POST: {
    'session.store': { paramsTuple?: []; params?: {} }
    'mfa.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'system.refresh': { paramsTuple?: []; params?: {} }
    'mfa.setup': { paramsTuple?: []; params?: {} }
    'mfa.enable': { paramsTuple?: []; params?: {} }
    'mfa.disable': { paramsTuple?: []; params?: {} }
    'settings.theme.change': { paramsTuple?: []; params?: {} }
    'settings.token.save': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'settings.training.update': { paramsTuple?: []; params?: {} }
    'settings.paths.update': { paramsTuple?: []; params?: {} }
    'models.refresh': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'settings.token.delete': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'models.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}