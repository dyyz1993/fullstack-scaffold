#!/bin/bash

echo "=========================================="
echo "  Sandbox 安全验证测试"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."

# 创建测试配置
echo "1. 创建测试配置..."
cat > ~/.srt-settings.json << 'EOF'
{
  "network": {
    "allowedDomains": ["example.com"],
    "deniedDomains": []
  },
  "filesystem": {
    "denyRead": ["~/.ssh", "~/.aws"],
    "allowWrite": [".", "/tmp"],
    "denyWrite": [".env", ".env.local"]
  }
}
EOF
echo "   ✅ 配置已创建"
echo ""

# 测试 1: 网络隔离
echo "2. 测试网络隔离..."
echo "   2.1 允许的域名 (example.com):"
npx srt "curl -s -I https://example.com --connect-timeout 3" 2>&1 | head -n 1
echo ""

echo "   2.2 阻止的域名 (google.com):"
npx srt "curl -s -I https://google.com --connect-timeout 3" 2>&1 | head -n 3
echo ""

# 测试 2: 文件系统隔离
echo "3. 测试文件系统隔离..."
echo "   3.1 允许写入当前目录:"
npx srt "echo 'test' > sandbox-test.tmp && cat sandbox-test.tmp && rm sandbox-test.tmp" 2>&1
echo ""

echo "   3.2 阻止写入 .env 文件:"
npx srt "echo 'MALICIOUS' > .env" 2>&1
echo ""

# 测试 3: SSH 密钥保护
echo "4. 测试敏感文件保护..."
if [ -f ~/.ssh/id_rsa ]; then
  echo "   4.1 尝试读取 SSH 私钥:"
  npx srt "cat ~/.ssh/id_rsa" 2>&1 | head -n 1
else
  echo "   4.1 SSH 私钥不存在，跳过"
fi
echo ""

# 清理
echo "5. 清理测试配置..."
rm -f ~/.srt-settings.json
echo "   ✅ 配置已清理"
echo ""

echo "=========================================="
echo "  验证完成！"
echo "=========================================="
