// ABOUTME: Vite integration for Express server
// ABOUTME: Handles dev middleware and production static file serving

import type { Application, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';

// 注意：vite 及根 vite.config 只在开发环境需要，必须延迟动态导入。
// 若在顶层静态导入，打包后的 dist-server 会在生产启动时直接 require
// vite/@swc/core 等 dev-only 依赖，在 pnpm 严格 node_modules 下崩溃。
/**
 * 集成 Vite 开发服务器（中间件模式）
 */
export async function setupViteMiddleware(app: Application) {
  const { createServer: createViteServer } = await import('vite');
  const { default: viteConfig } = await import('../vite.config.js');

  const vite = await createViteServer({
    ...viteConfig,
    // 配置对象已内联传入，禁止 Vite 再从 cwd 二次加载 vite.config.ts
    //（否则 react() 等插件会被实例化两次，导致 transform 重复执行）
    configFile: false,
    server: {
      ...viteConfig.server,
      middlewareMode: true,
    },
    appType: 'spa',
  });

  // 使用 Vite middleware
  app.use(vite.middlewares);

  console.log('🚀 Vite dev server initialized');
}

/**
 * 设置生产环境静态文件服务
 */
export function setupStaticServer(app: Application) {
  const distPath = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }

  // 1. 服务静态文件（如果存在对应文件则直接返回）
  app.use(express.static(distPath));

  // 2. SPA fallback - 所有未处理的请求返回 index.html
  // 到达这里的请求说明：
  //   - 不是 API 请求（已被前面注册的路由处理）
  //   - 不是静态文件（express.static 未找到对应文件）
  //   - 需要返回 index.html 让前端路由处理
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log('📦 Serving static files from dist/');
}

/**
 * 根据环境设置 Vite
 */
export async function setupVite(app: Application) {
  if (isDev) {
    await setupViteMiddleware(app);
  } else {
    setupStaticServer(app);
  }
}
