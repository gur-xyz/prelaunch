#!/usr/bin/env bash
set -euo pipefail

# ─── Prelaunch CLI — curl | bash startup auditor ───────────────────────
# Usage:  curl -fsSL https://crit.9roq.com | bash -s -- <url>
#         ./prelaunch.sh <url>
#         ./prelaunch.sh              # prompts interactively
#
# Self-contained: only requires bash + curl.
# ─────────────────────────────────────────────────────────────────────────

# ─── Color & Style ──────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
MAGENTA='\033[35m'
CYAN='\033[36m'
RESET='\033[0m'

box_top()    { echo -e "${BOLD}╔$(printf '═%.0s' $(seq 1 $1))╗${RESET}"; }
box_mid()    { echo -e "${BOLD}║${RESET} $1"; }
box_bot()    { echo -e "${BOLD}╚$(printf '═%.0s' $(seq 1 $1))╝${RESET}"; }
box_mid_center() {
  local w=$1 txt="$2"
  local pad=$(( (w - ${#txt}) / 2 ))
  printf "${BOLD}║${RESET}%*s%s%*s${BOLD}║${RESET}\n" "$pad" "" "$txt" "$(( w - pad - ${#txt} ))" ""
}

sep() { echo -e "${DIM}$(printf '━%.0s' $(seq 1 $1))${RESET}"; }

# ─── Config ─────────────────────────────────────────────────────────────
API_ENDPOINT="${PRELAUNCH_API:-https://prelaunch-8x8.pages.dev/api/audit}"
WIDTH=55

# ─── URL Input ──────────────────────────────────────────────────────────
get_url() {
  if [[ $# -ge 1 ]]; then
    URL="$1"
  elif [[ ! -t 0 ]]; then
    read -r URL
  else
    echo -e "${BOLD}${CYAN}╭─────────────────────────────────────────╮${RESET}"
    echo -e "${BOLD}${CYAN}│${RESET}  Paste your startup URL:               ${BOLD}${CYAN}│${RESET}"
    echo -e "${BOLD}${CYAN}╰─────────────────────────────────────────╯${RESET}"
    read -r -p "  → " URL
  fi

  # Clean up — strip whitespace, remove trailing slash
  URL="$(echo "$URL" | tr -d '[:space:]' | sed 's:/*$::')"

  # Add protocol if missing
  if [[ ! "$URL" =~ ^https?:// ]]; then
    URL="https://$URL"
  fi

  # Validate
  if [[ -z "$URL" ]]; then
    echo -e "${RED}✖ No URL provided.${RESET}" >&2
    exit 1
  fi

  echo "$URL"
}

# ─── Spinner ────────────────────────────────────────────────────────────
spinner() {
  local pid=$1 msg="$2"
  local spin=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0
  echo -ne "${DIM}  ${spin[0]} ${msg}...${RESET}"
  while kill -0 "$pid" 2>/dev/null; do
    echo -ne "\r${DIM}  ${spin[i]} ${msg}...${RESET}"
    i=$(( (i + 1) % ${#spin[@]} ))
    sleep 0.1
  done
  echo -ne "\r${GREEN}  ✓ ${msg} done${RESET}\n"
}

# ─── Render Progress Bar ────────────────────────────────────────────────
progress_bar() {
  local score=$1 width=20
  local filled=$(echo "$score * $width / 10" | bc 2>/dev/null || echo 0)
  local empty=$(( width - filled ))
  printf "${GREEN}%*s${DIM}%*s${RESET}" "$filled" "" | tr ' ' '█'
  printf "${DIM}%*s${RESET}" "$empty" "" | tr ' ' '░'
}

# ─── Render Report ──────────────────────────────────────────────────────
render_report() {
  local url="$1" data="$2"
  local os

  # Overall score
  os=$(echo "$data" | jq -r '.overal_score // .overall_score // 0' 2>/dev/null || echo "?")

  box_top $WIDTH
  box_mid_center $WIDTH "PRELAUNCH AUDIT"
  box_mid_center $WIDTH "${DIM}$url${RESET}"
  box_bot $WIDTH
  echo ""

  local dims=("product_fit:PRODUCT FIT" "geo:GEO" "seo:SEO" "trust:TRUST" "conversion:CONVERSION")
  local colors=("${YELLOW}" "${BLUE}" "${GREEN}" "${MAGENTA}" "${CYAN}")

  for i in "${!dims[@]}"; do
    local key="${dims[$i]%%:*}"
    local label="${dims[$i]##*:}"
    local score_val=$(echo "$data" | jq -r ".dimensions.${key}.score // 0" 2>/dev/null || echo "0")
    local reason=$(echo "$data" | jq -r ".dimensions.${key}.reason // \"\"" 2>/dev/null || echo "")

    printf " ${colors[$i]}%-14s${RESET}" "$label"
    printf " "
    progress_bar "$score_val"
    printf "  ${BOLD}%s${RESET}" "$score_val"
    echo "/10"
    if [[ -n "$reason" ]]; then
      echo -e "  ${DIM}${reason}${RESET}"
    fi
    echo ""
  done

  # Issues
  echo -e " ${YELLOW}${BOLD}⚠ TOP ISSUES${RESET}\n"

  local count=$(echo "$data" | jq '.issues | length' 2>/dev/null || echo 0)
  local max_issues=5
  [[ $count -lt $max_issues ]] && max_issues=$count

  for i in $(seq 0 $(( max_issues - 1 ))); do
    local dim=$(echo "$data" | jq -r ".issues[$i].dimension // \"\"" 2>/dev/null)
    local finding=$(echo "$data" | jq -r ".issues[$i].finding // \"\"" 2>/dev/null)
    local fix=$(echo "$data" | jq -r ".issues[$i].fix // \"\"" 2>/dev/null)
    local severity=$(echo "$data" | jq -r ".issues[$i].severity // \"\"" 2>/dev/null)
    local impact=$(echo "$data" | jq -r ".issues[$i].impact // \"\"" 2>/dev/null)

    local sev_color="$YELLOW"
    [[ "$severity" == "HIGH" ]] && sev_color="$RED"

    local dim_color="$CYAN"
    case "$dim" in
      PRODUCT|PRODUCT_FIT) dim_color="$YELLOW" ;;
      GEO) dim_color="$BLUE" ;;
      SEO) dim_color="$GREEN" ;;
      TRUST) dim_color="$MAGENTA" ;;
      CONVERSION) dim_color="$CYAN" ;;
    esac

    echo -e "  ${BOLD}$(( i + 1 )).${RESET} ${DIM}[${sev_color}${dim}${RESET}${DIM}]${RESET} ${finding}"
    echo -e "     → ${fix}"
    echo -e "     ${DIM}Impact: ${impact}${RESET}"
    echo ""
  done

  # Verdict
  local verdict=$(echo "$data" | jq -r '.verdict // ""' 2>/dev/null)
  if [[ -n "$verdict" ]]; then
    sep $WIDTH
    echo -e " ${BOLD}Verdict:${RESET} $verdict"
    echo ""
  fi

  sep $WIDTH
  echo -e " ${DIM}Full report + fixes at ${BOLD}crit.9roq.com${RESET}${DIM} — paid plans unlock executable fix scripts${RESET}"
  sep $WIDTH
}

# ─── Error Response ─────────────────────────────────────────────────────
render_error() {
  local url="$1" err="$2"
  box_top $WIDTH
  box_mid_center $WIDTH "${RED}PRELAUNCH AUDIT${RESET}"
  box_mid_center $WIDTH "${DIM}$url${RESET}"
  box_bot $WIDTH
  echo ""
  echo -e "  ${RED}${BOLD}✖ Audit failed${RESET}"
  echo -e "  ${DIM}${err}${RESET}"
  echo ""
  sep $WIDTH
  echo -e "  ${DIM}Try again or reach out: ${BOLD}crit.9roq.com${RESET}"
  sep $WIDTH
}

# ─── Main ───────────────────────────────────────────────────────────────
main() {
  local url
  url="$(get_url "$@")"

  echo ""
  echo -e "${BOLD}${GREEN}⟁ prelaunch${RESET} — auditing ${BOLD}$url${RESET}"
  echo ""

  # Use a temp file for the API response
  local tmpfile
  tmpfile="$(mktemp)"

  # Call API in background with spinner
  (
    curl -fsSL -X POST "$API_ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "{\"url\": \"$url\"}" \
      -o "$tmpfile" 2>/dev/null
  ) &
  local api_pid=$!

  spinner "$api_pid" "Analyzing"

  # Check response
  if [[ ! -s "$tmpfile" ]]; then
    render_error "$url" "API returned empty response. Check your URL and try again."
    rm -f "$tmpfile"
    exit 1
  fi

  # Validate JSON
  if ! jq '.' "$tmpfile" >/dev/null 2>&1; then
    local raw
    raw="$(cat "$tmpfile")"
    render_error "$url" "Invalid response from API: ${raw:0:200}"
    rm -f "$tmpfile"
    exit 1
  fi

  # Check for API error
  local api_error
  api_error="$(jq -r '.error // empty' "$tmpfile" 2>/dev/null)"
  if [[ -n "$api_error" ]]; then
    local detail
    detail="$(jq -r '.detail // ""' "$tmpfile" 2>/dev/null)"
    render_error "$url" "$api_error${detail:+ — $detail}"
    rm -f "$tmpfile"
    exit 1
  fi

  # Render the report
  render_report "$url" "$(cat "$tmpfile")"
  rm -f "$tmpfile"
}

main "$@"
