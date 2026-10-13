/**
 * 列表页每屏条数。
 *
 * ⚠️ 必须放在这个**普通模块**里，不能放在 `"use client"` 组件文件里导出。
 *    Next.js 只允许从客户端模块导入组件；导入普通常量（数字/字符串）在服务端
 *    会拿到 undefined —— 表现为 `list.slice(0, undefined)` 切出空数组，
 *    首屏一张卡都不渲染（2026-10-13 踩到，分类页整个网格是空的）。
 *    服务端切片与客户端展开共用同一份常量，避免两边写两个数走偏。
 */

/** 商品列表页：服务端首屏给一页，其余滚动加载 */
export const PRODUCTS_PAGE_SIZE = 12

/** 分类页：服务端首屏给一屏，其余点「Load more」 */
export const CATEGORY_PAGE_SIZE = 24
