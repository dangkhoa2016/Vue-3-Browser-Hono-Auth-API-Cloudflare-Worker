<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="space-y-4">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ $t('message.about.title') }}</h1>
      <p class="text-lg text-gray-600 dark:text-gray-300">
        {{ $t('message.about.description') }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">{{ $t('message.about.key_features_title') }}</h2>
        <ul class="space-y-3">
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-rocket-takeoff text-blue-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.features.hono.title') }}</strong> {{ $t('message.about.features.hono.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-database text-blue-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.features.d1.title') }}</strong> {{ $t('message.about.features.d1.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-shield-lock text-blue-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.features.jwt.title') }}</strong> {{ $t('message.about.features.jwt.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-shield-check text-blue-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.features.token_security.title') }}</strong> {{ $t('message.about.features.token_security.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-translate text-blue-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.features.i18n.title') }}</strong> {{ $t('message.about.features.i18n.body') }}</span>
          </li>
        </ul>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold mb-4 text-purple-600 dark:text-purple-400">{{ $t('message.about.advanced_title') }}</h2>
        <ul class="space-y-3">
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-person-badge text-purple-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.advanced.admin_roles.title') }}</strong> {{ $t('message.about.advanced.admin_roles.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-envelope text-purple-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.advanced.email_service.title') }}</strong> {{ $t('message.about.advanced.email_service.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-check-square text-purple-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.advanced.zod_validation.title') }}</strong> {{ $t('message.about.advanced.zod_validation.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-clipboard-data text-purple-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.advanced.enterprise_audit.title') }}</strong> {{ $t('message.about.advanced.enterprise_audit.body') }}</span>
          </li>
          <li class="flex items-start text-gray-600 dark:text-gray-300">
            <i class="bi bi-speedometer2 text-purple-500 mr-3 mt-1"></i>
            <span><strong>{{ $t('message.about.advanced.rate_limiting.title') }}</strong> {{ $t('message.about.advanced.rate_limiting.body') }}</span>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <h2 class="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">{{ $t('message.about.testing_title') }}</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">
        {{ $t('message.about.testing_intro') }}
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ul class="space-y-2">
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.system_integration') }}</li>
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.rbac') }}</li>
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.i18n_validation') }}</li>
        </ul>
        <ul class="space-y-2">
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.enterprise_audit') }}</li>
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.security_performance') }}</li>
           <li class="flex items-center text-gray-600 dark:text-gray-300"><i class="bi bi-check-circle-fill text-green-500 mr-2"></i> {{ $t('message.about.testing_items.email_activation') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
