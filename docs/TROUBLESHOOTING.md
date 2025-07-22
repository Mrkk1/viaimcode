# 故障排除指南

## 常见问题和解决方案

### 🐳 Docker 相关问题

#### 1. Docker Compose 版本警告

**问题**: 看到警告 "the attribute `version` is obsolete"

**原因**: 新版本的Docker Compose不再需要version字段

**解决方案**: 这是一个无害的警告，不影响功能。我们已经在最新版本中移除了version字段。

#### 2. 数据库连接失败

**问题**: 执行 `docker exec -i localsite-ai-db mysql -u root -p` 时出现 "Access denied"

**原因**: 使用了错误的密码。Docker容器中的MySQL密码是在docker-compose.yml中设置的。

**解决方案**:
```bash
# 使用正确的密码连接
docker exec -it localsite-ai-db mysql -u root -plocalsite_password

# 或者查看数据库状态
docker exec -it localsite-ai-db mysql -u root -plocalsite_password -e "SHOW DATABASES;"
```

#### 3. 数据库自动初始化

**问题**: 担心数据库表没有创建

**原因**: Docker会在首次启动时自动执行SQL初始化文件

**解决方案**: 
- 数据库会自动导入 `localsite_ai_2025-07-22_143026.sql` 文件
- 可以通过以下命令验证表是否创建：
```bash
docker exec -it localsite-ai-db mysql -u root -plocalsite_password localsite_ai -e "SHOW TABLES;"
```

### 🔑 API 配置问题

#### 1. 必需的API密钥

**问题**: 应用功能不完整或报错

**原因**: 项目需要特定的API密钥才能正常工作

**解决方案**: 在 `.env.local` 中配置以下密钥：

```env
# 网站生成 (必需)
DEEPSEEK_API_KEY=your_deepseek_key

# PPT生成 (必需)  
MOONSHOT_API_KEY=your_moonshot_key

# 图片存储 (必需)
ALICLOUD_OSS_ENDPOINT=oss-xxx
ALICLOUD_ACCESS_KEY_ID=xxxx
ALICLOUD_ACCESS_KEY_SECRET=xxxx
ALICLOUD_OSS_BUCKET=xxxx
```

**获取地址**:
- DeepSeek: https://platform.deepseek.com/
- Moonshot: https://platform.moonshot.cn/
- 阿里云OSS: https://oss.console.aliyun.com/

#### 2. 阿里云OSS配置

**问题**: 图片上传失败或缩略图生成失败

**原因**: 阿里云OSS配置不完整或错误

**解决方案**:
1. 确保所有OSS配置项都已填写
2. 检查OSS Bucket权限设置
3. 验证AccessKey权限

### 🔧 环境配置问题

#### 1. 环境变量不生效

**问题**: 配置了环境变量但应用中不生效

**解决方案**:
```bash
# Docker部署时，确保使用--env-file参数
docker-compose --env-file .env.local up -d

# 或者重启容器
docker-compose restart app
```

#### 2. 端口冲突

**问题**: 端口3000已被占用

**解决方案**:
1. 停止占用端口的进程：
```bash
lsof -ti:3000 | xargs kill -9
```

2. 或者修改docker-compose.yml中的端口映射：
```yaml
ports:
  - "3001:3000"  # 使用3001端口
```

### 📱 应用使用问题

#### 1. Token认证问题 (localhost vs IP访问)

**问题**: 使用 `http://localhost:3000` 登录后token不认，必须用IP地址才能正常使用

**原因**: Cookie的域名设置问题，导致不同访问方式下cookie无法正确传递

**解决方案**: 
这个问题已在最新版本中修复。如果仍遇到此问题：

1. **清除浏览器cookie**:
   - 打开浏览器开发者工具 (F12)
   - 进入 Application/应用 → Storage/存储 → Cookies
   - 删除所有相关cookie

2. **重启应用容器**:
```bash
docker-compose restart app
```

3. **使用一致的访问方式**:
   - 始终使用 `http://localhost:3000`
   - 或始终使用IP地址访问
   - 不要在同一浏览器中混用两种方式

#### 2. 无法注册/登录

**问题**: 用户系统不工作

**可能原因**:
- 数据库连接问题
- JWT_SECRET未配置

**解决方案**:
1. 检查数据库连接
2. 确保JWT_SECRET已配置
3. 查看应用日志：
```bash
docker-compose logs app
```

#### 3. 网站生成失败

**问题**: AI生成网站功能不工作

**可能原因**:
- DeepSeek API Key未配置或无效
- API配额不足

**解决方案**:
1. 检查DeepSeek API Key配置
2. 验证API余额和配额
3. 查看错误日志

#### 4. PPT生成失败

**问题**: PPT生成功能不工作

**可能原因**:
- Moonshot API Key未配置或无效
- API配额不足

**解决方案**:
1. 检查Moonshot API Key配置
2. 验证API余额和配额
3. 查看错误日志

### 🛠️ 调试工具

#### 查看服务状态
```bash
# 查看所有容器状态
docker-compose ps

# 查看应用日志
docker-compose logs app

# 查看数据库日志
docker-compose logs db

# 实时查看日志
docker-compose logs -f app
```

#### 数据库调试
```bash
# 连接数据库
docker exec -it localsite-ai-db mysql -u root -plocalsite_password localsite_ai

# 查看用户表
docker exec -it localsite-ai-db mysql -u root -plocalsite_password localsite_ai -e "SELECT * FROM users LIMIT 5;"

# 查看项目表
docker exec -it localsite-ai-db mysql -u root -plocalsite_password localsite_ai -e "SELECT id, title, status FROM projects LIMIT 5;"
```

#### 网络调试
```bash
# 测试应用响应
curl -I http://localhost:3000

# 测试API端点
curl http://localhost:3000/api/auth/me

# 检查端口占用
netstat -tulpn | grep :3000
```

#### Cookie调试
```bash
# 测试登录并查看cookie设置
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 查看cookie文件内容
cat cookies.txt
```

### 📞 获取帮助

如果以上解决方案都无法解决您的问题：

1. **查看日志**: 先查看详细的错误日志
2. **搜索Issue**: 在GitHub仓库中搜索相似问题
3. **提交Issue**: 创建新的Issue并包含：
   - 详细的错误描述
   - 重现步骤
   - 环境信息（OS、Docker版本等）
   - 相关日志输出

4. **联系支持**: 发送邮件至 support@localsite-ai.com

---

💡 **提示**: 大多数问题都与API密钥配置和环境变量设置有关。请确保按照文档正确配置所有必需的环境变量。 