"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-green-700 mb-6">Privacy Policy</h1>
          
          <div className="prose max-w-none">
            <p className="mb-6">At Pangolin-X, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
            <p>We collect the following information:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Name and contact information</li>
              <li>Location data (state and LGA)</li>
              <li>Farm and crop information</li>
              <li>Payment information</li>
              <li>Usage data and preferences</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Provide personalized weather forecasts</li>
              <li>Generate crop-specific advice</li>
              <li>Process payments and maintain your subscription</li>
              <li>Improve our services</li>
              <li>Communicate important updates</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Protection</h2>
            <p>We implement various security measures to protect your information:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Secure data encryption</li>
              <li>Regular security audits</li>
              <li>Limited access to personal information</li>
              <li>Secure payment processing</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Sharing</h2>
            <p>We may share your data with:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Payment processors for subscription management</li>
              <li>Weather data providers to provide local forecasts</li>
              <li>Service providers helping us operate our platform</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Access your personal data</li>
              <li>Request data correction</li>
              <li>Delete your account</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Remember your preferences</li>
              <li>Analyze service usage</li>
              <li>Improve user experience</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Updates to Privacy Policy</h2>
            <p>We may update this policy periodically. Significant changes will be notified to users via email or service notifications.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Refund Policy</h2>
            <p>Our refund policy is as follows:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Refunds are only available for subscription charges that were successfully processed but did not reflect in your account</li>
              <li>No refunds are provided for successful signups or renewals where the service was accessible</li>
              <li>To request a refund, please contact us at contact@pangolin-x.com with your transaction details</li>
              <li>Refund requests must be submitted within 7 days of the transaction</li>
              <li>Processing of refunds may take 5-10 business days depending on your payment provider</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact Us</h2>
            <p>For privacy-related questions or concerns, contact us at:</p>
            <p>Email: contact@pangolin-x.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}