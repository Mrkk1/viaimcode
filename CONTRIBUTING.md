# 贡献指南

感谢您对 viaimCode AI 项目的关注！我们欢迎任何形式的贡献，包括但不限于：

- 🐛 Bug 报告
- 💡 功能建议
- 📖 文档改进
- 🔧 代码贡献
- 🌐 国际化支持

## 🚀 快速开始

### 开发环境准备

1. **Fork 项目**
   - 点击 GitHub 页面右上角的 "Fork" 按钮
   - 克隆你 Fork 的仓库到本地

```bash
git clone https://github.com/你的用户名/LocalSite-ai.git
cd LocalSite-ai
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env.local
# 编辑 .env.local 文件，填入必要的配置
```

4. **启动开发服务器**
```bash
npm run dev
```

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 示例
```bash
git commit -m "feat: 添加PPT模板选择功能"
git commit -m "fix: 修复移动端响应式布局问题"
git commit -m "docs: 更新API文档"
```

## 🔄 开发流程

1. **创建功能分支**
```bash
git checkout -b feature/你的功能名
```

2. **进行开发**
   - 编写代码
   - 添加测试（如适用）
   - 更新文档

3. **提交代码**
```bash
git add .
git commit -m "feat: 你的功能描述"
```

4. **推送到远程仓库**
```bash
git push origin feature/你的功能名
```

5. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写详细的描述
   - 等待代码审查

## 🧪 代码质量

### 代码风格
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码

### 组件规范
- 使用函数式组件和 Hooks
- 组件名使用 PascalCase
- 文件名使用 kebab-case

### API 规范
- 使用 Next.js App Router
- API 路由返回统一的响应格式
- 适当的错误处理

## 🐛 Bug 报告

提交 Bug 时，请包含：

1. **问题描述**：清晰描述遇到的问题
2. **复现步骤**：详细的操作步骤
3. **预期行为**：你期望发生什么
4. **实际行为**：实际发生了什么
5. **环境信息**：
   - 操作系统
   - 浏览器版本
   - Node.js 版本

## 💡 功能建议

提交功能建议时，请包含：

1. **功能描述**：详细描述建议的功能
2. **使用场景**：什么情况下会用到这个功能
3. **期望效果**：这个功能能解决什么问题
4. **实现思路**：如果有的话，简述可能的实现方式

## 📚 文档贡献

文档改进包括：
- 修正错别字
- 改进说明的清晰度
- 添加示例
- 翻译文档

## 🌐 国际化

我们欢迎多语言支持：
- 添加新的语言包
- 改进现有翻译
- 修正翻译错误

## 📞 联系方式

如果你有任何问题，可以通过以下方式联系我们：

- 创建 GitHub Issue
- 发送邮件到项目维护者
- 加入我们的讨论群

## 🎉 致谢

感谢所有为这个项目做出贡献的开发者！

---

再次感谢您的贡献！🙏 