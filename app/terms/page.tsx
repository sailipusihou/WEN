import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Low Flame',
  description: 'Terms of Service for Low Flame.',
}

export default function TermsPage() {
  return (
    <div className="bg-[#FBFAF7] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <h1 className="font-en text-3xl md:text-4xl text-ink font-medium tracking-[0.005em] mb-2">Terms of Service</h1>
        <p className="font-sans text-xs text-ink-soft/50 mb-8">Last updated: August 2026</p>

        <div className="space-y-6 font-sans text-sm leading-7 text-[#4A4A4A]">
          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using the Low Flame website ("Site"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Site.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">2. Products & Orders</h2>
            <p>All products are described and priced in USD. We strive to keep product information accurate; prices and availability may change without notice. By placing an order you agree to pay the total amount shown at checkout, including any applicable shipping costs. Payments are processed securely through our payment providers.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">3. Shipping & Returns</h2>
            <p>Shipping estimates are provided at checkout and are not guaranteed delivery dates. Return requests can be submitted from your account within the applicable period; each request is reviewed by our team before approval.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">4. Reviews & User Content</h2>
            <p>Customers who have completed an order may submit reviews, which are displayed publicly on the Site. You are solely responsible for the content you submit; it must not be unlawful, misleading, or infringe the rights of others. We reserve the right to moderate or remove content at our discretion.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">5. Intellectual Property</h2>
            <p>All content on the Site, including text, images, logos, and branding, is the property of Low Flame or its licensors and is protected by applicable laws. You may not copy or reuse it without permission.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Low Flame shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Site or products purchased through it.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">7. Contact</h2>
            <p>Questions about these Terms can be sent through our <a href="/contact" className="text-[#8A6A2E] hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
