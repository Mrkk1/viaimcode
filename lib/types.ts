// 定义共享网页的数据模型
export interface SharedWebsite {
  id: string;        // 唯一标识符用于分享链接
  userId: string;    // 创建者ID
  title: string;     // 网站标题
  description: string; // 网站描述
  htmlContent: string; // 完整的 HTML 内容
  prompt: string;    // 生成网站时使用的提示
  createdAt: Date;   // 创建时间
  thumbnailUrl: string; // 网页预览图URL
}

// 定义用户模型
export interface User {
  id: string;
  username: string;
  password?: string; // 仅在创建/验证时使用，不会返回给前端
  createdAt: Date;
}

// 登录请求数据
export interface LoginData {
  username: string;
  password: string;
}

// 注册请求数据
export interface RegisterData extends LoginData {
  confirmPassword: string;
} 