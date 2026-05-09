# 模块：Admin 认证

## 信息

- **URL**: http://localhost:5175/admin/login
- **优先级**: P2
- **状态**: 待测试

## 测试用例

- [ ] 用例1：Admin 登录页面加载，显示用户名和密码输入框
- [ ] 用例2：使用快捷登录按钮（superadmin）登录，验证跳转到 Dashboard
- [ ] 用例3：未登录访问 /admin/dashboard 应重定向到登录页
- [ ] 用例4：Admin 注册页面加载，显示注册表单

## 执行记录

| 用例              | 状态 | 耗时 | Bug | 备注                          |
| ----------------- | ---- | ---- | --- | ----------------------------- |
| TC1: 登录页加载   | PASS | 3s   | -   | 4个元素都存在                 |
| TC2: 快捷登录     | PASS | 5s   | -   | 直接跳转dashboard             |
| TC3: 未登录重定向 | PASS | 4s   | -   | /admin/dashboard→/admin/login |
| TC4: 注册页加载   | PASS | 4s   | -   | 表单和输入框可见              |

## 发现的问题

无Bug。注册页使用CSS ID而非data-testid（风格不一致，非Bug）
