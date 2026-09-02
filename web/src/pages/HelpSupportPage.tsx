import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Mail, Phone, FileText, ChevronRight } from 'lucide-react';

export const HelpSupportPage: React.FC = () => {
  const faqs = [
    {
      question: 'How do I place an order?',
      answer: 'Browse products, add to cart, select delivery address, and checkout with Cash on Delivery.',
    },
    {
      question: 'How does Cash on Delivery work?',
      answer: 'Pay for your order when it is delivered to your doorstep. No online payment required.',
    },
    {
      question: 'How do I become a seller?',
      answer: 'Create a shop from the Business section, add products, and start selling!',
    },
    {
      question: 'How do I get verified?',
      answer: 'Submit your shop verification request with required documents. Admin will review and approve.',
    },
    {
      question: 'How can I track my order?',
      answer: 'Go to My Orders and click on the order to see detailed tracking information.',
    },
    {
      question: 'How do I contact a seller?',
      answer: 'Open a product page and click the chat button to start a conversation with the seller.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Help & Support</h1>
        </div>
      </header>

      <div className="p-4">
        {/* Contact Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <a
            href="tel:+995xxxxxxxxx"
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Phone className="text-green-600" size={24} />
            </div>
            <span className="text-sm font-medium text-gray-900">Call Us</span>
          </a>
          <a
            href="mailto:support@marketplace.com"
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="text-blue-600" size={24} />
            </div>
            <span className="text-sm font-medium text-gray-900">Email Us</span>
          </a>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl mb-6">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <HelpCircle size={20} />
              Frequently Asked Questions
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronRight size={18} className="text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Terms & Policies */}
        <div className="bg-white rounded-xl">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={20} />
              Terms & Policies
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
              <span className="text-gray-700">Terms of Service</span>
              <ChevronRight size={18} className="text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
              <span className="text-gray-700">Privacy Policy</span>
              <ChevronRight size={18} className="text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
              <span className="text-gray-700">Return Policy</span>
              <ChevronRight size={18} className="text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50">
              <span className="text-gray-700">Community Guidelines</span>
              <ChevronRight size={18} className="text-gray-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
