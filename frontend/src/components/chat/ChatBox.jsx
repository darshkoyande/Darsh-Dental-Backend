import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Lock, Smile, Paperclip, MoreVertical, Users, MessageSquare } from 'lucide-react';
import { useRole, getPatientDirectory } from '../../context/RoleContext';

/**
 * ChatBox — Role-aware secure messaging component.
 *
 * Dentist view: Left rail with patient contacts, click to switch conversations.
 * Patient view: Locked single thread with "Secure Portal Help Desk: Dr. Mehra".
 *
 * Props:
 *   embedded        (bool)   — When true, hides the contact rail (used on patient dashboard).
 *   overrideContact (object) — When provided (e.g., from ChatView), controls the header
 *                              contact display and thread key. Enables full interactivity
 *                              from parent-managed contact switching.
 */

const INITIAL_THREADS = {
  'DC-2001': [
    { id: 1, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Hello Rajivkumar! Welcome to DentalClub. How can I assist you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'Rajivkumar', senderRole: 'patient', content: 'Hi Dr. Mehra! I have some sensitivity in my lower right molars. Should I schedule a visit?', timestamp: '10:35 AM' },
    { id: 3, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Yes, let\'s schedule a check-up. In the meantime, try a sensitivity toothpaste and avoid very cold drinks.', timestamp: '10:38 AM' },
  ],
  'DC-2002': [
    { id: 1, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Hi Aarav! Your crown replacement follow-up is scheduled for next month. Any discomfort?', timestamp: '11:00 AM' },
    { id: 2, sender: 'Aarav Sharma', senderRole: 'patient', content: 'All good so far, Dr. Mehra! The new crown feels comfortable.', timestamp: '11:15 AM' },
  ],
  'DC-2003': [
    { id: 1, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Hello Priya! I reviewed your pre-surgical X-rays. We\'re all set for the wisdom tooth extraction on the 28th.', timestamp: '2:00 PM' },
    { id: 2, sender: 'Priya Patel', senderRole: 'patient', content: 'Thank you Dr. Mehra! Is there anything I need to prepare beforehand?', timestamp: '2:20 PM' },
    { id: 3, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Avoid eating 6 hours before the procedure. We\'ll provide detailed pre-op instructions at your next visit.', timestamp: '2:25 PM' },
  ],
  // ChatView staff threads (keyed by ChatView contact id)
  'chatview-1': [
    { id: 1, sender: 'Dr. Anita Mehra', senderRole: 'doctor', content: 'Good morning! Let me know if there are any urgent cases on today\'s schedule.', timestamp: '9:00 AM' },
  ],
  'chatview-2': [
    { id: 1, sender: 'Dr. Rajesh Kapoor', senderRole: 'doctor', content: 'Hi! I\'ve reviewed the orthodontic case files. We should discuss patient DC-2003 alignments.', timestamp: '10:45 AM' },
  ],
  'chatview-3': [
    { id: 1, sender: 'Nurse Deepika', senderRole: 'doctor', content: 'Room 2 sterilization complete. Ready for the next patient.', timestamp: '1:30 PM' },
  ],
};

function loadThreads() {
  try {
    const stored = localStorage.getItem('dc_chatMessages');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with any new initial threads that don't exist yet
      return { ...INITIAL_THREADS, ...parsed };
    }
    return { ...INITIAL_THREADS };
  } catch {
    return { ...INITIAL_THREADS };
  }
}

