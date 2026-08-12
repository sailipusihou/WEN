import { getRepository } from "@/lib/repository"

const repo = getRepository()
const products = repo.products.list()
const staff = repo.staff.list()

const statuses = ["pending", "processing", "shipped", "delivered", "pending"]
const customerNames = ["John Smith", "Emma Wilson", "Michael Chen", "Sophia Davis", "James Johnson"]
const customerEmails = ["john@example.com", "emma@example.com", "michael@example.com", "sophia@example.com", "james@example.com"]

for (let i = 0; i < 5; i++) {
  const product = products[i % products.length]
  const staffMember = staff[i % staff.length]
  const qty = (i % 3) + 1
  const total = product.price * qty
  const dateOffset = i * 86400000 * 2
  const createdAt = new Date(Date.now() - dateOffset).toISOString()

  const order: any = {
    id: "OTM-TEST-" + (1000 + i),
    items: [{
      id: "ITEM-" + i,
      productId: product.id,
      name: product.name,
      nameEn: product.nameEn || "",
      image: product.image,
      price: product.price,
      quantity: qty,
      subtotal: total,
      category: product.category || "",
    }],
    shipping: {
      firstName: customerNames[i].split(" ")[0],
      lastName: customerNames[i].split(" ")[1],
      email: customerEmails[i],
      phone: "+1 234 567 890" + i,
      address: "123 Test Street",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "United States",
    },
    subtotal: total,
    shippingCost: 0,
    total: total,
    currency: "USD",
    status: statuses[i],
    createdAt,
    customerEmail: customerEmails[i],
    customerName: customerNames[i],
    userEmail: customerEmails[i],
    assignedTo: staffMember.id,
    assignedToName: staffMember.name,
    assignedToAvatar: staffMember.avatar || "",
    statusHistory: [
      { status: "pending", timestamp: createdAt, note: "Order placed" },
    ],
  }

  repo.orders.add(order)
  console.log("Created order:", order.id, "| Status:", order.status, "| Total: $" + total, "| Staff:", staffMember.name)
}

console.log("Done! Total orders:", repo.orders.list().length)
