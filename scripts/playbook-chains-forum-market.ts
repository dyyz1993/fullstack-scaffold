/**
 * Forum / XBrowser Marketplace 两个 preset 的 Test Playbook 扩充案例链（正/逆/身份交叉深化）。
 *
 * 结构约定：key 为 `<preset.id>:<身份名>`（身份名与 generate-test-playbooks.ts 中 PRESETS 定义一致），
 * 由 generate-test-playbooks.ts 在生成循环里 merge 进对应身份的 cases。
 *
 * 类型说明：ExtraCase 与生成器内联 case 形状（title/steps/verify/shot?，selectors 可选不涉及）
 * 结构化一致——生成器 case 类型含可选 selectors，本文件的 ExtraCase 可直接赋值合并。
 * 注：未从 src/generators/template-generator 导入 ResolvedPreset——该类型描述的是
 * preset+modules 解析结果，与本案例形状无关，导入反而引入未使用依赖。
 *
 * 写作规范：title 含"逆向"或失败语义判逆；shot 只引用 docs/PRESETS/screenshots/ 下真实存在的文件；
 * 未实勘的功能以"实勘："标注预期。
 */

export interface ExtraCase {
  title: string
  steps: string[]
  verify: string
  shot?: string
}

export const EXTRA_CHAINS: Record<string, ExtraCase[]> = {
  // ═══════════════════════════════════════════════════════════
  // forum（forum.lpm1.top — CommunityHub 内容站）
  // 知识基线：.ui-tester/knowledge/forum/selectors.yml v9/v10
  // ═══════════════════════════════════════════════════════════
  'forum:管理员': [
    {
      title: '编辑内容后还原（正向链）',
      steps: [
        '打开 https://forum.lpm1.top/admin 登录 superadmin / 123456，进入内容管理',
        '编辑 content-1，标题末尾追加 [T-EDIT] 保存',
        '打开前台 /content/content-1 确认标题已带 [T-EDIT]',
        '返回管理后台再次编辑，移除 [T-EDIT] 还原',
      ],
      verify:
        '前台标题两阶段变化并可完整还原；还原后前台与后台列表均无测试残留（断言以变化前后对照为准，content-1 标题含历史测试残留 {fa-super} 勿锚定纯文本）',
    },
    {
      title: '草稿→发布状态切换（正向）',
      steps: [
        '管理后台内容管理新建内容（标题含 [T-DRAFT] 标记，存为草稿/draft）',
        '打开前台首页确认该内容不出现在列表',
        '管理端将其状态切换为 published',
        '刷新前台首页确认出现',
      ],
      verify:
        '实勘：前台列表只显示 published 内容、草稿不可见；发布后可见（若前台无草稿过滤则记录为缺陷）',
    },
    {
      title: '新建内容→删除回收链（正向）',
      steps: [
        '新建内容 [T-DEL-回收测试] 并发布',
        '前台确认可见后，管理端删除该内容',
        '前台首页列表与 /content/<id> 直访复查',
      ],
      verify: '删除后首页列表不再出现，直访返回 404 兜底页；种子内容 content-1/content-2 不受影响',
    },
    {
      title: '分类管理新建分类（正向·实勘）',
      steps: [
        '管理后台进入 内容管理→分类管理',
        '查看现有分类列表',
        '新建分类 [T-分类] 保存',
        '打开前台首页观察筛选胶囊区',
      ],
      verify:
        '实勘：分类列表渲染正常；前台筛选胶囊当前固定 6 个（全部/文章/公告/教程/新闻/政策），新分类是否映射到前台胶囊待勘（不映射则记录前后端不同步）',
    },
    {
      title: '用户管理搜索过滤（正向）',
      steps: [
        '管理后台进入用户管理（/admin/users）',
        '在搜索框输入 superadmin',
        '清空搜索恢复全表',
      ],
      verify: '搜索后表格仅剩 superadmin 行；清空后恢复完整列表且行数与初始一致',
    },
    {
      title: '管理后台硬刷新会话保持（正向）',
      steps: [
        '登录管理后台到达 /admin/dashboard',
        '按 F5 硬刷新',
        '再直接访问 /admin/users 子路由',
      ],
      verify:
        '刷新后仍停留 dashboard 不回登录页；子路由直访正常渲染（实勘 token 存储位置与有效期）',
    },
    {
      title: '同一内容连续两次编辑（连续操作）',
      steps: [
        '编辑 content-2 摘要追加 A → 保存',
        '立即再次编辑追加 B → 保存',
        '打开前台 /content/content-2 对照最终内容',
      ],
      verify: '前台显示两次编辑叠加后的最终内容，无中间态丢失或字段回滚',
    },
    {
      title: '错误密码登录管理后台（逆向）',
      steps: ['/admin 登录页输入 superadmin / wrong-pass-123', '点击登录'],
      verify: '提示凭据错误并停留登录页；地址栏不进入 /admin/dashboard，无任何管理数据渲染',
    },
    {
      title: '超长+HTML 注入内容标题（逆向）',
      steps: [
        '新建内容，标题填 256+ 字符并在末尾拼 <script>alert(1)</script>',
        '提交保存',
        '打开前台首页与该内容详情页',
      ],
      verify: '超长被校验拒绝或安全截断；脚本串以纯文本转义显示、无 alert 执行；首页列表布局不破版',
    },
    {
      title: '无 token / 普通用户 token 调管理 API（逆向·身份交叉）',
      steps: [
        '无 Authorization 请求 GET /api/admin/users 与 /api/admin/stats',
        '用前台注册用户（round2verify@t.com / Test1234!）登录取 JWT 后带 Bearer 重复请求',
      ],
      verify: '无 token 一律 401；普通用户 token 403（实勘 forum 后端角色校验，若放行记 P1 越权）',
    },
  ],
  'forum:注册用户': [
    {
      title: '三入口到达同一内容详情（入口交叉）',
      steps: [
        '登录后首页点击 ISR 教程卡（a[href="/content/content-2"]）进详情',
        '返回后从导航 Topics（[data-testid="nav-topics-button"]）点击同一内容链接（/topics/content-2 风格）',
        '再从 Popular 页点击同一内容',
      ],
      verify:
        '三个入口均渲染完整详情页（标题/正文/评论区一致）；Topics 的 /topics/content-N 路由不 404（v9 起该路由渲染完整详情）',
    },
    {
      title: '搜索+分类组合查询（正向深化）',
      steps: [
        '点击"教程"胶囊过滤出 ISR 教程',
        '保持筛选，在搜索框输入 ISR 并点搜索',
        '切回"全部"胶囊观察结果',
      ],
      verify:
        '教程+ISR 组合仅命中 ISR 教程卡；切回全部后符合组合语义（实勘：搜索与分类是否正交——已知 v4 观察为搜索不重置分类，若行为相反记回归）',
      shot: 'matrix/forum/forum-12.png',
    },
    {
      title: '刷新状态保持双向（登录保持/登出不复活）',
      steps: [
        '登录后首页按 F5 硬刷新，确认右上角仍为登录用户名 + Sign Out',
        '点击 Sign Out 后再次 F5',
        '检查 localStorage 的 auth-token 是否保持登出态',
      ],
      verify:
        '登录态刷新身份不变；登出后硬刷新 navbar 保持 Login、auth store 不自动恢复（v8 修复复验，若复活记 P1 回归）',
      shot: 'matrix/forum/forum-10.png',
    },
    {
      title: '登录落地页 /topics 断言（v8 复验）',
      steps: [
        '/login 使用 round2verify@t.com / Test1234! 点 [data-testid="login-submit"]',
        '观察跳转目标（0s / 2s 双帧）',
      ],
      verify:
        '登录成功落地 /topics（h1 Topics 聚合视图）；历史缺陷"跳 /todos 404"与"停留 /"均不复现',
    },
    {
      title: 'emoji/中英混合评论提交（正向）',
      steps: [
        '登录态打开 /content/content-1 评论区（[data-testid="comment-section"]）',
        '在 [data-testid="comment-input"] 输入 "Great! 🚀 中英混合 test 123"',
        '点 [data-testid="comment-submit"]，随后 F5 刷新',
      ],
      verify:
        '发布成功：评论计数 +1、列表插入且 emoji/中英原样显示、0/2000 计数器工作；F5 后评论持久（服务端持久化）',
      shot: 'matrix/forum/forum-13.png',
    },
    {
      title: '接近 2000 字长评论边界（正向边界）',
      steps: [
        '评论区输入 1999 字符中英混合长文本',
        '发布成功后再输入超限文本，观察计数器与提交按钮状态',
      ],
      verify:
        '1999 字符可发布且完整显示；超限输入被计数器/禁用态拦截或截断（实勘 2000 上限的具体截断行为）',
    },
    {
      title: '连续发 3 删 2 计数链（连续操作）',
      steps: [
        '连续发布评论 A、B、C 三条',
        '删除 B、C（仅自己评论渲染 [data-testid="comment-delete"]，无确认弹窗）',
        'F5 刷新核对剩余内容',
      ],
      verify: '计数 N→N+3→N+1 逐步正确；剩余 A 位置顺序保持；刷新后与服务端一致',
    },
    {
      title: '双击重复提交评论（逆向）',
      steps: ['输入一条正常评论', '快速双击发布按钮'],
      verify: '仅产生 1 条评论（计数 +1），无重复条目（若 +2 记录缺陷，后端幂等性实勘）',
    },
    {
      title: '纯空格评论被拒（逆向）',
      steps: ['评论框只输入空格（如 5 个空格）', '观察提交按钮状态并尝试提交'],
      verify: '按钮呈 disabled 禁用态或提交被拦截；计数不变、不产生空白评论',
    },
    {
      title: 'HTML/script 注入评论（逆向）',
      steps: ['提交评论 "<script>alert(1)</script>"', '再提交 "<img src=x onerror=alert(2)>"'],
      verify: '无任何 alert 执行；评论区以转义纯文本渲染；控制台无意外报错',
    },
    {
      title: '注册密码 5 位被拒（逆向）',
      steps: [
        '/register 填写 username/email，密码填 abc12（5 位）',
        '点 Create Account（form button[type="submit"]）',
      ],
      verify:
        'min 6 chars 校验拦截（原生 validationMessage 或红字提示）；不跳转 /login、不产生账号',
      shot: 'matrix/forum/06-register.png',
    },
    {
      title: '注册已存在邮箱被拒（逆向）',
      steps: ['/register 使用已存在邮箱 r7other@t.com 与新用户名注册', '提交'],
      verify:
        '服务端报错（实勘具体文案），停留注册/登录页且不产生重复账号；r7other 原账号仍可正常登录',
    },
    {
      title: '错误密码登录（逆向）',
      steps: ['/login 填 round2verify@t.com / WrongPass!', '点 [data-testid="login-submit"]'],
      verify:
        '[data-testid="login-error"] 显示 Invalid credentials、停留 /login 不跳转；连续 3 次失败后仍明确报错（实勘是否有限流/锁定）',
      shot: 'matrix/forum/07-login.png',
    },
    {
      title: '删除他人评论 API 403（IDOR·身份交叉）',
      steps: [
        'demo（demo@biomimic.app/demo123）与 r7other（r7other@t.com / Test1234!）分别登录各发一条评论，记下双方评论 id',
        '以 demo 身份在 UI 确认他人评论无删除按钮',
        '用 demo 的 JWT 直接 DELETE 他人评论 id（实勘 /api/comments/<id> 路由形态）',
      ],
      verify:
        'UI 无越权入口（删除按钮按作者渲染，v10 双向实测）；API 层 403、他人评论仍存在；作者本人与 super_admin 可删为已知白名单',
    },
    {
      title: '伪造 Bearer token 调发布评论 API（逆向·实勘）',
      steps: [
        '构造无签名 token（Authorization: Bearer fake123）POST 评论发布接口',
        '对照：带真实 JWT 请求同一接口',
      ],
      verify:
        '实勘：mock 后端历史上曾接受任意 user-token 自动登录——若 fake123 被放行记 P1（mock 认证旁路），若 401 则记录通过',
    },
    {
      title: 'Profile 渲染真实登录身份（v8 复验·正向）',
      steps: ['登录 round2verify 后访问 /profile', '对照 localStorage 中 user.username'],
      verify:
        '头像为用户名首字母、h1 为 round2verify；无 Jane Doe 硬编码残留（历史 P2 已修，复验防回归）',
    },
  ],
  'forum:游客（未登录）': [
    {
      title: '真游客态工艺链（前置·自动登录怪癖）',
      steps: [
        '全新会话打开首页（mock 后端会自动写入 auth-token/Demo User）',
        'eval 写入 localStorage.setItem("auth-token", JSON.stringify({state:{token:null,isAuthenticated:false,user:null},version:0})) 后 reload',
        '依次打开首页与内容详情确认身份',
      ],
      verify:
        'navbar 稳定显示 Login（键存在则不再自动登录，v9 实测工艺）；详情页评论区出现游客灰条——本用例为后续游客逆向用例的统一前置',
    },
    {
      title: '游客评论区只读态（v9 复验扩展）',
      steps: [
        '真游客态打开 /content/content-1',
        '滚动到 [data-testid="comment-section"]',
        '点击灰条内的登录按钮',
      ],
      verify:
        '无输入框无发布按钮；灰条"登录后参与讨论，分享你的想法"+登录按钮，点击跳转 /login；评论条目可见但 0 个删除按钮',
    },
    {
      title: '分类胶囊 6 连切遍历（正向遍历）',
      steps: ['依次点击 6 个筛选胶囊：全部→文章→公告→教程→新闻→政策→全部'],
      verify:
        '高亮跟随点击；文章=1 卡、教程=1 卡（ISR）、公告=暂无内容空态、新闻/政策=空态（实勘）、回到全部恢复 2 卡',
      shot: 'matrix/forum/forum-11.png',
    },
    {
      title: '搜索大小写与中英混合（正向深化）',
      steps: ['搜索小写 isr', '清空后搜索"教程"', '清空后搜索"欢迎"（content-1 标题词）'],
      verify:
        '实勘：小写 isr 是否命中 ISR 教程（大小写不敏感则命中）；中文关键词是否覆盖标题/正文；无结果时显示暂无内容空态且关键词保留在输入框',
      shot: 'matrix/forum/forum-12.png',
    },
    {
      title: '搜索后切换分类（组合语义边界）',
      steps: [
        '搜索 ISR 得到 1 卡',
        '点击"公告"胶囊观察结果',
        '点击"全部"胶囊观察结果',
        '再次点击搜索按钮重搜',
      ],
      verify:
        '实勘组合语义：切公告后是否空态、切回全部是否保留 ISR 关键词结果（已知 v4 观察"搜索不重置分类"，若行为相反记回归）；全程无 500/白屏',
    },
    {
      title: '空搜索直接提交（逆向边界）',
      steps: ['不输入任何内容直接点击搜索按钮', '输入后再清空，再次提交'],
      verify: '实勘：无提交动作或回退全列表；不出现 500/白屏，列表状态可恢复正常操作',
    },
    {
      title: '超长搜索词 256+（逆向）',
      steps: ['在搜索框粘贴 300 字符无意义字符串并提交'],
      verify: '不崩溃：显示空态或 0 结果；输入框无异常行为；提交后页面可继续正常搜索与筛选',
    },
    {
      title: '搜索 XSS/SQL 注入串（逆向）',
      steps: ['搜索 <script>alert(1)</script> 并提交', "再搜索 ' OR 1=1 -- 并提交"],
      verify: '关键词在空态文案中转义显示、无脚本执行；服务端不 500（防注入）；清空后列表恢复正常',
    },
    {
      title: '游客直访 /topics 与 /popular（入口正向）',
      steps: ['地址栏直接打开 /topics', '再直接打开 /popular'],
      verify:
        'Topics 渲染独立聚合视图（h1 Topics、组头 "# 分类名"+绿色计数徽章）；Popular 渲染排行列表（排名徽章+🔥热度+热度条，热度 0 时条宽 0%）——v9 改版后两者均非首页复刻',
    },
    {
      title: '登录页假报错冷验回归（逆向·v7 修复防回归）',
      steps: [
        '清空 localStorage 全新冷开 /login，静置 2s',
        '检查 [data-testid="login-error"] 与页面全部文本',
      ],
      verify:
        '无 Invalid credentials 横幅（v6 旧缺陷见历史截图对照）；未提交任何表单前 error 区不渲染',
      shot: 'matrix/forum/forum-17.png',
    },
    {
      title: '404 页游客态导航完整性（边界）',
      steps: ['访问 /no-such-page-xyz', '检查 navbar/footer 与页面内容'],
      verify:
        'HTTP 200 灰字 404 兜底；navbar/footer 正常可点击回首页；已知 P3：无"返回首页"链接（保持记录）',
      shot: 'matrix/forum/forum-19.png',
    },
    {
      title: '移动端底部 tab 遍历+游客登录条（375px）',
      steps: [
        '375x812 视口打开内容首页',
        '依次点底部 tab Home/Topics/Popular/Profile',
        '观察导航下方 [data-testid="mobile-auth-bar"]，点击 Sign In 进入 /login 后返回首页',
      ],
      verify:
        'bottom-tab-home 落 /topics；各 tab 可达无 404；mobile-auth-bar 游客态显示 Sign In/Sign Up（v8 round4 冷验通过）；桌面导航在 375px 隐藏为已知',
      shot: 'matrix/forum/forum-24-mobile.png',
    },
    {
      title: '游客伪造 token 调写 API（身份交叉·实勘）',
      steps: [
        '真游客态（auth-token 置 null）直接 POST /api/contents 与评论发布接口（不带 Authorization）',
      ],
      verify:
        '实勘：预期 401（写操作需登录/管理员）；若 mock 放行记 P1——该 mock 后端存在任意 token 放行的历史怪癖',
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // xbrowser-marketplace（market.lpm1.top — PluginHub 插件市场）
  // 知识基线：.ui-tester/knowledge/market/selectors.yml v6/v7/v8
  // ═══════════════════════════════════════════════════════════
  'xbrowser-marketplace:平台管理员': [
    {
      title: '快速登录三按钮逐一验证（正向遍历）',
      steps: [
        '打开 /admin（重定向 /admin/login）',
        '依次使用 超级管理员/客服人员/普通用户 三个快速登录按钮（每次登录后登出再试下一个）',
      ],
      verify:
        '超级管理员→/admin/dashboard + toast"已以超级管理员身份登录!"；客服/普通用户的落地页与可见菜单实勘（若与超管同权记越权缺陷）',
      shot: 'matrix/market/market-21-admin-login.png',
    },
    {
      title: '管理后台硬刷新会话保持（正向）',
      steps: [
        '超级管理员登录后 /admin/dashboard 按 F5 硬刷新',
        '直接访问 /admin/content 与系统设置子路由',
      ],
      verify: '刷新不回登录页，子路由直访正常渲染；已知 P3：仪表盘"最后更新"显示原始 ISO 时间戳',
      shot: 'matrix/market/market-21b-admin-dashboard.png',
    },
    {
      title: '内容编辑→还原双向链（正向链）',
      steps: [
        '/admin/content 编辑某条内容，标题追加 [T] 保存',
        '列表确认变更',
        '再次编辑移除 [T] 还原',
      ],
      verify: '两次保存均即时反映在列表；还原后与初值逐字段一致，无残留',
      shot: 'matrix/market/market-21c-admin-content-list.png',
    },
    {
      title: '内容新建→删除回收链（正向·实勘新建入口）',
      steps: [
        '在 /admin/content 探测新建内容入口（v8 记录行操作仅 编辑/删除）',
        '若可新建：创建 [T-DEL] 内容→列表出现→删除→消失',
        '验证入口存在（第九轮已补建插件管理组）',
      ],
      verify: '删除后列表行移除且前台不受污染；插件管理四页（列表/审核/看板/分类）已补建可达',
    },
    {
      title: '分类管理页遍历（正向·实勘）',
      steps: ['进入 内容管理→分类管理', '查看列表与增删改能力'],
      verify:
        '实勘：页面真实渲染（非软回退仪表盘壳）；记录当前 CRUD 能力边界；操作后回前台确认无异常',
    },
    {
      title: '用户与订单四子页遍历（正向）',
      steps: ['依次进入 用户与订单→ 用户/订单/工单/纠纷 四个子页'],
      verify: '四页均真实渲染（表格或空态），无一软回退到仪表盘壳；记录各页数据非空性',
    },
    {
      title: '系统管理三子页遍历（正向）',
      steps: ['依次进入 系统管理→ 角色权限/系统设置/系统日志'],
      verify: '角色权限矩阵完整、系统设置表单带真实值、系统日志有记录行；无软回退壳',
    },
    {
      title: '插件管理页审核链 approve/reject/下架（正向·新功能实勘）',
      steps: [
        'superadmin 登录后进入插件管理页（该 UI 正由开发补建）',
        '查看待审核列表',
        '对 [T] 测试插件执行 approve、对另一条执行 reject',
        '对已上架插件执行下架并回前台对照',
      ],
      verify:
        '实勘：状态流转 pending→approved/rejected 正确且 /developer 视角可见；下架后前台插件列表不再显示该插件（v8 时点管理端无插件菜单，若本次仍无 UI 则维持缺口记录）',
    },
    {
      title: '未知 /admin/* 路由软回退（逆向边界）',
      steps: ['直访 /admin/plugins', '再直访 /admin/not-exist-xyz'],
      verify:
        '实勘（v8 已记录）：HTTP 200 回退仪表盘壳、无 404 页——复核该行为是否仍存在；无崩溃无数据泄露，维持 soft-404 缺口记录',
    },
    {
      title: '错误密码登录管理后台（逆向）',
      steps: ['/admin/login 输入 superadmin / wrong-pass 提交'],
      verify: '报错停留登录页，不进入 dashboard；无半渲染的管理数据泄露',
    },
    {
      title: '客服人员越权探测（身份交叉·实勘）',
      steps: [
        '以客服人员快速登录',
        '尝试直访系统管理子页与（新建的）插件管理页',
        '尝试执行编辑/删除写操作',
      ],
      verify: '实勘：客服应仅只读/受限——无权限处应 403 或按钮隐藏；若可执行管理写操作记越权缺陷',
    },
    {
      title: '游客与普通用户 token 调管理 API（身份交叉·逆向）',
      steps: [
        '无 Authorization 请求 GET /api/admin/stats、/api/admin/users',
        '用前台普通用户（markettest0912@t.com / Test1234!）的 JWT 带 Bearer 重复请求',
      ],
      verify:
        '无 token 401；普通用户 403 不泄露任何管理数据（对照 fullstack preset 的 Permission denied 行为，实勘 market 后端）',
    },
  ],
  'xbrowser-marketplace:开发者': [
    {
      title: '注册→登录→发布插件完整链（正向闭环）',
      steps: [
        '/register 注册新账号（placeholder 定位 Choose a username / Enter your email / Choose a password）',
        '提交后跳 /login，登录新号（React 受控输入需 nativeInputValueSetter 注入）',
        '/publish 填全 7 字段（Plugin Name/Slug/Description/Repository URL/Homepage URL/NPM Package/License）',
        '点 Publish Plugin 提交',
      ],
      verify:
        '提交成功有明确反馈（toast/跳转/pending 徽章，实勘具体形态）；新插件不出现在前台列表（待审核）',
      shot: 'matrix/market/market-20d-publish-form.png',
    },
    {
      title: '发布表单逐必填缺失（逆向）',
      steps: ['依次仅留空 Name / Slug / Description 各提交一次（其余字段填全）'],
      verify:
        '每次均被 HTML5 required 拦截（原生"请填写此字段。"，v8 已验 Name 分支），停留 /publish、无 toast、不产生插件数据',
      shot: 'matrix/market/market-20d-publish-form.png',
    },
    {
      title: 'Slug 非法字符（逆向·实勘）',
      steps: ['/publish Slug 分别填 "Auth Guard!!"（空格+叹号）与纯中文，其余字段合法提交'],
      verify:
        '实勘：预期被校验拒绝或自动 slugify 规范化；若入库产生含空格/中文 slug 记缺陷（后续 /plugins/<slug> URL 不可达）',
    },
    {
      title: 'Slug 与现有插件冲突（逆向）',
      steps: ['/publish 正常填表但 Slug 填 auth-guard 提交'],
      verify: '实勘：预期 409/唯一约束报错且表单保留；若成功创建重复 slug 记 P1（前台路由冲突）',
    },
    {
      title: '超长 256+ 名称与描述（逆向）',
      steps: ['Plugin Name 填 256+ 字符、Description 填 2000+ 字符提交'],
      verify: '被校验拒绝或安全截断；提交后 /publish 与前台列表均不破版、无 500',
    },
    {
      title: 'HTML 注入插件名（逆向）',
      steps: ['Plugin Name 填 <script>alert(1)</script>，其余字段合法，提交'],
      verify:
        '无 alert 执行；实勘是否创建成功——若成功，确认卡片/列表转义显示并记录脏数据；若拒绝，确认提示明确',
    },
    {
      title: '/developer 我的插件列表状态（正向·角色实勘）',
      steps: ['发布插件后点导航 [data-testid="nav-developer-button"] 进 /developer'],
      verify:
        '实勘：已知普通用户被静默弹回 /login（P2 无权限提示）——若本次开发者角色可见列表，核对自己插件与 pending/approved 状态显示；若仍弹回则维持缺口记录',
      shot: 'matrix/market/market-20-developer-guard-redirect-login.png',
    },
    {
      title: '双击重复提交发布（逆向）',
      steps: ['/publish 填全合法表单后快速双击 Publish Plugin'],
      verify: '仅创建 1 条插件记录（实勘 API 幂等性），无重复 slug/重复行',
    },
    {
      title: '伪造 Bearer token 调发布 API（逆向·实勘）',
      steps: ['登出态以 Authorization: Bearer fake123 直接 POST /api/plugins（合法 JSON 体）'],
      verify:
        '实勘：预期 401；若 mock 放行创建记 P1 认证旁路（该 mock 曾自动写入 Demo User token，重点勘鉴权层）',
    },
    {
      title: '游客直访 /publish 与 /developer（身份交叉·实勘）',
      steps: ['真登出态（清 localStorage 后）分别直访 /publish 与 /developer'],
      verify:
        '实勘：预期均引导/弹回登录（/developer 已知静默弹 /login 且无提示）；记录 /publish 游客态实际行为（v8 时点未勘），无表单提交成功',
    },
    {
      title: 'demo 预填凭据正向重登（v7 修复复验）',
      steps: [
        '/login 保留预填 demo@biomimic.app/demo123 直接点 [data-testid="login-submit"]',
        '观察落地页与导航身份',
      ],
      verify:
        '登录成功落地 /plugins，导航显示 demo + Sign Out；旧"Invalid credentials"缺陷不复现（v4 WARNING 已过时）',
      shot: 'matrix/market/market-15b-login-page.png',
    },
  ],
  'xbrowser-marketplace:用户/浏览器用户': [
    {
      title: '安装→刷新按钮复位→下载量持久链（v6 复验深化）',
      steps: [
        '登录态详情页点 [data-testid="install-button"]（记当前下载量 N）',
        '确认按钮变 Installed ✓（绿色 disabled）+ toast Installed successfully',
        'F5 刷新回详情页',
        '再次 Install',
      ],
      verify:
        '首次点击 N→N+1；刷新后按钮复位 Install Plugin 但下载量保持 N+1（入库）；重装再 +1（累计不重置）',
      shot: 'matrix/market/market-05-install-click.png',
    },
    {
      title: '安装→卸载→重装下载量单调链（正向闭环）',
      steps: [
        '安装 auth-guard 后打开 /installed（导航 我的安装）确认条目',
        '点 [data-testid="uninstall-auth-guard"] 卸载',
        '回详情页重装 → 再回 /installed 核对',
      ],
      verify:
        '卸载后条目立即消失且 downloads 不回退；重装后条目复现（0→1）、downloads 净 +2——安装计数只增不减为断言核心',
    },
    {
      title: '我的安装空态 Browse CTA（正向边界）',
      steps: ['卸载全部已装插件后打开 /installed', '点击空态页 Browse Plugins CTA'],
      verify: '显示 No installs yet + Browse Plugins CTA；点击 CTA 可跳回插件列表（实勘链接目标）',
    },
    {
      title: '评论提交失败真实反馈（v6 复验·已知服务端 500）',
      steps: [
        '详情页评论表单选 5 星 + 填标题 + 填正文',
        '提交（Submit Review 无 testid，runtime-tag data-uitest 后真点）',
      ],
      verify:
        '表单保留不清空 + [data-testid="review-error"] 红框 Failed to submit review + Reviews 计数不变（旧"静默假装成功"已修；服务端 500 {success:false} 为已知残留，成功分支不可达）',
      shot: 'matrix/market/market-06-review-filled.png',
    },
    {
      title: '评论无星级提交被拒（逆向·实勘）',
      steps: ['只填标题与正文、不点任何星级，提交'],
      verify:
        '实勘：预期 rating 必填校验（前端禁用/后端 400）；若以 0 星入库或 500 静默，记录实际行为与缺陷级别',
    },
    {
      title: '评论超长文本边界（逆向·实勘）',
      steps: ['评论正文输入 2000+ 字符提交'],
      verify:
        '实勘：被截断/校验拒绝，或因服务端 500 走失败红框分支；无论何分支不得 XSS/破版，表单行为与失败反馈用例一致',
    },
    {
      title: '搜索+分类 chip 组合语义（正向深化·实勘）',
      steps: [
        '搜索 auth 得 Found 1 results',
        '依次点击结果页下方 All / wrench工具 / sparklesAI chips',
        '清空关键词回 All',
      ],
      verify:
        '实勘：chip 是否参与结果过滤（已知 chip 状态从侧栏泄漏高亮、AI 分类 0 匹配）——记录组合矩阵实际行为，结果集与视觉高亮一致即通过',
      shot: 'matrix/market/market-12.png',
    },
    {
      title: '分类筛选工具→0→All 往返（v6 行为复核）',
      steps: ['首页侧栏点 wrench工具 分类', '观察列表与空态', '点回 All Plugins'],
      verify:
        '工具分类 2→0 卡 + active 高亮 + No plugins found 空态；All 恢复 2 卡（v6 已验 PASS；AI 分类同 0 为已知 payload 无 category 字段）',
    },
    {
      title: '不存在插件 slug 直访（逆向·实勘）',
      steps: ['地址栏直接打开 /plugins/not-exist-slug-xyz'],
      verify:
        '实勘：预期 404/空态兜底而非白屏；对照 POST /api/plugins/not-exist-slug 的 404 行为，记录 UI 层实际形态',
    },
    {
      title: '删除他人评论 API 越权（IDOR·身份交叉·实勘）',
      steps: ['以自己 JWT DELETE /api/plugins/auth-guard/reviews/<伪造id>，再以他人资源 id 重试'],
      verify:
        '实勘：预期 403/404 且无副作用（评论区服务端写入当前 500，可能无可操作真实 id——记录 API 鉴权层实际响应码）',
    },
    {
      title: '普通用户 token 调管理 API（身份交叉·逆向）',
      steps: [
        '以普通用户 JWT 请求 GET /api/admin/stats、/api/admin/users',
        'UI 侧确认前台导航无任何管理入口',
      ],
      verify:
        'API 403 不泄露数据；UI 无 /admin 入口（管理端为独立登录体系，普通用户 token 不可复用为管理员身份——实勘确认）',
    },
  ],
  'xbrowser-marketplace:游客（未登录）': [
    {
      title: '真游客态工艺链（前置·自动登录怪癖）',
      steps: ['eval 清空 localStorage + sessionStorage + cookie 后 reload 首页'],
      verify:
        '导航显示 Login（app 首载会自动写入 Demo User auth-token，清空后不再写入——v8 gotcha）；本用例为后续游客用例统一前置',
      shot: 'matrix/market/market-10.png',
    },
    {
      title: '游客访问 /installed 引导卡（v8 确认）',
      steps: ['真游客态直访 /installed'],
      verify:
        '不跳转 /login：页内渲染引导卡 Sign in to see your installed plugins + "Your install history is tied to your account." + Sign In 紫钮；导航身份为 Login（旧断言"401 跳登录"已被该行为取代）',
    },
    {
      title: '游客点 Install（实勘·v6 后行为）',
      steps: [
        '真游客态在详情页点 [data-testid="install-button"]',
        '观察按钮/toast/下载量/URL 四要素',
      ],
      verify:
        '实勘：预期 401 反馈或登录引导（旧"零反馈不鉴权"可能随 v6 反馈修复而变化，见历史截图对照）；下载量不得增加、不得产生归属不明的安装记录',
      shot: 'matrix/market/market-15.png',
    },
    {
      title: '游客评论表单可见性（身份交叉·实勘）',
      steps: ['真游客态打开详情页滚动至评论表单'],
      verify:
        '实勘：market 是否与 forum 一致隐藏表单/灰条引导，或仍渲染可提交表单——若可提交，预期 401 失败红框（对照评论失败反馈用例分支）；记录实际形态',
      shot: 'matrix/market/market-14.png',
    },
    {
      title: '游客直访 /publish 与 /developer（身份交叉）',
      steps: ['真游客态分别直访 /publish、/developer'],
      verify:
        '均引导/弹回登录（/developer 已知静默弹 /login 为 P2 无提示——游客态复验同一行为；/publish 游客行为实勘）；无插件表单提交成功',
    },
    {
      title: '游客调管理 API（身份交叉·逆向）',
      steps: ['无 Authorization 请求 GET /api/admin/stats'],
      verify: '401，响应体无任何统计/用户数据（管理端为独立登录体系）',
    },
    {
      title: '伪造 Bearer token 调安装 API（逆向·实勘）',
      steps: ['Authorization: Bearer fake123 直接 POST /api/plugins/auth-guard/install'],
      verify:
        '实勘：预期 401/403；若 mock 放行记 P1 认证旁路并核对安装记录归属（mock 自动登录 token 为已知风险面）',
    },
    {
      title: '分页参数越界（逆向·实勘）',
      steps: ['GET /api/plugins?page=999', 'GET /api/plugins?page=-1 与 page=abc 两组对照'],
      verify:
        '实勘：预期空数组 200 或 400 校验错，不 500 不崩；当前无分页 UI 则记录 API 层结论即可',
    },
    {
      title: '搜索注入串（逆向）',
      steps: ["搜索框输入 ' OR 1=1 -- 提交", '再输入 <script>alert(1)</script> 提交'],
      verify:
        '显示 No results for "<原文>" 转义空态（或实勘意外命中并记录），无脚本执行、服务端不 500；搜索框内容可清空恢复',
    },
    {
      title: '移动端底部 tab 全遍历（375px·正向）',
      steps: [
        '375x812 视口打开首页',
        '依次点 bottom-tab-discover / bottom-tab-plugins / bottom-tab-categories / bottom-tab-search / bottom-tab-my / bottom-tab-我的安装',
      ],
      verify:
        '各 tab 全部可达对应路由（/plugins、/plugins/list、categories、search、/developer、/installed），激活态蓝色高亮；桌面导航在 375px 隐藏为已知',
      shot: 'matrix/market/market-22-mobile-home.png',
    },
  ],
}
