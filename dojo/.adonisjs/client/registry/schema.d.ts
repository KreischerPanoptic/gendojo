/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'mfa.create': {
    methods: ["GET","HEAD"]
    pattern: '/login/mfa'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['mfaCreate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['mfaCreate']>>>
    }
  }
  'mfa.store': {
    methods: ["POST"]
    pattern: '/login/mfa'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').mfaTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').mfaTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['mfaStore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['mfaStore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/session_controller').default['destroy']>>>
    }
  }
  'settings': {
    methods: ["GET","HEAD"]
    pattern: '/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/settings_controller').default['edit']>>>
    }
  }
  'models': {
    methods: ["GET","HEAD"]
    pattern: '/models'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/web/models_controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/web/models_controller').default['list']>>>
    }
  }
  'system.snapshot': {
    methods: ["GET","HEAD"]
    pattern: '/api/system/snapshot'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/system_controller').default['getSnapshot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/system_controller').default['getSnapshot']>>>
    }
  }
  'system.refresh': {
    methods: ["POST"]
    pattern: '/api/system/refresh'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/system_controller').default['refresh']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/system_controller').default['refresh']>>>
    }
  }
  'mfa.setup': {
    methods: ["POST"]
    pattern: '/api/mfa/setup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['setup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['setup']>>>
    }
  }
  'mfa.enable': {
    methods: ["POST"]
    pattern: '/api/mfa/enable'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').mfaTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').mfaTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['enable']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['enable']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'mfa.disable': {
    methods: ["POST"]
    pattern: '/api/mfa/disable'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['disable']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/mfa_controller').default['disable']>>>
    }
  }
  'settings.theme': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/theme'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['theme']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['theme']>>>
    }
  }
  'settings.theme.change': {
    methods: ["POST"]
    pattern: '/api/settings/theme'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').themeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').themeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['changeTheme']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['changeTheme']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.tokens': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/tokens'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['tokens']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['tokens']>>>
    }
  }
  'settings.token': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/token/:type'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { type: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['token']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['token']>>>
    }
  }
  'settings.token.save': {
    methods: ["POST"]
    pattern: '/api/settings/token/:type'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').tokenValidator)>>
      paramsTuple: [ParamValue]
      params: { type: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').tokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['saveToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['saveToken']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.token.delete': {
    methods: ["DELETE"]
    pattern: '/api/settings/token/:type'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { type: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['deleteToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['deleteToken']>>>
    }
  }
  'settings.training': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/training'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['training']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['training']>>>
    }
  }
  'settings.training.update': {
    methods: ["POST"]
    pattern: '/api/settings/training'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').trainingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').trainingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['updateTraining']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['updateTraining']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.paths': {
    methods: ["GET","HEAD"]
    pattern: '/api/settings/paths'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['paths']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['paths']>>>
    }
  }
  'settings.paths.update': {
    methods: ["POST"]
    pattern: '/api/settings/paths'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').pathsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').pathsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['updatePaths']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/settings_controller').default['updatePaths']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'models.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/models'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/models').filtersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['list']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'models.options': {
    methods: ["GET","HEAD"]
    pattern: '/api/models/options'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['options']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['options']>>>
    }
  }
  'models.refresh': {
    methods: ["POST"]
    pattern: '/api/models/refresh'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['refresh']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['refresh']>>>
    }
  }
  'models.model': {
    methods: ["GET","HEAD"]
    pattern: '/api/models/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['getOne']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['getOne']>>>
    }
  }
  'models.delete': {
    methods: ["DELETE"]
    pattern: '/api/models/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['deleteOne']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['deleteOne']>>>
    }
  }
  'models.model.integrity': {
    methods: ["GET","HEAD"]
    pattern: '/api/models/integrity/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['integrity']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['integrity']>>>
    }
  }
  'models.architecture.readiness': {
    methods: ["GET","HEAD"]
    pattern: '/api/models/arch/:arch/readiness'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { arch: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['readiness']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/HTTP/API/models_controller').default['readiness']>>>
    }
  }
}
