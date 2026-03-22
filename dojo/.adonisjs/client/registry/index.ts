/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/dashboard',
    tokens: [{"old":"/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['dashboard']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'mfa.create': {
    methods: ["GET","HEAD"],
    pattern: '/login/mfa',
    tokens: [{"old":"/login/mfa","type":0,"val":"login","end":""},{"old":"/login/mfa","type":0,"val":"mfa","end":""}],
    types: placeholder as Registry['mfa.create']['types'],
  },
  'mfa.store': {
    methods: ["POST"],
    pattern: '/login/mfa',
    tokens: [{"old":"/login/mfa","type":0,"val":"login","end":""},{"old":"/login/mfa","type":0,"val":"mfa","end":""}],
    types: placeholder as Registry['mfa.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'settings': {
    methods: ["GET","HEAD"],
    pattern: '/settings',
    tokens: [{"old":"/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['settings']['types'],
  },
  'models': {
    methods: ["GET","HEAD"],
    pattern: '/models',
    tokens: [{"old":"/models","type":0,"val":"models","end":""}],
    types: placeholder as Registry['models']['types'],
  },
  'system.snapshot': {
    methods: ["GET","HEAD"],
    pattern: '/api/system/snapshot',
    tokens: [{"old":"/api/system/snapshot","type":0,"val":"api","end":""},{"old":"/api/system/snapshot","type":0,"val":"system","end":""},{"old":"/api/system/snapshot","type":0,"val":"snapshot","end":""}],
    types: placeholder as Registry['system.snapshot']['types'],
  },
  'system.refresh': {
    methods: ["POST"],
    pattern: '/api/system/refresh',
    tokens: [{"old":"/api/system/refresh","type":0,"val":"api","end":""},{"old":"/api/system/refresh","type":0,"val":"system","end":""},{"old":"/api/system/refresh","type":0,"val":"refresh","end":""}],
    types: placeholder as Registry['system.refresh']['types'],
  },
  'mfa.setup': {
    methods: ["POST"],
    pattern: '/api/mfa/setup',
    tokens: [{"old":"/api/mfa/setup","type":0,"val":"api","end":""},{"old":"/api/mfa/setup","type":0,"val":"mfa","end":""},{"old":"/api/mfa/setup","type":0,"val":"setup","end":""}],
    types: placeholder as Registry['mfa.setup']['types'],
  },
  'mfa.enable': {
    methods: ["POST"],
    pattern: '/api/mfa/enable',
    tokens: [{"old":"/api/mfa/enable","type":0,"val":"api","end":""},{"old":"/api/mfa/enable","type":0,"val":"mfa","end":""},{"old":"/api/mfa/enable","type":0,"val":"enable","end":""}],
    types: placeholder as Registry['mfa.enable']['types'],
  },
  'mfa.disable': {
    methods: ["POST"],
    pattern: '/api/mfa/disable',
    tokens: [{"old":"/api/mfa/disable","type":0,"val":"api","end":""},{"old":"/api/mfa/disable","type":0,"val":"mfa","end":""},{"old":"/api/mfa/disable","type":0,"val":"disable","end":""}],
    types: placeholder as Registry['mfa.disable']['types'],
  },
  'settings.theme': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/theme',
    tokens: [{"old":"/api/settings/theme","type":0,"val":"api","end":""},{"old":"/api/settings/theme","type":0,"val":"settings","end":""},{"old":"/api/settings/theme","type":0,"val":"theme","end":""}],
    types: placeholder as Registry['settings.theme']['types'],
  },
  'settings.theme.change': {
    methods: ["POST"],
    pattern: '/api/settings/theme',
    tokens: [{"old":"/api/settings/theme","type":0,"val":"api","end":""},{"old":"/api/settings/theme","type":0,"val":"settings","end":""},{"old":"/api/settings/theme","type":0,"val":"theme","end":""}],
    types: placeholder as Registry['settings.theme.change']['types'],
  },
  'settings.tokens': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/tokens',
    tokens: [{"old":"/api/settings/tokens","type":0,"val":"api","end":""},{"old":"/api/settings/tokens","type":0,"val":"settings","end":""},{"old":"/api/settings/tokens","type":0,"val":"tokens","end":""}],
    types: placeholder as Registry['settings.tokens']['types'],
  },
  'settings.token': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/token/:type',
    tokens: [{"old":"/api/settings/token/:type","type":0,"val":"api","end":""},{"old":"/api/settings/token/:type","type":0,"val":"settings","end":""},{"old":"/api/settings/token/:type","type":0,"val":"token","end":""},{"old":"/api/settings/token/:type","type":1,"val":"type","end":""}],
    types: placeholder as Registry['settings.token']['types'],
  },
  'settings.token.save': {
    methods: ["POST"],
    pattern: '/api/settings/token/:type',
    tokens: [{"old":"/api/settings/token/:type","type":0,"val":"api","end":""},{"old":"/api/settings/token/:type","type":0,"val":"settings","end":""},{"old":"/api/settings/token/:type","type":0,"val":"token","end":""},{"old":"/api/settings/token/:type","type":1,"val":"type","end":""}],
    types: placeholder as Registry['settings.token.save']['types'],
  },
  'settings.token.delete': {
    methods: ["DELETE"],
    pattern: '/api/settings/token/:type',
    tokens: [{"old":"/api/settings/token/:type","type":0,"val":"api","end":""},{"old":"/api/settings/token/:type","type":0,"val":"settings","end":""},{"old":"/api/settings/token/:type","type":0,"val":"token","end":""},{"old":"/api/settings/token/:type","type":1,"val":"type","end":""}],
    types: placeholder as Registry['settings.token.delete']['types'],
  },
  'settings.training': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/training',
    tokens: [{"old":"/api/settings/training","type":0,"val":"api","end":""},{"old":"/api/settings/training","type":0,"val":"settings","end":""},{"old":"/api/settings/training","type":0,"val":"training","end":""}],
    types: placeholder as Registry['settings.training']['types'],
  },
  'settings.training.update': {
    methods: ["POST"],
    pattern: '/api/settings/training',
    tokens: [{"old":"/api/settings/training","type":0,"val":"api","end":""},{"old":"/api/settings/training","type":0,"val":"settings","end":""},{"old":"/api/settings/training","type":0,"val":"training","end":""}],
    types: placeholder as Registry['settings.training.update']['types'],
  },
  'settings.paths': {
    methods: ["GET","HEAD"],
    pattern: '/api/settings/paths',
    tokens: [{"old":"/api/settings/paths","type":0,"val":"api","end":""},{"old":"/api/settings/paths","type":0,"val":"settings","end":""},{"old":"/api/settings/paths","type":0,"val":"paths","end":""}],
    types: placeholder as Registry['settings.paths']['types'],
  },
  'settings.paths.update': {
    methods: ["POST"],
    pattern: '/api/settings/paths',
    tokens: [{"old":"/api/settings/paths","type":0,"val":"api","end":""},{"old":"/api/settings/paths","type":0,"val":"settings","end":""},{"old":"/api/settings/paths","type":0,"val":"paths","end":""}],
    types: placeholder as Registry['settings.paths.update']['types'],
  },
  'models.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/models',
    tokens: [{"old":"/api/models","type":0,"val":"api","end":""},{"old":"/api/models","type":0,"val":"models","end":""}],
    types: placeholder as Registry['models.list']['types'],
  },
  'models.options': {
    methods: ["GET","HEAD"],
    pattern: '/api/models/options',
    tokens: [{"old":"/api/models/options","type":0,"val":"api","end":""},{"old":"/api/models/options","type":0,"val":"models","end":""},{"old":"/api/models/options","type":0,"val":"options","end":""}],
    types: placeholder as Registry['models.options']['types'],
  },
  'models.refresh': {
    methods: ["POST"],
    pattern: '/api/models/refresh',
    tokens: [{"old":"/api/models/refresh","type":0,"val":"api","end":""},{"old":"/api/models/refresh","type":0,"val":"models","end":""},{"old":"/api/models/refresh","type":0,"val":"refresh","end":""}],
    types: placeholder as Registry['models.refresh']['types'],
  },
  'models.model': {
    methods: ["GET","HEAD"],
    pattern: '/api/models/:id',
    tokens: [{"old":"/api/models/:id","type":0,"val":"api","end":""},{"old":"/api/models/:id","type":0,"val":"models","end":""},{"old":"/api/models/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['models.model']['types'],
  },
  'models.delete': {
    methods: ["DELETE"],
    pattern: '/api/models/:id',
    tokens: [{"old":"/api/models/:id","type":0,"val":"api","end":""},{"old":"/api/models/:id","type":0,"val":"models","end":""},{"old":"/api/models/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['models.delete']['types'],
  },
  'models.model.integrity': {
    methods: ["GET","HEAD"],
    pattern: '/api/models/integrity/:id',
    tokens: [{"old":"/api/models/integrity/:id","type":0,"val":"api","end":""},{"old":"/api/models/integrity/:id","type":0,"val":"models","end":""},{"old":"/api/models/integrity/:id","type":0,"val":"integrity","end":""},{"old":"/api/models/integrity/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['models.model.integrity']['types'],
  },
  'models.architecture.readiness': {
    methods: ["GET","HEAD"],
    pattern: '/api/models/arch/:arch/readiness',
    tokens: [{"old":"/api/models/arch/:arch/readiness","type":0,"val":"api","end":""},{"old":"/api/models/arch/:arch/readiness","type":0,"val":"models","end":""},{"old":"/api/models/arch/:arch/readiness","type":0,"val":"arch","end":""},{"old":"/api/models/arch/:arch/readiness","type":1,"val":"arch","end":""},{"old":"/api/models/arch/:arch/readiness","type":0,"val":"readiness","end":""}],
    types: placeholder as Registry['models.architecture.readiness']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
