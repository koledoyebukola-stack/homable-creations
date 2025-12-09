import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-4">
            Privacy Policy
          </h1>
          
          <p className="text-sm text-[#888888] mb-8">
            Last updated: December 2025
          </p>
          
          <div className="space-y-8 text-[#555555]">
            <p>
              Homable Creations ("we", "our") respects your privacy. This policy explains what information we collect and how we use it.
            </p>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address when you create an account</li>
                <li>Uploaded decor photos to identify items and provide results</li>
                <li>Basic usage data such as device type, browser information and pages visited</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                How We Use Your Information
              </h2>
              <p className="mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Operate and improve Homable</li>
                <li>Analyze uploaded photos</li>
                <li>Maintain account access and security</li>
                <li>Understand general usage patterns</li>
              </ul>
              <p className="mt-4 font-semibold">
                We do not sell your personal information.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Affiliate Links
              </h2>
              <p>
                Some links on Homable may be affiliate links. We may earn a small commission if you purchase through these links, at no extra cost to you. All product pricing, availability and fulfillment are handled by third-party retailers.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Data Storage & Security
              </h2>
              <p>
                We store data using trusted providers and protect it through encrypted connections and restricted access. We limit storage of uploaded photos and only retain the data necessary to provide the service.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Your Rights
              </h2>
              <p>
                You may request access to or deletion of your personal information at any time by contacting us.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Contact
              </h2>
              <p>
                If you have questions about this policy, please contact:
              </p>
              <p className="mt-2">
                <a href="mailto:homablecreations@gmail.com" className="text-[#111111] hover:underline font-medium">
                  homablecreations@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}