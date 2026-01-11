export default {
  message: {
    about: {
      advanced: {
        admin_roles: {
          body: 'Complete role-based access control system.',
          title: 'Admin & Roles:'
        },
        email_service: {
          body: 'User activation via email (Brevo integration).',
          title: 'Email Service:'
        },
        enterprise_audit: {
          body: 'Complete logging with 50+ audit endpoints.',
          title: 'Enterprise Audit:'
        },
        rate_limiting: {
          body: 'IP-based tracking for login attempts.',
          title: 'Rate Limiting:'
        },
        zod_validation: {
          body: 'Comprehensive schema validation with i18n support.',
          title: 'Zod Validation:'
        }
      },
      advanced_title: 'Advanced Capabilities',
      description: 'A comprehensive Cloudflare Workers project using the Hono.js framework with D1 database to build a production-ready JWT authentication system.',
      features: {
        d1: {
          body: 'SQLite compatible with global distribution.',
          title: 'Cloudflare D1:'
        },
        hono: {
          body: 'Fast and lightweight JavaScript framework.',
          title: 'Hono.js Framework:'
        },
        i18n: {
          body: 'Automatic language detection & unlimited support.',
          title: 'Dynamic I18n:'
        },
        jwt: {
          body: 'Secure access & refresh tokens with bcrypt hashing.',
          title: 'JWT Auth:'
        },
        token_security: {
          body: 'Blacklist, rotation, and logout-all enforcement.',
          title: 'Token Security:'
        }
      },
      key_features_title: 'Key Features',
      testing_intro: 'The project includes a comprehensive modular test suite covering:',
      testing_items: {
        email_activation: 'Email & Account Activation',
        enterprise_audit: 'Enterprise Audit System',
        i18n_validation: 'I18n & Multilingual Validation',
        rbac: 'Role-Based Access Control (RBAC)',
        security_performance: 'Security & Performance',
        system_integration: 'System & Integration Tests'
      },
      testing_title: 'Testing Framework',
      title: 'About Hono Auth Worker'
    },
    app: {
      back_to_top: 'Back to top'
    },
    common: {
      loading: 'Loading...',
      retry: 'Retry',
      retry_title: 'Retry loading data'
    },
    error_modal: {
      retry: 'Retry System',
      title: 'System Error'
    },
    errors: {
      failed_to_load: 'Failed to load {item}: {message}',
      failed_to_load_script: 'Failed to load script tag: {item}',
      init_failed: 'initMainApp reported failure',
      init_undefined: 'initMainApp is not defined',
      network_error: 'Network Error',
      network_error_checking: 'Network error checking {item}: {message}',
      not_found: 'Not Found',
      script_execution_failed: 'Script execution failed: {message}',
      something_went_wrong: 'Something went wrong',
      unknown_error: 'Unknown error'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      cta: {
        documentation: 'Documentation',
        documentation_title: 'Read the documentation',
        get_started: 'Get Started',
        get_started_title: 'Start building your auth system'
      },
      hero: {
        subtitle: 'Production-ready boilerplate combining Hono.js, D1 Database, and JWT authentication for high-performance edge applications.',
        title_emphasis: 'Auth Solution',
        title_end: 'for Cloudflare Workers',
        title_start: 'The Ultimate'
      },
      tech: {
        d1_title: 'Serverless SQL database',
        edge_title: 'Global edge network deployment',
        heading: 'Powered by Modern Stack',
        hono_title: 'Ultra-fast web framework',
        jwt_title: 'Secure token-based authentication'
      }
    },
    auth: {
      login: 'Login',
      register: 'Register',
      login_subtitle: 'Welcome back! Please login to your account',
      register_subtitle: 'Create a new account to get started',
      email: 'Email',
      password: 'Password',
      confirm_password: 'Confirm Password',
      full_name: 'Full Name',
      email_placeholder: 'Enter your email',
      password_placeholder: 'Enter your password',
      confirm_password_placeholder: 'Confirm your password',
      full_name_placeholder: 'Enter your full name',
      remember_me: 'Remember me',
      forgot_password: 'Forgot password?',
      no_account: "Don't have an account?",
      register_now: 'Register now',
      already_have_account: 'Already have an account?',
      login_now: 'Login now',
      accept_terms_prefix: 'I agree to the',
      terms_of_service: 'Terms of Service',
      and: 'and',
      privacy_policy: 'Privacy Policy'
    },
    loader: {
      app: 'App',
      assets: 'Assets',
      component_not_found: 'Component Not Found',
      components: 'Components',
      error_details: 'Error Details',
      error_loading: 'Error loading [{stage}]: {message}',
      finalizing: 'Finalizing',
      initializing: 'Initializing...',
      libraries: 'Libraries',
      loading: 'Loading {item}...',
      items: {
        nprogress_css: 'NProgress CSS',
        bootstrap_icons: 'Bootstrap Icons',
        app_styles: 'App Styles',
        tailwind_css: 'Tailwind CSS',
        vue_demi: 'Vue Demi',
        pinia: 'Pinia',
        nprogress_js: 'NProgress JS',
        axios: 'Axios',
        axios_mock: 'Axios Mock Adapter',
        vue_router: 'Vue Router',
        app_vue: 'App.vue',
        main_store: 'Main Store'
      },
      loading_component_title: 'Loading Component...',
      starting_app: 'Starting Main App...',
      store: 'Store',
      system_init_sequence: 'System Initialization Sequence'
    },
    navbar: {
      about: 'About',
      brand: 'Hono Auth Worker',
      brand_title: 'Go to homepage',
      change_language: 'Change Language',
      home: 'Home',
      menu: 'Menu',
      mock_label: 'MOCK',
      profile: 'Profile',
      real_label: 'REAL',
      switch_to_dark: 'Switch to Dark Mode',
      switch_to_light: 'Switch to Light Mode',
      toggle_api_mode: 'Toggle API Mode'
    },
    not_found: {
      back: 'Back',
      back_title: 'Go back to previous page',
      home: 'Home',
      home_title: 'Return to homepage',
      message: 'The page you are looking for does not exist.',
      title: 'Page Not Found'
    },
    page_load_error: {
      message: 'We ran into an issue loading this content. Please check your connection and try again.',
      retry: 'Reload Content',
      title: 'Page Load Failed'
    },
    profile: {
      access_level: 'Access Level',
      account_info: 'Account Info',
      active: 'Active',
      comments: 'Comments',
      favorites: 'Favorites',
      guest_user: 'Guest User',
      joined: 'Joined',
      role: 'Role',
      stats: 'Stats',
      status: 'Status',
      title: 'User Profile',
      user_id: 'User ID',
      username: 'Username',
      visitor: 'Visitor',
      welcome: 'Welcome back!'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
