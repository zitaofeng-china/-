# Netlify 部署指南

## 快速部署步骤

### 方法一：通过 Netlify Dashboard（推荐）

1. **准备代码仓库**
   - 将代码推送到 GitHub、GitLab 或 Bitbucket
   - 确保 `C` 目录是项目的根目录

2. **登录 Netlify**
   - 访问 [https://www.netlify.com/](https://www.netlify.com/)
   - 使用 GitHub/GitLab/Bitbucket 账号登录

3. **创建新站点**
   - 点击 "Add new site" → "Import an existing project"
   - 选择你的代码仓库
   - 选择要部署的分支（通常是 `main` 或 `master`）

4. **配置构建设置**
   - **Base directory**: `C` （如果项目在 C 目录下）
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `C/dist` （如果项目在 C 目录下）
   
   或者如果直接在项目根目录：
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`

5. **部署**
   - 点击 "Deploy site"
   - 等待构建完成

### 方法二：通过 Netlify CLI

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **进入项目目录**
   ```bash
   cd C
   ```

4. **初始化 Netlify**
   ```bash
   netlify init
   ```
   - 选择 "Create & configure a new site"
   - 输入站点名称（或使用默认）
   - 选择团队（如果有）

5. **部署**
   ```bash
   # 测试部署（预览）
   netlify deploy
   
   # 生产部署
   netlify deploy --prod
   ```

### 方法三：拖拽部署（最简单）

1. **构建项目**
   ```bash
   cd C
   npm install
   npm run build
   ```

2. **拖拽部署**
   - 访问 [https://app.netlify.com/drop](https://app.netlify.com/drop)
   - 将 `C/dist` 文件夹拖拽到页面中
   - 等待上传和部署完成

## 重要配置说明

### netlify.toml
项目已包含 `netlify.toml` 配置文件，包含：
- 构建命令和输出目录
- SPA 路由重定向配置
- Node.js 版本设置

### _redirects 文件
`public/_redirects` 文件确保所有路由都正确重定向到 `index.html`，这对于 React SPA 应用很重要。

## 环境变量（如果需要）

如果项目需要环境变量，可以在 Netlify Dashboard 中设置：
1. 进入站点设置
2. 点击 "Environment variables"
3. 添加所需的变量

## 自定义域名

1. 在 Netlify Dashboard 中进入站点设置
2. 点击 "Domain management"
3. 添加自定义域名
4. 按照提示配置 DNS

## 持续部署

如果使用 Git 仓库连接，Netlify 会自动：
- 监听代码推送
- 自动触发构建
- 部署新版本

## 构建优化建议

- 确保 `package.json` 中的构建脚本正确
- 检查 `vite.config.ts` 中的构建配置
- 确保所有依赖都已正确安装

## 故障排除

### 构建失败
- 检查 Node.js 版本（建议使用 Node 18）
- 查看构建日志中的错误信息
- 确保所有依赖都已安装

### 路由不工作
- 确保 `_redirects` 文件在 `public` 目录下
- 检查 `netlify.toml` 中的重定向配置

### 资源加载失败
- 检查 `vite.config.ts` 中的 `base` 配置（如果需要子路径部署）

## 支持

如有问题，请查看：
- [Netlify 文档](https://docs.netlify.com/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)

