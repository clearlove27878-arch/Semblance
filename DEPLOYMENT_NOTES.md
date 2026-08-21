# 部署说明

## 技术栈

- 框架：React + TypeScript + Vite
- 包管理器：pnpm 11.19.0
- Node：24.x；本次 RC 在 Node 24.19.0 上验证
- 发布形态：静态站点

## 构建

```powershell
pnpm install
pnpm build:deploy
```

构建产物目录为 `dist/`。本地检查可以运行 `pnpm preview`，或使用任意静态文件服务器直接服务 `dist/`。

作者本地完整构建使用 `pnpm build`，其顺序为 `content:build` → TypeScript check → Vite build。内容重新生成可单独运行 `pnpm content:build`；默认源为项目根目录的 `网页文本源/`，默认图片源为项目根目录的 `public/content-assets/`，两者组合即可独立构建。项目不再默认访问父目录图片。作者也可以显式通过 `SI_CONTENT_SOURCE` 指向另一份内容源；只有该变量显式设置时，才启用兼容旧 source-side 图片目录的逻辑。

部署构建使用 `pnpm build:deploy`，其顺序为 `deploy:check` → TypeScript check → Vite build，不运行 `content:build`，不读取 `网页文本源/`、`SI_CONTENT_SOURCE` 或任何项目父目录。`deploy:check` 只检查已提交的 PLAYER/runtime/summary generated JSON、`public/content-assets/`、本地 Hanzi Writer 数据和本地 Tabler leaf 资源。

## 静态托管

- GitHub 集成：安装命令 `pnpm install`，构建命令 `pnpm build:deploy`，输出目录 `dist`。
- Cloudflare Pages：Framework `React + TypeScript + Vite`；Root directory 为 repository root（留空）；Build-time env 与 Runtime env 均不需要。
- 直接上传：上传 `dist/` 内部文件。
- 运行时环境变量：无。
- API、数据库、外部 CDN：无。
- SPA 回退：当前应用使用单一入口页面，没有需要额外配置的客户端 URL 路由。

本项目未执行 GitHub、Cloudflare 或其他远程平台的实际部署；本文件只记录本地 RC 的可复现配置。
