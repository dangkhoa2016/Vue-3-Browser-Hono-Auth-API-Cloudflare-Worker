export default {
  message: {
    title: 'Vue 3 Browser - Hono Auth API - Cloudflare Worker',
    app: {
      back_to_top: 'Lên đầu trang'
    },
    navbar: {
      brand: 'Hono Auth Worker',
      brand_title: 'Trở về trang chủ',
      home: 'Trang chủ',
      profile: 'Hồ sơ',
      about: 'Giới thiệu',
      toggle_api_mode: 'Chuyển chế độ API',
      mock_label: 'GIẢ LẬP',
      real_label: 'THẬT',
      switch_to_light: 'Chuyển sang chế độ Sáng',
      switch_to_dark: 'Chuyển sang chế độ Tối',
      change_language: 'Thay đổi Ngôn ngữ'
    },
    loader: {
      assets: 'Tài nguyên',
      libraries: 'Thư viện',
      components: 'Thành phần',
      store: 'Kho lưu trữ',
      app: 'Ứng dụng',
      finalizing: 'Hoàn tất',
      initializing: 'Đang khởi tạo...',
      loading: 'Đang tải {item}...',
      starting_app: 'Đang khởi động ứng dụng chính...',
      error_loading: 'Lỗi khi tải [{stage}]: {message}',
      system_init_sequence: 'Trình tự khởi tạo hệ thống',
      loading_component_title: 'Đang tải thành phần...',
      component_not_found: 'Không tìm thấy thành phần',
      error_details: 'Chi tiết lỗi'
    },
    errors: {
      failed_to_load: 'Không thể tải {item}: {message}',
      network_error: 'Lỗi mạng',
      not_found: 'Không tìm thấy',
      something_went_wrong: 'Đã xảy ra lỗi',
      init_failed: 'initMainApp báo cáo thất bại',
      init_undefined: 'initMainApp chưa được định nghĩa',
      unknown_error: 'Lỗi không xác định',
      network_error_checking: 'Lỗi mạng khi kiểm tra {item}: {message}',
      script_execution_failed: 'Thực thi script thất bại: {message}',
      failed_to_load_script: 'Không thể tải thẻ script: {item}'
    },
    error_modal: {
      title: 'Lỗi Hệ Thống',
      retry: 'Thử lại'
    },
    page_load_error: {
      title: 'Không thể tải trang',
      message: 'Chúng tôi gặp sự cố khi tải nội dung này. Vui lòng kiểm tra kết nối và thử lại.',
      retry: 'Tải lại'
    },
    common: {
      loading: 'Đang tải...',
      retry: 'Thử lại',
      retry_title: 'Thử tải lại dữ liệu'
    },
    home: {
      badge: 'Hono Auth Worker v1.0',
      hero: {
        title_start: 'Giải pháp',
        title_emphasis: 'Xác thực tối ưu',
        title_end: 'cho Cloudflare Workers',
        subtitle: 'Bản mẫu sẵn sàng sản xuất kết hợp Hono.js, cơ sở dữ liệu D1 và xác thực JWT cho các ứng dụng biên hiệu năng cao.'
      },
      cta: {
        get_started: 'Bắt đầu',
        get_started_title: 'Bắt đầu xây dựng hệ thống xác thực',
        documentation: 'Tài liệu',
        documentation_title: 'Đọc tài liệu hướng dẫn'
      },
      tech: {
        heading: 'Vận hành bởi nền tảng hiện đại',
        hono_title: 'Framework web siêu nhanh',
        d1_title: 'Cơ sở dữ liệu SQL không server',
        jwt_title: 'Xác thực bảo mật dựa trên token',
        edge_title: 'Triển khai mạng biên toàn cầu'
      }
    },
    about: {
      title: 'Về Hono Auth Worker',
      description: 'Dự án Cloudflare Workers toàn diện sử dụng Hono.js và cơ sở dữ liệu D1 để xây dựng hệ thống xác thực JWT sẵn sàng sản xuất.',
      key_features_title: 'Tính năng chính',
      features: {
        hono: {
          title: 'Hono.js Framework:',
          body: 'Framework JavaScript nhẹ và nhanh.'
        },
        d1: {
          title: 'Cloudflare D1:',
          body: 'Tương thích SQLite với phân phối toàn cầu.'
        },
        jwt: {
          title: 'JWT Auth:',
          body: 'Token truy cập & làm mới an toàn với bcrypt.'
        },
        token_security: {
          title: 'Bảo mật Token:',
          body: 'Danh sách đen, xoay vòng và buộc đăng xuất toàn bộ.'
        },
        i18n: {
          title: 'I18n động:',
          body: 'Tự động phát hiện ngôn ngữ và hỗ trợ không giới hạn.'
        }
      },
      advanced_title: 'Khả năng nâng cao',
      advanced: {
        admin_roles: {
          title: 'Quản trị & vai trò:',
          body: 'Hệ thống phân quyền đầy đủ dựa trên vai trò.'
        },
        email_service: {
          title: 'Dịch vụ email:',
          body: 'Kích hoạt người dùng qua email (tích hợp Brevo).'
        },
        zod_validation: {
          title: 'Xác thực Zod:',
          body: 'Kiểm tra lược đồ toàn diện với hỗ trợ i18n.'
        },
        enterprise_audit: {
          title: 'Kiểm toán doanh nghiệp:',
          body: 'Ghi log đầy đủ với hơn 50 điểm kiểm toán.'
        },
        rate_limiting: {
          title: 'Giới hạn tốc độ:',
          body: 'Theo dõi IP cho các lần đăng nhập.'
        }
      },
      testing_title: 'Bộ kiểm thử',
      testing_intro: 'Dự án bao gồm bộ kiểm thử mô-đun toàn diện bao phủ:',
      testing_items: {
        system_integration: 'Kiểm thử hệ thống & tích hợp',
        rbac: 'Kiểm soát truy cập dựa trên vai trò (RBAC)',
        i18n_validation: 'Kiểm thử i18n & đa ngôn ngữ',
        enterprise_audit: 'Hệ thống kiểm toán doanh nghiệp',
        security_performance: 'Bảo mật & hiệu năng',
        email_activation: 'Email & kích hoạt tài khoản'
      }
    },
    profile: {
      account_info: 'Thông tin tài khoản',
      username: 'Tên người dùng',
      role: 'Vai trò',
      status: 'Trạng thái',
      stats: 'Thống kê',
      joined: 'Ngày tham gia',
      user_id: 'Mã người dùng',
      access_level: 'Cấp độ truy cập',
      title: 'Hồ sơ người dùng',
      welcome: 'Chào mừng trở lại!',
      account_info: 'Thông tin tài khoản',
      username: 'Tên người dùng',
      guest_user: 'Người dùng khách',
      role: 'Vai trò',
      visitor: 'Khách',
      status: 'Trạng thái',
      active: 'Hoạt động',
      stats: 'Thống kê',
      favorites: 'Yêu thích',
      comments: 'Bình luận'
    },
    not_found: {
      title: 'Không tìm thấy trang',
      message: 'Trang bạn tìm kiếm không tồn tại.',
      back: 'Quay lại',
      back_title: 'Quay lại trang trước',
      home: 'Trang chủ',
      home_title: 'Trở về trang chủ'
    }
  }
};
