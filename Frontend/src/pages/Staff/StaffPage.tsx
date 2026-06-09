import { useState, type FormEvent } from 'react';
import type { StaffMember } from '../../api';
import './StaffPage.css';

type StaffFormPayload = {
  name: string;
  email: string;
  phone: string;
  address: string;
  login_email: string;
  password?: string;
  role: string;
  shift: string;
  status: string;
};

type StaffPageProps = {
  staff: StaffMember[];
  onAddStaff: (payload: StaffFormPayload & { password: string }) => Promise<void>;
  onUpdateStaff: (staffId: number, payload: StaffFormPayload) => Promise<void>;
  onDeleteStaff: (staffId: number) => Promise<void>;
};

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

const initialStaffForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  login_email: '',
  password: '',
  role: 'waiter',
  shift: 'day shift',
  status: 'active',
};

function StaffPage({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }: StaffPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const activeStaff = staff.filter((member) => member.status === 'active');
  const managers = staff.filter((member) => ['owner', 'manager'].includes(member.role));
  const serviceTeam = staff.filter((member) => ['waiter', 'cashier'].includes(member.role));
  const kitchenTeam = staff.filter((member) => member.role === 'kitchen');
  const isEditing = editingStaffId !== null;

  function openAddForm() {
    setEditingStaffId(null);
    setStaffForm(initialStaffForm);
    setShowForm(true);
  }

  function openEditForm(member: StaffMember) {
    setEditingStaffId(member.id);
    setStaffForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      address: member.address || '',
      login_email: member.login_email || member.email,
      password: '',
      role: member.role,
      shift: member.shift,
      status: member.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingStaffId(null);
    setStaffForm(initialStaffForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = staffForm.password ? staffForm : { ...staffForm, password: undefined };

    if (editingStaffId) {
      await onUpdateStaff(editingStaffId, payload);
    } else {
      await onAddStaff(staffForm);
    }

    closeForm();
  }

  function handleDelete(member: StaffMember) {
    if (window.confirm(`Delete ${member.name}'s staff account?`)) {
      void onDeleteStaff(member.id);
    }
  }

  return (
    <section className="staff-page">
      <div className="staff-page-hero panel">
        <div>
          <span>Staff</span>
          <h2>Team management</h2>
          <p>Review staff roles, shifts, account status, and operating coverage across service, kitchen, cashier, and management.</p>
        </div>
        <button type="button" onClick={showForm ? closeForm : openAddForm}>
          {showForm ? 'Close form' : 'Add staff'}
        </button>
      </div>

      {showForm ? (
        <div className="staff-modal-backdrop" role="presentation">
          <section className="staff-modal panel" role="dialog" aria-modal="true" aria-labelledby="staff-form-title">
            <div className="section-title">
              <div>
                <span>{isEditing ? 'Edit staff' : 'New staff'}</span>
                <h2 id="staff-form-title">{isEditing ? 'Edit staff account' : 'Add staff account'}</h2>
              </div>
              <button type="button" className="staff-modal-close" onClick={closeForm}>Close</button>
            </div>

            <div className="staff-form-section">
              <span>Profile details</span>
            </div>
            <form className="add-staff-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                Name
                <input
                  value={staffForm.name}
                  onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(event) => setStaffForm((current) => ({ ...current, phone: event.target.value }))}
                  required
                />
              </label>
              <label className="full-field">
                Address
                <textarea
                  value={staffForm.address}
                  onChange={(event) => setStaffForm((current) => ({ ...current, address: event.target.value }))}
                  required
                />
              </label>
              <label>
                Role
                <select value={staffForm.role} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="cashier">Cashier</option>
                </select>
              </label>
              <label>
                Shift
                <input
                  value={staffForm.shift}
                  onChange={(event) => setStaffForm((current) => ({ ...current, shift: event.target.value }))}
                  required
                />
              </label>
              <label>
                Status
                <select value={staffForm.status} onChange={(event) => setStaffForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="staff-form-section full-field">
                <span>Login account</span>
              </div>
              <label>
                Login email
                <input
                  type="email"
                  value={staffForm.login_email}
                  onChange={(event) => setStaffForm((current) => ({ ...current, login_email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Login password
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))}
                  minLength={8}
                  placeholder={isEditing ? 'Leave blank to keep current password' : ''}
                  required={!isEditing}
                />
              </label>
              <button type="submit">{isEditing ? 'Save changes' : 'Create staff'}</button>
            </form>
          </section>
        </div>
      ) : null}

      <div className="staff-stats">
        <article><span>Total staff</span><b>{staff.length}</b></article>
        <article><span>Active</span><b>{activeStaff.length}</b></article>
        <article><span>Managers</span><b>{managers.length}</b></article>
        <article><span>Kitchen</span><b>{kitchenTeam.length}</b></article>
      </div>

      <div className="staff-layout">
        <section className="panel">
          <div className="section-title">
            <span>Roster</span>
            <h2>Staff accounts</h2>
          </div>

          <div className="staff-list">
            {staff.map((member) => (
              <article className="staff-card" key={member.id}>
                <div className="staff-avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.email}{member.phone ? ` / ${member.phone}` : ''}</p>
                </div>
                <span className={`staff-pill ${member.role}`}>{readable(member.role)}</span>
                <span className="staff-shift">{member.shift}</span>
                <span className={member.status === 'active' ? 'staff-status active' : 'staff-status'}>{member.status}</span>
                <div className="staff-actions" aria-label={`${member.name} account actions`}>
                  <button type="button" className="secondary compact" onClick={() => openEditForm(member)}>Edit</button>
                  <button type="button" className="danger compact" onClick={() => handleDelete(member)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="staff-side">
          <section className="panel">
            <div className="section-title">
              <span>Service</span>
              <h2>Front team</h2>
            </div>
            <div className="mini-staff-list">
              {serviceTeam.map((member) => (
                <article key={member.id}>
                  <strong>{member.name}</strong>
                  <p>{member.role} / {member.shift}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <span>Kitchen</span>
              <h2>Preparation team</h2>
            </div>
            <div className="mini-staff-list">
              {kitchenTeam.map((member) => (
                <article key={member.id}>
                  <strong>{member.name}</strong>
                  <p>{member.shift}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default StaffPage;
