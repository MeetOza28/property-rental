/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

const AuthController = () => import('#controllers/auth_controller')
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import {
    forgotPasswordThrottle,
    loginThrottle,
    propertySearchThrottle,
    registerThrottle,
    resetPasswordThrottle,
} from './limiter.js'
const SubscriptionsController = () => import('#controllers/subscriptions_controller')
const InquiriesController = () => import('#controllers/inquiries_controller')
const DashboardInquiriesController = () => import('#controllers/dashboard_inquiries_controller')
const ComparisonsController = () => import('#controllers/comparisons_controller')
const RecommendationsController = () => import('#controllers/recommendations_controller')
const ReviewsController = () => import('#controllers/reviews_controller')
const DashboardAnalyticsController = () => import('#controllers/dashboard_analytics_controller')
const DashboardStatesController = () => import('#controllers/dashboard_states_controller')
const AgentDashboardController = () => import('#controllers/agent_dashboard_controller')
const SystemsController = () => import('#controllers/systems_controller')
const PropertyInsightsController = () => import('#controllers/property_insights_controller')
const UsersController = () => import('#controllers/users_controller')
const PublicWardsController = () => import('#controllers/public_wards_controller')
const AdminController = () => import('#controllers/admin_controller')
const SavedSearchesController = () => import('#controllers/saved_searches_controller')
const FavoritesController = () => import('#controllers/favorites_controller')
const PublicPropertiesController = () => import('#controllers/public_properties_controller')
const PropertiesController = () => import('#controllers/properties_controller')

router.get('/', async () => {
    return {
        hello: 'world',
    }
})

router.group(() => {
    router.post('/auth/register', [AuthController, 'register']).use(registerThrottle)
    router.post('/auth/login', [AuthController, 'login']).use(loginThrottle)
    router
        .post('/auth/forgot-password', [AuthController, 'forgotPassword'])
        .use(forgotPasswordThrottle)
    router
        .post('/auth/reset-password', [AuthController, 'resetPassword'])
        .use(resetPasswordThrottle)
    router.post('/auth/resend-verification', [AuthController, 'resendVerification'])
    router.get('/auth/verify-email/:token', [AuthController, 'verifyEmail'])
    router.post('/auth/refresh', [AuthController, 'refresh'])
})

router.get('/me', [AuthController, 'me']).use([middleware.auth()])

router
    .group(() => {
        router
            .group(() => {
                router.get('/properties', [PropertiesController, 'index'])
                router
                    .post('/properties', [PropertiesController, 'store'])
                    .use(middleware.subscriptionActive())
                router.get('/properties/:id', [PropertiesController, 'show'])
                router.put('/properties/:id', [PropertiesController, 'update'])
                router.delete('/properties/:id', [PropertiesController, 'destroy'])
                router.delete('/properties/:id/images/:index', [
                    PropertiesController,
                    'deleteImage',
                ])
                router.put('/properties/:id/images/reorder', [
                    PropertiesController,
                    'reorderImages',
                ])

                router.post('/properties/:id/assign-agent', [PropertiesController, 'assignAgent'])
                router.post('/properties/:id/reviews', [ReviewsController, 'store'])
                router.delete('/reviews/:id', [ReviewsController, 'destroy'])

                router.get('/properties/:id/export', [PropertiesController, 'export'])
                router.get('/properties/:id/export-csv', [PropertiesController, 'exportCsv'])
                router.get('/properties/:id/matching-searches', [
                    PropertiesController,
                    'getMatchingSavedSearches',
                ])

                router.get('/dashboard/states', [DashboardStatesController, 'index'])
                router.get('/dashboard/states/trends', [DashboardStatesController, 'trend'])
                router.get('/dashboard/states/views', [DashboardStatesController, 'views'])

                router.get('/dashboard/properties/:id/views', [PropertyInsightsController, 'views'])
                router.get('/dashboard/properties/:id/favorites', [
                    PropertyInsightsController,
                    'favorites',
                ])

                router.get('/dashboard/analytics/properties', [
                    DashboardAnalyticsController,
                    'properties',
                ])
                router.get('/dashboard/analytics/views', [DashboardAnalyticsController, 'views'])
                router.get('/dashboard/analytics/favorites', [
                    DashboardAnalyticsController,
                    'favorites',
                ])
                router.get('/dashboard/analytics/users', [DashboardAnalyticsController, 'users'])
                router.get('/dashboard/analytics/searches', [
                    DashboardAnalyticsController,
                    'searches',
                ])

                router.get('/dashboard/agent/analytics', [AgentDashboardController, 'analytics'])
            })
            .use(middleware.role(['admin', 'agent']))

        router.post('/auth/logout', [AuthController, 'logout'])

        router.put('/profile', [AuthController, 'updateProfile'])
        router.post('/change-password', [AuthController, 'changePassword'])
        router.delete('/profile', [AuthController, 'deleteProfile'])

        router.get('/favorites', [FavoritesController, 'index'])
        router.post('/favorites', [FavoritesController, 'store'])
        router.delete('/favorites/:propertyId', [FavoritesController, 'destroy'])
        router.get('/favorites/check/:propertyId', [FavoritesController, 'check'])
        router.post('/favorites/bulk-add', [FavoritesController, 'bulkAdd'])
        router.post('/favorites/bulk-remove', [FavoritesController, 'bulkRemove'])
        router.get('/favorites/export', [FavoritesController, 'export'])

        router.post('/saved-searches', [SavedSearchesController, 'store'])
        router.get('/saved-searches', [SavedSearchesController, 'index'])
        router.get('/saved-searches/:id', [SavedSearchesController, 'show'])
        router.patch('/saved-searches/:id', [SavedSearchesController, 'update'])
        router.delete('/saved-searches/:id', [SavedSearchesController, 'destroy'])
        router.post('/saved-searches/:id/toggle-alerts', [SavedSearchesController, 'toggleAlerts'])

        router.get('/states', [UsersController, 'states'])

        router.post('/inquiries', [InquiriesController, 'store'])
        router.get('/inquiries/:id', [InquiriesController, 'show'])
        router.post('/inquiries/:id/messages', [InquiriesController, 'addMessage'])

        router.get('/dashboard/inquiries', [DashboardInquiriesController, 'index'])
        router.get('/dashboard/inquiries/:id', [DashboardInquiriesController, 'show'])
        router.patch('/dashboard/inquiries/:id/status', [
            DashboardInquiriesController,
            'updateStatus',
        ])
        router.post('/dashboard/inquiries/:id/messages', [
            DashboardInquiriesController,
            'addMessage',
        ])
        router.patch('/dashboard/inquiries/:id/assign', [DashboardInquiriesController, 'assign'])

        router.get('/subscriptions/plans', [SubscriptionsController, 'plans'])
        router.get('/subscriptions/current', [SubscriptionsController, 'current'])
        router.post('/subscriptions/checkout', [SubscriptionsController, 'checkout'])
        router.post('/subscriptions/upgrade', [SubscriptionsController, 'upgrade'])
        router.post('/subscriptions/portal', [SubscriptionsController, 'portal'])
        router.post('/subscriptions/cancel', [SubscriptionsController, 'cancel'])
        router.get('/subscriptions/invoices', [SubscriptionsController, 'invoices'])
    })
    .use([middleware.auth(), middleware.ensureActiveUser()])

