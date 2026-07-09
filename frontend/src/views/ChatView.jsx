import { useState } from 'react';
import { Users, Search, X } from 'lucide-react';
import ChatBox from '../components/chat/ChatBox';

/**
 * ChatView — Dedicated full-page Secure Chat view.
 * Features an interactive contact list sidebar + full ChatBox.
 *
 * When a contact is clicked, the ChatBox switches to that contact's
 * independent messaging thread dynamically.
 */

const CONTACTS = [
  { id: 1, name: 'Dr. Anita Mehra', role: 'Prosthodontist', status: 'online',  initials: 'AM', unread: 2 },
  { id: 2, name: 'Dr. Rajesh Kapoor', role: 'Orthodontist', status: 'offline', initials: 'RK', unread: 0 },
  { id: 3, name: 'Nurse Deepika',    role: 'Dental Hygienist', status: 'online', initials: 'ND', unread: 0 },
];

export default function ChatView() {
  const [activeContact, setActiveContact] = useState(CONTACTS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Secure Chat</h1>
        <p className="text-sm text-slate-400 mt-1">
          End-to-end encrypted messaging with your dental care team.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Contact List ───────────────────── */}
        <div className="lg:w-72 glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-dental-500" />
              Contacts
            </h3>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs
                         focus:outline-none focus:ring-2 focus:ring-dental-300 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Contact Cards */}
          <div className="space-y-1">
            {filteredContacts.map((contact) => {
              const isActive = activeContact?.id === contact.id;
              return (
                <button
                  key={contact.id}
                  id={`chatview-contact-${contact.id}`}
                  onClick={() => setActiveContact(contact)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                             transition-all duration-150
                             ${isActive
                               ? 'bg-dental-50 border border-dental-200 shadow-sm'
                               : 'hover:bg-slate-50 border border-transparent'
                             }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dental-400 to-dental-600
                                    flex items-center justify-center text-white text-xs font-bold">
                      {contact.initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white
                                     ${contact.status === 'online' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-dental-700' : 'text-slate-700'}`}>
                      {contact.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{contact.role}</p>
                  </div>
                  {contact.unread > 0 && !isActive && (
                    <span className="w-5 h-5 rounded-full bg-dental-500 text-white text-[10px] font-bold
                                   flex items-center justify-center flex-shrink-0">
                      {contact.unread}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredContacts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No contacts found</p>
            )}
          </div>
        </div>

        {/* ── Chat Area ──────────────────────── */}
        <div className="flex-1">
          <ChatBox key={activeContact?.id} overrideContact={activeContact} />
        </div>
      </div>
    </div>
  );
}
