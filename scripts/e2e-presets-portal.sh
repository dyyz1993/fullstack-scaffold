#!/usr/bin/env bash
# =============================================================================
# Preset 目录站 E2E 验证（部署后自动化测试）
# 覆盖：9 站点健康 / 共享数据面 / 登录链 / 门户内容 / 文档存在性 / 存活复检
# 用法：bash scripts/e2e-presets-portal.sh [BASE_TLD]
#   默认 lpm1.top；结果同时输出 stdout 与 /tmp/e2e-presets-report.txt
# 退出码：0 = 全部通过；1 = 有失败（详情见报告 FAIL 行）
# 依赖：curl、python3（无其他依赖；可在任意机器跑，无需 CF 凭据）
# =============================================================================
set -u
TLD="${1:-lpm1.top}"
PASS=0; FAIL=0
REPORT="${TMPDIR:-/tmp}/e2e-presets-report.txt"
: > "$REPORT"

say()  { echo "$@" | tee -a "$REPORT"; }
check() { # check <名称> <期望> <实际>
  if [ "$2" = "$3" ]; then
    PASS=$((PASS+1)); say "PASS  $1 (期望 $2, 实际 $3)"
  else
    FAIL=$((FAIL+1)); say "FAIL  $1 (期望 $2, 实际 $3)"
  fi
}
code() { curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 25 "$1" 2>/dev/null; }
json() { curl -s --connect-timeout 10 --max-time 25 "$@" 2>/dev/null; }

say "================ Preset 目录站 E2E ================"
say "时间: $(date '+%F %T %Z')   TLD: $TLD"
say ""

# ---------- 1. 站点健康（9 站点） ----------
say "== 1. 站点健康 =="
for s in fullstack todo saas shop forum market minimal; do
  check "$s.lpm1.top /health" 200 "$(code https://$s.$TLD/health)"
done
check "demo.lpm1.top /health" 200 "$(code https://demo.$TLD/health)"
check "presets.lpm1.top 门户" 200 "$(code https://presets.$TLD/)"

