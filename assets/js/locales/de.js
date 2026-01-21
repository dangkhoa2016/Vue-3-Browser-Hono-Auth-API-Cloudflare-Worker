export default {
  message: {
    about: {
      advanced: {
        admin_roles: {
          body: 'Vollständiges rollenbasiertes Zugriffskontrollsystem.',
          title: 'Admin & Rollen:'
        },
        email_service: {
          body: 'Benutzeraktivierung per E-Mail (Brevo-Integration).',
          title: 'E-Mail-Dienst:'
        },
        enterprise_audit: {
          body: 'Vollständiges Logging mit über 50 Audit-Endpunkten.',
          title: 'Enterprise Audit:'
        },
        rate_limiting: {
          body: 'IP-basierte Nachverfolgung von Anmeldeversuchen.',
          title: 'Rate Limiting:'
        },
        zod_validation: {
          body: 'Umfassende Schemaprüfung mit i18n-Unterstützung.',
          title: 'Zod-Validierung:'
        }
      },
      advanced_title: 'Erweiterte Funktionen',
      description: 'Ein umfassendes Cloudflare-Workers-Projekt mit Hono.js und D1-Datenbank für ein produktionsreifes JWT-Authentifizierungssystem.',
      features: {
        d1: {
          body: 'SQLite-kompatibel mit globaler Verteilung.',
          title: 'Cloudflare D1:'
        },
        hono: {
          body: 'Schnelles und leichtgewichtiges JavaScript-Framework.',
          title: 'Hono.js Framework:'
        },
        i18n: {
          body: 'Automatische Spracherkennung und unbegrenzte Unterstützung.',
          title: 'Dynamisches I18n:'
        },
        jwt: {
          body: 'Sichere Zugriffs- und Refresh-Token mit bcrypt-Hashing.',
          title: 'JWT Auth:'
        },
        token_security: {
          body: 'Blacklist, Rotation und erzwungenes Abmelden aller Sitzungen.',
          title: 'Token-Sicherheit:'
        }
      },
      key_features_title: 'Wesentliche Funktionen',
      testing_intro: 'Das Projekt enthält eine umfassende modulare Testsuite für:',
      testing_items: {
        email_activation: 'E-Mail- & Kontoaktivierung',
        enterprise_audit: 'Enterprise-Audit-System',
        i18n_validation: 'i18n- und Mehrsprachen-Validierung',
        rbac: 'Rollenbasierte Zugriffskontrolle (RBAC)',
        security_performance: 'Sicherheit & Performance',
        system_integration: 'System- und Integrationstests'
      },
      testing_title: 'Test-Framework',
      title: 'Über Hono Auth Worker'
    },
    app: {
      back_to_top: 'Nach oben'
    },
    common: {
      close: 'Schließen',
      loading: 'Laden...',
      retry: 'Wiederholen',
      retry_title: 'Daten erneut laden'
    },
    error_modal: {
      retry: 'Wiederholen',
      title: 'Systemfehler'
    },
    errors: {
      failed_to_load: 'Fehler beim Laden von {item}: {message}',
      failed_to_load_script: 'Fehler beim Laden des Skript-Tags: {item}',
      init_failed: 'initMainApp meldete Fehler',
      init_undefined: 'initMainApp ist nicht definiert',
      network_error: 'Netzwerkfehler',
      network_error_checking: 'Netzwerkfehler beim Überprüfen von {item}: {message}',
      not_found: 'Nicht gefunden',
      script_execution_failed: 'Skriptausführung fehlgeschlagen: {message}',
      something_went_wrong: 'Etwas ist schief gelaufen',
      unknown_error: 'Unbekannter Fehler'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      cta: {
        documentation: 'Dokumentation',
        documentation_title: 'Dokumentation lesen',
        get_started: 'Loslegen',
        get_started_title: 'Beginnen Sie mit dem Aufbau Ihres Auth-Systems'
      },
      hero: {
        subtitle: 'Produktionsreifes Boilerplate, das Hono.js, D1-Datenbank und JWT-Authentifizierung für leistungsstarke Edge-Anwendungen kombiniert.',
        title_emphasis: 'Auth-Lösung',
        title_end: 'für Cloudflare Workers',
        title_start: 'Die ultimative'
      },
      tech: {
        d1_title: 'Serverlose SQL-Datenbank',
        edge_title: 'Globales Edge-Netzwerk-Deployment',
        heading: 'Angetrieben von modernem Stack',
        hono_title: 'Ultraschnelles Web-Framework',
        jwt_title: 'Sichere token-basierte Authentifizierung'
      }
    },
    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      login_subtitle: 'Willkommen zurück! Bitte melden Sie sich an',
      register_subtitle: 'Erstellen Sie ein neues Konto, um zu beginnen',
      email: 'E-Mail',
      password: 'Passwort',
      confirm_password: 'Passwort bestätigen',
      full_name: 'Vollständiger Name',
      email_placeholder: 'Geben Sie Ihre E-Mail ein',
      password_placeholder: 'Geben Sie Ihr Passwort ein',
      confirm_password_placeholder: 'Bestätigen Sie Ihr Passwort',
      full_name_placeholder: 'Geben Sie Ihren Namen ein',
      password_mismatch: 'Passwort und Bestätigung stimmen nicht überein. Bitte geben Sie identische Werte ein.',
      password_mismatch_password_hint: 'Das Passwort muss mit der Bestätigung übereinstimmen.',
      password_mismatch_confirm_hint: 'Die Bestätigung muss exakt dem Passwort entsprechen.',
      registration_failed: 'Registrierung fehlgeschlagen. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.',
      connection_error: 'Verbindung zum Server nicht möglich. Bitte versuchen Sie es später erneut.',
      unexpected_error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      remember_me: 'Angemeldet bleiben',
      forgot_password: 'Passwort vergessen?',
      no_account: 'Noch kein Konto?',
      register_now: 'Jetzt registrieren',
      already_have_account: 'Bereits ein Konto?',
      login_now: 'Jetzt anmelden',
      accept_terms_prefix: 'Ich stimme zu',
      terms_of_service: 'Nutzungsbedingungen',
      and: 'und',
      privacy_policy: 'Datenschutzerklärung',
      login_required: 'Anmeldung erforderlich',
      login_required_message: 'Bitte melden Sie sich an, um Ihr Profil anzuzeigen',
      logging_in: 'Anmelden...',
      registering: 'Registrieren...',
      logout: 'Abmelden',
      logout_confirm_title: 'Abmeldung bestätigen',
      logout_confirm_message: 'Möchten Sie sich wirklich abmelden?',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      can_login_now: 'Sie können sich jetzt mit Ihrem Konto anmelden',
      go_to_login: 'Zur Anmeldung',
      close: 'Schließen'
    },
    loader: {
      app: 'App',
      assets: 'Ressourcen',
      component_not_found: 'Komponente nicht gefunden',
      components: 'Komponenten',
      error_details: 'Fehlerdetails',
      error_loading: 'Fehler beim Laden von [{stage}]: {message}',
      finalizing: 'Abschließen',
      initializing: 'Initialisierung...',
      libraries: 'Bibliotheken',
      loading: 'Lade {item}...',
      items: {
        nprogress_css: 'NProgress CSS',
        bootstrap_icons: 'Bootstrap Icons',
        app_styles: 'App-Stile',
        tailwind_css: 'Tailwind CSS',
        vue_demi: 'Vue Demi',
        pinia: 'Pinia',
        nprogress_js: 'NProgress JS',
        axios: 'Axios',
        axios_mock: 'Axios Mock Adapter',
        vue_router: 'Vue Router',
        app_vue: 'App.vue',
        main_store: 'Haupt-Store'
      },
      loading_component_title: 'Komponente wird geladen...',
      loading_profile: 'Profil wird geladen',
      starting_app: 'Starte Hauptanwendung...',
      store: 'Speicher',
      system_init_sequence: 'Systeminitialisierungssequenz'
    },
    navbar: {
      about: 'Über',
      brand: 'Hono Auth Worker',
      brand_title: 'Zur Startseite',
      change_language: 'Sprache ändern',
      home: 'Startseite',
      menu: 'Menü',
      mock_label: 'MOCK',
      profile: 'Profil',
      real_label: 'ECHT',
      switch_to_dark: 'Zu dunklem Modus wechseln',
      switch_to_light: 'Zu hellem Modus wechseln',
      toggle_api_mode: 'API-Modus umschalten'
    },
    not_found: {
      back: 'Zurück',
      back_title: 'Zurück zur vorherigen Seite',
      home: 'Startseite',
      home_title: 'Zurück zur Startseite',
      message: 'Die gesuchte Seite existiert nicht.',
      title: 'Seite nicht gefunden'
    },
    page_load_error: {
      message: 'Beim Laden dieses Inhalts ist ein Fehler aufgetreten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
      retry: 'Inhalt neu laden',
      title: 'Laden der Seite fehlgeschlagen'
    },
    profile: {
      access_level: 'Zugriffsstufe',
      account_info: 'Kontoinformationen',
      active: 'Aktiv',
      comments: 'Kommentare',
      favorites: 'Favoriten',
      guest_user: 'Gastbenutzer',
      joined: 'Beigetreten',
      role: 'Rolle',
      stats: 'Statistiken',
      status: 'Status',
      title: 'Benutzerprofil',
      user_id: 'Benutzer-ID',
      full_name: 'Vollständiger Name',
      visitor: 'Besucher',
      welcome: 'Willkommen zurück!'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
