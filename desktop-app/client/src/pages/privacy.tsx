import { Camera } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
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
        <h1
          className="text-4xl font-bold mb-8"
          data-testid="text-privacy-title"
        >
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Last updated: December 28, 2025
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              The Photo CRM ("we," "our," or "us") is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our customer
              relationship management platform designed for photographers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-medium mb-2">Account Information</h3>
            <p>
              When you register, we collect your name, email address, business
              name, and payment information.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">Client Data</h3>
            <p>
              You may store client contact information, project details,
              communications, and files within our platform.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">Usage Data</h3>
            <p>
              We automatically collect information about how you interact with
              our services, including pages visited, features used, and
              timestamps.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Google API Services
            </h2>
            <p>
              The Photo CRM integrates with Google services to enhance your
              experience. Our use of information received from Google APIs
              adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">Google Calendar</h3>
            <p>We access your Google Calendar to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Display your availability for client booking</li>
              <li>Create calendar events for appointments and shoots</li>
              <li>Sync booking confirmations to your calendar</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">Gmail</h3>
            <p>We access Gmail to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Send emails on your behalf to clients</li>
              <li>Track email delivery and read receipts</li>
              <li>
                Capture client replies and thread them into project activity
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">Google Meet</h3>
            <p>
              We access Google Meet to automatically generate video conference
              links for virtual consultations.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">
              Limited Use Disclosure
            </h3>
            <p>
              We only use Google user data to provide and improve user-facing
              features that are visible and prominent in our interface. We do
              not use Google user data for advertising, transfer it to third
              parties except as necessary to provide the service, or allow
              humans to read user data unless required for security purposes or
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative messages and updates</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>
                Monitor and analyze usage patterns to improve user experience
              </li>
              <li>Protect against fraudulent or unauthorized activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Data Sharing and Disclosure
            </h2>
            <p>
              We do not sell your personal information. We may share your
              information with:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Service Providers:</strong> Third parties who perform
                services on our behalf (payment processing via Stripe, email
                delivery via SendGrid, SMS via Twilio, image hosting via
                Cloudinary)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a
                merger, acquisition, or sale of assets
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide you services. You may request
              deletion of your data at any time by contacting us at
              support@thephotocrm.com. Upon account deletion, we will delete or
              anonymize your data within 30 days, except where retention is
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information, including encryption of data in
              transit and at rest, secure authentication systems, and regular
              security assessments.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access, correct, or delete your personal information</li>
              <li>Export your data in a portable format</li>
              <li>Revoke access to connected Google services at any time</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at support@thephotocrm.com or
              manage your connected accounts in Settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Children's Privacy
            </h2>
            <p>
              Our services are not intended for individuals under 18 years of
              age. We do not knowingly collect personal information from
              children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at:
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
