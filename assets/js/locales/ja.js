export default {
  message: {
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker',
    app: {
      back_to_top: 'トップに戻る'
    },
    navbar: {
      change_language: '言語を変更',
      brand: 'Hono Auth Worker',
      home: 'ホーム',
      profile: 'プロフィール',
      about: '概要',
      toggle_api_mode: 'API モードを切り替え',
      mock_label: 'モック',
      real_label: '本番',
      switch_to_light: 'ライトモードに切り替え',
      switch_to_dark: 'ダークモードに切り替え'
    },
    loader: {
      assets: 'アセット',
      libraries: 'ライブラリ',
      components: 'コンポーネント',
      store: 'ストア',
      app: 'アプリ',
      finalizing: '完了中',
      initializing: '初期化中...',
      loading: '{item} を読み込み中...',
      starting_app: 'メインアプリを起動中...',
      error_loading: '[{stage}] の読み込み中にエラーが発生しました: {message}',
      system_init_sequence: 'システム初期化シーケンス',
      loading_component_title: 'コンポーネントを読み込み中...',
      component_not_found: 'コンポーネントが見つかりません',
      error_details: 'エラーの詳細'
    },
    errors: {
      failed_to_load: '{item} の読み込みに失敗しました: {message}',
      network_error: 'ネットワークエラー',
      not_found: '見つかりません',
      something_went_wrong: '何かがうまくいきませんでした',
      init_failed: 'initMainApp が失敗を報告しました',
      init_undefined: 'initMainApp が定義されていません',
      unknown_error: '不明なエラー',
      network_error_checking: '{item} の確認中にネットワークエラーが発生しました: {message}',
      script_execution_failed: 'スクリプトの実行に失敗しました: {message}',
      failed_to_load_script: 'スクリプトタグの読み込みに失敗しました: {item}'
    },
    error_modal: {
      title: 'システムエラー',
      retry: 'やり直す'
    },
    page_load_error: {
      title: 'ページの読み込みに失敗しました',
      message: 'このコンテンツの読み込み中に問題が発生しました。接続を確認してもう一度お試しください。',
      retry: 'コンテンツを再読み込み'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      hero: {
        title_start: '究極の',
        title_emphasis: '認証ソリューション',
        title_end: 'Cloudflare Workers のために',
        subtitle: '高性能なエッジアプリ向けに、Hono.js と D1 データベース、JWT 認証を組み合わせた本番運用可能なボイラープレート。'
      },
      cta: {
        get_started: '始める',
        documentation: 'ドキュメント'
      },
      tech: {
        heading: 'モダンスタックで動作'
      }
    },
    about: {
      title: 'Hono Auth Worker について',
      description: 'Hono.js と D1 データベースを用いて、本番運用レベルの JWT 認証システムを構築する Cloudflare Workers プロジェクトです。',
      key_features_title: '主な機能',
      features: {
        hono: {
          title: 'Hono.js フレームワーク:',
          body: '高速で軽量な JavaScript フレームワーク。'
        },
        d1: {
          title: 'Cloudflare D1:',
          body: 'グローバル配信に対応した SQLite 互換。'
        },
        jwt: {
          title: 'JWT 認証:',
          body: 'bcrypt ハッシュを使った安全なアクセス & リフレッシュトークン。'
        },
        token_security: {
          title: 'トークンセキュリティ:',
          body: 'ブラックリスト、ローテーション、全体ログアウトの強制。'
        },
        i18n: {
          title: '動的 i18n:',
          body: '自動言語検出と無制限の対応。'
        }
      },
      advanced_title: '高度な機能',
      advanced: {
        admin_roles: {
          title: '管理者とロール:',
          body: '完全なロールベースアクセス制御システム。'
        },
        email_service: {
          title: 'メールサービス:',
          body: 'メール経由のユーザー有効化（Brevo 連携）。'
        },
        zod_validation: {
          title: 'Zod バリデーション:',
          body: 'i18n 対応の包括的なスキーマ検証。'
        },
        enterprise_audit: {
          title: 'エンタープライズ監査:',
          body: '50 以上の監査エンドポイントによる完全なログ。'
        },
        rate_limiting: {
          title: 'レート制限:',
          body: 'ログイン試行を IP ベースで追跡。'
        }
      },
      testing_title: 'テストフレームワーク',
      testing_intro: '本プロジェクトには次を網羅するモジュール式テストスイートが含まれます:',
      testing_items: {
        system_integration: 'システム & 統合テスト',
        rbac: 'ロールベースアクセス制御 (RBAC)',
        i18n_validation: 'i18n と多言語バリデーション',
        enterprise_audit: 'エンタープライズ監査システム',
        security_performance: 'セキュリティ & パフォーマンス',
        email_activation: 'メールとアカウント有効化'
      }
    },
    profile: {
      account_info: 'アカウント情報',
      username: 'ユーザー名',
      role: '役割',
      status: 'ステータス',
      stats: '統計',
      joined: '登録日',
      user_id: 'ユーザーID',
      access_level: 'アクセスレベル',
      title: 'ユーザープロフィール',
      welcome: 'お帰りなさい！',
      account_info: 'アカウント情報',
      username: 'ユーザー名',
      guest_user: 'ゲストユーザー',
      role: 'ロール',
      visitor: 'ビジター',
      status: 'ステータス',
      active: '有効',
      stats: '統計',
      favorites: 'お気に入り',
      comments: 'コメント'
    },
    common: {
      loading: '読み込み中...',
      retry: '再試行',
      retry_title: 'データを再読み込み'
    },
    home: {
      cta: {
        get_started_title: '認証システムの構築を開始',
        documentation_title: 'ドキュメントを読む'
      },
      tech: {
        hono_title: '超高速ウェブフレームワーク',
        d1_title: 'サーバーレスSQLデータベース',
        jwt_title: 'セキュアトークンベース認証',
        edge_title: 'グローバルエッジネットワーク展開'
      }
    },
    not_found: {
      title: 'ページが見つかりません',
      message: 'お探しのページは存在しません。',
      back: '戻る',
      back_title: '前のページに戻る',
      home: 'ホーム',
      home_title: 'ホームページに戻る'
    }
  }
};
