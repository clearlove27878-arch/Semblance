# 《似》网页推理灰盒

这是一个基于 React、TypeScript 和 Vite 的离线网页推理灰盒。玩家内容按调查阶段逐步开放，已经获得的内容可以回看；项目不依赖后端、云端服务、LLM、API key 或运行时联网请求。

## 本地运行

```powershell
pnpm install
pnpm dev
```

生产构建、测试和本地预览：

```powershell
pnpm test
pnpm build
pnpm preview
```

作者完整构建（重新解析项目内网页文本源）：

```powershell
pnpm build
```

部署构建（只检查已提交的 generated PLAYER/runtime 数据，再运行 TypeScript + Vite）：

```powershell
pnpm build:deploy
```

内容源发生变化时，可单独重新生成内容：

```powershell
pnpm content:build
```

## 发布

生产静态文件输出到 `dist/`。静态托管只需要发布该目录；GitHub 集成部署时使用 `pnpm install` 和 `pnpm build`，构建产物目录填写 `dist`。

Cloudflare Pages 使用 `pnpm install` 和 `pnpm build:deploy`，不重新解析网页文本源。运行时和部署构建没有必需环境变量、API、数据库或外部 CDN。作者本地仍可选用 `SI_CONTENT_SOURCE` 覆盖内容源；该变量不属于玩家运行时或 Cloudflare 配置。

默认完整构建只使用项目内的 `网页文本源/` 与 `public/content-assets/`；正式图片不再从项目父目录读取。只有显式设置 `SI_CONTENT_SOURCE` 时，才启用兼容作者旧 source-side 图片目录的构建模式。

## 项目结构

- `src/`：应用、案件桌面、阅读器、状态流和内容运行时。
- `scripts/`：内容构建与校验脚本。
- `网页文本源/`：项目内正式网页文本源；仅 `content:build` 和作者完整 `build` 使用。
- `tests/`：状态流、权限、解析和界面模型测试。
- `public/content-assets/`：随生产包发布的玩家可见资源。

作者资料、测试记录和发布归档可能包含内部内容，建议将源码仓库保持为 Private。请勿把作者资料目录、发布整合包或本地缓存提交到公开仓库。
