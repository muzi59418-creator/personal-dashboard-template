# 个人工作仪表板模板

一个适合个人使用的本地化工作管理仪表板，用来记录工作内容、今日事项、项目进展、工作日记和临时想法。

这是一个基于 React、TypeScript 和 Vite 的开源模板项目。项目默认使用浏览器本地存储，不需要后端服务，也不内置账号体系。仓库只包含通用中文演示数据，不包含个人工作数据、账号、联系方式、密钥、token、本地私人路径或内部业务信息。

当前版本：v1.4.1

## 在线预览

- 在线 Demo：待部署
- 本地预览：`npm install` 后运行 `npm run dev`
- 使用模板：点击 GitHub 页面右上角 `Use this template`

## 效果预览

![首页概览](docs/images/readme/01-home.png)

## 页面截图

### 今日工作台

![今日工作台](docs/images/readme/02-today.png)

### 工作内容

![工作内容](docs/images/readme/03-work-items.png)

### 项目管理

![项目管理](docs/images/readme/04-projects.png)

### 工作日记 / 灵感记录

![工作日记 / 灵感记录](docs/images/readme/05-notes.png)

### 设置 / 数据备份

![设置 / 数据备份](docs/images/readme/06-settings.png)

## 核心功能

- 今日工作台：集中查看优先事项、今日例行、项目推进和今日已完成内容。
- 工作内容管理：记录、筛选和更新待处理、进行中、已完成、暂停等工作事项。
- 项目管理：按重要紧急四象限管理项目，并跟踪项目推进清单。
- 推进清单：将项目拆成可执行事项，支持状态、截止时间和来源工作关联。
- 工作日记：记录每日总结、问题、复盘和后续行动。
- 临时想法：保存灵感、待整理内容和图片附件。
- 数据备份与导入：支持导出 JSON、导入 JSON、刷新本地存储和恢复演示数据。
- 本地浏览器存储：默认使用 localStorage 保存数据，适合个人本地使用和二次开发。

## 适合谁用

- 想做个人工作台的人。
- 想用本地网页管理工作的运营、产品、开发、自由职业者。
- 想基于模板二次开发的人。

## 本地启动

先安装 Node.js，然后在项目目录中运行：

```bash
npm install
npm run dev
```

启动后，终端会显示本地访问地址，通常是：

```text
http://localhost:5173/
```

## 构建命令

```bash
npm run build
npm run lint
```

构建产物会生成在 `dist` 目录中。`dist` 已加入 `.gitignore`，不会提交到仓库。

## 数据存储方式

- 默认使用浏览器 `localStorage`。
- 不需要后端服务。
- 不内置账号体系。
- 当前版本不接入真实云端服务，也不写入账号、密码、API Key 或 token。
- 换浏览器、换设备或清空浏览器数据后，本地数据不会自动同步。
- 重要数据建议在“设置 / 备份”页面定期导出 JSON 备份。

导出的 JSON 会包含 `version`、`appVersion` 和 `schemaVersion`。旧版本 JSON 备份仍可导入；读取旧本地数据时会先保存迁移前备份，再补齐新字段。

## 部署说明

### 部署到 Vercel

1. 使用 GitHub Template 创建自己的仓库。
2. 登录 Vercel，选择 `Add New Project`。
3. 导入自己的 GitHub 仓库。
4. Framework Preset 选择 `Vite`。
5. Build Command 使用 `npm run build`。
6. Output Directory 使用 `dist`。
7. 点击 Deploy。

### 部署到 Cloudflare Pages

1. 使用 GitHub Template 创建自己的仓库。
2. 登录 Cloudflare Dashboard，进入 `Workers & Pages`。
3. 选择 `Create application` 后选择 `Pages`。
4. 连接自己的 GitHub 仓库。
5. Framework preset 选择 `Vite`。
6. Build command 填写 `npm run build`。
7. Build output directory 填写 `dist`。
8. 保存并开始部署。

## 版本说明

当前版本：v1.4.1

v1.4.1 主要统一全局卡片、按钮、表单、弹窗和抽屉视觉，优化首页统计卡片、核心列表、项目四象限、例行工作和数据管理页阅读体验。该版本不修改数据结构、统计逻辑、localStorage key 或 SCHEMA_VERSION。

更多版本记录见 [CHANGELOG.md](CHANGELOG.md) 和 [docs/VERSIONING.md](docs/VERSIONING.md)。

## 通过 GitHub Template 创建自己的版本

在 GitHub 仓库页面点击 `Use this template`，选择 `Create a new repository`，然后填写自己的仓库名称。创建后，可以自由修改演示数据、页面文案、颜色和功能。

## 开源协议

本项目使用 MIT License。你可以自由使用、修改和分发，但请保留许可证说明。
