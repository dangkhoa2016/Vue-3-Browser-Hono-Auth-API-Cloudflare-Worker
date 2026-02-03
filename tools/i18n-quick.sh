#!/bin/bash

# i18n Quick Commands / Lệnh nhanh i18n
# Quick support for common i18n audit commands / Hỗ trợ nhanh cho các lệnh i18n audit thường dùng

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Detect locale from --lang argument or environment
LOCALE="en"
for arg in "$@"; do
  if [[ "$arg" == --lang=* ]]; then
    LOCALE="${arg#--lang=}"
    break
  fi
done
# If no --lang provided, detect from environment
if [[ "$LOCALE" == "en" ]] && [[ "${LANG:-}" == vi* ]]; then
  LOCALE="vi"
fi

# Translation function
t() {
  case "$LOCALE" in
    vi)
      case "$1" in
        "running_audit") echo "Đang chạy kiểm tra i18n..." ;;
        "running_audit_sort") echo "Đang chạy kiểm tra i18n với keys đã sắp xếp..." ;;
        "exporting_results") echo "Đang xuất kết quả kiểm tra i18n..." ;;
        "exported_to") echo "✓ Đã xuất tới:" ;;
        "checking_consistency") echo "Đang kiểm tra tính nhất quán i18n..." ;;
        "all_passed") echo "✓ Tất cả kiểm tra đều đạt!" ;;
        "issues_found") echo "✗ Tìm thấy vấn đề. Chạy 'bash tools/i18n-quick.sh audit-sort' để xem chi tiết" ;;
        "quick_commands") echo "Lệnh nhanh i18n" ;;
        "usage") echo "Cách dùng" ;;
        "commands") echo "Các lệnh" ;;
        "audit_desc") echo "Chạy kiểm tra i18n đầy đủ" ;;
        "audit_sort_desc") echo "Chạy kiểm tra với keys đã sắp xếp" ;;
        "export_desc") echo "Xuất kết quả kiểm tra (JSON + CSV)" ;;
        "check_desc") echo "Kiểm tra tính nhất quán (thoát khi có lỗi)" ;;
        "help_desc") echo "Hiển thị trợ giúp này" ;;
        "examples") echo "Ví dụ" ;;
        "output_files") echo "Các file đầu ra" ;;
        "json_format") echo "Định dạng JSON" ;;
        "csv_format") echo "Định dạng CSV" ;;
        "unknown_command") echo "Lệnh không xác định" ;;
        "run_help") echo "Chạy" ;;
        "for_commands") echo "để xem các lệnh khả dụng" ;;
        *) echo "$1" ;;
      esac
      ;;
    *)
      case "$1" in
        "running_audit") echo "Running i18n audit..." ;;
        "running_audit_sort") echo "Running i18n audit with sorted keys..." ;;
        "exporting_results") echo "Exporting i18n audit results..." ;;
        "exported_to") echo "✓ Exported to:" ;;
        "checking_consistency") echo "Checking i18n consistency..." ;;
        "all_passed") echo "✓ All checks passed!" ;;
        "issues_found") echo "✗ Issues found. Run 'bash tools/i18n-quick.sh audit-sort' for details" ;;
        "quick_commands") echo "i18n Quick Commands" ;;
        "usage") echo "Usage" ;;
        "commands") echo "Commands" ;;
        "audit_desc") echo "Run full i18n audit" ;;
        "audit_sort_desc") echo "Run audit with sorted keys" ;;
        "export_desc") echo "Export audit results (JSON + CSV)" ;;
        "check_desc") echo "Check consistency (exit on error)" ;;
        "help_desc") echo "Show this help" ;;
        "examples") echo "Examples" ;;
        "output_files") echo "Output Files" ;;
        "json_format") echo "JSON format" ;;
        "csv_format") echo "CSV format" ;;
        "unknown_command") echo "Unknown command" ;;
        "run_help") echo "Run" ;;
        "for_commands") echo "for available commands" ;;
        *) echo "$1" ;;
      esac
      ;;
  esac
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Prepare language argument for node commands
LANG_ARG=""
if [[ -n "$LOCALE" ]]; then
  LANG_ARG="--lang=$LOCALE"
fi

# Get first non-flag argument as command
CMD=""
for arg in "$@"; do
  if [[ ! "$arg" == --* ]]; then
    CMD="$arg"
    break
  fi
done
CMD="${CMD:-help}"

# Commands
case "$CMD" in
  audit)
    echo -e "${CYAN}$(t running_audit)${NC}"
    echo ""
    node "$SCRIPT_DIR/i18n-audit.js" $LANG_ARG
    ;;
  
  audit-sort)
    echo -e "${CYAN}$(t running_audit_sort)${NC}"
    echo ""
    node "$SCRIPT_DIR/i18n-audit.js" $LANG_ARG --sort
    ;;
  
  export)
    echo -e "${CYAN}$(t exporting_results)${NC}"
    echo ""
    node "$SCRIPT_DIR/i18n-audit.js" $LANG_ARG --export --csv
    echo -e "${GREEN}$(t exported_to)${NC}"
    echo "  - $SCRIPT_DIR/i18n-audit-result.json"
    echo "  - $SCRIPT_DIR/i18n-audit-result.csv"
    ;;
  
  check)
    echo -e "${CYAN}$(t checking_consistency)${NC}"
    echo ""
    node "$SCRIPT_DIR/i18n-audit.js" $LANG_ARG
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      echo -e "${GREEN}$(t all_passed)${NC}"
    else
      echo -e "${RED}$(t issues_found)${NC}"
    fi
    exit $EXIT_CODE
    ;;
  
  help|--help|-h)
    echo -e "${CYAN}${BOLD}$(t quick_commands)${NC}"
    echo ""
    echo -e "${BLUE}$(t usage):${NC} bash tools/i18n-quick.sh [command] [options]"
    echo ""
    echo -e "${BLUE}$(t commands):${NC}"
    echo "  audit              $(t audit_desc)"
    echo "  audit-sort         $(t audit_sort_desc)"
    echo "  export             $(t export_desc)"
    echo "  check              $(t check_desc)"
    echo "  help               $(t help_desc)"
    echo ""
    echo -e "${BLUE}$(t examples):${NC}"
    echo "  bash tools/i18n-quick.sh audit"
    echo "  bash tools/i18n-quick.sh audit-sort"
    echo "  bash tools/i18n-quick.sh export"
    echo "  bash tools/i18n-quick.sh check"
    echo "  bash tools/i18n-quick.sh --lang=vi audit"
    echo "  bash tools/i18n-quick.sh --lang=en help"
    echo ""
    echo -e "${BLUE}$(t output_files):${NC}"
    echo "  tools/i18n-audit-result.json - $(t json_format)"
    echo "  tools/i18n-audit-result.csv  - $(t csv_format)"
    ;;
  
  *)
    echo -e "${RED}$(t unknown_command): $CMD${NC}"
    echo ""
    echo -e "$(t run_help) '${CYAN}bash tools/i18n-quick.sh help${NC}' $(t for_commands)"
    exit 1
    ;;
esac
