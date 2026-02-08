export default {
  message: {
    about: {
      advanced: {
        admin_roles: {
          body: '완전한 역할 기반 접근 제어 시스템.',
          title: '관리 & 역할:'
        },
        email_service: {
          body: '이메일을 통한 사용자 활성화 (Brevo 연동).',
          title: '이메일 서비스:'
        },
        enterprise_audit: {
          body: '50개 이상의 감사 엔드포인트로 완전한 로깅.',
          title: '엔터프라이즈 감사:'
        },
        rate_limiting: {
          body: '로그인 시도를 IP 기반으로 추적.',
          title: '요청 제한:'
        },
        zod_validation: {
          body: 'i18n 지원을 갖춘 포괄적 스키마 검증.',
          title: 'Zod 검증:'
        }
      },
      advanced_title: '고급 기능',
      description: 'Hono.js와 D1 데이터베이스로 프로덕션 준비된 JWT 인증 시스템을 구축하는 종합 Cloudflare Workers 프로젝트입니다.',
      features: {
        d1: {
          body: '글로벌 분산을 지원하는 SQLite 호환.',
          title: 'Cloudflare D1:'
        },
        hono: {
          body: '빠르고 가벼운 JavaScript 프레임워크.',
          title: 'Hono.js 프레임워크:'
        },
        i18n: {
          body: '자동 언어 감지와 무제한 지원.',
          title: '동적 i18n:'
        },
        jwt: {
          body: 'bcrypt 해싱을 활용한 안전한 액세스 및 리프레시 토큰.',
          title: 'JWT 인증:'
        },
        token_security: {
          body: '블랙리스트, 회전, 전체 로그아웃 강제.',
          title: '토큰 보안:'
        }
      },
      key_features_title: '주요 기능',
      testing_intro: '프로젝트에는 다음을 포함하는 모듈식 테스트 스위트가 있습니다:',
      testing_items: {
        email_activation: '이메일 및 계정 활성화',
        enterprise_audit: '엔터프라이즈 감사 시스템',
        i18n_validation: 'i18n 및 다국어 검증',
        rbac: '역할 기반 접근 제어 (RBAC)',
        security_performance: '보안 및 성능',
        system_integration: '시스템 및 통합 테스트'
      },
      testing_title: '테스트 프레임워크',
      title: 'Hono Auth Worker 소개'
    },
    app: {
      back_to_top: '맨 위로'
    },
    common: {
      close: '닫기',
      loading: '로딩 중...',
      retry: '다시 시도',
      retry_title: '데이터 다시 로드'
    },
    error_modal: {
      retry: '다시 시도',
      title: '시스템 오류'
    },
    errors: {
      failed_to_load: '{item} 로드 실패: {message}',
      failed_to_load_script: '스크립트 태그 로드 실패: {item}',
      init_failed: 'initMainApp 실패 보고됨',
      init_undefined: 'initMainApp이 정의되지 않았습니다',
      network_error: '네트워크 오류',
      network_error_checking: '{item} 확인 중 네트워크 오류: {message}',
      not_found: '찾을 수 없음',
      script_execution_failed: '스크립트 실행 실패: {message}',
      something_went_wrong: '문제가 발생했습니다',
      unknown_error: '알 수 없는 오류'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      cta: {
        documentation: '문서',
        documentation_title: '문서 읽기',
        get_started: '시작하기',
        get_started_title: '인증 시스템 구축 시작'
      },
      hero: {
        subtitle: 'Hono.js, D1 데이터베이스, JWT 인증을 결합한 고성능 엣지 애플리케이션용 프로덕션 지원 보일러플레이트.',
        title_emphasis: '인증 솔루션',
        title_end: 'Cloudflare Workers용',
        title_start: '최고의'
      },
      tech: {
        d1_title: '서버리스 SQL 데이터베이스',
        edge_title: '글로벌 엣지 네트워크 배포',
        heading: '최신 스택으로 구동',
        hono_title: '초고속 웹 프레임워크',
        jwt_title: '보안 토큰 기반 인증'
      }
    },
    auth: {
      login: '로그인',
      register: '회원가입',
      login_subtitle: '다시 오신 것을 환영합니다! 계정에 로그인하세요',
      register_subtitle: '새 계정을 만들어 시작하세요',
      email: '이메일',
      password: '비밀번호',
      confirm_password: '비밀번호 확인',
      full_name: '이름',
      email_placeholder: '이메일을 입력하세요',
      password_placeholder: '비밀번호를 입력하세요',
      confirm_password_placeholder: '비밀번호를 확인하세요',
      full_name_placeholder: '이름을 입력하세요',
      password_mismatch: '비밀번호와 확인 비밀번호가 일치하지 않습니다. 동일하게 입력해주세요.',
      password_mismatch_password_hint: '비밀번호는 확인 입력과 동일해야 합니다.',
      password_mismatch_confirm_hint: '확인 비밀번호도 비밀번호와 정확히 같아야 합니다.',
      registration_failed: '회원가입에 실패했습니다. 정보를 확인하고 다시 시도해주세요.',
      connection_error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      unexpected_error: '예기치 못한 오류가 발생했습니다. 다시 시도해주세요.',
      remember_me: '로그인 유지',
      forgot_password: '비밀번호를 잊으셨나요?',
      no_account: '계정이 없으신가요?',
      register_now: '지금 가입하기',
      already_have_account: '이미 계정이 있으신가요?',
      login_now: '지금 로그인',
      accept_terms_prefix: '다음에 동의합니다',
      terms_of_service: '서비스 약관',
      and: '및',
      privacy_policy: '개인정보 보호정책',
      login_required: '로그인 필요',
      login_required_message: '프로필을 보려면 로그인하세요',
      logging_in: '로그인 중...',
      registering: '가입 중...',
      logout: '로그아웃',
      logout_confirm_title: '로그아웃 확인',
      logout_confirm_message: '정말 로그아웃하시겠습니까?',
      cancel: '취소',
      confirm: '확인',
      can_login_now: '이제 계정으로 로그인할 수 있습니다',
      go_to_login: '로그인하기',
      close: '닫기'
    },
    loader: {
      app: '앱',
      assets: '자산',
      component_not_found: '컴포넌트를 찾을 수 없습니다',
      components: '구성 요소',
      error_details: '오류 상세',
      error_loading: '[{stage}] 로드 중 오류 발생: {message}',
      finalizing: '마무리 중',
      initializing: '초기화 중...',
      libraries: '라이브러리',
      loading: '{item} 로드 중...',
      items: {
        nprogress_css: 'NProgress CSS',
        bootstrap_icons: 'Bootstrap Icons',
        app_styles: '앱 스타일',
        tailwind_css: 'Tailwind CSS',
        vue_demi: 'Vue Demi',
        pinia: 'Pinia',
        nprogress_js: 'NProgress JS',
        axios: 'Axios',
        axios_mock: 'Axios Mock Adapter',
        vue_router: 'Vue Router',
        app_vue: 'App.vue',
        main_store: '메인 스토어'
      },
      loading_component_title: '컴포넌트 로드 중...',
      loading_profile: '프로필 로드 중',
      starting_app: '메인 앱 시작 중...',
      store: '스토어',
      system_init_sequence: '시스템 초기화 시퀀스'
    },
    navbar: {
      about: '소개',
      api_explorer: 'API 탐색기',
      brand: 'Hono Auth Worker',
      brand_title: '홈페이지로 이동',
      change_language: '언어 변경',
      home: '홈',
      menu: '메뉴',
      mock_label: 'MOCK',
      profile: '프로필',
      real_label: '실제',
      switch_to_dark: '다크 모드로 전환',
      switch_to_light: '라이트 모드로 전환',
      this_project: '이 프로젝트',
      toggle_api_mode: 'API 모드 전환',
      admin: '관리자',
      admin_dashboard: '대시보드',
      user_management: '사용자 관리',
      system_stats: '시스템 통계',
      system_health: '시스템 상태',
      audit_logs: '감사 로그',
      security_incidents: '보안 사고',
      realtime_monitoring: '실시간 모니터링',
      kv_admin: 'KV 관리'
    },
    api_explorer: {
      title: '역할 기반 API 탐색기',
      subtitle: '접근 가능한 엔드포인트가 역할에 따라 필터링됩니다.',
      header_message: 'API 정보',
      role: '역할',
      environment: '환경',
      status: '상태',
      total_available: '접근 가능한 엔드포인트',
      total_system: '시스템 엔드포인트',
      categories: '카테고리',
      endpoints: '엔드포인트',
      endpoint_count: '{count}개 엔드포인트',
      no_endpoints: '이 역할에 대해 사용할 수 있는 엔드포인트가 없습니다.',
      error_loading: 'API 정보를 불러오지 못했습니다',
      login_required_title: '로그인 필요',
      login_required_message: '역할 기반 엔드포인트를 보려면 로그인하세요.'
    },
    not_found: {
      back: '뒤로',
      back_title: '이전 페이지로 돌아가기',
      home: '홈',
      home_title: '홈페이지로 돌아가기',
      message: '찾으시는 페이지가 존재하지 않습니다.',
      title: '페이지를 찾을 수 없습니다'
    },
    page_load_error: {
      message: '콘텐츠를 불러오는 중 문제가 발생했습니다. 연결 상태를 확인하고 다시 시도해 주세요.',
      retry: '콘텐츠 다시 로드',
      title: '페이지 로드 실패'
    },
    profile: {
      access_level: '접근 레벨',
      account_info: '계정 정보',
      active: '활성',
      comments: '댓글',
      favorites: '즐겨찾기',
      guest_user: '게스트 사용자',
      joined: '가입일',
      role: '역할',
      stats: '통계',
      status: '상태',
      title: '사용자 프로필',
      user_id: '사용자 ID',
      full_name: '성명',
      visitor: '방문자',
      welcome: '다시 오신 것을 환영합니다!'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
