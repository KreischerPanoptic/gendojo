import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

// ─── Public / app root ────────────────────────────────────────────────────────

router.on('/').redirect('dashboard').use(middleware.auth())
router.on('/dashboard').renderInertia('dashboard', {}).as('dashboard').use(middleware.auth())

router
  .group(() => {
    router.get('/login', [controllers.http.web.Session, 'create']).as('session.create')
    router.post('/login', [controllers.http.web.Session, 'store']).as('session.store')
    router.get('/login/mfa', [controllers.http.web.Session, 'mfaCreate']).as('mfa.create')
    router.post('/login/mfa', [controllers.http.web.Session, 'mfaStore']).as('mfa.store')
  })
  .use(middleware.guest())

// ─── Auth — authenticated only ────────────────────────────────────────────────

router
  .group(() => {
    router.post('/logout', [controllers.http.web.Session, 'destroy']).as('session.destroy')

    // Settings
    router.get('/settings', [controllers.http.web.Settings, 'edit']).as('settings')

    // Models
    router.get('/models', [controllers.http.web.Models, 'list']).as('models')
  })
  .use(middleware.auth())

router
  .group(() => {
    // System information
    router
      .get('/system/snapshot', [controllers.http.api.System, 'getSnapshot'])
      .as('system.snapshot')
    router.post('/system/refresh', [controllers.http.api.System, 'refresh']).as('system.refresh')
    // MFA management (setup → enable / disable)
    router.post('/mfa/setup', [controllers.http.api.Mfa, 'setup']).as('mfa.setup')
    router.post('/mfa/enable', [controllers.http.api.Mfa, 'enable']).as('mfa.enable')
    router.post('/mfa/disable', [controllers.http.api.Mfa, 'disable']).as('mfa.disable')
    // Settings managment
    router.get('/settings/theme', [controllers.http.api.Settings, 'theme']).as('settings.theme')
    router
      .post('/settings/theme', [controllers.http.api.Settings, 'changeTheme'])
      .as('settings.theme.change')
    router.get('/settings/tokens', [controllers.http.api.Settings, 'tokens']).as('settings.tokens')
    router
      .get('/settings/token/:type', [controllers.http.api.Settings, 'token'])
      .as('settings.token')
    router
      .post('/settings/token/:type', [controllers.http.api.Settings, 'saveToken'])
      .as('settings.token.save')
    router
      .delete('/settings/token/:type', [controllers.http.api.Settings, 'deleteToken'])
      .as('settings.token.delete')
    router
      .get('/settings/training', [controllers.http.api.Settings, 'training'])
      .as('settings.training')
    router
      .post('/settings/training', [controllers.http.api.Settings, 'updateTraining'])
      .as('settings.training.update')
    router.get('/settings/paths', [controllers.http.api.Settings, 'paths']).as('settings.paths')
    router
      .post('/settings/paths', [controllers.http.api.Settings, 'updatePaths'])
      .as('settings.paths.update')
    // Models managment
    router.get('/models', [controllers.http.api.Models, 'list']).as('models.list')
    router.get('/models/options', [controllers.http.api.Models, 'options']).as('models.options')
    router.post('/models/refresh', [controllers.http.api.Models, 'refresh']).as('models.refresh')
    router.get('/models/:id', [controllers.http.api.Models, 'getOne']).as('models.model')
    router.delete('/models/:id', [controllers.http.api.Models, 'deleteOne']).as('models.delete')
    router
      .get('/models/integrity/:id', [controllers.http.api.Models, 'integrity'])
      .as('models.model.integrity')
    router
      .get('/models/arch/:arch/readiness', [controllers.http.api.Models, 'readiness'])
      .as('models.architecture.readiness')
  })
  .use(middleware.auth())
  .prefix('api')