router
    .group(() => {
        router.get('/admin/favorites/analytics', [FavoritesController, 'analytics'])

        router.get('/admin/users', [AdminController, 'users'])
        router.get('/admin/users/:id', [AdminController, 'userById'])
        router.put('/admin/users/:id/role', [AdminController, 'updateUserRole'])
        router.put('/admin/users/:id/activate', [AdminController, 'activateUser'])
        router.put('/admin/users/:id/deactivate', [AdminController, 'deactivateUser'])
        router.put('/admin/users/:id/restore', [AdminController, 'restoreUser'])
        router.get('/admin/users/:id/properties', [AdminController, 'userProperties'])

        router.get('/admin/agents', [AdminController, 'agents'])
        router.get('/admin/agents/:id', [AdminController, 'getAgentById'])
        router.get('/admin/agents/:id/stats', [AdminController, 'agentStates'])
        router.put('/admin/agents/:id/toggle-status', [AdminController, 'toggleAgentStatus'])

        router.get('/admin/properties', [AdminController, 'allProperties'])
        router.put('/admin/properties/:id/restore', [AdminController, 'restoreProperty'])
    })
    .use([middleware.auth(), middleware.role(['admin'])])

router.group(() => {
    router.get('/public/wards', [PublicWardsController, 'wards'])
    router.get('/public/wards/:id', [PublicWardsController, 'wardById'])
    router.get('/public/wards/:id/districts', [PublicWardsController, 'wardDistricts'])

    router.get('/public/train-stations', [PublicWardsController, 'trainStations'])
    router.get('/public/train-stations/:id', [PublicWardsController, 'trainStationById'])

    router
        .get('/public/properties', [PublicPropertiesController, 'index'])
        .use(propertySearchThrottle)
    router.get('/public/properties/trending', [PublicPropertiesController, 'trending'])
    router
        .get('/public/properties/nearby', [PublicPropertiesController, 'nearby'])
        .use(propertySearchThrottle)
    router
        .get('/public/properties/search', [PublicWardsController, 'searchProperties'])
        .use(propertySearchThrottle)
    router.get('/public/properties/:slug', [PublicPropertiesController, 'show'])
    router.get('/public/properties/:id/similar', [PublicWardsController, 'similarProperties'])
    router.get('/public/properties/:id/reviews', [ReviewsController, 'index'])

    router.get('/public/features', [PublicWardsController, 'features'])
    router.get('/public/favorites/count', [PublicWardsController, 'favoriteCount'])
})

router
    .group(() => {
        router.get('/recommendations', [RecommendationsController, 'index'])
        router.get('/recommendations/properties/:id/similar', [
            RecommendationsController,
            'similar',
        ])
        router.get('/recommendations/properties/trending', [RecommendationsController, 'trending'])

        router.get('/comparisons', [ComparisonsController, 'index'])
        router.post('/comparisons', [ComparisonsController, 'store'])
        router.get('/comparisons/:id', [ComparisonsController, 'show'])
        router.patch('/comparisons/:id', [ComparisonsController, 'update'])
        router.delete('/comparisons/:id', [ComparisonsController, 'destroy'])
    })
    // .use([middleware.ensureSession])
    .use([middleware.ensureSession(), middleware.auth({ guards: ['api'], optional: true })])

router.post('/webhooks/stripe', [SubscriptionsController, 'webhook'])

router.get('/health', [SystemsController, 'health'])
router.get('/version', [SystemsController, 'version'])

router.get('/success', async () => {
    return {
        message: 'Payment successful 🎉',
    }
})

router.get('/cancel', async () => {
    return {
        message: 'Payment cancelled ❌',
    }
})
