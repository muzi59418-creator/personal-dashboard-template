// 云端同步预留适配层。
// 第一版不连接真实 Supabase、Cloudflare、Firebase 或第三方图片服务。

export async function uploadImageToCloud(imageDataUrl: string): Promise<string> {
  // TODO: 后续替换为真实云端文件存储，并返回云端图片 URL。
  return imageDataUrl;
}

/*
后续云端同步需要接入：
- 用户登录鉴权
- 云端数据库
- 图片文件存储
- 数据权限规则
- 多设备同步
- 自动备份
*/
