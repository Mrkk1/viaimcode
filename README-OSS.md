# 阿里云OSS图片存储配置指南

## 背景

为了解决生产环境中图片存储和加载的问题，我们将网站生成的图片保存到阿里云OSS对象存储中，这样可以确保：

1. 图片在服务器重启后依然可访问
2. 多实例部署时图片资源可共享
3. 无状态容器环境中持久化存储图片
4. 提供更快的图片加载速度

## 配置步骤

### 1. 创建阿里云OSS存储空间

1. 登录[阿里云控制台](https://oss.console.aliyun.com/)
2. 创建一个新的Bucket（存储空间）
3. 设置适当的读写权限（建议设置为"公共读，私有写"）
4. 记录Bucket名称和所在区域

### 2. 创建AccessKey

1. 在阿里云控制台找到"AccessKey管理"
2. 创建一个新的AccessKey（或使用已有的）
3. 保存AccessKey ID和AccessKey Secret

### 3. 配置环境变量

在项目根目录创建`.env.local`文件（本地开发）或在生产环境设置以下环境变量：

```
# 阿里云OSS配置
ALICLOUD_ACCESS_KEY_ID=你的AccessKey_ID
ALICLOUD_ACCESS_KEY_SECRET=你的AccessKey_Secret
ALICLOUD_OSS_BUCKET=你的Bucket名称
ALICLOUD_OSS_REGION=你的Bucket所在区域 (例如: oss-cn-hangzhou)
# 如果使用自定义域名，可以设置endpoint替代region
# ALICLOUD_OSS_ENDPOINT=你的自定义域名.example.com
```

### 4. 跨域资源共享(CORS)配置

为了允许前端网站访问OSS中的图片，需要配置CORS规则：

1. 在阿里云OSS控制台中选择你的Bucket
2. 点击"权限管理" > "跨域设置"
3. 添加以下规则：
   - 来源: 填写你的网站域名（例如`https://your-website.com`）或使用`*`允许所有域名
   - 允许Methods: 勾选GET
   - 允许Headers: 填写`*`
   - 缓存时间: 根据需要设置（例如86400秒）
   - 是否允许携带Cookie: 根据需要选择

### 5. 重启服务

配置完成后，重启你的应用服务以使环境变量生效。

## 工作原理

- 当用户保存网站时，系统会自动将截图上传到阿里云OSS
- 图片URL会保存在数据库中，用于后续加载
- 当用户浏览网站列表或查看详情时，图片将直接从阿里云OSS加载

## 故障排查

如果图片无法正常上传或显示，请检查：

1. 环境变量是否正确配置
2. OSS的存储空间是否有足够的访问权限
3. 网络连接是否正常
4. 服务器日志中是否有相关错误信息

## 本地开发模式

在本地开发环境中:
- 默认情况下图片会保存在`/public/uploads`目录下
- 如需在本地使用OSS，可将`NODE_ENV`设置为`production`或在上传时指定`useOss`参数为`true` 