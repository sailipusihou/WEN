import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Low Flame',
  description: 'Privacy Policy for Low Flame.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#F1E9DC] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <h1 className="font-en text-3xl md:text-4xl text-[#221E1A] font-semibold tracking-tight mb-2">Privacy Policy</h1>
        <p className="font-sans text-xs text-[#57503F]/50 mb-8">Last updated: August 2026</p>

        <div className="space-y-6 font-sans text-sm leading-7 text-[#4A4A4A]">
          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">1. Information We Collect</h2>
            <p>When you create an account, place an order, or contact us, we collect the information you provide — such as your name, email address, shipping address, phone number, and order history. We may also collect basic usage information to improve our services.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">2. How We Use Your Information</h2>
            <p>We use your information to process and deliver orders, provide customer support, send order updates and service messages, prevent fraud, and improve the Site. We may send promotional emails only if you have opted in; you can unsubscribe at any time.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">3. Payment Information</h2>
            <p>Payments are processed by trusted third-party providers (e.g., PayPal). We do not store your full card details on our servers.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">4. Social Media Integration</h2>
            <p>If you authorize a social media account (such as TikTok) to connect with our marketing console, we access it only through the platform&apos;s official APIs, with your consent, and solely for publishing our own content and understanding engagement. We never sell or share your personal data with third parties for their own purposes.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">5. Cookies</h2>
            <p>We use essential cookies to keep you signed in and to remember your shopping cart. You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">6. Data Retention & Your Rights</h2>
            <p>We retain order data as long as necessary for legal and business purposes. You may request access to, correction of, or deletion of your personal data by contacting us through the <a href="/contact" className="text-[#8A6A2E] hover:underline">Contact page</a>.</p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-[#221E1A] mb-2">7. Contact</h2>
            <p>For any privacy questions, please reach out via our <a href="/contact" className="text-[#8A6A2E] hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
