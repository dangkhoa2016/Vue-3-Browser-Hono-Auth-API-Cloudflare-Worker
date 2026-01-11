export default {
  message: {
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker',
    app: {
      back_to_top: '맨 위로'
    },
    navbar: {
      change_language: '언어 변경',
      brand: 'Hono Auth Worker',
      home: '홈',
      profile: '프로필',
      about: '소개',
      toggle_api_mode: 'API 모드 전환',
      mock_label: 'MOCK',
      real_label: '실제',
      switch_to_light: '라이트 모드로 전환',
      switch_to_dark: '다크 모드로 전환'
    },
    loader: {
      assets: '자산',
      libraries: '라이브러리',
      components: '구성 요소',
      store: '스토어',
      app: '앱',
      finalizing: '마무리 중',
      initializing: '초기화 중...',
      loading: '{item} 로드 중...',
      starting_app: '메인 앱 시작 중...',
      error_loading: '[{stage}] 로드 중 오류 발생: {message}',
      system_init_sequence: '시스템 초기화 시퀀스',
      loading_component_title: '컴포넌트 로드 중...',
      component_not_found: '컴포넌트를 찾을 수 없습니다',
      error_details: '오류 상세'
    },
    errors: {
      failed_to_load: '{item} 로드 실패: {message}',
      network_error: '네트워크 오류',
      not_found: '찾을 수 없음',
      something_went_wrong: '문제가 발생했습니다',
      init_failed: 'initMainApp 실패 보고됨',
      init_undefined: 'initMainApp이 정의되지 않았습니다',
      unknown_error: '알 수 없는 오류',
      network_error_checking: '{item} 확인 중 네트워크 오류: {message}',
      script_execution_failed: '스크립트 실행 실패: {message}',
      failed_to_load_script: '스크립트 태그 로드 실패: {item}'
    },
    error_modal: {
      title: '시스템 오류',
      retry: '다시 시도'
    },
    page_load_error: {
      title: '페이지 로드 실패',
      message: '콘텐츠를 불러오는 중 문제가 발생했습니다. 연결 상태를 확인하고 다시 시도해 주세요.',
      retry: '콘텐츠 다시 로드'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      hero: {
        title_start: '궁극의',
        title_emphasis: '인증 솔루션',
        title_end: 'Cloudflare Workers용',
        subtitle: 'Hono.js, D1 데이터베이스, JWT 인증을 결합한 고성능 엣지 앱용 프로덕션 준비 보일러플레이트.'
      },
      cta: {
        get_started: '시작하기',
        documentation: '문서'
      },
      tech: {
        heading: '모던 스택 기반'
      }
    },
    about: {
      title: 'Hono Auth Worker 소개',
      description: 'Hono.js와 D1 데이터베이스로 프로덕션 준비된 JWT 인증 시스템을 구축하는 종합 Cloudflare Workers 프로젝트입니다.',
      key_features_title: '주요 기능',
      features: {
        hono: {
          title: 'Hono.js 프레임워크:',
          body: '빠르고 가벼운 JavaScript 프레임워크.'
        },
        d1: {
          title: 'Cloudflare D1:',
          body: '글로벌 분산을 지원하는 SQLite 호환.'
        },
        jwt: {
          title: 'JWT 인증:',
          body: 'bcrypt 해싱을 활용한 안전한 액세스 및 리프레시 토큰.'
        },
        token_security: {
          title: '토큰 보안:',
          body: '블랙리스트, 회전, 전체 로그아웃 강제.'
        },
        i18n: {
          title: '동적 i18n:',
          body: '자동 언어 감지와 무제한 지원.'
        }
      },
      advanced_title: '고급 기능',
      advanced: {
        admin_roles: {
          title: '관리 & 역할:',
          body: '완전한 역할 기반 접근 제어 시스템.'
        },
        email_service: {
          title: '이메일 서비스:',
          body: '이메일을 통한 사용자 활성화 (Brevo 연동).'
        },
        zod_validation: {
          title: 'Zod 검증:',
          body: 'i18n 지원을 갖춘 포괄적 스키마 검증.'
        },
        enterprise_audit: {
          title: '엔터프라이즈 감사:',
          body: '50개 이상의 감사 엔드포인트로 완전한 로깅.'
        },
        rate_limiting: {
          title: '요청 제한:',
          body: '로그인 시도를 IP 기반으로 추적.'
        }
      },
      testing_title: '테스트 프레임워크',
      testing_intro: '프로젝트에는 다음을 포함하는 모듈식 테스트 스위트가 있습니다:',
      testing_items: {
        system_integration: '시스템 및 통합 테스트',
        rbac: '역할 기반 접근 제어 (RBAC)',
        i18n_validation: 'i18n 및 다국어 검증',
        enterprise_audit: '엔터프라이즈 감사 시스템',
        security_performance: '보안 및 성능',
        email_activation: '이메일 및 계정 활성화'
      }
    },
    profile: {
      account_info: '계정 정보',
      username: '사용자 이름',
      role: '역할',
      status: '상태',
      stats: '통계',
      joined: '가입일',
      user_id: '사용자 ID',
      access_level: '접근 레벨',
      title: '사용자 프로필',
      welcome: '다시 오신 것을 환영합니다!',
      account_info: '계정 정보',
      username: '사용자명',
      guest_user: '게스트 사용자',
      role: '역할',
      visitor: '방문자',
      status: '상태',
      active: '활성',
      stats: '통계',
      favorites: '즐겨찾기',
      comments: '댓글'
    },
    common: {
      loading: '로딩 중...',
      retry: '다시 시도',
      retry_title: '데이터 다시 로드'
    },
    home: {
      cta: {
        get_started_title: '인증 시스템 구축 시작',
        documentation_title: '문서 읽기'
      },
      tech: {
        hono_title: '초고속 웹 프레임워크',
        d1_title: '서버리스 SQL 데이터베이스',
        jwt_title: '보안 토큰 기반 인증',
        edge_title: '글로벌 엣지 네트워크 배포'
      }
    },
    not_found: {
      title: '페이지를 찾을 수 없습니다',
      message: '찾으시는 페이지가 존재하지 않습니다.',
      back: '뒤로',
      back_title: '이전 페이지로 돌아가기',
      home: '홈',
      home_title: '홈페이지로 돌아가기'
    }
  }
};
