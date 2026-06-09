import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '../../api';
import './PersonalSettingsPage.css';

type PersonalSettingsPageProps = {
  user: User;
  loading: boolean;
  onSave: (payload: { name: string; email: string; phone: string; address: string; date_of_birth: string; password?: string }) => Promise<void>;
};

function PersonalSettingsPage({ user, loading, onSave }: PersonalSettingsPageProps) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    dateOfBirth: user.date_of_birth || '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      dateOfBirth: user.date_of_birth || '',
      password: '',
      confirmPassword: '',
    });
    setError('');
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() || !form.dateOfBirth.trim()) {
      setError('Name, email, phone, address, and date of birth are required.');
      return;
    }

    if (form.password && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    await onSave({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      date_of_birth: form.dateOfBirth.trim(),
      ...(form.password ? { password: form.password } : {}),
    });

    setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
  }

  return (
    <section className="personal-settings-page">
      <div className="personal-settings-hero panel">
        <div>
          <span>Personal settings</span>
          <h2>{user.name}</h2>
          <p>Update your account name, login email, contact details, and password.</p>
        </div>
        <div className="personal-avatar" aria-hidden="true">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className="personal-settings-layout">
        <form className="panel personal-settings-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="section-title">
            <span>Account</span>
            <h2>Personal data</h2>
          </div>

          <div className="form-grid">
            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              Login email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>

            <label>
              Address
              <input
                type="text"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>

            <label>
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
              />
            </label>

            <label>
              New password
              <input
                type="password"
                value={form.password}
                placeholder="Leave blank to keep current"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={form.confirmPassword}
                placeholder="Repeat new password"
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
            </label>
          </div>

          {error ? <p className="personal-settings-error">{error}</p> : null}

          <div className="personal-settings-actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>

        <aside className="panel personal-summary-panel">
          <div className="section-title">
            <span>Current</span>
            <h2>Account summary</h2>
          </div>

          <div className="personal-summary-list">
            <article>
              <span>Name</span>
              <strong>{user.name}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{user.email}</strong>
            </article>
            <article>
              <span>Role</span>
              <strong>{user.role}</strong>
            </article>
            <article>
              <span>Phone</span>
              <strong>{user.phone || 'Not added'}</strong>
            </article>
            <article>
              <span>Address</span>
              <strong>{user.address || 'Not added'}</strong>
            </article>
            <article>
              <span>Date of birth</span>
              <strong>{user.date_of_birth || 'Not added'}</strong>
            </article>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default PersonalSettingsPage;
