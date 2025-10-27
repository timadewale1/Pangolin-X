"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-green-700 mb-6">Terms and Conditions</h1>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Pangolin-X (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p>Pangolin-X provides weather forecasting and agricultural advisory services for farmers in Nigeria. The service includes weather predictions, crop management advice, and related agricultural information.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. User Registration and Account</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be at least 18 years old or have legal guardian consent</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Subscription and Payments</h2>
            <p>Users must maintain an active subscription to access premium features. Payment terms:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Monthly subscription: ₦1,500</li>
              <li>Yearly subscription: ₦15,000</li>
              <li>Payments are non-refundable except as required by law</li>
              <li>Subscription auto-renews unless cancelled</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT ANY WARRANTY OF ANY KIND. While we strive for accuracy, we cannot guarantee:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>The absolute accuracy of weather forecasts</li>
              <li>The suitability of agricultural advice for all situations</li>
              <li>Uninterrupted or error-free service</li>
              <li>Specific results from using the service</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Limitation of Liability</h2>
            <p>PANGOLIN-X AND ITS OPERATORS SHALL NOT BE LIABLE FOR:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Any direct, indirect, incidental, special, or consequential damages</li>
              <li>Crop losses or agricultural damages</li>
              <li>Business decisions made based on our forecasts or advice</li>
              <li>Data loss or security breaches beyond our control</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. User Responsibilities</h2>
            <p>Users agree to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Use the service in compliance with all applicable laws</li>
              <li>Not share account credentials</li>
              <li>Not misuse or attempt to exploit the service</li>
              <li>Verify advice with local agricultural experts when necessary</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Modifications to Service</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Modify or discontinue any part of the service</li>
              <li>Update these terms at any time</li>
              <li>Change subscription fees with notice</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination</h2>
            <p>We may terminate or suspend access to the Service immediately, without prior notice, for:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Violation of these Terms</li>
              <li>Non-payment of subscription fees</li>
              <li>Fraudulent or illegal activities</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <p>Email: contact@pangolin-x.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}