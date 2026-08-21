# 部署说明

## 技术栈

- 框架：React + TypeScript + Vite
- 包管理器：pnpm 11.19.0
- Node：24.x；本次 RC 在 Node 24.19.0 上验证
- 发布形态：静态站点

## 构建

```powershell
pnpm install
pnpm build
```

构建产物目录为 `dist/`。本地检查可以运行 `pnpm preview`，或使用任意静态文件服务器直接服务 `dist/`。

内容构建脚本默认读取项目约定的构建时内容源；维护者也可以通过 `SI_CONTENT_SOURCE` 指向另一份内容源。它只在构建期使用，生产浏览器不读取该变量。

## 静态托管

- GitHub 集成：安装命令 `pnpm install`，构建命令 `pnpm build`，输出目录 `dist`。
- 直接上传：上传 `dist/` 内部文件。
- 运行时环境变量：无。
- API、数据库、外部 CDN：无。
- SPA 回退：当前应用使用单一入口页面，没有需要额外配置的客户端 URL 路由。

本项目未执行 GitHub、Cloudflare 或其他远程平台的实际部署；本文件只记录本地 RC 的可复现配置。
