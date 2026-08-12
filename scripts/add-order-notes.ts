import { updateOrder, getAllOrders } from "@/lib/orders"

const orders = getAllOrders()
const notes = [
  "Please wrap as a gift, birthday present for my mother.",
  "Express delivery needed, urgent order.",
  "Customer requested a call before delivery.",
  "",
  "Leave at front desk, thank you!",
]

orders.forEach((o: any, i: number) => {
  if (notes[i % notes.length]) {
    updateOrder(o.id, { notes: notes[i % notes.length] })
    console.log("Added note to", o.id, ":", notes[i % notes.length])
  }
})

console.log("Done!")
