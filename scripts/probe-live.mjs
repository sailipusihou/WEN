// 线上只读探针: 确认新代码已上线 (不写任何数据)
const BASE = 'https://lowflame.store'

async function probe(name, url, init) {
  try {
    const r = await fetch(url, init)
    const text = (await r.text()).slice(0, 160)
    console.log(`${name}\n   status=${r.status}\n   body=${text}\n`)
    return { status: r.status, text }
  } catch (e) {
    console.log(`${name}\n   ERROR ${e.message}\n`)
    return { status: 0, text: '' }
  }
}

;(async () => {
  const home = await probe('首页', BASE + '/', { method: 'GET' })

  const fd = new FormData()
  fd.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]), 'x.png')
  const up = await probe('未登录上传附件 (期望 401 + 新文案)', BASE + '/api/messages/upload', { method: 'POST', body: fd })

  const notify = await probe('未登录调用发货通知 (期望 401)', BASE + '/api/shipments/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId: 'x', channel: 'email' }),
  })

  const doc = await probe('文档回读分支 (期望 404 file not found, 而非 400 不支持)', BASE + '/api/uploads?file=probe-nonexistent.txt', { method: 'GET' })

  console.log('===== 判定 =====')
  console.log('首页 200                :', home.status === 200)
  console.log('新上传路由已上线        :', up.status === 401 && up.text.includes('sign in'))
  console.log('发货通知路由已上线      :', notify.status === 401 || notify.status === 403)
  console.log('pdf/txt 回读分支已上线  :', doc.status === 404)
})()
