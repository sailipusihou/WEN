import * as XLSX from 'xlsx'

export interface ParsedRow {
  [key: string]: any
}

/**
 * 通用文件解析函数，支持 .csv, .xlsx, .xls 格式
 * 返回 JSON 对象数组，使用第一行作为表头
 */
export async function parseFile(file: File): Promise<ParsedRow[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}
