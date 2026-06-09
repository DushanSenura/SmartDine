import { useEffect, useState, type FormEvent } from 'react';
import type { Space, StaffMember, Store } from '../../api';
import './CompanySettingsPage.css';

type CompanySettingsPayload = {
  name: string;
  location: string;
  description: string;
  manager: string;
  status: string;
};

type CompanySettingsPageProps = {
  store: Store | null;
  stores: Store[];
  staff: StaffMember[];
  spaces: Space[];
  onUpdateCompany: (branchId: number, payload: CompanySettingsPayload) => Promise<void>;
};

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

const emptyCompanyForm = {
  name: '',
  location: '',
  description: '',
  manager: '',
  status: 'open',
};

function CompanySettingsPage({ store, stores, staff, spaces, onUpdateCompany }: CompanySettingsPageProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(store?.id ?? stores[0]?.id ?? null);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const managers = staff.filter((member) => ['owner', 'manager'].includes(member.role));
  const serviceStaff = staff.filter((member) => ['waiter', 'cashier'].includes(member.role));
  const kitchenStaff = staff.filter((member) => member.role === 'kitchen');
  const tables = spaces.filter((space) => space.kind === 'table');
  const privateRooms = spaces.filter((space) => space.kind === 'private_room');
  const selectedBranch = stores.find((branch) => branch.id === selectedBranchId) ?? store ?? stores[0] ?? null;

  useEffect(() => {
    const nextBranch = stores.find((branch) => branch.id === selectedBranchId) ?? store ?? stores[0] ?? null;
    if (!nextBranch) {
      setCompanyForm(emptyCompanyForm);
      return;
    }

    setSelectedBranchId(nextBranch.id);
    setCompanyForm({
      name: nextBranch.name,
      location: nextBranch.location,
      description: nextBranch.description,
      manager: nextBranch.manager || managers[0]?.name || '',
      status: nextBranch.status || 'open',
    });
  }, [store, stores, selectedBranchId]);

  async function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage('');

    if (!selectedBranch) {
      setFormMessage('No company or branch profile is available to update.');
      return;
    }

    setSaving(true);
    try {
      await onUpdateCompany(selectedBranch.id, companyForm);
      setFormMessage('Company information updated.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Could not update company information.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="company-settings-page">
      <div className="company-settings-hero panel">
        <div>
          <span>Company settings</span>
          <h2>{store?.name ?? 'SmartDine'}</h2>
          <p>Review company profile, branch configuration, access roles, and operating defaults.</p>
        </div>
      </div>

      <div className="company-settings-stats">
        <article><span>Branches</span><b>{stores.length}</b></article>
        <article><span>Managers</span><b>{managers.length}</b></article>
        <article><span>Tables</span><b>{tables.length}</b></article>
        <article><span>Private rooms</span><b>{privateRooms.length}</b></article>
      </div>

      <div className="company-settings-layout">
        <section className="panel company-profile-panel">
          <div className="section-title">
            <span>Profile</span>
            <h2>Edit company information</h2>
          </div>

          <form className="company-settings-form" onSubmit={(event) => void handleCompanySubmit(event)}>
            <label>
              Company or branch
              <select
                value={selectedBranch?.id ?? ''}
                onChange={(event) => {
                  setFormMessage('');
                  setSelectedBranchId(Number(event.target.value));
                }}
              >
                {stores.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </label>

            <label>
              Company / branch name
              <input
                value={companyForm.name}
                onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label>
              Location
              <input
                value={companyForm.location}
                onChange={(event) => setCompanyForm((current) => ({ ...current, location: event.target.value }))}
                required
              />
            </label>

            <label>
              Manager
              <select
                value={companyForm.manager}
                onChange={(event) => setCompanyForm((current) => ({ ...current, manager: event.target.value }))}
                required
              >
                <option value="" disabled>Select manager</option>
                {managers.map((member) => (
                  <option key={member.id} value={member.name}>{member.name} / {member.role}</option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={companyForm.status}
                onChange={(event) => setCompanyForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>

            <label>
              Description
              <textarea
                value={companyForm.description}
                onChange={(event) => setCompanyForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
            </label>

            {formMessage ? <p className="company-settings-message">{formMessage}</p> : null}

            <button type="submit" className="primary" disabled={saving || !selectedBranch}>
              {saving ? 'Saving...' : 'Save company information'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Branches</span>
            <h2>Branch defaults</h2>
          </div>

          <div className="settings-list">
            {stores.map((branch) => (
              <article key={branch.id} className={branch.id === selectedBranch?.id ? 'selected' : ''}>
                <div>
                  <strong>{branch.name}</strong>
                  <p>{branch.location}</p>
                  <small>Manager: {branch.manager || 'Not assigned'}</small>
                </div>
                <button type="button" className="settings-branch-edit" onClick={() => setSelectedBranchId(branch.id)}>
                  Edit
                </button>
                <span className={`settings-pill ${branch.status}`}>{branch.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Access</span>
            <h2>Role settings</h2>
          </div>

          <div className="settings-role-grid">
            <article><span>Management</span><b>{managers.length}</b><p>Owner and manager dashboard access</p></article>
            <article><span>Service</span><b>{serviceStaff.length}</b><p>Waiters and cashiers for guest flow</p></article>
            <article><span>Kitchen</span><b>{kitchenStaff.length}</b><p>Kitchen preparation accounts</p></article>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Operations</span>
            <h2>Space settings</h2>
          </div>

          <div className="settings-list">
            {spaces.map((space) => (
              <article key={space.id}>
                <div>
                  <strong>{space.label}</strong>
                  <p>{readable(space.kind)} / capacity {space.capacity}</p>
                  <small>QR token: {space.qr_token}</small>
                </div>
                <span className={`settings-pill ${space.status}`}>{space.status}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default CompanySettingsPage;
