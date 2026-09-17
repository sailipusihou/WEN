import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Returns & Refunds | Low Flame',
  description:
    'Low Flame 30-day return and refund policy. How to start a return, who pays return shipping, and how long refunds take.',
}

/**
 * 退货与退款政策页。
 *
 * 为什么必须有这一页：
 *   1. Google 审核网站（Google Pay API 生产环境权限）会检查退货/退款政策是否清晰可查，
 *      缺失或只指向联系表单会被拒 —— 这正是 OR_BIBED_06 的常见成因之一。
 *   2. 跨境客户下单前最在意的三件事之一（另外两个是运费和时效）。
 *   3. 美国 FTC 的 Mail/Telephone Order Merchandise Rule 要求商家在发货延迟时
 *      有明确的退款安排，把政策写清楚对双方都是保护。
 *
 * ⚠️ 改这里之前先确认与站点其他位置口径一致：
 *   - components/cart/ShopWithConfidence.tsx 写着 "30-day money back"
 *   - lib/settings.ts 的配送分区（美加/欧洲/亚太/其他）与免邮门槛
 *   三处必须对得上，否则客户按这个页面来找你对账，你没法解释。
 */
export default function RefundPolicyPage() {
  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <h1 className="font-en text-3xl md:text-4xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">
          Returns &amp; Refunds
        </h1>
        <p className="font-sans text-xs text-[#5A4A36]/50 mb-8">Last updated: September 2026</p>

        <div className="space-y-6 font-sans text-sm leading-7 text-[#4A4A36]">
          <section className="p-4" style={{ backgroundColor: 'var(--paper-warm)', borderRadius: 8 }}>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">The short version</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>30 days</strong> from delivery to request a return.</li>
              <li><strong>We pay return shipping</strong> if the item arrived damaged, defective, or is not what you ordered.</li>
              <li><strong>You pay return shipping</strong> if you changed your mind — the item must be unused and in its original packaging.</li>
              <li><strong>Refunds are issued to your original payment method within 5 business days</strong> of us receiving the returned item.</li>
              <li>Custom or personalised pieces cannot be returned unless faulty.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">1. Return window</h2>
            <p>
              You may request a return within <strong>30 calendar days</strong> of the delivery date recorded by the
              carrier. Requests made after this window cannot be accepted, unless the item is covered by a
              warranty claim or we shipped the wrong item.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">2. Condition of returned items</h2>
            <p>
              Items must be returned unused, undamaged, and in their original packaging with any tags, certificates,
              or accessories included. Handcrafted pieces are individually made, so minor variations in glaze,
              grain, or finish are a characteristic of the craft rather than a defect.
            </p>
            <p className="mt-2">
              We may reduce a refund if the value of the goods has been diminished by handling beyond what is
              necessary to inspect them.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">3. Damaged, defective, or incorrect items</h2>
            <p>
              Please inspect your parcel on arrival. If anything is damaged, faulty, or not what you ordered,
              contact us within <strong>7 days of delivery</strong> with your order number and photographs of the
              item and its packaging. We will arrange a replacement or a full refund, and we cover the return
              shipping cost.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">4. How to start a return</h2>
            <p>
              Email <a href="mailto:hello@lowflame.store" className="underline underline-offset-2 text-[#8A6A2E]">hello@lowflame.store</a> or
              use the <Link href="/contact" className="underline underline-offset-2 text-[#8A6A2E]">contact form</Link> with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your order number (starts with <code>OTM-</code>)</li>
              <li>The email address used at checkout</li>
              <li>The reason for the return</li>
            </ul>
            <p className="mt-2">
              We reply within <strong>1–2 business days</strong> with return instructions and the return address.
              Please do not send items back before receiving these instructions — parcels sent without a return
              reference may not be traceable to your order.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">5. Who pays return shipping</h2>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(74,58,36,0.2)' }}>
                    <th className="py-2 pr-4 font-semibold text-[#2A2118]">Reason</th>
                    <th className="py-2 font-semibold text-[#2A2118]">Return shipping</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(74,58,36,0.1)' }}>
                    <td className="py-2 pr-4">Damaged / defective / wrong item</td>
                    <td className="py-2"><strong>We pay</strong> (or we refund the cost you paid)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(74,58,36,0.1)' }}>
                    <td className="py-2 pr-4">Changed your mind</td>
                    <td className="py-2">You pay</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Refused at customs / uncollected</td>
                    <td className="py-2">You pay (original shipping is not refunded)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">6. Refund timing and method</h2>
            <p>
              Once we receive and inspect your return, we will email you to confirm. Refunds are issued to the
              <strong> original payment method</strong> within <strong>5 business days</strong> of that confirmation.
            </p>
            <p className="mt-2">
              Depending on your bank or card issuer, it can take a further 5–10 business days for the credit to
              appear on your statement. PayPal refunds usually appear sooner. We cannot refund to a different card
              or account than the one used for the purchase.
            </p>
            <p className="mt-2">
              Original shipping charges are refunded only when the return is due to damage, a defect, or our error.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">7. Exchanges</h2>
            <p>
              We do not operate a direct exchange process. If you would like a different item, please return the
              original for a refund and place a new order — this is faster than waiting for a cross-shipment.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">8. Non-returnable items</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Custom or personalised pieces made to your specification</li>
              <li>Items marked as final sale at the time of purchase</li>
              <li>Free gift items included with an order (they carry no refundable value)</li>
              <li>Items returned without prior authorisation, or returned after the 30-day window</li>
            </ul>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">9. Orders cancelled before dispatch</h2>
            <p>
              You may cancel an order at no cost any time before it is dispatched. Email us with your order number
              and we will cancel and refund in full. Once the parcel has left our workshop, the return process above
              applies.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">10. Statutory rights</h2>
            <p>
              Nothing in this policy limits any rights you have under the mandatory consumer protection laws of
              your country of residence. Where local law provides a longer cancellation period or stronger
              remedies, that law prevails.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">11. Contact</h2>
            <p>
              Questions about a return or refund? Email{' '}
              <a href="mailto:hello@lowflame.store" className="underline underline-offset-2 text-[#8A6A2E]">hello@lowflame.store</a>{' '}
              or use our <Link href="/contact" className="underline underline-offset-2 text-[#8A6A2E]">contact form</Link>.
              We answer within 1–2 business days.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 flex flex-wrap gap-4 font-sans text-sm" style={{ borderTop: '1px solid rgba(74,58,36,0.14)' }}>
          <Link href="/shipping-policy" className="underline underline-offset-4 text-[#8A6A2E]">Shipping Policy</Link>
          <Link href="/terms" className="underline underline-offset-4 text-[#8A6A2E]">Terms of Service</Link>
          <Link href="/privacy" className="underline underline-offset-4 text-[#8A6A2E]">Privacy Policy</Link>
          <Link href="/contact" className="underline underline-offset-4 text-[#8A6A2E]">Contact</Link>
        </div>
      </div>
    </div>
  )
}
