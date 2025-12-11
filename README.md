# 图像编辑器

一个功能强大的在线图像编辑器，支持图像裁剪、滤镜、绘图、文字添加等功能。

## 功能特性

- 🖼️ 图像加载和显示
- ✂️ 图像裁剪（支持旋转）
- 🎨 图像滤镜（亮度、对比度、饱和度）
- ✏️ 绘图功能
- 📝 文字图层添加和编辑
- 📚 多图层管理
- 📜 时间线历史记录
- 💾 图像导出

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Canvas API

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 部署到 Netlify

### 方法一：通过 Netlify Dashboard

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 登录 [Netlify](https://www.netlify.com/)
3. 点击 "New site from Git"
4. 选择你的代码仓库
5. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
6. 点击 "Deploy site"

### 方法二：通过 Netlify CLI

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 初始化项目
netlify init

# 部署
netlify deploy --prod
```

### 方法三：拖拽部署

1. 运行 `npm run build` 构建项目
2. 将 `dist` 文件夹拖拽到 [Netlify Drop](https://app.netlify.com/drop)

## 项目结构

```
C/
├── src/
│   ├── pages/Editor/     # 编辑器主页面
│   ├── canvas/           # Canvas 渲染引擎
│   ├── features/         # 功能模块（裁剪、滤镜、绘图、文字）
│   ├── components/       # 通用组件
│   └── utils/           # 工具函数
├── netlify.toml         # Netlify 配置文件
└── package.json
```

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 许可证

MIT

