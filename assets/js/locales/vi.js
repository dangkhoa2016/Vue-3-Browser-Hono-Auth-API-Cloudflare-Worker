export default {
  message: {
    about: {
      advanced: {
        admin_roles: {
          body: 'Hệ thống phân quyền đầy đủ dựa trên vai trò.',
          title: 'Quản trị & vai trò:'
        },
        email_service: {
          body: 'Kích hoạt người dùng qua email (tích hợp Brevo).',
          title: 'Dịch vụ email:'
        },
        enterprise_audit: {
          body: 'Ghi log đầy đủ với hơn 50 điểm kiểm toán.',
          title: 'Kiểm toán doanh nghiệp:'
        },
        rate_limiting: {
          body: 'Theo dõi IP cho các lần đăng nhập.',
          title: 'Giới hạn tốc độ:'
        },
        zod_validation: {
          body: 'Kiểm tra lược đồ toàn diện với hỗ trợ i18n.',
          title: 'Xác thực Zod:'
        }
      },
      advanced_title: 'Khả năng nâng cao',
      description: 'Dự án Cloudflare Workers toàn diện sử dụng Hono.js và cơ sở dữ liệu D1 để xây dựng hệ thống xác thực JWT sẵn sàng sản xuất.',
      features: {
        d1: {
          body: 'Tương thích SQLite với phân phối toàn cầu.',
          title: 'Cloudflare D1:'
        },
        hono: {
          body: 'Framework JavaScript nhẹ và nhanh.',
          title: 'Hono.js Framework:'
        },
        i18n: {
          body: 'Tự động phát hiện ngôn ngữ và hỗ trợ không giới hạn.',
          title: 'I18n động:'
        },
        jwt: {
          body: 'Token truy cập & làm mới an toàn với bcrypt.',
          title: 'JWT Auth:'
        },
        token_security: {
          body: 'Danh sách đen, xoay vòng và buộc đăng xuất toàn bộ.',
          title: 'Bảo mật Token:'
        }
      },
      key_features_title: 'Tính năng chính',
      testing_intro: 'Dự án bao gồm bộ kiểm thử mô-đun toàn diện bao phủ:',
      testing_items: {
        email_activation: 'Email & kích hoạt tài khoản',
        enterprise_audit: 'Hệ thống kiểm toán doanh nghiệp',
        i18n_validation: 'Kiểm thử i18n & đa ngôn ngữ',
        rbac: 'Kiểm soát truy cập dựa trên vai trò (RBAC)',
        security_performance: 'Bảo mật & hiệu năng',
        system_integration: 'Kiểm thử hệ thống & tích hợp'
      },
      testing_title: 'Bộ kiểm thử',
      title: 'Về Hono Auth Worker'
    },
    app: {
      back_to_top: 'Lên đầu trang'
    },
    common: {
      close: 'Đóng',
      loading: 'Đang tải...',
      retry: 'Thử lại',
      retry_title: 'Thử tải lại dữ liệu'
    },
    error_modal: {
      retry: 'Thử lại',
      title: 'Lỗi Hệ Thống'
    },
    errors: {
      failed_to_load: 'Không thể tải {item}: {message}',
      failed_to_load_script: 'Không thể tải thẻ script: {item}',
      init_failed: 'initMainApp báo cáo thất bại',
      init_undefined: 'initMainApp chưa được định nghĩa',
      network_error: 'Lỗi mạng',
      network_error_checking: 'Lỗi mạng khi kiểm tra {item}: {message}',
      not_found: 'Không tìm thấy',
      script_execution_failed: 'Thực thi script thất bại: {message}',
      something_went_wrong: 'Đã xảy ra lỗi',
      unknown_error: 'Lỗi không xác định'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      cta: {
        documentation: 'Tài liệu',
        documentation_title: 'Đọc tài liệu hướng dẫn',
        get_started: 'Bắt đầu',
        get_started_title: 'Bắt đầu xây dựng hệ thống xác thực'
      },
      hero: {
        subtitle: 'Bản mẫu sẵn sàng sản xuất kết hợp Hono.js, cơ sở dữ liệu D1 và xác thực JWT cho các ứng dụng biên hiệu năng cao.',
        title_emphasis: 'Xác thực tối ưu',
        title_end: 'cho Cloudflare Workers',
        title_start: 'Giải pháp'
      },
      tech: {
        d1_title: 'Cơ sở dữ liệu SQL không server',
        edge_title: 'Triển khai mạng biên toàn cầu',
        heading: 'Vận hành bởi nền tảng hiện đại',
        hono_title: 'Framework web siêu nhanh',
        jwt_title: 'Xác thực bảo mật dựa trên token'
      }
    },
    auth: {
      login: 'Đăng nhập',
      register: 'Đăng ký',
      login_subtitle: 'Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản',
      register_subtitle: 'Tạo tài khoản mới để bắt đầu',
      email: 'Email',
      password: 'Mật khẩu',
      confirm_password: 'Xác nhận mật khẩu',
      full_name: 'Họ và tên',
      email_placeholder: 'Nhập email của bạn',
      password_placeholder: 'Nhập mật khẩu',
      confirm_password_placeholder: 'Xác nhận mật khẩu',
      full_name_placeholder: 'Nhập họ và tên',
      password_mismatch: 'Mật khẩu và xác nhận không trùng khớp. Vui lòng nhập lại cho khớp.',
      password_mismatch_password_hint: 'Mật khẩu phải trùng khớp với phần xác nhận.',
      password_mismatch_confirm_hint: 'Xác nhận mật khẩu phải trùng khớp 100% với mật khẩu.',
      registration_failed: 'Đăng ký không thành công. Vui lòng kiểm tra thông tin và thử lại.',
      connection_error: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
      unexpected_error: 'Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.',
      remember_me: 'Ghi nhớ đăng nhập',
      forgot_password: 'Quên mật khẩu?',
      no_account: 'Chưa có tài khoản?',
      register_now: 'Đăng ký ngay',
      already_have_account: 'Đã có tài khoản?',
      login_now: 'Đăng nhập ngay',
      accept_terms_prefix: 'Tôi đồng ý với',
      terms_of_service: 'Điều khoản sử dụng',
      and: 'và',
      privacy_policy: 'Chính sách bảo mật',
      login_required: 'Yêu cầu đăng nhập',
      login_required_message: 'Vui lòng đăng nhập để xem hồ sơ của bạn',
      logging_in: 'Đang đăng nhập...',
      registering: 'Đang đăng ký...',
      logout: 'Đăng xuất',
      logout_confirm_title: 'Xác nhận đăng xuất',
      logout_confirm_message: 'Bạn có chắc chắn muốn đăng xuất?',
      cancel: 'Hủy',
      confirm: 'Xác nhận',
      can_login_now: 'Bạn có thể đăng nhập ngay bây giờ với tài khoản của mình',
      go_to_login: 'Đi đến Đăng nhập',
      close: 'Đóng'
    },
    loader: {
      app: 'Ứng dụng',
      assets: 'Tài nguyên',
      component_not_found: 'Không tìm thấy thành phần',
      components: 'Thành phần',
      error_details: 'Chi tiết lỗi',
      error_loading: 'Lỗi khi tải [{stage}]: {message}',
      finalizing: 'Hoàn tất',
      initializing: 'Đang khởi tạo...',
      libraries: 'Thư viện',
      loading: 'Đang tải {item}...',
      items: {
        nprogress_css: 'CSS NProgress',
        bootstrap_icons: 'Biểu tượng Bootstrap',
        app_styles: 'Kiểu giao diện ứng dụng',
        tailwind_css: 'Tailwind CSS',
        vue_demi: 'Vue Demi',
        pinia: 'Pinia',
        nprogress_js: 'NProgress JS',
        axios: 'Axios',
        axios_mock: 'Axios Mock Adapter',
        vue_router: 'Vue Router',
        app_vue: 'App.vue',
        main_store: 'Kho chính'
      },
      loading_component_title: 'Đang tải thành phần...',
      loading_profile: 'Đang tải hồ sơ',
      starting_app: 'Đang khởi động ứng dụng chính...',
      store: 'Kho lưu trữ',
      system_init_sequence: 'Trình tự khởi tạo hệ thống'
    },
    navbar: {
      about: 'Giới thiệu',
      brand: 'Hono Auth Worker',
      brand_title: 'Trở về trang chủ',
      change_language: 'Thay đổi Ngôn ngữ',
      home: 'Trang chủ',
      menu: 'Menu',
      mock_label: 'GIẢ LẬP',
      profile: 'Hồ sơ',
      real_label: 'THẬT',
      switch_to_dark: 'Chuyển sang chế độ Tối',
      switch_to_light: 'Chuyển sang chế độ Sáng',
      toggle_api_mode: 'Chuyển chế độ API'
    },
    not_found: {
      back: 'Quay lại',
      back_title: 'Quay lại trang trước',
      home: 'Trang chủ',
      home_title: 'Trở về trang chủ',
      message: 'Trang bạn tìm kiếm không tồn tại.',
      title: 'Không tìm thấy trang'
    },
    page_load_error: {
      message: 'Chúng tôi gặp sự cố khi tải nội dung này. Vui lòng kiểm tra kết nối và thử lại.',
      retry: 'Tải lại',
      title: 'Không thể tải trang'
    },
    profile: {
      access_level: 'Cấp độ truy cập',
      account_info: 'Thông tin tài khoản',
      active: 'Hoạt động',
      comments: 'Bình luận',
      favorites: 'Yêu thích',
      guest_user: 'Người dùng khách',
      joined: 'Ngày tham gia',
      role: 'Vai trò',
      stats: 'Thống kê',
      status: 'Trạng thái',
      title: 'Hồ sơ người dùng',
      user_id: 'Mã người dùng',
      username: 'Tên người dùng',
      visitor: 'Khách',
      welcome: 'Chào mừng trở lại!'
    },
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker'
  }
};
