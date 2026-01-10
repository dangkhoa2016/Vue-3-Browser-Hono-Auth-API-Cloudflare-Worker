export default {
  message: {
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker',
    app: {
      back_to_top: 'Back to top'
    },
    navbar: {
      brand: 'Hono Auth Worker',
      home: 'Home',
      profile: 'Profile',
      about: 'About',
      toggle_api_mode: 'Toggle API Mode',
      mock_label: 'MOCK',
      real_label: 'REAL',
      switch_to_light: 'Switch to Light Mode',
      switch_to_dark: 'Switch to Dark Mode'
    },
    loader: {
      assets: 'Assets',
      libraries: 'Libraries',
      components: 'Components',
      store: 'Store',
      app: 'App',
      finalizing: 'Finalizing',
      initializing: 'Initializing...',
      loading: 'Loading {item}...',
      starting_app: 'Starting Main App...',
      error_loading: 'Error loading [{stage}]: {message}',
      system_init_sequence: 'System Initialization Sequence',
      loading_component_title: 'Loading Component...',
      component_not_found: 'Component Not Found',
      error_details: 'Error Details'
    },
    errors: {
      failed_to_load: 'Failed to load {item}: {message}',
      network_error: 'Network Error',
      not_found: 'Not Found',
      something_went_wrong: 'Something went wrong',
      init_failed: 'initMainApp reported failure',
      init_undefined: 'initMainApp is not defined',
      unknown_error: 'Unknown error',
      network_error_checking: 'Network error checking {item}: {message}',
      script_execution_failed: 'Script execution failed: {message}',
      failed_to_load_script: 'Failed to load script tag: {item}'
    },
    error_modal: {
      title: 'System Error',
      retry: 'Retry System'
    },
    page_load_error: {
      title: 'Page Load Failed',
      message: 'We ran into an issue loading this content. Please check your connection and try again.',
      retry: 'Reload Content'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      hero: {
        title_start: 'The Ultimate',
        title_emphasis: 'Auth Solution',
        title_end: 'for Cloudflare Workers',
        subtitle: 'Production-ready boilerplate combining Hono.js, D1 Database, and JWT authentication for high-performance edge applications.'
      },
      cta: {
        get_started: 'Get Started',
        documentation: 'Documentation'
      },
      tech: {
        heading: 'Powered by Modern Stack'
      }
    },
    about: {
      title: 'About Hono Auth Worker',
      description: 'A comprehensive Cloudflare Workers project using the Hono.js framework with D1 database to build a production-ready JWT authentication system.',
      key_features_title: 'Key Features',
      features: {
        hono: {
          title: 'Hono.js Framework:',
          body: 'Fast and lightweight JavaScript framework.'
        },
        d1: {
          title: 'Cloudflare D1:',
          body: 'SQLite compatible with global distribution.'
        },
        jwt: {
          title: 'JWT Auth:',
          body: 'Secure access & refresh tokens with bcrypt hashing.'
        },
        token_security: {
          title: 'Token Security:',
          body: 'Blacklist, rotation, and logout-all enforcement.'
        },
        i18n: {
          title: 'Dynamic I18n:',
          body: 'Automatic language detection & unlimited support.'
        }
      },
      advanced_title: 'Advanced Capabilities',
      advanced: {
        admin_roles: {
          title: 'Admin & Roles:',
          body: 'Complete role-based access control system.'
        },
        email_service: {
          title: 'Email Service:',
          body: 'User activation via email (Brevo integration).'
        },
        zod_validation: {
          title: 'Zod Validation:',
          body: 'Comprehensive schema validation with i18n support.'
        },
        enterprise_audit: {
          title: 'Enterprise Audit:',
          body: 'Complete logging with 50+ audit endpoints.'
        },
        rate_limiting: {
          title: 'Rate Limiting:',
          body: 'IP-based tracking for login attempts.'
        }
      },
      testing_title: 'Testing Framework',
      testing_intro: 'The project includes a comprehensive modular test suite covering:',
      testing_items: {
        system_integration: 'System & Integration Tests',
        rbac: 'Role-Based Access Control (RBAC)',
        i18n_validation: 'I18n & Multilingual Validation',
        enterprise_audit: 'Enterprise Audit System',
        security_performance: 'Security & Performance',
        email_activation: 'Email & Account Activation'
      }
    },
    profile: {
      title: 'User Profile',
      welcome: 'Welcome back!',
      account_info: 'Account Info',
      username: 'Username',
      guest_user: 'Guest User',
      role: 'Role',
      visitor: 'Visitor',
      status: 'Status',
      active: 'Active',
      stats: 'Stats',
      favorites: 'Favorites',
      comments: 'Comments'
    },
    not_found: {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      back: 'Back',
      home: 'Home'
    }
  }
};