# ---------- 2. 共享数据面（同一 D1 数据池） ----------
say ""
say "== 2. 共享数据面 =="
for s in todo shop minimal fullstack; do
  TOTAL=$(json "https://$s.$TLD/api/todos" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    t = d.get('data', {}).get('total', 'NA') if d.get('success') else 'ERR'
    # fullstack-admin 租户数据状态可变，只判语义
    print('OK' if (t != 'ERR' and t != 'EXC') else 'ERR') if '$s' == 'fullstack' else print(t)
except Exception:
    print('EXC')" 2>/dev/null)
  # fullstack-admin 的 todos 随租户数据状态变化（total 可为 0），只断言接口语义成功
  if [ "$s" = "fullstack" ]; then
    check "$s todos 接口语义成功" "OK" "$TOTAL"
  else
    check "$s todos 种子共享" "10" "$TOTAL"
  fi
done

# forum/market 无 todos 模块 → 验证各自的核心公开接口
FORUM_CONTENTS=$(json "https://forum.$TLD/api/public/contents?limit=5" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    n = d.get('data')
    # 兼容两种形态：list 或 {contents: [...]}
    if isinstance(n, list): print(len(n))
    elif isinstance(n, dict) and 'contents' in n: print(len(n['contents']))
    else: print('ERR')
except Exception:
    print('EXC')" 2>/dev/null)
check "forum 公开内容列表" "2" "$FORUM_CONTENTS"

MARKET_SEARCH=$(json "https://market.$TLD/api/plugins/search?q=a" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('OK' if d.get('success') else 'ERR')
except Exception:
    print('EXC')" 2>/dev/null)
check "market 插件搜索" "OK" "$MARKET_SEARCH"

# ---------- 3. 登录链（两套认证） ----------
say ""
say "== 3. 登录链 =="
# 3a. developers 登录（saas：account 字段；注意 saas 站当前有已知 500，允许 fail-fast 标记）
SAAS_LOGIN=$(json -X POST "https://saas.$TLD/api/auth/login" -H "Content-Type: application/json" -d '{"account":"superadmin","password":"admin123"}' | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('OK' if d.get('success') and d.get('data', {}).get('token') else 'ERR')
except Exception:
    print('EXC')" 2>/dev/null)
check "saas developers 登录（superadmin/admin123）" "OK" "$SAAS_LOGIN"

# 3b. mock 登录（fullstack-admin：username 字段 + 123456）
FA_LOGIN=$(json -X POST "https://fullstack.$TLD/api/auth/login" -H "Content-Type: application/json" -d '{"username":"superadmin","password":"123456"}' | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('OK' if d.get('success') and d.get('data', {}).get('token') else 'ERR')
except Exception:
    print('EXC')" 2>/dev/null)
check "fullstack mock 登录（superadmin/123456）" "OK" "$FA_LOGIN"

# 3c. 租户控制台页面
check "saas /tenant/login 页面" 200 "$(code https://saas.$TLD/tenant/login)"

# ---------- 3b. 邀请全链（D1 事务兼容回归） ----------
say ""
say "== 3b. 邀请全链（线上真实事务路径） =="
INV=$(json -X POST "https://saas.$TLD/api/tenants/5/members/invite" -H "Authorization: Bearer test-super-admin-1" -H "Content-Type: application/json" -d '{"email":"e2e-invite@lpm1.top","roleId":"tr_saas_admin"}' | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d['data']['token'] if d.get('success') else 'ERR')
except Exception: print('EXC')" 2>/dev/null)
check "saas 创建邀请" "48" "${#INV}"
ACCEPT=$(json -X POST "https://saas.$TLD/api/tenants/invitations/$INV/accept" -H "Authorization: Bearer test-user-9" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('OK' if d.get('success') else 'ERR')
except Exception: print('EXC')" 2>/dev/null)
check "saas 接受邀请（D1 事务）" "OK" "$ACCEPT"

# ---------- 4. 门户内容 ----------
say ""
say "== 4. 门户内容 =="
PORTAL=$(json https://presets.$TLD/)
check "门户含品牌名" "3" "$(echo "$PORTAL" | grep -c 'create-fullstack-scaffold')"
# 门户 v2 为 hash SPA：服务端渲染默认 preset + 全部导航 chip
SUB_COUNT=$(echo "$PORTAL" | grep -oE 'class="chip( on)?"' | wc -l | tr -d ' ')
check "门户导航 7 个 preset" "7" "$SUB_COUNT"
JOURNEY_COUNT=$(echo "$PORTAL" | grep -c "journey")
[ "$JOURNEY_COUNT" -ge 1 ] && J=ok || J=none
check "门户含旅程故事板" "ok" "$J"
check "门户含 Mission Pack 链接" "1" "$(echo "$PORTAL" | grep -c 'MISSION-PACK')"

# ---------- 5. 文档存在性（GitHub raw） ----------
say ""
say "== 5. 文档与 Skill 分发 =="
for d in saas fullstack-admin minimal INDEX; do
  check "docs/PRESETS/$d.md" 200 "$(code https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/$d.md)"
done
check "Skill: saas-multitenant" 200 "$(code https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/skills/saas-multitenant/SKILL.md)"
check "Mission Pack" 200 "$(code https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/MISSION-PACK.md)"

# ---------- 6. 存活复检（部署事故多发生在健康窗口期后） ----------
say ""
say "== 6. 存活复检（间隔 60s，捕捉健康窗口期后的死亡） =="
say "…等待 60s 后复检 9 站点"
sleep 60
for s in fullstack todo saas shop forum market minimal; do
  check "复检 $s" 200 "$(code https://$s.$TLD/health)"
done
check "复检 demo" 200 "$(code https://demo.$TLD/health)"
check "复检 门户" 200 "$(code https://presets.$TLD/)"

# ---------- 汇总 ----------
say ""
say "================ 结果汇总 ================"
say "PASS: $PASS   FAIL: $FAIL   总计: $((PASS+FAIL))"
[ "$FAIL" -gt 0 ] && say "⚠️  失败项见上方 FAIL 行" || say "✅ 全部通过"
say "=========================================="
[ "$FAIL" -eq 0 ]
