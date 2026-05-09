# 模块：ISR/SEO

## 信息

- **URL**: http://localhost:5175/
- **优先级**: P1
- **状态**: 待测试

## 测试用例

- [ ] 用例1：GET /todos HTML 源码包含 <title> 标签
- [ ] 用例2：GET /todos HTML 源码包含 og:title meta 标签
- [ ] 用例3：GET /content HTML 源码包含 meta description
- [ ] 用例4：GET /api/todos 返回 JSON（非 HTML），API 路由不走 ISR
- [ ] 用例5：页面加载后 React 水合正常（SPA 功能正常）

## 执行记录

| 用例                  | 状态 | 耗时 | Bug | 备注                   |
| --------------------- | ---- | ---- | --- | ---------------------- |
| TC1: title标签        | FAIL | 0.1s | -   | 本地dev无SSR，预期行为 |
| TC2: og:title         | PASS | 0.1s | -   | 标签存在，内容通用     |
| TC3: meta description | PASS | 0.1s | -   | 标签存在，内容通用     |
| TC4: API返回JSON      | PASS | 0.1s | -   | API不被ISR拦截         |
| TC5: React水合        | PASS | 8s   | -   | SPA完全交互            |

## 发现的问题

TC1失败是预期行为：本地Vite dev不提供SSR，ISR/SSR仅在Cloudflare部署环境生效
