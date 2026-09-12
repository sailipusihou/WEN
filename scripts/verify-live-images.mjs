// 清理后: 验证所有保留下来的上传文件仍可访问
const BASE = 'https://lowflame.store'
const KEPT = [
  'ai/img_1785921580353_b2964de7.jpg',
  'ai/img_1785959458421_843fa0d1.png',
  'ai/img_1786094838635_70d81b41.png',
  'ai/img_1786723108863_9b4dabb8.jpg',
  'ai/img_1786811917594_2d0ac7ec.png',
  'ai/video_1786812096676_323142c9.mp4',
  'img-1784555352002-knjwpz.png',
  'img-1784585880588-qf6j0q.jpg',
  'img-1784748898731-x98p02.png',
  'img-1786721975176-3p7v7z.png',
  'img-1786723136059-xffs4c.png',
  'vid-1784737838857-dcmijp.mp4',
]

;(async () => {
  let bad = 0
  for (const f of KEPT) {
    const urls = f.startsWith('ai/')
      ? [`${BASE}/uploads/${f}`, `${BASE}/api/uploads?file=${encodeURIComponent(f)}`]
      : [`${BASE}/api/uploads?file=${encodeURIComponent(f)}`]
    for (const u of urls) {
      try {
        const r = await fetch(u)
        const ok = r.status === 200
        if (!ok) bad++
        console.log(`${ok ? 'OK  ' : 'BAD '} ${r.status} ${r.headers.get('content-type') || ''}  ${decodeURIComponent(u).replace(BASE, '')}`)
      } catch (e) { bad++; console.log(`ERR  ${u} ${e.message}`) }
    }
  }
  console.log(`\n===== 失败 ${bad} =====`)
})()
