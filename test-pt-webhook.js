const http = require('http')

const payload = JSON.stringify({
  event_type: 'pin_comment',
  data: {
    comment_id: 'pt_test_comment_001',
    pin_id: 'pt_test_pin_001',
    text: 'Test Pinterest comment!',
    created_at: new Date().toISOString(),
    commenter: {
      username: 'testuser',
      id: '12345'
    },
    pin_title: 'Test Pin',
    pin_image_url: 'https://example.com/image.jpg'
  }
})

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/marketing/webhook/pinterest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}

const req = http.request(options, (res) => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', d))
})
req.on('error', e => console.error('Error:', e.message))
req.write(payload)
req.end()