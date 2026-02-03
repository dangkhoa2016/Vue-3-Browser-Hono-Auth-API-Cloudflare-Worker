export default {
  message: {
    about: {
      advanced: {
        admin_roles: {
          body: '完全なロールベースアクセス制御システム。',
          title: '管理者とロール:'
        },
        email_service: {
          body: 'メール経由のユーザー有効化（Brevo 連携）。',
          title: 'メールサービス:'
        },
        enterprise_audit: {
          body: '50 以上の監査エンドポイントによる完全なログ。',
          title: 'エンタープライズ監査:'
        },
        rate_limiting: {
          body: 'ログイン試行を IP ベースで追跡。',
          title: 'レート制限:'
        },
        zod_validation: {
          body: 'i18n 対応の包括的なスキーマ検証。',
          title: 'Zod バリデーション:'
        }
      },
      advanced_title: '高度な機能',
      description: 'Hono.js と D1 データベースを用いて、本番運用レベルの JWT 認証システムを構築する Cloudflare Workers プロジェクトです。',
      features: {
        d1: {
          body: 'グローバル配信に対応した SQLite 互換。',
          title: 'Cloudflare D1:'
        },
        hono: {
          body: '高速で軽量な JavaScript フレームワーク。',
          title: 'Hono.js フレームワーク:'
        },
        i18n: {
          body: '自動言語検出と無制限の対応。',
          title: '動的 i18n:'
        },
        jwt: {
          body: 'bcrypt ハッシュを使った安全なアクセス & リフレッシュトークン。',
          title: 'JWT 認証:'
        },
        token_security: {
          body: 'ブラックリスト、ローテーション、全体ログアウトの強制。',
          title: 'トークンセキュリティ:'
        }
      },
      key_features_title: '主な機能',
      testing_intro: '本プロジェクトには次を網羅するモジュール式テストスイートが含まれます:',
      testing_items: {
        email_activation: 'メールとアカウント有効化',
        enterprise_audit: 'エンタープライズ監査システム',
        i18n_validation: 'i18n と多言語バリデーション',
        rbac: 'ロールベースアクセス制御 (RBAC)',
        security_performance: 'セキュリティ & パフォーマンス',
        system_integration: 'システム & 統合テスト'
      },
      testing_title: 'テストフレームワーク',
      title: 'Hono Auth Worker について'
    },
    app: {
      back_to_top: 'トップに戻る'
    },
    common: {
      loading: '読み込み中...',
      retry: '再試行',
      retry_title: 'データを再読み込み'
    },
    error_modal: {
      retry: 'やり直す',
      title: 'システムエラー'
    },
    errors: {
      failed_to_load: '{item} の読み込みに失敗しました: {message}',
      failed_to_load_script: 'スクリプトタグの読み込みに失敗しました: {item}',
      init_failed: 'initMainApp が失敗を報告しました',
      init_undefined: 'initMainApp が定義されていません',
      network_error: 'ネットワークエラー',
      network_error_checking: '{item} の確認中にネットワークエラーが発生しました: {message}',
      not_found: '見つかりません',
      script_execution_failed: 'スクリプトの実行に失敗しました: {message}',
      something_went_wrong: '何かがうまくいきませんでした',
      unknown_error: '不明なエラー'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      cta: {
        documentation: 'ドキュメント',
        documentation_title: 'ドキュメントを読む',
        get_started: 'はじめる',
        get_started_title: '認証システムの構築を開始'
      },
      hero: {
        subtitle: 'Hono.js、D1データベース、JWT認証を組み合わせた、高性能エッジアプリケーション用の本番対応ボイラープレート。',
        title_emphasis: '認証ソリューション',
        title_end: 'Cloudflare Workers向け',
        title_start: '究極の'
      },
      tech: {
        d1_title: 'サーバーレスSQLデータベース',
        edge_title: 'グローバルエッジネットワーク展開',
        heading: '最新スタックで動作',
        hono_title: '超高速ウェブフレームワーク',
        jwt_title: 'セキュアトークンベース認証'
      }
    },
    loader: {
      app: 'アプリ',
      assets: 'アセット',
      component_not_found: 'コンポーネントが見つかりません',
      components: 'コンポーネント',
      error_details: 'エラーの詳細',
      error_loading: '[{stage}] の読み込み中にエラーが発生しました: {message}',
      finalizing: '完了中',
      initializing: '初期化中...',
      libraries: 'ライブラリ',
      loading: '{item} を読み込み中...',
      loading_component_title: 'コンポーネントを読み込み中...',
      starting_app: 'メインアプリを起動中...',
      store: 'ストア',
      system_init_sequence: 'システム初期化シーケンス'
    },
    navbar: {
      about: '概要',
      brand: 'Hono Auth Worker',
      brand_title: 'ホームページへ',
      change_language: '言語を変更',
      home: 'ホーム',
      mock_label: 'モック',
      profile: 'プロフィール',
      real_label: '本番',
      switch_to_dark: 'ダークモードに切り替え',
      switch_to_light: 'ライトモードに切り替え',
      toggle_api_mode: 'API モードを切り替え'
    },
    not_found: {
      back: '戻る',
      back_title: '前のページに戻る',
      home: 'ホーム',
      home_title: 'ホームページに戻る',
      message: 'お探しのページは存在しません。',
      title: 'ページが見つかりません'
    },
    page_load_error: {
      message: 'このコンテンツの読み込み中に問題が発生しました。接続を確認してもう一度お試しください。',
      retry: 'コンテンツを再読み込み',
      title: 'ページの読み込みに失敗しました'
    },
    profile: {
      access_level: 'アクセスレベル',
      account_info: 'アカウント情報',
      active: '有効',
      comments: 'コメント',
      favorites: 'お気に入り',
      guest_user: 'ゲストユーザー',
      joined: '登録日',
      role: 'ロール',
      stats: '統計',
      status: 'ステータス',
      title: 'ユーザープロフィール',
      user_id: 'ユーザーID',
      username: 'ユーザー名',
      visitor: 'ビジター',
      welcome: 'お帰りなさい！'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
