'use client';

import {
  Activity,
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Blocks,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  File,
  FileText,
  Filter,
  Headphones,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { navGroups } from '@/lib/navigation.js';
import {
  apiRequest,
  clearAuth,
  getStoredUser,
  saveAuth,
  type AuthResponse,
  type AuthUser,
} from '@/lib/api';

type Section =
  | 'dashboard'
  | 'inbox'
  | 'chatbots'
  | 'knowledge'
  | 'workflows'
  | 'integrations'
  | 'analytics'
  | 'settings';

type Conversation = {
  id: number;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  unread?: number;
  intent: string;
  messages: { text: string; time: string; mine?: boolean }[];
};

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  Bot,
  Files: FileText,
  Workflow,
  Blocks,
  ChartNoAxesCombined: Activity,
  Settings2,
};

const sectionInfo: Record<
  Section,
  { title: string; description: string; eyebrow: string }
> = {
  dashboard: {
    title: 'Good morning',
    description:
      'Here’s what’s happening with your WhatsApp AI workspace today.',
    eyebrow: 'Tuesday, November 24',
  },
  inbox: {
    title: 'Team inbox',
    description:
      'A shared place for your team and AI to support every customer.',
    eyebrow: 'Conversations',
  },
  chatbots: {
    title: 'AI assistants',
    description:
      'Build, train, and publish assistants for every customer journey.',
    eyebrow: 'Automation',
  },
  knowledge: {
    title: 'Knowledge base',
    description:
      'Give your assistants trusted answers from your business content.',
    eyebrow: 'Content',
  },
  workflows: {
    title: 'Workflows',
    description:
      'Connect triggers, AI decisions, and actions in one clear flow.',
    eyebrow: 'Automation',
  },
  integrations: {
    title: 'Integrations',
    description: 'Connect WhatsApp and the tools your business already uses.',
    eyebrow: 'Connections',
  },
  analytics: {
    title: 'Analytics',
    description:
      'Understand conversations, automation, and customer experience.',
    eyebrow: 'Reports',
  },
  settings: {
    title: 'Workspace settings',
    description: 'Manage your business profile, team access, and preferences.',
    eyebrow: 'Workspace',
  },
};

const conversations: Conversation[] = [
  {
    id: 1,
    name: 'Aarav Mehta',
    initials: 'AM',
    color: '',
    preview: 'Do you have an appointment available this week?',
    time: '2m',
    unread: 2,
    intent: 'Appointment',
    messages: [
      {
        text: 'Hi, I wanted to check if Dr. Sharma has any appointments this week.',
        time: '10:24 AM',
      },
      {
        text: 'Hello Aarav! I can help with that. Which day works best for you?',
        time: '10:24 AM',
        mine: true,
      },
      {
        text: 'Do you have an appointment available this week?',
        time: '10:25 AM',
      },
    ],
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    initials: 'PK',
    color: 'blue',
    preview: 'Thank you, that was really helpful!',
    time: '18m',
    intent: 'General enquiry',
    messages: [
      { text: 'Could you share your clinic timings?', time: '9:56 AM' },
      {
        text: 'We are open Monday to Saturday, 9 AM to 7 PM.',
        time: '9:57 AM',
        mine: true,
      },
      { text: 'Thank you, that was really helpful!', time: '10:01 AM' },
    ],
  },
  {
    id: 3,
    name: 'Rahul Desai',
    initials: 'RD',
    color: 'gold',
    preview: 'I would like to speak with someone.',
    time: '42m',
    unread: 1,
    intent: 'Human handoff',
    messages: [
      { text: 'I have a question about my last visit.', time: '9:31 AM' },
      {
        text: 'I can connect you with our reception team. One moment, please.',
        time: '9:32 AM',
        mine: true,
      },
      { text: 'I would like to speak with someone.', time: '9:33 AM' },
    ],
  },
  {
    id: 4,
    name: 'Neha Kulkarni',
    initials: 'NK',
    color: 'pink',
    preview: 'What should I bring for my first visit?',
    time: '1h',
    intent: 'Appointment',
    messages: [
      { text: 'I booked an appointment for Friday.', time: '8:45 AM' },
      {
        text: 'We look forward to seeing you. Please bring your ID and any previous reports.',
        time: '8:46 AM',
        mine: true,
      },
      { text: 'What should I bring for my first visit?', time: '8:48 AM' },
    ],
  },
  {
    id: 5,
    name: 'Karan Shah',
    initials: 'KS',
    color: 'purple',
    preview: 'Is parking available at the clinic?',
    time: '2h',
    intent: 'Location',
    messages: [
      { text: 'Is parking available at the clinic?', time: '8:05 AM' },
      {
        text: 'Yes, complimentary visitor parking is available at the main entrance.',
        time: '8:06 AM',
        mine: true,
      },
    ],
  },
];

const assistantCards = [
  {
    name: 'Care Concierge',
    description: 'Answers patient questions and helps schedule appointments.',
    icon: Headphones,
    tone: '',
    status: 'Live',
    conversations: '1,284',
    updated: 'Updated 2h ago',
  },
  {
    name: 'Order Support',
    description: 'Helps customers track orders, returns, and product details.',
    icon: Bot,
    tone: 'purple',
    status: 'Draft',
    conversations: '—',
    updated: 'Edited yesterday',
  },
  {
    name: 'Welcome Assistant',
    description: 'Greets new customers and routes them to the right team.',
    icon: Sparkles,
    tone: 'blue',
    status: 'Live',
    conversations: '682',
    updated: 'Updated Nov 21',
  },
];

