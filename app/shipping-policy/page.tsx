import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Shipping Policy | Low Flame',
  description:
    'Low Flame shipping policy: processing times, delivery estimates, shipping rates by region, free shipping thresholds, customs and duties.',
}

/**
 * 配送政策页。
 *
 * 运费数字必须与 lib/settings.ts 的配送分区保持一致，否则客户按这个页面来对账会对不上：
 *   United States / Canada        $34.72   满 $199 免运费
 *   Europe (UK/DE/FR/IT/ES/NL)    $48.61   满 $249 免运费
 *   Asia Pacific (AU/JP/KR/SG)    $41.67   满 $229 免运费
 *   Rest of World                 $55.56   满 $279 免运费
 * 时效取自各处显示的 7–14 business days。
 */
export default function ShippingPolicyPage() {
  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <h1 className="font-en text-3xl md:text-4xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">
          Shipping Policy
        </h1>
        <p className="font-sans text-xs text-[#5A4A36]/50 mb-8">Last updated: September 2026</p>

        <div className="space-y-6 font-sans text-sm leading-7 text-[#4A4A36]">
          <section className="p-4" style={{ backgroundColor: 'var(--paper-warm)', borderRadius: 8 }}>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">The short version</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dispatched from our workshop within <strong>1–2 business days</strong>.</li>
              <li>Delivery usually takes <strong>7–14 business days</strong> after dispatch.</li>
              <li>All shipments are <strong>tracked</strong>; you receive the tracking number by email.</li>
              <li>Shipping is calculated at checkout based on your address.</li>
              <li><strong>Free shipping</strong> over $199 (US &amp; Canada), $249 (Europe), $229 (Asia Pacific), $279 (rest of world).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">1. Processing time</h2>
            <p>
              Orders are prepared and dispatched from our workshop within <strong>1–2 business days</strong>
              (Monday–Friday, excluding public holidays). During sale periods and the weeks before major holidays,
              processing can take up to <strong>4 business days</strong> — we will email you if your order is
              affected.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">2. Delivery estimates</h2>
            <p>
              Estimated delivery is <strong>7–14 business days</strong> after dispatch for most destinations.
              The estimate shown at checkout is calculated from your delivery address. These are estimates, not
              guaranteed dates: customs clearance and local carrier delays are outside our control.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">3. Shipping rates</h2>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(74,58,36,0.2)' }}>
                    <th className="py-2 pr-4 font-semibold text-[#2A2118]">Region</th>
                    <th className="py-2 pr-4 font-semibold text-[#2A2118]">Flat rate</th>
                    <th className="py-2 font-semibold text-[#2A2118]">Free over</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['United States, Canada', '$34.72', '$199'],
                    ['Europe — UK, Germany, France, Italy, Spain, Netherlands', '$48.61', '$249'],
                    ['Asia Pacific — Australia, Japan, South Korea, Singapore', '$41.67', '$229'],
                    ['Rest of world', '$55.56', '$279'],
                  ].map(([region, rate, free]) => (
                    <tr key={region} style={{ borderBottom: '1px solid rgba(74,58,36,0.1)' }}>
                      <td className="py-2 pr-4">{region}</td>
                      <td className="py-2 pr-4">{rate}</td>
                      <td className="py-2">{free}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              The exact charge for your order is always shown in the order summary at checkout before you pay.
              Free-shipping thresholds are calculated on the discounted subtotal, before shipping and taxes.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">4. Tracking</h2>
            <p>
              Every parcel ships with a tracking number, emailed to you as soon as the order is dispatched. If you
              have not received tracking within 3 business days of ordering, check your spam folder, then contact us.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">5. Customs, duties and taxes</h2>
            <p>
              Orders are shipped from our workshop to your delivery address. Depending on your country, the
              shipment may be subject to import duties, taxes, or customs handling fees. <strong>These charges are
              the responsibility of the recipient</strong> and are not included in the price paid at checkout.
            </p>
            <p className="mt-2">
              If a parcel is refused at customs or left uncollected and is returned to us, the original shipping
              cost is not refunded and any return shipping charged to us is deducted from the refund.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">6. Address accuracy</h2>
            <p>
              Please check your delivery address carefully at checkout. We cannot change the address after dispatch.
              If a parcel is returned to us as undeliverable because of an incorrect or incomplete address, we will
              contact you to arrange redelivery — an additional shipping charge applies.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">7. Lost or delayed parcels</h2>
            <p>
              If tracking has not updated for more than <strong>10 business days</strong>, contact us and we will
              open a trace with the carrier. If the parcel is confirmed lost, we will send a replacement or issue a
              full refund, at your choice.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">8. Split shipments</h2>
            <p>
              If your order contains items with different preparation times, we may ship them separately at no extra
              cost. You will receive a tracking number for each parcel.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#2A2118] mb-2">9. Contact</h2>
            <p>
              Questions about a shipment? Email{' '}
              <a href="mailto:hello@lowflame.store" className="underline underline-offset-2 text-[#8A6A2E]">hello@lowflame.store</a>{' '}
              or use our <Link href="/contact" className="underline underline-offset-2 text-[#8A6A2E]">contact form</Link>.
              We answer within 1–2 business days.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 flex flex-wrap gap-4 font-sans text-sm" style={{ borderTop: '1px solid rgba(74,58,36,0.14)' }}>
          <Link href="/refund-policy" className="underline underline-offset-4 text-[#8A6A2E]">Returns &amp; Refunds</Link>
          <Link href="/terms" className="underline underline-offset-4 text-[#8A6A2E]">Terms of Service</Link>
          <Link href="/privacy" className="underline underline-offset-4 text-[#8A6A2E]">Privacy Policy</Link>
          <Link href="/contact" className="underline underline-offset-4 text-[#8A6A2E]">Contact</Link>
        </div>
      </div>
    </div>
  )
}
