# 安全政策

## 支持的版本

我们为以下版本提供安全更新：

| 版本 | 支持状态 |
| --- | --- |
| 0.3.x | ✅ |
| 0.2.x | ❌ |
| < 0.2.0 | ❌ |

## 报告安全漏洞

如果您发现了安全漏洞，请**不要**通过公开的 GitHub Issues 报告。相反，请通过以下方式私下联系我们：

### 联系方式

- **邮箱**: security@viaimcode.ai
- **GPG公钥**: [下载公钥](./security/gpg-public-key.txt)

### 报告格式

请在邮件中包含以下信息：

1. **漏洞描述**: 详细描述安全问题
2. **影响范围**: 哪些版本受到影响
3. **复现步骤**: 如何重现这个问题
4. **潜在影响**: 可能造成的安全风险
5. **建议修复**: 如果有修复建议请一并提供

### 响应时间

- **确认收到**: 24小时内
- **初步评估**: 72小时内
- **详细回复**: 7天内
- **修复发布**: 根据严重程度，1-30天内

## 安全最佳实践

### 部署安全

#### 环境变量保护
```bash
# 永远不要将敏感信息提交到代码库
# 使用环境变量存储敏感配置
export DEEPSEEK_API_KEY="your-secret-key"
export MOONSHOT_API_KEY="your-secret-key"
export DB_PASSWORD="your-database-password"
```

#### 数据库安全
- 使用强密码
- 限制数据库访问权限
- 启用SSL连接
- 定期备份数据

#### API密钥管理
- 定期轮换API密钥
- 使用最小权限原则
- 监控API使用情况
- 设置使用限额

### 网络安全

#### HTTPS配置
```nginx
# Nginx配置示例
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # 安全头配置
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

#### 防火墙配置
```bash
# 只开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3306/tcp from 127.0.0.1  # MySQL (仅本地)
```

### 应用安全

#### 输入验证
- 验证所有用户输入
- 使用参数化查询防止SQL注入
- 对输出进行适当编码

#### 身份认证
- 实施强密码策略
- 支持多因素认证
- 会话管理安全

#### 权限控制
- 实施最小权限原则
- 定期审查用户权限
- 记录敏感操作日志

## 已知安全注意事项

### AI API密钥
- API密钥具有高敏感性
- 不要在客户端代码中暴露
- 定期检查密钥使用情况

### 文件上传
- 限制上传文件类型
- 扫描恶意内容
- 设置文件大小限制

### 数据隐私
- 遵循数据保护法规
- 实施数据加密
- 提供数据删除功能

## 安全更新通知

我们会通过以下渠道发布安全更新：

- **GitHub Security Advisories**
- **项目官网公告**
- **邮件列表通知**
- **社交媒体发布**

## 安全审计

我们定期进行安全审计：

- **代码安全扫描**: 每次发布前
- **依赖漏洞检查**: 每周自动化检查
- **渗透测试**: 每季度一次
- **第三方安全审计**: 每年一次

## 漏洞披露政策

### 协调披露
我们遵循负责任的漏洞披露原则：

1. **私下报告**: 首先私下联系我们
2. **协调修复**: 与我们合作制定修复计划
3. **公开披露**: 修复发布后公开漏洞详情

### 致谢
我们会在以下情况下公开致谢报告者：

- 报告者同意公开致谢
- 漏洞确实存在且有效
- 按照负责任披露原则报告

## 安全资源

### 相关文档
- [OWASP安全指南](https://owasp.org/)
- [Node.js安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [Next.js安全指南](https://nextjs.org/docs/going-to-production#security-headers)

### 安全工具
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - 依赖漏洞检查
- [Snyk](https://snyk.io/) - 安全漏洞扫描
- [OWASP ZAP](https://www.zaproxy.org/) - Web应用安全测试

## 联系信息

如有任何安全相关问题，请联系：

- **安全团队邮箱**: security@viaimcode.ai
- **项目维护者**: maintainer@viaimcode.ai
- **紧急联系**: emergency@viaimcode.ai

---

感谢您帮助保持 viaimCode AI 的安全！🔒 