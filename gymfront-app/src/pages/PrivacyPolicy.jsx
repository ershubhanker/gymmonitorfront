// src/pages/PrivacyPolicy.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Shield, 
  ArrowLeft,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              <span>Gym Monitor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <Shield className="h-3.5 w-3.5" />
            Last Updated: April 2026
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Your privacy matters to us. Learn how we collect, use, and protect your data.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-10 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Table of Contents</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              '1. Introduction',
              '2. Who We Are',
              '3. Data We Collect',
              '4. How We Use Your Data',
              '5. How We Share Your Data',
              '6. Data Security',
              '7. Data Retention',
              '8. Your Privacy Rights',
              '9. Grievance Officer',
              '10. Changes to This Policy'
            ].map((item) => (
              <a 
                key={item} 
                href={`#section-${item.split('.')[0]}`}
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="space-y-10 text-gray-700">
          {/* Section 1 */}
          <section id="section-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="leading-relaxed mb-4">
              Gymmonitor.in ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              personal information when you use our software-as-a-service (SaaS) gym management 
              platform, including our web application located at https://gymmonitor.in (the "Service").
            </p>
            <p className="leading-relaxed mb-4">
              We process personal data as both a <strong>Data Controller</strong> and a <strong>Data Processor</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>As a Controller:</strong> For our direct business users (Gym Owners, Staff) and 
                website visitors, we determine the purposes and means of processing your data.
              </li>
              <li>
                <strong>As a Processor:</strong> On behalf of our business users (Gyms), we process the 
                data of their members (e.g., for check-ins, attendance, and bookings). The Gym is the 
                Data Controller for this member data, and we act under their instructions.
              </li>
            </ul>
            <p className="leading-relaxed">
              This policy applies to all users of the Service. By using the Service, you agree to the 
              collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Who We Are</h2>
            <p className="leading-relaxed mb-4">Our legal entity details are:</p>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-2">
                <p><strong>Company Name:</strong> Maskottchen Technology</p>
                {/* <p><strong>Registered Address:</strong> [Your Company Address]</p> */}
                <p>
                  <strong>Contact Email:</strong>{' '}
                  <a href="mailto:info@maskottchentechnology.com" className="text-blue-600 hover:underline">
                    info@maskottchentechnology.com
                  </a>
                </p>
                {/* <p><strong>Grievance Officer:</strong> [Name and Email of Grievance Officer]</p> */}
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data We Collect</h2>
            <p className="leading-relaxed mb-4">
              We collect different categories of data depending on your relationship with our Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              3.1. Information We Collect from Gym Owners and Staff (Business Users)
            </h3>
            <p className="leading-relaxed mb-3">This data is collected to set up and manage your account on our platform.</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Business Contact Details:</strong> Name, email address, phone number, job title, and business address.</li>
              <li><strong>Account Information:</strong> Gym name, username, and password.</li>
              <li><strong>Billing and Payment Information:</strong> Financial details needed for subscription billing (e.g., payment card information, which is processed by our third-party payment gateway and not stored directly by us).</li>
              <li><strong>Service Usage Data:</strong> Information on how you use our platform, including login dates/times, IP address, device information, and feature usage analytics.</li>
              <li><strong>Support and Communication Records:</strong> Contents of emails, chat logs, or phone calls when you contact our support team.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              3.2. Information We Process on Behalf of Gyms (Member Data)
            </h3>
            <p className="leading-relaxed mb-3">
              We process this data solely based on the instructions of the Gym (the Data Controller) 
              and their contract with you.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Member Profile Information:</strong> Full name, email address, phone number, and personal photo.</li>
              <li><strong>Membership Details:</strong> Membership type, status, and history.</li>
              <li><strong>Activity Data:</strong> Booking history (classes, sessions), attendance logs, and check-in times.</li>
              <li><strong>Health & Fitness Data:</strong> If you voluntarily connect a wearable device or provide health data to the gym via our app, we may process this on their behalf.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              3.3. Information Collected Automatically (All Users)
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> When you access the Service, we may collect certain information automatically, including your IP address, browser type, browser version, the pages you visit, the time and date of your visit, time spent on those pages, unique device identifiers, and other diagnostic data.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="section-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Use Your Data</h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              4.1. For Business Users (Gym Owners & Staff)
            </h3>
            <p className="leading-relaxed mb-3">We use your data to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Provide the Service:</strong> To create and manage your account, authenticate your access, 
                and deliver the features of our platform (scheduling, membership management, billing, etc.). 
                <em className="text-gray-500 block text-sm mt-1">(Legal Basis: Contractual Necessity)</em>
              </li>
              <li>
                <strong>Process Payments:</strong> To bill your account for our services. 
                <em className="text-gray-500 block text-sm mt-1">(Legal Basis: Contractual Necessity / Legal Obligation)</em>
              </li>
              <li>
                <strong>Customer Support:</strong> To respond to your inquiries and resolve issues. 
                <em className="text-gray-500 block text-sm mt-1">(Legal Basis: Legitimate Interest / Contract)</em>
              </li>
              <li>
                <strong>Service Improvements:</strong> To analyze usage data to understand how our clients use 
                Gymmonitor and to improve our services. 
                <em className="text-gray-500 block text-sm mt-1">(Legal Basis: Legitimate Interest)</em>
              </li>
              <li>
                <strong>Marketing:</strong> To send you occasional product updates, newsletters, or offers 
                (you can opt-out at any time). 
                <em className="text-gray-500 block text-sm mt-1">(Legal Basis: Consent / Legitimate Interest)</em>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              4.2. For Member Data (Processed on behalf of Gyms)
            </h3>
            <p className="leading-relaxed mb-3">We process this data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Enable gym check-ins and attendance tracking.</li>
              <li>Manage class bookings and schedules.</li>
              <li>Send administrative messages related to the gym (e.g., booking confirmations, payment receipts).</li>
              <li>Provide the gym with analytics on member activity.</li>
            </ul>
            <p className="mt-3 text-sm text-gray-500 italic">
              The legal basis for this processing is Contractual Necessity as we are processing this data 
              to perform our contract with the gym. We rely on the gym to obtain the necessary consent from 
              their members for this processing.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. How We Share Your Data</h2>
            <p className="leading-relaxed mb-4">
              We do not sell your personal data. We may share your data only as necessary to operate the 
              Service or to fulfill legal obligations.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.1. Third-Party Service Providers</h3>
            <p className="leading-relaxed mb-3">We share data with trusted third parties who perform services on our behalf:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Payment Processors:</strong> To handle subscription billing (e.g., Stripe, Razorpay).</li>
              <li><strong>Cloud Hosting and IT Services:</strong> To store and back up your data (e.g., AWS, Google Cloud).</li>
              <li><strong>Analytics and Monitoring Tools:</strong> To help us monitor system performance and improve our services (e.g., Google Analytics).</li>
              <li><strong>Customer Support Tools:</strong> To manage support inquiries and communications.</li>
              <li><strong>Communication Services:</strong> To send out service-related emails and notifications.</li>
            </ul>
            <p className="leading-relaxed mb-4">
              Each third-party provider is contractually obligated to safeguard your data and only process it 
              for the specific purpose provided.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.2. Legal Requirements</h3>
            <p className="leading-relaxed">
              We may disclose your information if required to do so by law or in response to valid requests 
              by public authorities (e.g., a court or a government agency).
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
            <p className="leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your personal data 
              against unauthorized access, alteration, disclosure, or destruction. These measures include 
              encryption of sensitive data (both in transit and at rest), access controls, and regular 
              security audits of our systems.
            </p>
            <p className="leading-relaxed">
              However, no method of transmission over the Internet or electronic storage is 100% secure, 
              and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="leading-relaxed mb-4">
              We retain personal data only for as long as necessary to fulfill the purposes for which it 
              was collected or as required by law.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account & Billing Data:</strong> We keep your account information for the duration 
                of your contract and for a period after to comply with tax and accounting laws (e.g., for 5-7 years).
              </li>
              <li>
                <strong>Member Data (Processed for Gyms):</strong> We retain this data as per the gym's 
                instructions or until the gym closes its account with us.
              </li>
              <li>
                <strong>Support & Usage Data:</strong> We retain this for a shorter period, typically for 
                up to 1-3 years, to resolve issues and improve the Service.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="section-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Privacy Rights</h2>
            <p className="leading-relaxed mb-4">
              Depending on your location (e.g., EU, UK, California, India), you may have certain rights 
              regarding your personal data. These may include:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Right to Access:</strong> You can request a copy of the data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate or incomplete data.</li>
              <li><strong>Right to Erasure:</strong> You can request that we delete your personal data (subject to legal obligations).</li>
              <li><strong>Right to Restrict Processing:</strong> You can ask us to stop processing your data under certain conditions.</li>
              <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a machine-readable format.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">How to Exercise Your Rights</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>For Gym Owners/Staff:</strong> You can manage your data directly through your account 
                settings or by contacting us at 
                <a href="mailto:info@maskottchentechnology.com" className="text-blue-600 hover:underline ml-1">
                  info@maskottchentechnology.com
                </a>
              </li>
              <li>
                <strong>For Gym Members:</strong> Your data is controlled by the gym you belong to. To exercise 
                your rights, please contact your gym directly. If your gym has used our platform to manage your 
                data, we can assist them in fulfilling your request.
              </li>
            </ul>
          </section>

          {/* Section 9 */}
          <section id="section-9">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Grievance Officer (For Indian Compliance)</h2>
            <p className="leading-relaxed mb-4">
              In accordance with the Information Technology Act, 2000 and the SPDI Rules, we have appointed 
              a Grievance Officer to address any concerns or complaints you may have regarding the processing 
              of your personal data.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-2">
                <p><strong>Name:</strong> Karan Tiwari</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:[Officer's Email]" className="text-blue-600 hover:underline">
                    info@maskottchentechnology.com
                  </a>
                </p>
                <p><strong>Response Time:</strong> We aim to respond to all complaints within 30 days.</p>
              </div>
            </div>
          </section>

          {/* Section 10 */}
          <section id="section-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. 
              You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mt-10 border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Have Questions?</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href="mailto:info@maskottchentechnology.com" className="text-blue-600 hover:underline font-medium">
                    info@maskottchentechnology.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-800">+91-9041300884</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 text-center text-sm mt-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Gym Monitor
          </div>
        </div>
        <p>© {new Date().getFullYear()} Gym Monitor by Maskottchen Technology. All rights reserved.</p>
        <p className="mt-1 text-gray-500">
          Support:{' '}
          <a href="mailto:info@maskottchentechnology.com" className="text-blue-400 hover:underline">
            info@maskottchentechnology.com
          </a>
        </p>
      </footer>
    </div>
  );
}