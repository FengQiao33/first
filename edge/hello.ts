/**
 * 边缘函数示例（按 ESA Pages 的函数规范可微调入口导出形式）
 *
 * 用途示例：
 * - AI 接口转发（隐藏 API Key）
 * - Cache 缓存热点结果（降低成本、提升体验）
 * - 简单限流/防刷
 * - 边缘存储（KV/R2/对象存储）读写
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "ESA Pages";

    return new Response(
      JSON.stringify(
        {
          ok: true,
          message: `Hello, ${name}!`,
          now: new Date().toISOString()
        },
        null,
        2
      ),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60"
        }
      }
    );
  }
};

