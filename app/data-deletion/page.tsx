import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion | Low Flame',
  description: 'How to request deletion of your data from Low Flame.',
}

export default function DataDeletionPage() {
  return (
    <div className="bg-[#FBFAF7] min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <h1 className="font-en text-3xl md:text-4xl text-ink font-medium tracking-[0.005em] mb-2">User Data Deletion</h1>
        <p className="font-sans text-xs text-ink-soft/50 mb-8">Last updated: August 2026</p>

        <div className="space-y-6 font-sans text-sm leading-7 text-[#4A4A4A]">
          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">1. Your Right to Deletion</h2>
            <p>
              In accordance with applicable privacy laws and platform policies (including Meta&apos;s Platform
              Terms and Data Policy), you may request that we delete the personal data we hold about you at any
              time. This includes data collected through our website and through connected social media accounts.
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">2. How to Request Deletion</h2>
            <p>To request deletion of your data, please contact us by email and include the following information:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The email address associated with your account</li>
              <li>The social media account or platform you connected (if any)</li>
              <li>A brief description of the data you would like deleted</li>
            </ul>
            <p className="mt-3">
              <strong>Contact email:</strong>{' '}
              <a href="mailto:hunterstevensai@163.com" className="text-[#8A6A2E] hover:underline">hunterstevensai@163.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">3. What Happens Next</h2>
            <p>
              We will verify your identity and process your deletion request within 30 days. Once your request is
              completed, your personal data will be permanently deleted from our systems, except where we are
              legally required to retain certain records (for example, for tax or fraud-prevention purposes).
            </p>
          </section>

          <section>
            <h2 className="font-en text-lg font-semibold text-ink mb-2">4. Contact</h2>
            <p>
              For any questions about this Data Deletion policy, please contact us at{' '}
              <a href="mailto:hunterstevensai@163.com" className="text-[#8A6A2E] hover:underline">hunterstevensai@163.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
