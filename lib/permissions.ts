export type AdminRole = "super_admin" | "admin" | "manager" | "order_processor"

export interface PermissionItem {
  key: string
  label: string
  description: string
  group: string
}

// All individual permissions in the system
export const ALL_PERMISSIONS: PermissionItem[] = [
  { key: "dashboard", label: "Dashboard", description: "View dashboard overview", group: "General" },
  { key: "analytics_view", label: "Analytics", description: "View sales analytics and reports", group: "Analytics" },
  { key: "products_view", label: "View Products", description: "Browse product list", group: "Products" },
  { key: "products_manage", label: "Manage Products", description: "Add, edit, delete products", group: "Products" },
  { key: "categories_manage", label: "Manage Categories", description: "Add, edit, delete categories", group: "Products" },
  { key: "orders_view", label: "View Orders", description: "Browse order list", group: "Orders" },
  { key: "orders_process", label: "Process Orders", description: "Update order status, add tracking", group: "Orders" },
  { key: "orders_assign", label: "Assign Staff", description: "Assign staff members to orders", group: "Orders" },
  { key: "users_view", label: "View Users", description: "Browse customer list", group: "Users" },
  { key: "users_edit", label: "Edit Users", description: "Edit customer profiles, ratings, tags", group: "Users" },
  { key: "users_delete", label: "Delete Users", description: "Delete customer profiles", group: "Users" },
  { key: "finance_view", label: "View Finance", description: "See revenue and financial data", group: "Finance" },
  { key: "finance_manage", label: "Manage Finance", description: "Sync PayPal transactions, export data, process refunds", group: "Finance" },
  { key: "messages_view", label: "View Messages", description: "Browse and read messages", group: "Messages" },
  { key: "messages_reply", label: "Reply Messages", description: "Send replies to customers", group: "Messages" },
  { key: "social_publish", label: "Publish Social Posts", description: "Publish posts to connected social accounts (Instagram/Facebook/TikTok/YouTube/Pinterest/X/LinkedIn)", group: "Marketing" },
  { key: "reviews_manage", label: "Manage Reviews", description: "Moderate and reply to reviews", group: "Reviews" },
  { key: "worklog_view", label: "View Work Log", description: "Browse operation logs", group: "System" },
  { key: "settings_view", label: "View Settings", description: "View site settings", group: "System" },
  { key: "settings_manage", label: "Manage Settings", description: "Change site settings", group: "System" },
  { key: "staff_manage", label: "Manage Staff", description: "Add, edit, delete staff accounts", group: "System" },
  { key: "ai_assistant", label: "AI Assistant", description: "Use AI assistant for chat and analysis", group: "System" },
  { key: "ai_assistant_config", label: "Configure AI", description: "Configure AI assistant API keys and settings", group: "System" },
]

// Default permissions for each role (used as template)
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS.map(p => p.key),
  admin: ["dashboard", "analytics_view", "products_view", "products_manage", "categories_manage",
          "orders_view", "orders_process", "orders_assign", "users_view", "users_edit", "finance_view", "finance_manage",
          "messages_view", "messages_reply", "social_publish", "reviews_manage", "worklog_view",
          "settings_view", "settings_manage", "ai_assistant"],
  manager: ["dashboard", "analytics_view", "orders_view", "orders_process",
            "messages_view", "messages_reply", "reviews_manage", "worklog_view"],
  order_processor: ["dashboard", "orders_view", "orders_process"],
}

// Map nav items to required permissions
export const NAV_PERMISSION_MAP: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/analytics": "analytics_view",
  "/admin/products": "products_view",
  "/admin/products/new": "products_manage",
  "/admin/categories": "categories_manage",
  "/admin/orders": "orders_view",
  "/admin/shipping": "orders_process",
  "/admin/users": "users_view",
  "/admin/finance": "finance_view",
  "/admin/messages": "messages_view",
  "/admin/promotions": "products_manage",
  "/admin/reviews": "reviews_manage",
  "/admin/work-log": "worklog_view",
  "/admin/settings": "settings_view",
  "/admin/staff": "staff_manage",
  "/admin/knowledge-base": "ai_assistant",
}

export function getEffectivePermissions(role: string, customPermissions?: string[]): string[] {
  if (role === "super_admin") return ALL_PERMISSIONS.map(p => p.key)
  if (customPermissions && customPermissions.length > 0) return customPermissions
  return ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.order_processor
}

export const ROLE_RANK: Record<string, number> = {
  super_admin: 100, admin: 80, manager: 50, order_processor: 20,
}

export const ROLE_INFO: Record<string, { label: string; description: string; color: string }> = {
  super_admin: { label: "Super Admin", description: "Full system access — manage staff, settings, and all modules", color: "text-red-500" },
  admin: { label: "Administrator", description: "Access to products, orders, analytics, finance, and reports", color: "text-purple-500" },
  manager: { label: "Manager", description: "Manage orders, reviews, and customer communications", color: "text-blue-500" },
  order_processor: { label: "Order Processor", description: "View and process orders only", color: "text-green-500" },
}

export function roleLevel(role: string): number {
  return ROLE_RANK[role] || 0
}

export function canAccessNavItem(userRole: string | undefined | null, userPermissions: string[] | undefined, navHref: string): boolean {
  // super_admin has access to everything
  if (userRole === "super_admin") return true
  // Check if the required permission for this nav item is in the user's permissions
  const requiredPerm = NAV_PERMISSION_MAP[navHref]
  if (!requiredPerm) return false
  return userPermissions?.includes(requiredPerm) ?? false
}

export function getRoleDescription(role: string): string {
  return ROLE_INFO[role]?.description || ""
}
