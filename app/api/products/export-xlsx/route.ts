import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import ExcelJS from 'exceljs'
import sharp from 'sharp'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

/**
 * 导出商品表格（.xlsx），**每个商品的图片嵌在表格里**。
 *
 * 为什么要专门做一个（已有的 /api/products/export 是 CSV，图片只是 URL）：
 * CSV 在 Excel 里点开只是一串链接，看不到东西；要给供货商或自己核对货盘时，
 * 得挨个点开。这里把主图缩成缩略图直接嵌进单元格。
 *
 * 两个取舍：
 *  · **缩略图压缩**：160 件的主图原图合计约 20MB，直接嵌会导出 20MB 的文件。
 *    用 sharp 压到 140px 宽后约 1–2MB —— 从美国服务器下来快得多。
 *    压缩失败（个别格式 sharp 认不了）时退回原图，不让整张表失败。
 *  · **只嵌主图**：详情图动辄每件三五张，全嵌会把文件撑到几十 MB。
 *
 * ⚠️ 依赖 exceljs 与 sharp，两者都必须在**运行时的 node_modules** 里
 *    （部署只传 .next，不传依赖 —— 详见交接文档）。
 */
const THUMB_W = 140          // 缩略图宽度（像素）
const THUMB_H = 140
const ROW_HEIGHT = 72        // 行高（点）—— 够放下一张缩略图

/** 把 `/api/uploads?file=xxx.jpeg` 还原成磁盘路径；取不到就返回 null */
function resolveUpload(imageField?: string | null): { file: string; abs: string } | null {
  if (!imageField) return null
  let name = ''
  try {
    if (imageField.startsWith('/api/uploads')) {
      name = new URL('http://x' + imageField).searchParams.get('file') || ''
    } else if (imageField.startsWith('/uploads/')) {
      name = imageField.replace('/uploads/', '')
    } else if (!imageField.includes('/')) {
      name = imageField
    }
  } catch {
    return null
  }
  if (!name) return null
  name = path.basename(name)          // 防路径穿越
  const abs = path.join(process.cwd(), 'public', 'uploads', name)
  return fs.existsSync(abs) ? { file: name, abs } : null
}

/**
 * 缩略图。压不动就退回原图 —— 不能让一张图毁掉整次导出。
 * 一并返回扩展名：exceljs 要求 extension 与实际字节一致，猜错图会显示不出来。
 */
async function thumbBuffer(abs: string, file: string): Promise<{ buf: Buffer; ext: 'jpeg' | 'png' | 'gif' }> {
  try {
    const buf = await sharp(abs)
      .resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80 })
      .toBuffer()
    return { buf, ext: 'jpeg' }
  } catch {
    const ext = /\.png$/i.test(file) ? 'png' : /\.gif$/i.test(file) ? 'gif' : 'jpeg'
    return { buf: fs.readFileSync(abs), ext }
  }
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const activeOnly = searchParams.get('active') === 'true'

  let products = getRepository().products.list()
  if (category) products = products.filter(p => p.category === category)
  if (activeOnly) products = products.filter(p => p.active !== false)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Low Flame'
  wb.created = new Date()
  const ws = wb.addWorksheet('商品 Products', {
    views: [{ state: 'frozen', ySplit: 1 }],   // 表头冻结，滚动时还在
  })

  ws.columns = [
    { header: '图片 Image', key: 'img', width: 16 },
    { header: '编码 Code', key: 'code', width: 12 },
    { header: '名称 Name', key: 'name', width: 22 },
    { header: 'Name (EN)', key: 'nameEn', width: 32 },
    { header: '售价 Price (USD)', key: 'price', width: 15 },
    { header: '成本 Cost (USD)', key: 'costPrice', width: 15 },
    { header: '毛利率 Margin', key: 'margin', width: 12 },
    { header: '分类 Category', key: 'category', width: 18 },
    { header: '题材 Collection', key: 'theme', width: 14 },
    { header: '标签 Tags', key: 'tags', width: 26 },
    { header: '库存 Stock', key: 'stock', width: 10 },
    { header: '状态 Status', key: 'status', width: 10 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).height = 22
  ws.getRow(1).alignment = { vertical: 'middle' }

  const THEMES = ['Tea Sets', 'Travel Sets', 'Cups', 'Tableware']

  let rowNo = 1                    // 0 是表头，数据从第 1 行（1-based 的第 2 行）开始
  for (const p of products) {
    const margin = p.costPrice && p.price
      ? Math.round(((p.price - p.costPrice) / p.price) * 100) + '%'
      : ''
    const row = ws.addRow({
      img: '',
      code: p.code || '',
      name: p.name,
      nameEn: p.nameEn || '',
      price: p.price,
      costPrice: p.costPrice ?? '',
      margin,
      category: p.category || '',
      theme: (p.tags || []).find((t: string) => THEMES.includes(t)) || '',
      tags: (p.tags || []).join(' · '),
      stock: p.stock ?? 0,
      status: p.active === false ? '下架' : '上架',
    })
    row.height = ROW_HEIGHT
    row.alignment = { vertical: 'middle', wrapText: false }
    row.getCell('price').numFmt = '$#,##0.00'
    row.getCell('costPrice').numFmt = '$#,##0.00'

    // 嵌缩略图
    const found = resolveUpload(p.image)
    if (found) {
      try {
        const { buf, ext } = await thumbBuffer(found.abs, found.file)
        const id = wb.addImage({ buffer: buf as any, extension: ext })
        ws.addImage(id, {
          tl: { col: 0.15, row: rowNo - 1 + 0.12 },
          ext: { width: 72, height: 72 },
          editAs: 'oneCell',
        })
      } catch {
        // 单张图失败就留空，不影响其它行
      }
    }
    rowNo++
  }

  const buf = await wb.xlsx.writeBuffer()
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="products-${date}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
