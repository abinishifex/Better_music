import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader as Loader2, Save, X } from 'lucide-react';
import {
  createEvent,
  updateEvent,
  uploadEventImage,
  deleteEventImage,
  type EventRow,
} from '@/lib/supabase';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

type Props = {
  mode: 'create' | 'edit';
  event?: EventRow | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type FormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  organizer: string;
  description: string;
};

function emptyForm(): FormState {
  return { title: '', date: '', time: '', location: '', category: 'Techno', organizer: '', description: '' };
}

function formFromEvent(event: EventRow): FormState {
  return {
    title: event.title,
    date: event.date,
    time: event.time,
    location: event.location,
    category: event.category,
    organizer: event.organizer ?? '',
    description: event.description ?? '',
  };
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_SIZE) {
    return 'Image is too large. Maximum size is 10 MB.';
  }
  return null;
}

export default function EventFormModal({ mode, event, onClose, onSuccess, onError }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && event ? formFromEvent(event) : emptyForm()
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    mode === 'edit' && event?.image ? event.image : ''
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setImageError(err);
      setImageFile(null);
      setImagePreview(mode === 'edit' && event?.image ? event.image : '');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImageError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.date || !form.time || !form.location.trim()) {
      setFormError('Please fill in title, date, time, and location.');
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | null = mode === 'edit' ? event?.image ?? null : null;

      if (imageFile) {
        imageUrl = await uploadEventImage(imageFile);
        if (mode === 'edit' && event?.image) {
          await deleteEventImage(event.image);
        }
      } else if (mode === 'edit' && !imagePreview && event?.image) {
        // Image was cleared during edit
        await deleteEventImage(event.image);
        imageUrl = null;
      }

      const payload = {
        title: form.title.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        category: form.category,
        organizer: form.organizer.trim() || null,
        description: form.description.trim() || null,
        image: imageUrl,
      };

      if (mode === 'create') {
        await createEvent(payload);
        onSuccess(`"${form.title}" was created.`);
      } else if (event) {
        await updateEvent(event.id, payload);
        onSuccess(`"${form.title}" was updated.`);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormError(message);
      onError(mode === 'create' ? 'Could not create the event. Please try again.' : 'Could not update the event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div className="event-form-modal" role="dialog" aria-modal="true" aria-labelledby="form-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={() => !saving && onClose()} aria-label="Close form" disabled={saving}>
          <X size={20} />
        </button>
        <div className="form-modal-header">
          <div className="eyebrow small"><span className="eyebrow-dot" /> {isEdit ? 'Edit event' : 'New event'}</div>
          <h2 id="form-title">{isEdit ? 'Update the night' : 'Create a night'}</h2>
        </div>
        <form className="event-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Title <em className="form-required">*</em></span>
            <input
              className="form-input"
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Neon Pulse"
              maxLength={120}
              disabled={saving}
              required
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span className="form-label">Date <em className="form-required">*</em></span>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                disabled={saving}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Time <em className="form-required">*</em></span>
              <input
                className="form-input"
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                disabled={saving}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span className="form-label">Location <em className="form-required">*</em></span>
              <input
                className="form-input"
                type="text"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Berlin, DE"
                maxLength={120}
                disabled={saving}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Category</span>
              <select
                className="form-input form-select"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                disabled={saving}
              >
                <option value="Techno">Techno</option>
                <option value="Indie">Indie</option>
                <option value="Jazz">Jazz</option>
                <option value="Hip-Hop">Hip-Hop</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span className="form-label">Organizer</span>
            <input
              className="form-input"
              type="text"
              value={form.organizer}
              onChange={(e) => update('organizer', e.target.value)}
              placeholder="Subsonic Collective"
              maxLength={120}
              disabled={saving}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Description</span>
            <textarea
              className="form-input form-textarea"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="A warehouse takeover with four DJs across two floors…"
              rows={3}
              maxLength={500}
              disabled={saving}
            />
          </label>

          <div className="form-field">
            <span className="form-label">Cover image</span>
            <div className="image-upload">
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Event cover preview" />
                  <button type="button" className="image-preview-clear" onClick={clearImage} disabled={saving} aria-label="Remove image">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" className="image-upload-empty" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                  <ImagePlus size={22} />
                  <span>Click to upload an image</span>
                  <span className="image-upload-hint">JPG, PNG, or WebP — max 10 MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={saving}
                hidden
              />
              {imageError && <span className="form-error">{imageError}</span>}
            </div>
          </div>

          {formError && <div className="form-error form-error-banner">{formError}</div>}

          <div className="form-actions">
            <button type="button" className="form-cancel" onClick={() => !saving && onClose()} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <><Loader2 size={16} className="spin" /> {isEdit ? 'Saving…' : 'Creating…'}</> : <><Save size={16} /> {isEdit ? 'Save changes' : 'Create event'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
