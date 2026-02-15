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
      clear: 'Clear',
      confirm_title: 'Confirm',
      confirm_message: 'Are you sure you want to delete {model} with id: {id}?',
      actions: 'Actions',
      create: 'Create',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
      retry: 'Retry',
      retry_title: 'Retry loading data'
    },
    error_modal: {
      retry: 'Retry System',
      title: 'System Error'
    },
    errors: {
      error_title: 'Error',
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
      password_mismatch: 'Passwords do not match. Please ensure both fields are identical.',
      password_mismatch_password_hint: 'Your password must match the confirmation.',
      password_mismatch_confirm_hint: 'Confirm password must exactly match your password.',
      registration_failed: 'Registration failed. Please check your details and try again.',
      connection_error: 'Cannot connect to server. Please try again later.',
      unexpected_error: 'An unexpected error occurred. Please try again.',
      remember_me: 'Remember me',
      forgot_password: 'Forgot password?',
      no_account: "Don't have an account?",
      register_now: 'Register now',
      already_have_account: 'Already have an account?',
      login_now: 'Login now',
      accept_terms_prefix: 'I agree to the',
      terms_of_service: 'Terms of Service',
      and: 'and',
      privacy_policy: 'Privacy Policy',
      login_required: 'Login Required',
      login_required_message: 'Please login to view your profile',
      password_min_length: 'Password must be at least {min} characters long',
      logging_in: 'Logging in...',
      registering: 'Registering...',
      logout: 'Logout',
      logout_confirm_title: 'Confirm Logout',
      logout_confirm_message: 'Are you sure you want to logout?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      can_login_now: 'You can now login with your credentials',
      go_to_login: 'Go to Login',
      close: 'Close'
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
      loading_profile: 'Loading profile',
      starting_app: 'Starting Main App...',
      store: 'Store',
      system_init_sequence: 'System Initialization Sequence'
    },
    navbar: {
      about: 'About',
      api_explorer: 'API Explorer',
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
      this_project: 'This Project',
      toggle_api_mode: 'Toggle API Mode',
      admin: 'Admin',
      admin_dashboard: 'Dashboard',
      user_management: 'User Management',
      system_stats: 'System Stats',
      system_health: 'System Health',
      audit_logs: 'Audit Logs',
      security_incidents: 'Security Incidents',
      realtime_monitoring: 'Realtime Monitoring',
      kv_admin: 'KV Admin'
    },
    api_explorer: {
      title: 'Role-based API Explorer',
      subtitle: 'Endpoints you can access are filtered by your role.',
      header_message: 'API Information',
      role: 'Role',
      environment: 'Environment',
      status: 'Status',
      total_available: 'Accessible endpoints',
      total_system: 'System endpoints',
      categories: 'Categories',
      endpoints: 'Endpoints',
      endpoint_count: '{count} endpoints',
      no_endpoints: 'No endpoints available for this role.',
      error_loading: 'Failed to load API info',
      login_required_title: 'Login required',
      login_required_message: 'Please login to view role-based endpoints.'
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
      full_name: 'Full Name',
      visitor: 'Visitor',
      welcome: 'Welcome back!'
    },
    admin_users: {
      badge: 'Account Administration',
      models: {
        user: 'user'
      },
      deleted_success: 'Deleted user {name} with id: #{id} successfully',
      delete_failed_title: 'Delete failed',
      delete_failed_detail: 'Failed to delete user: {reason}',
      create_user: 'Create User',
      edit_user: 'Edit User',
      server_filtering: 'Server filtering',
      client_filtering: 'Client filtering',
      title: 'User Management',
      list_title: 'User List',
      subtitle: 'Manage accounts, roles, and status across the system.',
      stats_total: 'Total users',
      stats_active: 'Active',
      stats_inactive: 'Inactive',
      table_title: 'User List',
      table_subtitle: 'Filter, search, and review user details.',
      search_placeholder: 'Search name or email',
      role_all: 'All roles',
      status_all: 'All statuses',
      column_id: 'ID',
      column_full_name: 'Full name',
      column_email: 'Email',
      column_role: 'Role',
      column_status: 'Status',
      column_created_at: 'Created',
      column_updated_at: 'Updated',
      status_active: 'Active',
      status_inactive: 'Inactive',
      empty_title: 'No users found',
      empty_message: 'Try adjusting your filters or search terms.',
      reload: 'Reload',
      page: 'Page',
      of: 'of',
      access_denied_title: 'Access denied',
      access_denied_message: 'You do not have permission to view this page.',
      login_required_message: 'Please login to access user management.'
    },
    kv_admin_page: {
      title: 'KV Configuration',
      subtitle: 'View effective key/value pairs and see which values are overridden.',
      stats_total: 'Total keys',
      stats_overrides: 'Overrides',
      stats_allowed: 'Allowed keys',
      reload: 'Reload',
      search_placeholder: 'Search key or value',
      show_overrides_only: 'Overrides only',
      last_updated: 'Last updated',
      table_title: 'Configuration values',
      table_subtitle: 'Effective values resolved from defaults and KV overrides.',
      column_key: 'Key',
      column_value: 'Value',
      column_default: 'Default',
      column_source: 'Source',
      column_actions: 'Actions',
      source_kv: 'KV',
      source_default: 'Default',
      source_unknown: 'Unknown',
      empty_title: 'No configurations found',
      empty_message: 'Try adjusting your search or filters.',
      access_denied_title: 'Access denied',
      access_denied_message: 'Only super admins can view KV configurations.',
      login_required_message: 'Please login with a super admin account.',
      copy_key: 'Copy key',
      copy_value: 'Copy value',
      expand: 'Expand',
      collapse: 'Collapse',
      copied: 'Copied',
      error_loading: 'Failed to load KV configs'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