const activityItems = [
  {
    initials: 'AM',
    title: 'Aarav Mehta',
    text: 'asked about appointment availability',
    time: '2 minutes ago',
    color: '',
  },
  {
    initials: 'AI',
    title: 'Care Concierge',
    text: 'resolved a clinic-hours question',
    time: '14 minutes ago',
    color: 'blue',
  },
  {
    initials: 'PK',
    title: 'Priya Kapoor',
    text: 'was handed off to your team',
    time: '38 minutes ago',
    color: 'gold',
  },
  {
    initials: 'SY',
    title: 'System',
    text: 'synced 3 new knowledge sources',
    time: '1 hour ago',
    color: 'purple',
  },
];

function Button({
  children,
  variant = 'primary',
  size = '',
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'small' | '';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      className={`button ${variant === 'primary' ? '' : `button-${variant}`} ${size ? `button-${size}` : ''}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function PageHeading({
  section,
  action,
}: {
  section: Section;
  action?: React.ReactNode;
}) {
  const info = sectionInfo[section];
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{info.eyebrow}</div>
        <h1>{info.title}</h1>
        <p>{info.description}</p>
      </div>
      {action && <div className="heading-actions">{action}</div>}
    </div>
  );
}

function PreviewBanner() {
  return (
    <div className="preview-banner">
      <CircleHelp size={15} />
      <span>
        <strong>Workspace</strong> · Live data appears where connected; some
        features are still in preview.
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  negative = false,
  period = 'vs. last 7 days',
  showTrend = true,
}: {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  negative?: boolean;
  period?: string;
  showTrend?: boolean;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">
          <Icon size={15} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        {showTrend ? (
          <span className={negative ? 'trend-down' : 'trend-up'}>
            {negative ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
            {change}
          </span>
        ) : (
          <span>{change}</span>
        )}
        <span>{period}</span>
      </div>
    </article>
  );
}

function ActivityPanel() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Recent activity</h2>
          <p>What’s happening across your workspace</p>
        </div>
        <button className="icon-button" aria-label="More activity options">
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="activity-list">
        {activityItems.map((item) => (
          <div className="activity-item" key={item.title + item.time}>
            <div className={`activity-avatar ${item.color}`}>
              {item.initials}
            </div>
            <div className="activity-copy">
              <p>
                <strong>{item.title}</strong> {item.text}
              </p>
              <span>{item.time}</span>
            </div>
            {item.initials === 'AI' && (
              <span className="activity-icon">
                <Check size={13} />
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversationChart() {
  const heights = [
    [35, 44],
    [48, 41],
    [40, 55],
    [54, 60],
    [45, 50],
    [62, 70],
    [58, 64],
    [72, 75],
    [68, 61],
    [81, 88],
    [74, 83],
    [88, 91],
  ];
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Conversation volume</h2>
          <p>Messages handled by your team and AI</p>
        </div>
        <button className="period-select">
          Last 7 days <ChevronDown size={12} />
        </button>
      </div>
      <div className="chart-wrap" aria-label="Conversation volume bar chart">
        <div className="chart-y-labels">
          <span>400</span>
          <span>300</span>
          <span>200</span>
          <span>100</span>
          <span>0</span>
        </div>
        <div className="chart-grid">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="chart-bars">
          {heights.map(([team, ai], index) => (
            <div className="chart-column" key={index}>
              <span className="bar" style={{ height: `${team}%` }} />
              <span className="bar primary" style={{ height: `${ai}%` }} />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>
      <div className="chart-legend">
        <span className="legend-key">
          <i className="legend-dot primary" /> AI resolved
        </span>
        <span className="legend-key">
          <i className="legend-dot" /> Team handled
        </span>
      </div>
    </section>
  );
}

function useWorkspaceData() {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [aiStatus, setAiStatus] = useState<AiWorkspaceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<InboxThread[]>('/conversations'),
      apiRequest<AiWorkspaceStatus>('/ai/status').catch(() => null),
    ])
      .then(([conversationData, status]) => {
        if (cancelled) return;
        setThreads(conversationData);
        setAiStatus(status);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load workspace data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { threads, aiStatus, loading, error };
}

function DashboardPage() {
  const { threads, aiStatus, loading, error } = useWorkspaceData();
  return (
    <>
      <PageHeading section="dashboard" />
      <PreviewBanner />
      {error ? (
        <div className="panel empty-state">{error}</div>
      ) : loading ? (
        <div className="panel empty-state">Loading workspace data...</div>
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              label="WhatsApp contacts"
              value={threads.length.toLocaleString()}
              change="Live count"
              icon={MessageCircle}
              showTrend={false}
              period="saved WhatsApp contacts"
            />
            <MetricCard
              label="Indexed documents"
              value={(aiStatus?.documentCount ?? 0).toLocaleString()}
              change="Knowledge base"
              icon={FileText}
              showTrend={false}
              period="currently indexed"
            />
            <MetricCard
              label="Active AI provider"
              value={aiStatus?.provider ?? 'Not configured'}
              change="Current setting"
              icon={Sparkles}
              showTrend={false}
              period="AI response provider"
            />
          </div>
          <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent WhatsApp contacts</h2>
            <p>Latest contacts with messages saved in this workspace</p>
          </div>
          <a className="panel-link" href="/inbox">
            Open inbox <ArrowRight size={13} />
          </a>
        </div>
            {threads.length ? (
              <div className="activity-list">
                {threads.slice(0, 5).map((thread) => (
                  <div className="activity-item" key={thread.id}>
                    <div className="activity-avatar">{thread.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div className="activity-copy">
                      <p><strong>{thread.name}</strong> · {thread.lastMessage || thread.phoneNumber}</p>
                      <span>{formatMessageTime(thread.lastMessageAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No WhatsApp contacts yet. Incoming WhatsApp messages will appear here.</div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function AssistantCards({
  notify,
  limit,
}: {
  notify: (message: string) => void;
  limit?: number;
}) {
  return (
    <div className="assistant-grid">
      {assistantCards.slice(0, limit).map((assistant) => {
        const Icon = assistant.icon;
        return (
          <article className="feature-card assistant-card" key={assistant.name}>
            <div className="assistant-card-top">
              <span className={`assistant-icon ${assistant.tone}`}>
                <Icon size={19} />
              </span>
              <span
                className={`status ${assistant.status === 'Draft' ? 'draft' : ''}`}
              >
                {assistant.status}
              </span>
            </div>
            <h3>{assistant.name}</h3>
            <p>{assistant.description}</p>
            <div className="assistant-card-footer">
              <span>{assistant.conversations} conversations</span>
              <span>{assistant.updated}</span>
            </div>
            <button
              className="button button-quiet button-small"
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
              onClick={() =>
                notify(
                  `${assistant.name} settings are part of the chatbot configuration module.`,
                )
              }
            >
              View assistant <ArrowRight size={12} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

type InboxThread = {
  id: string;
  name: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageAt: string;
};

type InboxMessage = {
  message: string;
  role: 'user' | 'assistant';
  createdAt: string;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function InboxPage({ notify }: { notify: (message: string) => void }) {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const selected = threads.find((item) => item.id === selectedId) ?? null;
  const filtered = threads.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.phoneNumber.toLowerCase().includes(query.toLowerCase()) ||
      item.lastMessage.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest<InboxThread[]>('/conversations')
      .then((response) => {
        if (cancelled) return;
        setThreads(response);
        setSelectedId((current) => current ?? response[0]?.id ?? null);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : 'Could not load inbox.'),
      )
      .finally(() => {
        if (!cancelled) setLoadingThreads(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    apiRequest<{ messages: InboxMessage[] }>(`/conversations/${selectedId}`)
      .then((response) => {
        if (!cancelled) setMessages(response.messages);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : 'Could not load messages.'),
      )
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      await apiRequest(`/whatsapp/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessageText('');
      const response = await apiRequest<{ messages: InboxMessage[] }>(
        `/conversations/${selectedId}`,
      );
      setMessages(response.messages);
      const refreshedThreads = await apiRequest<InboxThread[]>('/conversations');
      setThreads(refreshedThreads);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeading section="inbox" />
      <div className="inbox-layout">
        <aside className="inbox-list">
          <div className="inbox-list-head">
            <h2>All conversations</h2>
            <label className="inbox-search">
              <Search size={13} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
              />
            </label>
          </div>
          <div className="conversation-list">
            {loadingThreads && (
              <div className="empty-state">Loading conversations...</div>
            )}
            {filtered.map((item) => (
              <button
                className={`conversation-item ${selectedId === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="table-avatar">
                  {item.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="conversation-summary">
                  <span className="conversation-summary-top">
                    <strong>{item.name}</strong>
                    <time>{formatMessageTime(item.lastMessageAt)}</time>
                  </span>
                  <p>{item.lastMessage || item.phoneNumber}</p>
                </span>
              </button>
            ))}
            {!loadingThreads && !filtered.length && (
              <div className="empty-state">
                {query ? 'No conversations match your search.' : 'No WhatsApp conversations yet.'}
              </div>
            )}
          </div>
        </aside>
        {selected ? (
          <section className="inbox-chat">
            <header className="chat-header">
              <div className="chat-contact">
                <span className="table-avatar">
                  {selected.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{selected.name}</strong>
                  <span>WhatsApp · {selected.phoneNumber}</span>
                </div>
              </div>
            </header>
            <div className="chat-messages">
              {loadingMessages ? (
                <div className="empty-state">Loading messages...</div>
              ) : messages.length ? (
                messages.map((message, index) => (
                  <div
                    className={`message ${message.role === 'assistant' ? 'mine' : ''}`}
                    key={`${selected.id}-${index}`}
                  >
                    {message.message}
                    <time>
                      {formatMessageTime(message.createdAt)}
                      {message.role === 'assistant' ? ' · Team' : ''}
                    </time>
                  </div>
                ))
              ) : (
                <div className="empty-state">No messages in this conversation.</div>
              )}
            </div>
            <form className="chat-composer" onSubmit={sendMessage}>
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a WhatsApp reply..."
                maxLength={4096}
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !messageText.trim()}>
                <Send size={14} /> {sending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </section>
        ) : (
          <section className="inbox-chat">
            <div className="empty-state">
              {loadingThreads ? 'Loading inbox...' : 'Select a conversation to view messages.'}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function ChatbotsPage({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <PageHeading section="chatbots" />
      <AiWorkspace notify={notify} />
    </>
  );
}

type AiWorkspaceStatus = {
  provider: 'gemini' | 'openai' | 'local';
  geminiConfigured: boolean;
  openAiConfigured: boolean;
  localEnabled: boolean;
  documentCount: number;
  availableProviders: Array<'gemini' | 'openai' | 'local'>;
};

function AiWorkspace({ notify }: { notify: (message: string) => void }) {
  const [status, setStatus] = useState<AiWorkspaceStatus | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<AiWorkspaceStatus>('/ai/status')
      .then((response) => {
        if (!cancelled) setStatus(response);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : 'Could not load AI settings.'),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeProvider(provider: AiWorkspaceStatus['provider']) {
    setSavingProvider(true);
    try {
      const response = await apiRequest<
        Omit<AiWorkspaceStatus, 'documentCount'> & { message: string }
      >(
        '/ai/settings',
        {
          method: 'POST',
          body: JSON.stringify({ provider }),
        },
      );
      setStatus((current) => current ? { ...current, ...response } : null);
      notify(response.message);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not change AI provider.');
    } finally {
      setSavingProvider(false);
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setAsking(true);
    setAnswer('');
    try {
      const response = await apiRequest<{
        answer: string;
        provider: string;
        relevantDocuments: string[];
      }>('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question: text }),
      });
      setAnswer(response.answer);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="panel ai-workspace">
      <div className="panel-heading">
        <div>
          <h2>AI assistant settings</h2>
          <p>Choose your live AI provider and test answers using your knowledge documents.</p>
        </div>
      </div>
      {loading ? (
        <div className="empty-state">Loading AI settings...</div>
      ) : status ? (
        <>
          <div className="ai-status-grid">
            <div className="metric-card">
              <div className="metric-label">Active provider</div>
              <div className="metric-value">{status.provider}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Indexed documents</div>
              <div className="metric-value">{status.documentCount}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Gemini</div>
              <div className="metric-value">{status.geminiConfigured ? 'Configured' : 'Not configured'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">OpenAI</div>
              <div className="metric-value">{status.openAiConfigured ? 'Configured' : 'Not configured'}</div>
            </div>
          </div>
          <div className="ai-controls">
            <div className="form-field">
              <label htmlFor="ai-provider">AI provider</label>
              <select
                id="ai-provider"
                value={status.provider}
                disabled={savingProvider}
                onChange={(event) => {
                  const provider = status.availableProviders.find(
                    (item) => item === event.target.value,
                  );
                  if (provider) void changeProvider(provider);
                }}
              >
                {status.availableProviders.map((provider) => (
                  <option value={provider} key={provider}>{provider}</option>
                ))}
              </select>
            </div>
            <form className="ai-question-form" onSubmit={askQuestion}>
              <div className="form-field">
                <label htmlFor="ai-question">Ask your assistant</label>
                <textarea
                  id="ai-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a question about your business or uploaded documents"
                  required
                />
              </div>
              <Button type="submit" disabled={asking || !question.trim()}>
                <Send size={14} /> {asking ? 'Thinking...' : 'Ask AI'}
              </Button>
            </form>
            {answer && (
              <div className="ai-answer" role="status">
                <strong>Assistant response</strong>
                <p>{answer}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">AI settings could not be loaded.</div>
      )}
    </section>
  );
}

function KnowledgePage({ notify }: { notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<
    Array<{ id?: string; text: string; metadata: Record<string, unknown> }>
  >([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ documents: typeof documents }>('/ai/documents')
      .then((response) => {
        if (!cancelled) setDocuments(response.documents);
      })
      .catch((error) => notify(error instanceof Error ? error.message : 'Could not load documents.'))
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const bytes = await file.arrayBuffer();
      const base64 = btoa(
        Array.from(new Uint8Array(bytes), (byte) =>
          String.fromCharCode(byte),
        ).join(''),
      );
      const response = await apiRequest<{ status: string; count: number }>(
        '/ai/documents',
        {
          method: 'POST',
          body: JSON.stringify({
            file_content: base64,
            file_type: file.type || file.name,
            metadata: {
              name: file.name,
              size: file.size,
              source: 'studio-upload',
            },
          }),
        },
      );
      if (response.status === 'stored') {
        const refreshed = await apiRequest<{ documents: typeof documents }>(
          '/ai/documents',
        );
        setDocuments(refreshed.documents);
        notify(`${file.name} was indexed successfully.`);
      } else {
        notify(`Could not index ${file.name}.`);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(document: { id?: string }) {
    if (!document.id) return;
    try {
      await apiRequest<{ status: string }>(`/ai/documents/${document.id}`, {
        method: 'DELETE',
      });
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      notify('Document removed.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not remove document.');
    }
  }

  return (
    <>
      <PageHeading
        section="knowledge"
        action={
          <Button
            onClick={() =>
              notify(
                'Document ingestion will connect to your knowledge API in the next phase.',
              )
            }
          >
            <Plus size={15} /> Add source
          </Button>
        }
      />
      <PreviewBanner />
      <div className="metric-grid">
        <MetricCard
          label="Knowledge sources"
          value="12"
          change="3 new this month"
          icon={FileText}
        />
        <MetricCard
          label="Indexed sections"
          value="486"
          change="Updated just now"
          icon={Blocks}
        />
        <MetricCard
          label="Used in answers"
          value="1,208"
          change="14.6%"
          icon={MessageCircle}
        />
        <MetricCard
          label="Needs review"
          value="2"
          change="Check sync status"
          icon={Clock3}
          negative
        />
      </div>
      <div className="knowledge-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your sources</h2>
              <p>Documents and websites your assistants can reference</p>
            </div>
            <button className="filter-chip">
              <Filter size={12} /> All sources
            </button>
          </div>
          <div className="document-list">
            {loadingDocuments && (
              <div className="empty-state">Loading indexed documents...</div>
            )}
            {!loadingDocuments && documents.length === 0 && (
              <div className="empty-state">No documents have been indexed yet.</div>
            )}
            {documents.map((document, index) => {
              const name =
                String(document.metadata?.name || 'Indexed document');
              const kind = String(document.metadata?.source || 'TEXT').toUpperCase();
              return (
              <div className="document-row" key={document.id || `${name}-${index}`}>
                <span className="file-icon">
                  <File size={15} />
                </span>
                <span className="file-meta">
                  <strong>{name}</strong>
                  <span>{kind} · {document.text.length.toLocaleString()} characters</span>
                </span>
                <span className="file-status">
                  <Check size={11} style={{ verticalAlign: 'middle' }} />{' '}
                  Indexed
                </span>
                <button
                  className="icon-button"
                  aria-label={`More options for ${name}`}
                  onClick={() => void deleteDocument(document)}
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
              );
            })}
          </div>
          <div className="table-footer">
            <span>Showing 4 of 12 sources</span>
            <div className="pagination">
              <button className="page-number">
                <ChevronLeft size={13} />
              </button>
              <button className="page-number active">1</button>
              <button className="page-number">2</button>
              <button className="page-number">3</button>
              <button className="page-number">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-heading">
            <div>
              <h2>Add knowledge</h2>
              <p>Give your assistant more trusted context</p>
            </div>
          </div>
          <div className="dropzone">
            <div>
              <span className="dropzone-icon">
                <FileText size={18} />
              </span>
              <h3>Drop files to upload</h3>
              <p>PDF, DOCX, TXT, CSV up to 25 MB</p>
              <label className="button button-secondary button-small">
                {uploading ? 'Uploading...' : 'Choose files'}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.xlsx"
                  hidden
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
          <div style={{ marginTop: 16 }} className="form-field">
            <label htmlFor="website-source">Add a website URL</label>
            <input
              id="website-source"
              placeholder="https://yourbusiness.com/help"
            />
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                notify(
                  'Website indexing will connect to the knowledge API in the next phase.',
                )
              }
            >
              Add website
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function WorkflowsPage({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <PageHeading
        section="workflows"
        action={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                notify('Workflow templates will be available soon.')
              }
            >
              <Sparkles size={14} /> Templates
            </Button>
            <Button
              onClick={() =>
                notify(
                  'The visual workflow editor is planned for the next build phase.',
                )
              }
            >
              <Plus size={15} /> New workflow
            </Button>
          </>
        }
      />
      <PreviewBanner />
      <div className="metric-grid">
        <MetricCard
          label="Active workflows"
          value="4"
          change="1 updated today"
          icon={Workflow}
        />
        <MetricCard
          label="Runs this month"
          value="3,482"
          change="22.4%"
          icon={Zap}
        />
        <MetricCard
          label="Successful runs"
          value="99.1%"
          change="0.8%"
          icon={Check}
        />
        <MetricCard
          label="Needs attention"
          value="3"
          change="Review run history"
          icon={CircleHelp}
          negative
        />
      </div>
      <section className="panel" style={{ marginBottom: 15 }}>
        <div className="panel-heading">
          <div>
            <h2>Appointment assistant flow</h2>
            <p>Last edited by Shubham · Published Nov 21, 2026</p>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <span className="status">Active</span>
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                notify('Workflow editor will be connected in a later phase.')
              }
            >
              Edit workflow
            </Button>
          </div>
        </div>
        <div className="workflow-canvas">
          <div className="workflow-nodes">
            <div className="workflow-node start">
              <div className="workflow-node-header">
                <span className="node-icon">
                  <MessageCircle size={12} />
                </span>{' '}
                New message
              </div>
              <p>When a WhatsApp message arrives</p>
            </div>
            <ArrowRight className="workflow-connector" size={18} />
            <div className="workflow-node ai">
              <div className="workflow-node-header">
                <span className="node-icon purple">
                  <Sparkles size={12} />
                </span>{' '}
                AI assistant
              </div>
              <p>Understand intent and find an answer</p>
            </div>
            <ArrowRight className="workflow-connector" size={18} />
            <div className="workflow-node handoff">
              <div className="workflow-node-header">
                <span className="node-icon amber">
                  <UsersRound size={12} />
                </span>{' '}
                Human handoff
              </div>
              <p>Route complex questions to reception</p>
            </div>
          </div>
        </div>
      </section>
      <section className="table-panel">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <strong style={{ fontSize: 12 }}>Your workflows</strong>
            <span className="plan-pill">4 workflows</span>
          </div>
          <button
            className="filter-chip"
            onClick={() => notify('Workflow filters will be available soon.')}
          >
            <Filter size={12} /> Filter
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Status</th>
                <th>Runs this month</th>
                <th>Success rate</th>
                <th>Last updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[
                ['Appointment assistant', 'Active', '1,842', '99.4%', 'Today'],
                ['After-hours support', 'Active', '964', '98.8%', 'Nov 22'],
                ['Order status lookup', 'Draft', '—', '—', 'Nov 20'],
                ['New patient welcome', 'Active', '676', '99.1%', 'Nov 18'],
              ].map((row) => (
                <tr key={row[0]}>
                  <td>
                    <strong style={{ color: '#46564c' }}>{row[0]}</strong>
                  </td>
                  <td>
                    <span
                      className={`status ${row[1] === 'Draft' ? 'draft' : ''}`}
                    >
                      {row[1]}
                    </span>
                  </td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>{row[4]}</td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() =>
                        notify('Workflow actions will be connected soon.')
                      }
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function IntegrationsPage({ notify }: { notify: (message: string) => void }) {
  const integrations = [
    {
      name: 'WhatsApp Business',
      desc: 'Connect your WhatsApp Business account to chat with customers.',
      icon: MessageCircle,
      tone: 'whatsapp',
      connected: true,
      state: 'Connected',
    },
    {
      name: 'Google Calendar',
      desc: 'Check availability and help customers book appointments.',
      icon: CalendarDays,
      tone: 'calendar',
      connected: false,
      state: 'Not connected',
    },
    {
      name: 'Shopify',
      desc: 'Answer product questions and look up customer orders.',
      icon: Blocks,
      tone: 'store',
      connected: false,
      state: 'Not connected',
    },
    {
      name: 'Google Sheets',
      desc: 'Send conversation events to your business spreadsheets.',
      icon: FileText,
      tone: 'store',
      connected: false,
      state: 'Not connected',
    },
    {
      name: 'External API',
      desc: 'Connect your own services through a secure REST endpoint.',
      icon: Zap,
      tone: 'calendar',
      connected: false,
      state: 'Not connected',
    },
    {
      name: 'Webhooks',
      desc: 'Send selected conversation events to your own systems.',
      icon: Workflow,
      tone: '',
      connected: false,
      state: 'Not connected',
    },
  ];
  return (
    <>
      <PageHeading
        section="integrations"
        action={
          <Button
            variant="secondary"
            onClick={() => notify('Integration catalog is being prepared.')}
          >
            <Blocks size={14} /> Browse integrations
          </Button>
        }
      />
      <PreviewBanner />
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-heading">
          <div>
            <h2>Messaging channel</h2>
            <p>Connect the channel your customers already use</p>
          </div>
          <span className="status">1 connected</span>
        </div>
        <div
          className="integration-grid"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {integrations.slice(0, 1).map((item) => {
            const Icon = item.icon;
            return (
              <article
                className="feature-card integration-card"
                key={item.name}
              >
                <div className="integration-top">
                  <span className={`integration-logo ${item.tone}`}>
                    <Icon size={20} />
                  </span>
                  <span className="status">Connected</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <div className="integration-card-footer">
                  <span className="connection-state connected">
                    Phone number connected
                  </span>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      notify(
                        'WhatsApp connection management will be connected in the integration phase.',
                      )
                    }
                  >
                    Manage
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Business tools</h2>
            <p>Bring your existing tools into the conversation</p>
          </div>
        </div>
        <div className="integration-grid">
          {integrations.slice(1).map((item) => {
            const Icon = item.icon;
            return (
              <article
                className="feature-card integration-card"
                key={item.name}
              >
                <div className="integration-top">
                  <span className={`integration-logo ${item.tone}`}>
                    <Icon size={20} />
                  </span>
                  <span className="connection-state">{item.state}</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <div className="integration-card-footer">
                  <span className="connection-state">
                    Available for your workspace
                  </span>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      notify(`${item.name} setup is not connected yet.`)
                    }
                  >
                    Connect
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function AnalyticsPage() {
  const { threads, aiStatus, loading, error } = useWorkspaceData();
  return (
    <>
      <PageHeading section="analytics" />
      <PreviewBanner />
      {error ? (
        <div className="panel empty-state">{error}</div>
      ) : loading ? (
        <div className="panel empty-state">Loading analytics...</div>
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              label="WhatsApp contacts"
              value={threads.length.toLocaleString()}
              change="Live count"
              icon={MessageCircle}
              showTrend={false}
              period="saved in this workspace"
            />
            <MetricCard
              label="Indexed documents"
              value={(aiStatus?.documentCount ?? 0).toLocaleString()}
              change="Live count"
              icon={FileText}
              showTrend={false}
              period="available to the AI"
            />
            <MetricCard
              label="AI provider"
              value={aiStatus?.provider ?? 'Not configured'}
              change="Current setting"
              icon={Sparkles}
              showTrend={false}
              period="serving AI requests"
            />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Recent contacts</h2>
                <p>Current conversation data; historical analytics are not yet stored.</p>
              </div>
            </div>
            {threads.length ? (
              <div className="document-list">
                {threads.slice(0, 10).map((thread) => (
                  <div className="document-row" key={thread.id}>
                    <span className="table-avatar">
                      {thread.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="file-meta">
                      <strong>{thread.name}</strong>
                      <span>{thread.lastMessage || thread.phoneNumber}</span>
                    </span>
                    <span className="file-status">{formatMessageTime(thread.lastMessageAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No WhatsApp contact data is available yet.</div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState('Business profile');
  const [profile, setProfile] = useState({
    businessName: '',
    category: '',
    description: '',
    timezone: 'UTC',
  });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const tabs = [
    { label: 'Business profile', icon: UserRound },
    { label: 'Team members', icon: UsersRound },
    { label: 'WhatsApp channel', icon: MessageCircle },
    { label: 'AI preferences', icon: Sparkles },
    { label: 'Security', icon: ShieldCheck },
  ];

  useEffect(() => {
    let cancelled = false;
    apiRequest<typeof profile>('/auth/profile')
      .then((response) => {
        if (cancelled) return;
        setProfile(response);
        setSavedProfile(response);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : 'Could not load workspace profile.'),
      )
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const saved = await apiRequest<typeof profile>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      });
      setProfile(saved);
      setSavedProfile(saved);
      notify('Workspace profile saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save workspace profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <>
      <PageHeading section="settings" />
      <PreviewBanner />
      <div className="settings-layout">
        <nav className="panel settings-nav" aria-label="Settings sections">
          {tabs.map(({ label, icon: Icon }) => (
            <button
              className={`settings-tab ${tab === label ? 'active' : ''}`}
              key={label}
              onClick={() => setTab(label)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{tab}</h2>
              <p>
                {tab === 'Business profile'
                  ? 'The details customers and your team see.'
                  : 'Manage settings for your workspace.'}
              </p>
            </div>
          </div>
          {tab === 'Business profile' ? (
            <form className="settings-form" onSubmit={saveProfile}>
              <div className="form-field">
                <label htmlFor="business-name">Business name</label>
                <input
                  id="business-name"
                  value={profile.businessName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, businessName: event.target.value }))
                  }
                  minLength={2}
                  maxLength={120}
                  required
                  disabled={profileLoading || profileSaving}
                />
              </div>
              <div className="form-field">
                <label htmlFor="business-category">Business category</label>
                <select
                  id="business-category"
                  value={profile.category}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, category: event.target.value }))
                  }
                  disabled={profileLoading || profileSaving}
                >
                  <option value="">Select category</option>
                  {['Healthcare', 'Retail', 'Education', 'Hospitality', 'Other'].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="business-description">
                  About your business
                </label>
                <textarea
                  id="business-description"
                  value={profile.description}
                  maxLength={2000}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, description: event.target.value }))
                  }
                  disabled={profileLoading || profileSaving}
                />
              </div>
              <hr className="settings-divider" />
              <div className="form-field">
                <label htmlFor="business-timezone">Timezone</label>
                <select
                  id="business-timezone"
                  value={profile.timezone}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, timezone: event.target.value }))
                  }
                  disabled={profileLoading || profileSaving}
                >
                  <option value="Asia/Kolkata">
                    India Standard Time (UTC+05:30)
                  </option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="settings-actions">
                <Button
                  variant="secondary"
                  onClick={() => setProfile(savedProfile)}
                  disabled={profileLoading || profileSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={profileLoading || profileSaving}>
                  {profileSaving ? 'Saving...' : profileLoading ? 'Loading...' : 'Save changes'}
                </Button>
              </div>
            </form>
          ) : tab === 'Team members' ? (
            <div>
              <div
                className="table-toolbar"
                style={{ padding: '0 0 12px', border: 0 }}
              >
                <span className="small">
                  People who can access your workspace
                </span>
                <Button
                  size="small"
                  onClick={() =>
                    notify(
                      'Invite flow will be available when team management is connected.',
                    )
                  }
                >
                  <Plus size={13} /> Invite member
                </Button>
              </div>
              <div className="document-list">
                {[
                  [
                    'Shubham Ghaturle',
                    'shubham.g@yopmail.com',
                    'Business admin',
                    'SG',
                  ],
                  ['Riya Patel', 'riya@example.com', 'Agent', 'RP'],
                  ['Aman Shah', 'aman@example.com', 'Agent', 'AS'],
                ].map((member) => (
                  <div className="document-row" key={member[0]}>
                    <span className="table-avatar">{member[3]}</span>
                    <span className="file-meta">
                      <strong>{member[0]}</strong>
                      <span>{member[1]}</span>
                    </span>
                    <span className="file-status">{member[2]}</span>
                    <button
                      className="icon-button"
                      onClick={() =>
                        notify('Member access controls will be available soon.')
                      }
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : tab === 'AI preferences' ? (
            <AiWorkspace notify={notify} />
          ) : (
            <div className="empty-state">
              <span className="dropzone-icon">
                <Settings2 size={18} />
              </span>
              <h3>{tab}</h3>
              <p>
                This settings section will be connected as the corresponding
                backend features are implemented.
              </p>
              <Button
                variant="secondary"
                size="small"
                onClick={() => notify(`${tab} settings are not connected yet.`)}
              >
                Explore settings
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function StudioApp({
  activeSection: requestedSection,
}: {
  activeSection: string;
}) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    function closeProfileMenu(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeProfileMenu);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', closeProfileMenu);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      if (!authUser) {
        setAuthChecking(false);
        return;
      }
      try {
        const response = await apiRequest<{ user: AuthUser }>('/auth/me');
        if (!cancelled) setAuthUser(response.user);
      } catch {
        clearAuth();
        if (!cancelled) setAuthUser(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }
    void verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');

    const form = new FormData(event.currentTarget);
    try {
      const body =
        authMode === 'register'
          ? {
              businessName: String(form.get('businessName') || '').trim(),
              ownerName: String(form.get('ownerName') || '').trim(),
              email: String(form.get('email') || '').trim(),
              password: String(form.get('password') || ''),
            }
          : {
              email: String(form.get('email') || '').trim(),
              password: String(form.get('password') || ''),
            };

      const response = await apiRequest<AuthResponse>(
        `/auth/${authMode}`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      saveAuth(response);
      setAuthUser(response.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    clearAuth();
    setAuthUser(null);
  }

  if (authChecking) {
    return (
      <main className="auth-page">
        <div className="auth-card auth-loading">Loading workspace...</div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark"><MessageCircle size={19} /></span>
            <div>
              <strong>WhatsApp AI Studio</strong>
              <span>Customer conversations, smarter</span>
            </div>
          </div>
          <h1>{authMode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Sign in to manage your WhatsApp AI business.'
              : 'Register a business and your workspace administrator account.'}
          </p>
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label>
                  Business name
                  <input name="businessName" minLength={2} required autoComplete="organization" />
                </label>
                <label>
                  Your name
                  <input name="ownerName" minLength={2} required autoComplete="name" />
                </label>
              </>
            )}
            <label>
              Email
              <input name="email" type="email" maxLength={254} required autoComplete="email" />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={8} maxLength={72} required autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
            </label>
            {authError && <div className="auth-error">{authError}</div>}
            <Button type="submit" disabled={authBusy}>
              {authBusy ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create workspace'}
            </Button>
          </form>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setAuthError('');
              setAuthMode(authMode === 'login' ? 'register' : 'login');
            }}
          >
            {authMode === 'login'
              ? 'New to WhatsApp AI Studio? Create a workspace'
              : 'Already have a workspace? Sign in'}
          </button>
        </section>
      </main>
    );
  }

  const activeSection = (
    requestedSection in sectionInfo ? requestedSection : 'dashboard'
  ) as Section;
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };
  const activeTitle = sectionInfo[activeSection].title;
  let sectionContent: React.ReactNode;
  switch (activeSection) {
    case 'inbox':
      sectionContent = <InboxPage notify={notify} />;
      break;
    case 'chatbots':
      sectionContent = <ChatbotsPage notify={notify} />;
      break;
    case 'knowledge':
      sectionContent = <KnowledgePage notify={notify} />;
      break;
    case 'workflows':
      sectionContent = <WorkflowsPage notify={notify} />;
      break;
    case 'integrations':
      sectionContent = <IntegrationsPage notify={notify} />;
      break;
    case 'analytics':
      sectionContent = <AnalyticsPage />;
      break;
    case 'settings':
      sectionContent = <SettingsPage notify={notify} />;
      break;
    default:
      sectionContent = <DashboardPage />;
  }

  return (
    <div className="studio">
      <button
        aria-label="Close navigation"
        className={`mobile-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <a className="brand" href="/">
          <span className="brand-mark">
            <MessageCircle size={19} />
          </span>
          <span>
            <span className="brand-name">WhatsApp AI Studio</span>
            <span className="brand-caption">
              Customer conversations, smarter
            </span>
          </span>
        </a>
        <button
          className="workspace-switcher"
          onClick={() =>
            notify(
              'Workspace switching will be available when multi-business access is connected.',
            )
          }
        >
          <span className="workspace-avatar">
            {authUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <span className="workspace-name">
            <strong>{authUser.name}</strong>
            <span>Business workspace</span>
          </span>
          <ChevronDown className="workspace-chevron" size={14} />
        </button>
        <nav className="nav-groups" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="nav-label">{group.label}</p>
              <div className="nav-items">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] ?? LayoutDashboard;
                  return (
                    <a
                      className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                      href={item.href}
                      key={item.id}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="nav-icon">
                        <Icon size={16} />
                      </span>
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-heading">
              <strong>Growth plan</strong>
              <span className="plan-pill">TRIAL</span>
            </div>
            <p>
              Your workspace is ready to grow. Explore the platform features.
            </p>
            <div className="usage-track">
              <span />
            </div>
            <div className="usage-label">
              <span>Monthly conversations</span>
              <strong>620 / 1,000</strong>
            </div>
          </div>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {authUser.name
                .split(/\s+/)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="profile-meta">
              <strong>{authUser.name}</strong>
              <span>{authUser.role === 'BUSINESS_ADMIN' ? 'Business admin' : authUser.role}</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={17} />
            </button>
            <div className="breadcrumb">
              Workspace{' '}
              <ChevronRight
                size={13}
                style={{ verticalAlign: 'middle', margin: '0 5px' }}
              />{' '}
              <strong>{activeTitle}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="top-search">
              <Search size={14} />
              <input
                aria-label="Search workspace"
                placeholder="Search anything..."
              />
              <span className="shortcut">⌘ K</span>
            </label>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => notify('Help center is coming soon.')}
            >
              <CircleHelp size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => notify('You’re all caught up on notifications.')}
            >
              <Bell size={16} />
              <i className="notification-dot" />
            </button>
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                className="top-profile"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <span className="profile-avatar">
                  {authUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span>{authUser.name}</span>
                <ChevronDown size={13} color="#8c9990" />
              </button>
              {profileMenuOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-user">
                    <strong>{authUser.name}</strong>
                    <span>{authUser.email}</span>
                  </div>
                  <button
                    className="profile-dropdown-signout"
                    role="menuitem"
                    onClick={signOut}
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="content">
          {sectionContent}
          <footer
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 24,
              color: '#9aa49d',
              fontSize: 10,
            }}
          >
            <span>© 2026 WhatsApp AI Studio · Workspace preview</span>
            <span>
              Need help?{' '}
              <button
                onClick={() => notify('Support is coming soon.')}
                style={{
                  border: 0,
                  background: 'none',
                  color: '#41805a',
                  padding: 0,
                  fontSize: 10,
                }}
              >
                Contact support
              </button>
            </span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