export default function ChatBox({ embedded = false, overrideContact = null }) {
  const { currentUser, userRole } = useRole();
  const patientDirectory = getPatientDirectory();
  const [threads, setThreads] = useState(loadThreads);
  const [activeContactId, setActiveContactId] = useState(
    userRole === 'patient' ? 'DC-2001' : (patientDirectory[0]?.id || 'DC-2001')
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Determine the effective thread key: overrideContact takes priority
  const effectiveThreadKey = overrideContact
    ? `chatview-${overrideContact.id}`
    : activeContactId;

  const messages = threads[effectiveThreadKey] || [];

  // Persist chat messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dc_chatMessages', JSON.stringify(threads));
    } catch { /* ignore */ }
  }, [threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clear input when switching contacts
  useEffect(() => {
    setInputValue('');
    setIsTyping(false);
  }, [effectiveThreadKey]);

  const senderName = userRole === 'dentist' ? 'Dr. Anita Mehra' : (currentUser?.name || 'Patient');
  const senderRole = userRole === 'dentist' ? 'doctor' : 'patient';

  // Resolve the displayed contact for the header
  const activeContact = overrideContact
    ? overrideContact
    : userRole === 'patient'
      ? { id: 'doctor', name: 'Dr. Anita Mehra', initials: 'AM', status: 'online', role: 'Secure Portal Help Desk' }
      : patientDirectory.find(p => p.id === activeContactId) || patientDirectory[0];

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: senderName,
      senderRole: senderRole,
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    setThreads(prev => ({
      ...prev,
      [effectiveThreadKey]: [...(prev[effectiveThreadKey] || []), newMsg],
    }));
    setInputValue('');

    // Simulate typing + auto-reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyName = overrideContact
        ? (overrideContact.name || 'Contact')
        : userRole === 'dentist'
          ? (activeContact?.name || 'Patient')
          : 'Dr. Anita Mehra';
      const replyRole = userRole === 'dentist' ? 'patient' : 'doctor';

      setThreads(prev => ({
        ...prev,
        [effectiveThreadKey]: [
          ...(prev[effectiveThreadKey] || []),
          {
            id: Date.now() + 1,
            sender: replyName,
            senderRole: replyRole,
            content: 'Thank you for the message! I\'ll review and respond shortly.',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          },
        ],
      }));
    }, 2000);
  }, [inputValue, senderName, senderRole, effectiveThreadKey, userRole, activeContact, overrideContact]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Hide the contact rail when embedded OR when overrideContact is provided
  const showContactRail = !embedded && !overrideContact;

  return (
    <div className={`flex ${showContactRail ? 'flex-col lg:flex-row gap-4' : ''}`}>

      {/* ── Contact Rail ──────────────────────── */}
      {showContactRail && (
        <div className="lg:w-72 glass-card p-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              {userRole === 'patient' ? (
                <><MessageSquare className="w-4 h-4 text-dental-500" /> Help Desk</>
              ) : (
                <><Users className="w-4 h-4 text-dental-500" /> Patient Threads</>
              )}
            </h3>
          </div>

          {userRole === 'patient' ? (
            /* Patient: Single locked contact */
            <div className="px-3 py-3 rounded-xl bg-dental-50 border border-dental-200">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dental-400 to-dental-600
                                  flex items-center justify-center text-white text-xs font-bold">
                    AM
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dental-700">Dr. Anita Mehra</p>
                  <p className="text-[10px] text-dental-500 font-medium">Secure Portal Help Desk</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Encrypted channel · Always available</span>
              </div>
            </div>
          ) : (
            /* Dentist: Active patient contact list — fully interactive */
            <div className="space-y-1">
              {patientDirectory.map((patient) => {
                const isActive = activeContactId === patient.id;
                const threadMsgs = threads[patient.id] || [];
                const lastMsg = threadMsgs[threadMsgs.length - 1];
                return (
                  <button
                    key={patient.id}
                    id={`chatbox-contact-${patient.id}`}
                    onClick={() => setActiveContactId(patient.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                               transition-all duration-150
                               ${isActive
                                 ? 'bg-dental-50 border border-dental-200 shadow-sm'
                                 : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dental-400 to-dental-600
                                      flex items-center justify-center text-white text-xs font-bold">
                        {patient.initials}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-dental-700' : 'text-slate-700'}`}>
                        {patient.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {lastMsg ? lastMsg.content.substring(0, 40) + '...' : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ── Chat Panel ──────────────────────── */}
      <div className={`flex-1 glass-card flex flex-col ${embedded ? 'h-[500px]' : 'h-[500px] lg:h-[560px]'}`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dental-400 to-dental-600
                              flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {overrideContact
                  ? overrideContact.initials
                  : userRole === 'patient' ? 'AM' : (activeContact?.initials || '?')}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                (overrideContact?.status === 'online' || (!overrideContact && true))
                  ? 'bg-emerald-400'
                  : 'bg-slate-300'
              }`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {overrideContact
                  ? overrideContact.name
                  : userRole === 'patient' ? 'Dr. Anita Mehra' : (activeContact?.name || 'Select Patient')}
              </h3>
              <p className={`text-[10px] font-medium ${
                (overrideContact?.status === 'offline') ? 'text-slate-400' : 'text-emerald-500'
              }`}>
                {overrideContact
                  ? (overrideContact.status === 'online' ? 'Online' : 'Offline')
                  : 'Online'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-50
                             px-2.5 py-1 rounded-full border border-slate-100">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </span>
            <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* Date Separator */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 font-medium bg-white px-3 py-1 rounded-full border border-slate-100">
              Today
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No messages yet. Start a conversation!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isDoctor = msg.senderRole === 'doctor';
            const alignRight = (userRole === 'dentist' && isDoctor) || (userRole === 'patient' && !isDoctor);
            return (
              <div key={msg.id} className={`flex ${alignRight ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <p className="text-[10px] text-slate-400 font-medium mb-1 px-1">
                    {msg.sender} · {msg.timestamp}
                  </p>
                  <div className={`chat-bubble ${alignRight ? 'chat-bubble-doctor' : 'chat-bubble-patient'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex flex-col items-start">
                <p className="text-[10px] text-slate-400 font-medium mb-1 px-1">
                  {overrideContact
                    ? overrideContact.name
                    : userRole === 'dentist' ? (activeContact?.name || 'Patient') : 'Dr. Anita Mehra'}
                </p>
                <div className="chat-bubble chat-bubble-patient flex items-center gap-1 px-5 py-3">
                  <span className="w-2 h-2 rounded-full bg-slate-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white/50 shrink-0">
          <div className="flex items-end gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors flex-shrink-0"
                    title="Attach file">
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm
                           text-slate-700 placeholder:text-slate-400 resize-none
                           focus:outline-none focus:ring-2 focus:ring-dental-300 focus:border-dental-400
                           transition-all duration-200"
              />
            </div>
            <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors flex-shrink-0"
                    title="Emoji">
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-dental-500 to-dental-600 text-white
                         shadow-sm hover:shadow-glow-blue transition-all duration-200 flex-shrink-0
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                         active:scale-95"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
