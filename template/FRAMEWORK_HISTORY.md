# 框架文件修改历史

本文件记录所有框架层代码的修改历史。

## 框架层路径

- `src/shared/core/`
- `src/server/core/`
- `src/server/entries/`
- `src/server/test-utils/`
- `src/server/index.ts`
- `src/client/services/`

## 使用说明

1. **初始化基准**: 运行 `npm run framework:init` 为所有框架文件添加基准 Hash
2. **修改框架文件**: 在文件顶部添加 `@framework-modify`、`@reason` 和 `@impact` 注释
3. **更新基准**: 运行 `npm run framework:update` 更新基准 Hash 并记录到本文件

## 修改记录

| 日期 | 文件 | 基准变更 | 修改原因 | 影响范围 | 审批人 |
|------|------|----------|----------|----------|--------|
