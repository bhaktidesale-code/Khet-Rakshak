/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Send, Phone, Video, Upload, CheckCircle2, ChevronRight, 
  HelpCircle, ShieldCheck, MessageSquare, Volume2, Info, Star
} from 'lucide-react';
import { Language, Expert } from '../types';
import { translations } from '../translations';

interface ExpertConsultationProps {
  currentLanguage: Language;
  initialMessage?: string;
  onClearInitialMessage?: () => void;
}

export default function ExpertConsultation({
  currentLanguage,
  initialMessage,
  onClearInitialMessage
}: ExpertConsultationProps) {
  const t = translations[currentLanguage];

  // Mock list of agricultural officers/experts
  const experts: Expert[] = [
    {
      id: 'exp-1',
      name: 'Dr. Anjali Deshmukh',
      qualification: 'Ph.D. in Plant Pathology (MPKV Rahuri)',
      specialization: 'Fungal crop spot diagnostics & Onion diseases',
      languages: ['Marathi', 'Hindi', 'English'],
      availability: 'Mon - Fri (10:00 AM - 04:00 PM)',
      rating: 4.9,
      fee: 150,
      avatar: 'AD'
    },
    {
      id: 'exp-2',
      name: 'Prof. Ramchandra Gowda',
      qualification: 'M.Sc. in Soil Chemistry (UAS Bangalore)',
      specialization: 'Micro-nutrient recommendations & pH remediation',
      languages: ['Kannada', 'Telugu', 'English'],
      availability: 'Wed - Sun (02:00 PM - 07:00 PM)',
      rating: 4.7,
      fee: 100,
      avatar: 'RG'
    }
  ];

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<{ sender: 'farmer' | 'bot'; text: string; time: string }[]>([
    { sender: 'bot', text: 'Namaskar! I am the Khet Rakshak Agri-Assistant. Ask me anything about crop diseases, sensor moisture ranges, or drone scheduling.', time: 'Just now' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [bookedVideoExpert, setBookedVideoExpert] = useState<Expert | null>(null);

  React.useEffect(() => {
    if (initialMessage) {
      const farmerMsg = { sender: 'farmer' as const, text: initialMessage, time: 'Just now' };
      const query = initialMessage.toLowerCase();
      let reply = "I'm checking that query against our crop advisory database. For highly specific chemical dosages, please schedule a live video call with Dr. Anjali Deshmukh.";
      
      if (query.includes('blight') || query.includes('fungal') || query.includes('spot') || query.includes('mildew') || query.includes('zone c') || query.includes('zone d') || query.includes('scans')) {
        reply = "Visual spot clustering (like Blight or Mildew) is usually triggered by stagnant humidity above 70%. We recommend inspecting the leaf underside, clearing weeds to increase wind flow, and refraining from massive chemical sprays until checked in person.";
      } else if (query.includes('moisture') || query.includes('water') || query.includes('irrigation')) {
        reply = "Optimal soil moisture for vegetative bulb formation is 22% - 28%. If moisture drops below 18%, onion leaves will start wilting from the margins. Verify drip pipe blockage first.";
      } else if (query.includes('nitrogen') || query.includes('fertiliser') || query.includes('urea') || query.includes('npk')) {
        reply = "Low Nitrogen causes pale yellow older leaves. Apply neem-coated urea or composted manure specifically near the drip lines to avoid waste. Always check sensor values first.";
      }

      setChatMessages((prev) => [
        ...prev, 
        farmerMsg,
        { 
          sender: 'bot' as const, 
          text: `${reply}\n\n⚠️ DISCLAIMER: Automated guidance is advisory. Real expert verification is recommended before applying chemicals.`, 
          time: 'Just now' 
        }
      ]);

      if (onClearInitialMessage) {
        onClearInitialMessage();
      }
    }
  }, [initialMessage, onClearInitialMessage]);

  // Scripted response mapping for absolute stability and relevance
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.toLowerCase();
    const newMessages = [...chatMessages, { sender: 'farmer' as const, text: userInput, time: 'Just now' }];
    setChatMessages(newMessages);
    setUserInput('');

    setTimeout(() => {
      let reply = "I'm checking that query against our crop advisory database. For highly specific chemical dosages, please schedule a live video call with Dr. Anjali Deshmukh.";
      
      if (query.includes('blight') || query.includes('fungal') || query.includes('spot') || query.includes('mildew')) {
        reply = "Visual spot clustering (like Blight or Mildew) is usually triggered by stagnant humidity above 70%. We recommend inspecting the leaf underside, clearing weeds to increase wind flow, and refraining from massive chemical sprays until checked in person.";
      } else if (query.includes('moisture') || query.includes('water') || query.includes('irrigation')) {
        reply = "Optimal soil moisture for vegetative bulb formation is 22% - 28%. If moisture drops below 18%, onion leaves will start wilting from the margins. Verify drip pipe blockage first.";
      } else if (query.includes('nitrogen') || query.includes('fertiliser') || query.includes('urea') || query.includes('npk')) {
        reply = "Low Nitrogen causes pale yellow older leaves. Apply neem-coated urea or composted manure specifically near the drip lines to avoid waste. Always check sensor values first.";
      } else if (query.includes('price') || query.includes('cost') || query.includes('book')) {
        reply = "Drone scanning starts at ₹100 base fee + area charge (₹70/acre for AI report). You can book a pilot pass directly through the 'Book Drone' section in the navbar.";
      }

      setChatMessages((prev) => [...prev, { 
        sender: 'bot' as const, 
        text: `${reply}\n\n⚠️ DISCLAIMER: Automated guidance is advisory. Real expert verification is recommended before applying chemicals.`, 
        time: 'Just now' 
      }]);
    }, 1000);
  };

  const handleBookVideo = (exp: Expert) => {
    setBookedVideoExpert(exp);
    setShowVideoModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Page description */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Ask an Expert</h2>
          <p className="text-xs text-gray-500">Consult with certified state agronomists and coordinate ground check visits.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
          Online Officers: 4
        </span>
      </div>

      {/* Row: Chatbot on Left, Video Schedule cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Chatbot Simulator panel */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-[450px] overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-emerald-50/30">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              🤖
            </div>
            <div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white">"Krishi Bol" Automated Assistant</h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Ready to assist • Advisory only</p>
            </div>
          </div>

          {/* Messages block */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx}
                className={`max-w-[85%] p-3.5 rounded-2xl ${
                  msg.sender === 'farmer' 
                    ? 'bg-emerald-600 text-white ml-auto rounded-tr-none' 
                    : 'bg-gray-50 dark:bg-gray-850 text-gray-800 dark:text-gray-200 mr-auto rounded-tl-none border'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                <span className="text-[8px] opacity-60 text-right block mt-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask about Blight, Nitrogen, or Irrigation..." 
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs focus:outline-none"
              id="chatbot-input-field"
            />
            <button 
              type="submit"
              className="px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl flex items-center justify-center"
              id="chatbot-send-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Agronomist booking cards */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Schedule 1-on-1 Consultation</h3>
          <p className="text-xs text-gray-500">Book direct face-to-face video checks with crop pathologists.</p>

          <div className="space-y-4 text-xs">
            {experts.map((exp) => (
              <div key={exp.id} className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-850 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                    {exp.avatar}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{exp.name}</h4>
                      <span className="text-[10px] text-amber-600 font-bold">⭐ {exp.rating}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">{exp.qualification}</p>
                    <p className="text-gray-500 leading-relaxed font-semibold">{exp.specialization}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-200/50 pt-2.5">
                  <div>
                    <span className="text-[10px] text-gray-400">Consultation Fee</span>
                    <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-400">₹{exp.fee}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleBookVideo(exp)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 flex items-center gap-1 shadow-md shadow-emerald-700/15"
                    id={`book-expert-video-${exp.id}`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Book Video Call</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Video call booking success modal */}
      {showVideoModal && bookedVideoExpert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mx-auto shadow-md">
              ✓
            </div>
            <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Video Call Scheduled!</h3>
            <p className="text-xs text-gray-500">
              A private meeting room link has been reserved with <strong>{bookedVideoExpert.name}</strong> for tomorrow afternoon at 03:00 PM.
            </p>
            <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 rounded p-2 border">
              We have shared the meeting ID with you via SMS and WhatsApp.
            </p>
            <button 
              onClick={() => setShowVideoModal(false)}
              className="w-full py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
