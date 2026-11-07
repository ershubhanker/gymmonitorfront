import React from 'react';
import { MessageCircle, Phone, Mail, ShieldCheck, Sparkles, Send, CheckCircle2, Headphones } from 'lucide-react';

const WhatsAppContactNotice = () => {
  const supportPhone = "+919041300884";
  const supportEmail = "info@maskottchentechnology.com";
  const whatsappUrl = `https://wa.me/919041300884?text=${encodeURIComponent('Hi gymMonitor team, I would like to configure dedicated WhatsApp chat for my gym.')}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-8 sm:px-10 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <MessageCircle className="h-8 w-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Dedicated WhatsApp Integration
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                WhatsApp Chat for Your Gym
              </h2>
              <p className="text-emerald-50 text-sm mt-1 max-w-xl">
                Chat with members, answer enquiries, and see who replied to your reminders directly from your gym portal.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Highlight Message Box */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                Contact gymMonitor team to configure your WhatsApp no.
              </h3>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                To activate direct two-way WhatsApp chat with your gym members, your official WhatsApp Business number needs to be verified and configured with our Meta Cloud API service.
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Send className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">2-Way Live Chat</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Receive inbound replies from members and send free-form replies directly from your computer.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Official Business API</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Meta verified API ensures zero risk of WhatsApp number ban compared to unofficial extensions.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Automated Sync</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Automatic payment receipts, expiry warnings, and welcome letters sent from your brand name.
              </p>
            </div>
          </div>

          {/* Contact Support CTA Box */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/80 border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-sm font-semibold text-gray-900">
                  Ready to connect your WhatsApp number?
                </div>
                <div className="text-xs text-gray-500">
                  Our setup team will configure and verify your number in minutes.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm shadow-emerald-700/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>

                <a
                  href="tel:+919041300884"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-gray-500" />
                  +91-9041300884
                </a>

                <a
                  href={`mailto:${supportEmail}?subject=Configure%20WhatsApp%20Number%20for%20Gym`}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-gray-500" />
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppContactNotice;

