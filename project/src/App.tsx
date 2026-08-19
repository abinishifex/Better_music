import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Disc3,
  Instagram,
  MapPin,
  Menu,
  Music2,
  Pencil,
  Play,
  Plus,
  Radio,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  fetchEvents,
  deleteEvent,
  deleteEventImage,
  type EventRow,
} from '@/lib/supabase';
import Toast, { type ToastState } from '@/components/Toast';
import EventFormModal from '@/components/EventFormModal';

type EventCategory = 'All' | 'Techno' | 'Indie' | 'Jazz' | 'Hip-Hop';

const categories: EventCategory[] = ['All', 'Techno', 'Indie', 'Jazz', 'Hip-Hop'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Tonight';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${period}`;
}

type DisplayEvent = {
  id: number;
  title: string;
  description: string;
  location: string;
  organizer: string;
  date: string;
  time: string;
  category: string;
  image: string;
  live: boolean;
  featured: boolean;
};

function toDisplayEvent(row: EventRow, index: number): DisplayEvent {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(row.date + 'T00:00:00');
  const isToday = eventDate.toDateString() === today.toDateString();

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    location: row.location,
    organizer: row.organizer ?? '',
    date: formatDate(row.date),
    time: formatTime(row.time),
    category: row.category,
    image: row.image ?? '',
    live: isToday,
    featured: index === 0,
  };
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'details'; event: DisplayEvent }
  | { kind: 'create' }
  | { kind: 'edit'; event: EventRow };

