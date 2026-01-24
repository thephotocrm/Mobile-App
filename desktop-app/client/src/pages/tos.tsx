import { Camera } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <Camera className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">The Photo CRM</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8" data-testid="text-tos-title">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Last updated: December 28, 2025
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using The Photo CRM ("Service"), you agree to be
              bound by these Terms of Service ("Terms"). If you do not agree to
              these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p>
              The Photo CRM is a customer relationship management platform
              designed for photographers. The Service includes tools for client
              management, scheduling, proposals, contracts, payments, galleries,
              and automated communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Account Registration
            </h2>
            <p>To use the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Provide accurate and complete information during registration
              </li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update your account information as needed</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Subscription and Payment
            </h2>
            <p>
              Access to certain features requires a paid subscription. By
              subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Pay all applicable fees as described at the time of purchase
              </li>
              <li>
                Authorize recurring billing until you cancel your subscription
              </li>
              <li>
                Cancellations take effect at the end of the current billing
                period
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to modify pricing with 30 days' notice.
              Continued use after price changes constitutes acceptance of the
              new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Transmit spam, viruses, or other harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Use the Service to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Data</h2>
            <p>
              You retain ownership of all data you upload to the Service ("Your
              Data"). By using the Service, you grant us a limited license to
              store, process, and display Your Data solely to provide the
              Service. You are responsible for maintaining backups of Your Data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Third-Party Integrations
            </h2>
            <p>
              The Service integrates with third-party services including Google
              (Calendar, Gmail, Meet), Stripe, Twilio, and Cloudinary. Your use
              of these integrations is subject to the respective third party's
              terms of service. We are not responsible for the availability or
              functionality of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Intellectual Property
            </h2>
            <p>
              The Service, including its design, features, and content
              (excluding Your Data), is owned by The Photo CRM and protected by
              intellectual property laws. You may not copy, modify, or create
              derivative works of the Service without our written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, OR SECURE. USE OF THE SERVICE IS AT
              YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PHOTO CRM SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS
              OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU
              PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless The Photo CRM from any
              claims, damages, or expenses arising from your use of the Service,
              violation of these Terms, or infringement of any third-party
              rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time
              for violation of these Terms or for any other reason with notice.
              Upon termination, your right to use the Service ceases
              immediately. You may export Your Data before termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              13. Changes to Terms
            </h2>
            <p>
              We may modify these Terms at any time. We will notify you of
              material changes via email or through the Service. Continued use
              of the Service after changes constitutes acceptance of the
              modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware,
              without regard to conflict of law principles. Any disputes shall
              be resolved in the courts of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> support@thephotocrm.com
              <br />
              <strong>Website:</strong> thephotocrm.com
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 bg-slate-900 text-slate-400 text-center text-sm">
        <div className="flex justify-center gap-4 mb-4">
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <span>|</span>
          <Link href="/tos" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
        <p>
          &copy; {new Date().getFullYear()} The Photo CRM. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
