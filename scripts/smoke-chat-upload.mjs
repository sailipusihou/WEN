// 冒烟测试: 客户聊天附件上传 + 发货通知接口
// ⚠️ 仅用于本地开发库: 会注册测试客户, 请勿在服务器上运行。
//    用法: 先本地 `npm run build && npx next start -p 3100`, 再 `node scripts/smoke-chat-upload.mjs`
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3100'
const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`)
}

async function main() {
  // ---------- 1. 未登录上传: 应被我们的路由拒绝 (401 + 自定义文案) ----------
  {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]), 'a.png')
    const r = await fetch(BASE + '/api/messages/upload', { method: 'POST', body: fd })
    const d = await r.json().catch(() => ({}))
    check('未登录上传被拒绝', r.status === 401, `${r.status} ${d.error || ''}`)
    check('拒绝来自新路由(而非中间件)', (d.error || '').includes('sign in'), d.error)
  }

  // ---------- 2. 注册/登录测试客户 ----------
  const email = `smoke-${Date.now()}@example.com`
  const password = 'test123456'
  let cookie = ''
  {
    const r = await fetch(BASE + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName: 'Smoke', lastName: 'Test' }),
    })
    const d = await r.json().catch(() => ({}))
    check('测试客户注册', r.status === 201, `${r.status} ${d.error || ''}`)
    const setCookie = r.headers.getSetCookie ? r.headers.getSetCookie() : []
    const tok = setCookie.find(c => c.startsWith('user_token='))
    if (tok) cookie = tok.split(';')[0]
    if (!cookie) {
      const lr = await fetch(BASE + '/api/auth/user-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const sc = lr.headers.getSetCookie ? lr.headers.getSetCookie() : []
      const t2 = sc.find(c => c.startsWith('user_token='))
      if (t2) cookie = t2.split(';')[0]
    }
    check('拿到 user_token cookie', !!cookie, cookie ? cookie.slice(0, 22) + '…' : '(none)')
  }

  const authHeaders = { Cookie: cookie }
  const uploaded = []

  // ---------- 3. 登录后上传 PNG ----------
  {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF/9v0AAAAASUVORK5CYII=',
      'base64'
    )
    const fd = new FormData()
    fd.append('file', new Blob([png]), 'photo.png')
    const r = await fetch(BASE + '/api/messages/upload', { method: 'POST', body: fd, headers: authHeaders })
    const d = await r.json().catch(() => ({}))
    check('登录客户上传 PNG', r.status === 201 && !!d.url, `${r.status} ${d.url || d.error || ''}`)
    if (d.url) {
      uploaded.push(d.url)
      const g = await fetch(BASE + d.url)
      check('回读上传的 PNG', g.status === 200 && (g.headers.get('content-type') || '').includes('image/png'),
        `${g.status} ${g.headers.get('content-type')}`)
    }
  }

  // ---------- 4. 登录后上传 TXT ----------
  {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from('hello, this is a plain text attachment')]), 'notes.txt')
    const r = await fetch(BASE + '/api/messages/upload', { method: 'POST', body: fd, headers: authHeaders })
    const d = await r.json().catch(() => ({}))
    check('登录客户上传 TXT', r.status === 201 && !!d.url, `${r.status} ${d.url || d.error || ''}`)
    if (d.url) {
      uploaded.push(d.url)
      const g = await fetch(BASE + d.url)
      check('回读上传的 TXT', g.status === 200 && (g.headers.get('content-type') || '').includes('text/plain'),
        `${g.status} ${g.headers.get('content-type')}`)
      check('TXT 带 nosniff', g.headers.get('x-content-type-options') === 'nosniff', String(g.headers.get('x-content-type-options')))
    }
  }

  // ---------- 5. 伪装成 PNG 的 HTML 必须被拒 ----------
  {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from('<html><script>alert(1)</script></html>')]), 'evil.png')
    const r = await fetch(BASE + '/api/messages/upload', { method: 'POST', body: fd, headers: authHeaders })
    const d = await r.json().catch(() => ({}))
    check('伪装 PNG 的 HTML 被拒', r.status === 400, `${r.status} ${d.error || ''}`)
  }

  // ---------- 6. 不允许的扩展名 (exe) 被拒 ----------
  {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from('MZ\x90\x00')]), 'setup.exe')
    const r = await fetch(BASE + '/api/messages/upload', { method: 'POST', body: fd, headers: authHeaders })
    const d = await r.json().catch(() => ({}))
    check('exe 被拒', r.status === 400, `${r.status} ${d.error || ''}`)
  }

  // ---------- 7. 发货通知接口: 未登录应 401 ----------
  {
    const r = await fetch(BASE + '/api/shipments/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId: 'SHP-X', channel: 'email' }),
    })
    check('发货通知未授权被拒', r.status === 401 || r.status === 403, String(r.status))
  }

  // ---------- 8. 发货通知接口: 普通客户 token 不能调用 ----------
  {
    const r = await fetch(BASE + '/api/shipments/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ shipmentId: 'SHP-X', channel: 'email' }),
    })
    check('发货通知对普通客户被拒', r.status === 401 || r.status === 403, String(r.status))
  }

  console.log('\n清理测试上传文件…')
  const fs = await import('fs')
  const path = await import('path')
  for (const u of uploaded) {
    const name = decodeURIComponent(u.split('file=')[1] || '')
    const p = path.join(process.cwd(), 'public', 'uploads', name)
    try { fs.unlinkSync(p); console.log('  已删除', name) } catch (e) { console.log('  删除失败', name, e.message) }
  }

  const failed = results.filter(r => !r.ok)
  console.log(`\n===== ${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) {
    failed.forEach(f => console.log('FAILED:', f.name, f.detail))
    process.exit(1)
  }
}

main().catch(e => { console.error('脚本异常:', e); process.exit(1) })