function App() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>('All');
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [rawEvents, setRawEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadEvents = useCallback(async () => {
    try {
      const rows = await fetchEvents();
      setRawEvents(rows);
      setEvents(rows.map(toDisplayEvent));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setToast({ kind: 'error', message: "Couldn't load events. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(
    () => activeCategory === 'All' ? events : events.filter((event) => event.category === activeCategory),
    [activeCategory, events],
  );

  const scrollToEvents = () => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
  }, []);

  const handleDelete = useCallback(async (event: DisplayEvent) => {
    try {
      if (event.image) {
        await deleteEventImage(event.image);
      }
      await deleteEvent(event.id);
      setModal({ kind: 'none' });
      showToast('success', `"${event.title}" was deleted.`);
      setLoading(true);
      await loadEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Delete failed:', message);
      showToast('error', "Couldn't delete this event. Please try again.");
    }
  }, [loadEvents, showToast]);

  const handleEditClick = useCallback((event: DisplayEvent) => {
    const raw = rawEvents.find((r) => r.id === event.id) ?? null;
    if (!raw) {
      showToast('error', "Couldn't open this event for editing.");
      return;
    }
    setModal({ kind: 'edit', event: raw });
  }, [rawEvents, showToast]);

  const handleFormSuccess = useCallback(async (message: string) => {
    showToast('success', message);
    setLoading(true);
    await loadEvents();
  }, [loadEvents, showToast]);

  const handleFormError = useCallback((message: string) => {
    showToast('error', message);
  }, [showToast]);

  return (
    <div className="app-shell">
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Better Music home">
          <span className="brand-mark"><Music2 size={17} strokeWidth={2.5} /></span>
          <span>Better Music</span>
        </a>
        <nav className={`main-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a className="active" href="#discover" onClick={() => setIsMenuOpen(false)}>Discover</a>
          <a href="#events" onClick={() => setIsMenuOpen(false)}>Events</a>
          <a href="#live" onClick={() => setIsMenuOpen(false)}>Live now</a>
          <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
        </nav>
        <div className="topbar-actions">
          <button className="location-button" type="button"><MapPin size={14} /> Berlin <ChevronRight size={13} /></button>
          <button className="nav-create-button desktop-create" type="button" onClick={() => setModal({ kind: 'create' })}>
            <Plus size={13} /> Create event
          </button>
          <button className="icon-button menu-button" type="button" aria-label="Toggle menu" onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <button className="profile-button" type="button" aria-label="Open profile"><CircleUserRound size={20} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero" id="discover">
          <div className="hero-grid" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> Your city is alive</div>
            <h1>Discover<br /><em>Music Events</em></h1>
            <p className="hero-copy">The pulse of the underground, curated for you.</p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={scrollToEvents}>Join the movement <ArrowUpRight size={17} /></button>
              <button className="play-button" type="button" aria-label="Play a preview"><span><Play size={13} fill="currentColor" /></span> Hear the sound</button>
            </div>
          </div>
          <div className="sound-waves" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}
          </div>
          <div className="scroll-prompt"><ArrowDown size={15} /> <span>Scroll to explore</span></div>
          <div className="hero-stamp"><Disc3 size={16} /><span>EST. 2024</span></div>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <div className="eyebrow small"><span className="eyebrow-dot" /> Handpicked for you</div>
              <h2>Find your <em>frequency.</em></h2>
            </div>
            <p className="section-note">New sounds, familiar faces,<br />and nights worth remembering.</p>
          </div>
          <div className="filter-row" role="tablist" aria-label="Filter events by genre">
            <div className="filter-label"><Sparkles size={14} /> Browse by mood</div>
            <div className="filters">
              {categories.map((category) => <button key={category} className={activeCategory === category ? 'filter active' : 'filter'} type="button" onClick={() => setActiveCategory(category)}>{category}</button>)}
            </div>
          </div>

          {loading && <div className="event-list-empty">Loading events…</div>}
          {error && <div className="event-list-empty">Couldn't load events. {error}</div>}
          {!loading && !error && filteredEvents.length === 0 && <div className="event-list-empty">No events in this category yet.</div>}

          <div className="event-list">
            {filteredEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} onOpen={() => setModal({ kind: 'details', event })} />)}
          </div>
        </section>

        <section className="manifesto" id="about">
          <div className="manifesto-icon"><Radio size={22} /></div>
          <div><div className="eyebrow small"><span className="eyebrow-dot" /> Better together</div><h2>More than a night out.<br /><em>A state of mind.</em></h2></div>
          <p>We connect the people, places and sounds that make a city feel like yours.</p>
          <button className="text-button" type="button" onClick={scrollToEvents}>Explore all events <ArrowUpRight size={16} /></button>
        </section>
      </main>

      <footer className="footer" id="live">
        <a className="brand" href="#top"><span className="brand-mark"><Music2 size={17} /></span><span>Better Music</span></a>
        <span className="footer-copy">Find the signal.</span>
        <div className="footer-links"><a href="#events">Events</a><a href="#about">About</a><a href="#top">Instagram <Instagram size={13} /></a></div>
      </footer>

      {modal.kind === 'details' && (
        <EventModal
          event={modal.event}
          onClose={() => setModal({ kind: 'none' })}
          onDelete={handleDelete}
          onEdit={handleEditClick}
        />
      )}
      {modal.kind === 'create' && (
        <EventFormModal
          mode="create"
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleFormSuccess}
          onError={handleFormError}
        />
      )}
      {modal.kind === 'edit' && (
        <EventFormModal
          mode="edit"
          event={modal.event}
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleFormSuccess}
          onError={handleFormError}
        />
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function EventImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return <div className={className ? `event-image-fallback ${className}` : 'event-image-fallback'}>No image</div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={(e) => {
    const target = e.currentTarget;
    target.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'event-image-fallback';
    fallback.textContent = 'Image unavailable';
    target.parentElement?.appendChild(fallback);
  }} />;
}

function EventCard({ event, index, onOpen }: { event: DisplayEvent; index: number; onOpen: () => void }) {
  return <article className={`event-card ${event.featured ? 'featured' : ''}`} style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}>
    <button className="card-image" type="button" onClick={onOpen} aria-label={`View ${event.title}`}>
      <EventImage src={event.image} alt={event.title} />
      <span className="image-shade" />
      {event.live && <span className="live-badge"><span /> Live now</span>}
      <span className="category-badge">{event.category}</span>
      <span className="image-arrow"><ArrowUpRight size={18} /></span>
    </button>
    <div className="card-content">
      <div className="card-title-row"><div><span className="card-index">0{index + 1}</span><h3>{event.title}</h3></div><span className="card-price">From €18</span></div>
      <p className="card-description">{event.description}</p>
      <div className="card-meta"><span><MapPin size={14} /> {event.location}</span><span><CalendarDays size={14} /> {event.date}</span><span><Clock3 size={14} /> {event.time}</span></div>
      <button className="details-button" type="button" onClick={onOpen}>View details <ArrowUpRight size={15} /></button>
    </div>
  </article>;
}

function EventModal({
  event,
  onClose,
  onDelete,
  onEdit,
}: {
  event: DisplayEvent;
  onClose: () => void;
  onDelete: (event: DisplayEvent) => void;
  onEdit: (event: DisplayEvent) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDeleteClick = () => {
    setConfirming(true);
  };

  const handleConfirmDelete = () => {
    setDeleting(true);
    Promise.resolve(onDelete(event)).finally(() => {
      setDeleting(false);
      setConfirming(false);
    });
  };

  return <div className="modal-backdrop" role="presentation" onClick={onClose}>
    <div className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="Close details"><X size={20} /></button>
      <EventImage src={event.image} alt={event.title} />
      <div className="modal-body">
        <div className="eyebrow small"><span className="eyebrow-dot" /> {event.category} experience</div>
        <h2 id="event-title">{event.title}</h2>
        <p>{event.description}</p>
        <div className="modal-details">
          <span><MapPin size={15} /> {event.location}</span>
          <span><CalendarDays size={15} /> {event.date} · {event.time}</span>
          {event.organizer && <span><Radio size={15} /> {event.organizer}</span>}
        </div>
        <div className="modal-actions">
          <button className="primary-button full-width" type="button" onClick={onClose}><Ticket size={16} /> Get tickets · From €18</button>
          <div className="modal-edit-row">
            <button className="edit-button" type="button" onClick={() => onEdit(event)}>
              <Pencil size={14} /> Edit
            </button>
            <button className="delete-button" type="button" onClick={handleDeleteClick} disabled={deleting}>
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
        {confirming && (
          <div className="confirm-overlay" role="alertdialog" aria-label="Confirm deletion">
            <div className="confirm-card">
              <p>Delete <strong>"{event.title}"</strong>? This can't be undone.</p>
              <div className="confirm-actions">
                <button className="form-cancel" type="button" onClick={() => setConfirming(false)} disabled={deleting}>Cancel</button>
                <button className="delete-button confirm-delete" type="button" onClick={handleConfirmDelete} disabled={deleting}>
                  <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>;
}

export default App;
