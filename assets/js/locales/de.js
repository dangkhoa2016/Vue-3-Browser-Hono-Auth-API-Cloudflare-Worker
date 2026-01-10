export default {
  message: {
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker',
    app: {
      back_to_top: 'Nach oben'
    },
    navbar: {
      brand: 'Hono Auth Worker',
      home: 'Startseite',
      profile: 'Profil',
      about: 'Über',
      toggle_api_mode: 'API-Modus umschalten',
      mock_label: 'MOCK',
      real_label: 'ECHT',
      switch_to_light: 'Zu hellem Modus wechseln',
      switch_to_dark: 'Zu dunklem Modus wechseln'
    },
    loader: {
      assets: 'Ressourcen',
      libraries: 'Bibliotheken',
      components: 'Komponenten',
      store: 'Speicher',
      app: 'App',
      finalizing: 'Abschließen',
      initializing: 'Initialisierung...',
      loading: 'Lade {item}...',
      starting_app: 'Starte Hauptanwendung...',
      error_loading: 'Fehler beim Laden von [{stage}]: {message}',
      system_init_sequence: 'Systeminitialisierungssequenz',
      loading_component_title: 'Komponente wird geladen...',
      component_not_found: 'Komponente nicht gefunden',
      error_details: 'Fehlerdetails'
    },
    errors: {
      failed_to_load: 'Fehler beim Laden von {item}: {message}',
      network_error: 'Netzwerkfehler',
      not_found: 'Nicht gefunden',
      something_went_wrong: 'Etwas ist schief gelaufen',
      init_failed: 'initMainApp meldete Fehler',
      init_undefined: 'initMainApp ist nicht definiert',
      unknown_error: 'Unbekannter Fehler',
      network_error_checking: 'Netzwerkfehler beim Überprüfen von {item}: {message}',
      script_execution_failed: 'Skriptausführung fehlgeschlagen: {message}',
      failed_to_load_script: 'Fehler beim Laden des Skript-Tags: {item}'
    },
    error_modal: {
      title: 'Systemfehler',
      retry: 'Wiederholen'
    },
    page_load_error: {
      title: 'Laden der Seite fehlgeschlagen',
      message: 'Beim Laden dieses Inhalts ist ein Fehler aufgetreten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
      retry: 'Inhalt neu laden'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      hero: {
        title_start: 'Die ultimative',
        title_emphasis: 'Auth-Lösung',
        title_end: 'für Cloudflare Workers',
        subtitle: 'Produktionsreifes Boilerplate, das Hono.js, D1-Datenbank und JWT-Authentifizierung für leistungsstarke Edge-Anwendungen kombiniert.'
      },
      cta: {
        get_started: 'Loslegen',
        documentation: 'Dokumentation'
      },
      tech: {
        heading: 'Angetrieben von modernem Stack'
      }
    },
    about: {
      title: 'Über Hono Auth Worker',
      description: 'Ein umfassendes Cloudflare-Workers-Projekt mit Hono.js und D1-Datenbank für ein produktionsreifes JWT-Authentifizierungssystem.',
      key_features_title: 'Wesentliche Funktionen',
      features: {
        hono: {
          title: 'Hono.js Framework:',
          body: 'Schnelles und leichtgewichtiges JavaScript-Framework.'
        },
        d1: {
          title: 'Cloudflare D1:',
          body: 'SQLite-kompatibel mit globaler Verteilung.'
        },
        jwt: {
          title: 'JWT Auth:',
          body: 'Sichere Zugriffs- und Refresh-Token mit bcrypt-Hashing.'
        },
        token_security: {
          title: 'Token-Sicherheit:',
          body: 'Blacklist, Rotation und erzwungenes Abmelden aller Sitzungen.'
        },
        i18n: {
          title: 'Dynamisches I18n:',
          body: 'Automatische Spracherkennung und unbegrenzte Unterstützung.'
        }
      },
      advanced_title: 'Erweiterte Funktionen',
      advanced: {
        admin_roles: {
          title: 'Admin & Rollen:',
          body: 'Vollständiges rollenbasiertes Zugriffskontrollsystem.'
        },
        email_service: {
          title: 'E-Mail-Dienst:',
          body: 'Benutzeraktivierung per E-Mail (Brevo-Integration).'
        },
        zod_validation: {
          title: 'Zod-Validierung:',
          body: 'Umfassende Schemaprüfung mit i18n-Unterstützung.'
        },
        enterprise_audit: {
          title: 'Enterprise Audit:',
          body: 'Vollständiges Logging mit über 50 Audit-Endpunkten.'
        },
        rate_limiting: {
          title: 'Rate Limiting:',
          body: 'IP-basierte Nachverfolgung von Anmeldeversuchen.'
        }
      },
      testing_title: 'Test-Framework',
      testing_intro: 'Das Projekt enthält eine umfassende modulare Testsuite für:',
      testing_items: {
        system_integration: 'System- und Integrationstests',
        rbac: 'Rollenbasierte Zugriffskontrolle (RBAC)',
        i18n_validation: 'i18n- und Mehrsprachen-Validierung',
        enterprise_audit: 'Enterprise-Audit-System',
        security_performance: 'Sicherheit & Performance',
        email_activation: 'E-Mail- & Kontoaktivierung'
      }
    },
    profile: {
      title: 'Benutzerprofil',
      welcome: 'Willkommen zurück!',
      account_info: 'Kontoinformationen',
      username: 'Benutzername',
      guest_user: 'Gastbenutzer',
      role: 'Rolle',
      visitor: 'Besucher',
      status: 'Status',
      active: 'Aktiv',
      stats: 'Statistiken',
      favorites: 'Favoriten',
      comments: 'Kommentare'
    },
    not_found: {
      title: 'Seite nicht gefunden',
      message: 'Die gesuchte Seite existiert nicht.',
      back: 'Zurück',
      home: 'Startseite'
    }
  }
};
