# 贡献指南

感谢您对 LocalSite AI 项目的兴趣！我们欢迎各种形式的贡献。

## 🚀 快速开始

### 开发环境设置

1. **Fork 并克隆项目**
```bash
git clone https://github.com/your-username/LocalSite-ai.git
cd LocalSite-ai
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env.local
# 编辑 .env.local 填入必要配置
```

4. **启动开发服务器**
```bash
npm run dev
```

## 📋 贡献类型

我们欢迎以下类型的贡献：

- 🐛 **Bug 修复**
- ✨ **新功能开发**
- 📚 **文档改进**
- 🎨 **UI/UX 优化**
- ⚡ **性能优化**
- 🧪 **测试覆盖**
- 🌐 **国际化支持**

## 🔧 开发规范

### 代码规范

- 使用 **TypeScript** 进行开发
- 遵循 **ESLint** 和 **Prettier** 规则
- 组件使用 **函数式组件** 和 **React Hooks**
- 使用 **Tailwind CSS** 进行样式开发
- API 路由遵循 **Next.js App Router** 规范

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 示例

```bash
feat(ppt): 添加PPT模板自定义功能
fix(auth): 修复用户登录状态异常问题
docs(readme): 更新安装指南
```

### 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/xxx`: 功能分支
- `fix/xxx`: 修复分支
- `docs/xxx`: 文档分支

## 📝 开发流程

### 1. 创建 Issue

在开始开发前，请先创建或选择一个 Issue：

- 描述问题或功能需求
- 添加适当的标签
- 分配给自己

### 2. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-fix-name
```

### 3. 开发

- 编写代码
- 添加必要的测试
- 确保代码通过 lint 检查
- 更新相关文档

### 4. 测试

```bash
# 类型检查
npm run type-check

# 代码格式检查
npm run lint

# 构建测试
npm run build
```

### 5. 提交

```bash
git add .
git commit -m "feat: 添加新功能描述"
```

### 6. 推送并创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

## 🎯 Pull Request 指南

### PR 标题

使用清晰的标题描述你的更改：
```
feat: 添加PPT导出为PDF功能
fix: 修复移动端布局问题
docs: 更新API文档
```

### PR 描述

请在 PR 描述中包含：

- **变更概述**: 简要描述所做的更改
- **相关 Issue**: 引用相关的 Issue 编号
- **测试说明**: 如何测试这些更改
- **截图/GIF**: 对于 UI 更改，提供视觉证明
- **Breaking Changes**: 如果有破坏性更改，请明确说明

### PR 模板

```markdown
## 变更概述
简要描述此PR的目的和内容

## 相关Issue
Closes #123

## 变更类型
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## 测试
- [ ] 已添加测试用例
- [ ] 所有测试通过
- [ ] 手动测试通过

## 截图
（如适用）

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已进行自我代码审查
- [ ] 已添加必要的注释
- [ ] 已更新相关文档
```

## 🐛 Bug 报告

报告 Bug 时请包含：

- **环境信息**: OS、浏览器、Node.js 版本等
- **重现步骤**: 详细的重现步骤
- **期望行为**: 期望发生什么
- **实际行为**: 实际发生了什么
- **错误信息**: 完整的错误日志
- **截图**: 如果适用

## 💡 功能请求

提出新功能时请包含：

- **功能描述**: 详细描述所需功能
- **使用场景**: 为什么需要这个功能
- **期望行为**: 功能应该如何工作
- **替代方案**: 是否考虑过其他解决方案

## 📚 文档贡献

文档改进包括：

- 修正拼写和语法错误
- 改进现有文档的清晰度
- 添加缺失的文档
- 翻译文档到其他语言
- 添加代码示例

## 🎨 UI/UX 贡献

UI/UX 改进包括：

- 改善用户界面设计
- 优化用户体验流程
- 提升响应式设计
- 改进可访问性
- 添加动画和交互效果

## 🚀 发布流程

项目维护者会定期发布新版本：

1. 合并所有准备好的功能和修复
2. 更新版本号和 CHANGELOG
3. 创建 GitHub Release
4. 部署到生产环境

## 🤝 社区准则

请遵守我们的社区准则：

- 友好和尊重他人
- 建设性地提供反馈
- 帮助新贡献者
- 保持专业和包容的态度

## 📞 获取帮助

如果您需要帮助：

- 📧 发送邮件到：support@localsite-ai.com
- 💬 加入我们的讨论区
- 🐛 在 GitHub Issues 中提问

## 🙏 致谢

感谢所有为 LocalSite AI 做出贡献的开发者！

---

再次感谢您的贡献！🎉 