import { useState, type FormEvent } from 'react';
import type { Order, Space, StaffMember, Store } from '../../api';
import './BranchPage.css';

type BranchFormPayload = {
  name: string;
  location: string;
  description: string;
  manager: string;
  status: string;
};

type BranchPageProps = {
  store: Store | null;
  stores: Store[];
  spaces: Space[];
  staff: StaffMember[];
  orders: Order[];
  onAddBranch: (payload: BranchFormPayload) => Promise<void>;
  onUpdateBranch: (branchId: number, payload: BranchFormPayload) => Promise<void>;
};

const initialBranchForm = {
  name: '',
  location: '',
  description: '',
  manager: '',
  status: 'open',
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function BranchPage({ store, stores, spaces, staff, orders, onAddBranch, onUpdateBranch }: BranchPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [branchForm, setBranchForm] = useState(initialBranchForm);
  const [selectedBranch, setSelectedBranch] = useState<Store | null>(null);
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const assignedWaiters = new Set(spaces.map((space) => space.assigned_waiter).filter(Boolean));
  const tables = spaces.filter((space) => space.kind === 'table');
  const privateRooms = spaces.filter((space) => space.kind === 'private_room');
  const paidOrders = orders.filter((order) => order.payment_status === 'paid' || order.status === 'completed');
  const pendingBills = orders.filter((order) => ['pending_bill', 'unpaid'].includes(order.payment_status));
  const requestedBills = orders.filter((order) => order.status === 'payment_requested');
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const pendingBillingTotal = pendingBills.reduce((sum, order) => sum + Number(order.total), 0);
  const requestedBillingTotal = requestedBills.reduce((sum, order) => sum + Number(order.total), 0);
  const openBranches = stores.filter((branch) => branch.status === 'open');
  const managerOptions = staff.filter((member) => ['owner', 'manager'].includes(member.role) && member.status === 'active');
  const selectedBranchManager = selectedBranch
    ? staff.find((member) => member.name === selectedBranch.manager)
    : null;

  function closeForm() {
    setShowForm(false);
    setEditingBranchId(null);
    setBranchForm(initialBranchForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingBranchId) {
      await onUpdateBranch(editingBranchId, branchForm);
    } else {
      await onAddBranch(branchForm);
    }

    closeForm();
  }

  function openAddForm() {
    setEditingBranchId(null);
    setBranchForm({ ...initialBranchForm, manager: managerOptions[0]?.name || '' });
    setShowForm(true);
  }

  function openEditForm(branch: Store) {
    setSelectedBranch(null);
    setEditingBranchId(branch.id);
    setBranchForm({
      name: branch.name,
      location: branch.location,
      description: branch.description,
      manager: branch.manager || managerOptions[0]?.name || '',
      status: branch.status,
    });
    setShowForm(true);
  }

  function nextBranchStatus(status: string) {
    if (status === 'open') {
      return 'maintenance';
    }

    if (status === 'maintenance') {
      return 'closed';
    }

    return 'open';
  }

  async function changeBranchStatus(branch: Store) {
    await onUpdateBranch(branch.id, {
      name: branch.name,
      location: branch.location,
      description: branch.description,
      manager: branch.manager || managerOptions[0]?.name || '',
      status: nextBranchStatus(branch.status),
    });
    setSelectedBranch(null);
  }

  return (
    <section className="branch-page">
      <div className="branch-page-hero panel">
        <div>
          <span>Branches</span>
          <h2>{store?.name ?? 'Company locations'}</h2>
          <p>Review branch status, operating zones, assigned service staff, and current order load from one place.</p>
        </div>
        <button type="button" onClick={showForm ? closeForm : openAddForm}>
          {showForm ? 'Close form' : 'Add branch'}
        </button>
      </div>

      {showForm ? (
        <div className="branch-modal-backdrop" role="presentation">
          <section className="branch-modal panel" role="dialog" aria-modal="true" aria-labelledby="branch-form-title">
            <div className="section-title">
              <div>
                <span>{editingBranchId ? 'Edit branch' : 'New branch'}</span>
                <h2 id="branch-form-title">{editingBranchId ? 'Edit branch information' : 'Add branch'}</h2>
              </div>
              <button type="button" className="branch-modal-close" onClick={closeForm}>Close</button>
            </div>

            <form className="add-branch-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                Branch name
                <input
                  value={branchForm.name}
                  onChange={(event) => setBranchForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Location
                <input
                  value={branchForm.location}
                  onChange={(event) => setBranchForm((current) => ({ ...current, location: event.target.value }))}
                  required
                />
              </label>
              <label>
                Manager
                <select
                  value={branchForm.manager}
                  onChange={(event) => setBranchForm((current) => ({ ...current, manager: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select manager</option>
                  {managerOptions.map((member) => (
                    <option key={member.id} value={member.name}>{member.name} / {member.role}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={branchForm.status} onChange={(event) => setBranchForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </label>
              <label className="full-field">
                Description
                <textarea
                  value={branchForm.description}
                  onChange={(event) => setBranchForm((current) => ({ ...current, description: event.target.value }))}
                  required
                />
              </label>
              <button type="submit">{editingBranchId ? 'Save branch' : 'Create branch'}</button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedBranch ? (
        <div className="branch-modal-backdrop" role="presentation">
          <section className="branch-detail-modal panel" role="dialog" aria-modal="true" aria-labelledby="branch-detail-title">
            <div className="section-title">
              <div>
                <span>{selectedBranch.status}</span>
                <h2 id="branch-detail-title">{selectedBranch.name}</h2>
              </div>
              <div className="branch-detail-actions">
                <button type="button" className="secondary" onClick={() => openEditForm(selectedBranch)}>Edit</button>
                <button type="button" className="secondary" onClick={() => void changeBranchStatus(selectedBranch)}>
                  Change status
                </button>
                <button type="button" className="branch-modal-close" onClick={() => setSelectedBranch(null)}>Close</button>
              </div>
            </div>

            <div className="branch-detail-summary">
              <article><span>Branch name</span><b>{selectedBranch.name}</b></article>
              <article><span>Status</span><b>{selectedBranch.status}</b></article>
              <article><span>Manager</span><b>{selectedBranch.manager || 'Not assigned'}</b></article>
              <article><span>Location</span><b>{selectedBranch.location}</b></article>
              <article><span>Staff</span><b>{staff.length}</b></article>
              <article><span>Tables</span><b>{tables.length}</b></article>
              <article><span>Private rooms</span><b>{privateRooms.length}</b></article>
              <article><span>Spaces</span><b>{spaces.length}</b></article>
              <article><span>Active orders</span><b>{activeOrders.length}</b></article>
              <article><span>Revenue</span><b>{formatMoney(totalRevenue)}</b></article>
              <article><span>Billings</span><b>{formatMoney(pendingBillingTotal + requestedBillingTotal)}</b></article>
            </div>

            <div className="branch-detail-section">
              <span>Description</span>
              <p>{selectedBranch.description}</p>
            </div>

            <div className="branch-detail-section">
              <span>Manager contact</span>
              <p>
                {selectedBranchManager
                  ? `${selectedBranchManager.email}${selectedBranchManager.phone ? ` / ${selectedBranchManager.phone}` : ''}`
                  : 'No manager account details found.'}
              </p>
            </div>

            <div className="branch-detail-section">
              <span>Revenue and billings</span>
              <div className="branch-finance-grid">
                <article>
                  <span>Total revenue</span>
                  <strong>{formatMoney(totalRevenue)}</strong>
                  <p>{paidOrders.length} paid orders</p>
                </article>
                <article>
                  <span>Pending billing</span>
                  <strong>{formatMoney(pendingBillingTotal)}</strong>
                  <p>{pendingBills.length} unpaid or pending bills</p>
                </article>
                <article>
                  <span>Payment requested</span>
                  <strong>{formatMoney(requestedBillingTotal)}</strong>
                  <p>{requestedBills.length} bills sent to cashier</p>
                </article>
              </div>

              <div className="branch-billing-list">
                {orders.map((order) => (
                  <article key={order.id}>
                    <div>
                      <strong>Order #{order.id}</strong>
                      <p>{order.customer_name} / {order.waiter_name}</p>
                    </div>
                    <span>{order.payment_status.replace(/_/g, ' ')}</span>
                    <b>{formatMoney(order.total)}</b>
                  </article>
                ))}
                {!orders.length ? <p className="empty">No billing records yet.</p> : null}
              </div>
            </div>

            <div className="branch-detail-section">
              <span>Staff members</span>
              <div className="branch-detail-grid">
                {staff.map((member) => (
                  <article key={member.id}>
                    <strong>{member.name}</strong>
                    <p>{member.role} / {member.shift}</p>
                    <small>{member.email}{member.phone ? ` / ${member.phone}` : ''}</small>
                    <b className={member.status === 'active' ? 'branch-mini-status active' : 'branch-mini-status'}>{member.status}</b>
                  </article>
                ))}
                {!staff.length ? <p className="empty">No staff members added yet.</p> : null}
              </div>
            </div>

            <div className="branch-detail-section">
              <span>Tables</span>
              <div className="branch-detail-grid">
                {tables.map((space) => (
                  <article key={space.id}>
                    <strong>{space.label}</strong>
                    <p>Capacity {space.capacity} / {space.assigned_waiter}</p>
                    <small>QR token: {space.qr_token}</small>
                    <b className={`branch-mini-status ${space.status}`}>{space.status}</b>
                  </article>
                ))}
                {!tables.length ? <p className="empty">No tables added yet.</p> : null}
              </div>
            </div>

            <div className="branch-detail-section">
              <span>Private rooms</span>
              <div className="branch-detail-grid">
                {privateRooms.map((space) => (
                  <article key={space.id}>
                    <strong>{space.label}</strong>
                    <p>Capacity {space.capacity} / {space.assigned_waiter}</p>
                    <small>QR token: {space.qr_token}</small>
                    <b className={`branch-mini-status ${space.status}`}>{space.status}</b>
                  </article>
                ))}
                {!privateRooms.length ? <p className="empty">No private rooms added yet.</p> : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div className="branch-stats">
        <article><span>Branches</span><b>{stores.length}</b></article>
        <article><span>Open</span><b>{openBranches.length}</b></article>
        <article><span>Spaces</span><b>{spaces.length}</b></article>
        <article><span>Active orders</span><b>{activeOrders.length}</b></article>
      </div>

      <div className="branch-layout">
        <section className="panel branch-profile">
          <div className="section-title">
            <span>Primary branch</span>
            <h2>Location profile</h2>
          </div>

          <div className="branch-profile-card">
            <strong>{store?.name ?? 'SmartDine Central'}</strong>
            <p>{store?.location ?? 'No location set'}</p>
            <p>Manager: {store?.manager || 'Not assigned'}</p>
            <span>{store?.description ?? 'No description available.'}</span>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Locations</span>
            <h2>All branches</h2>
          </div>

          <div className="branch-list">
            {stores.map((branch) => (
              <article className="branch-list-card" key={branch.id}>
                <button type="button" className="branch-card-main" onClick={() => setSelectedBranch(branch)}>
                  <div>
                    <strong>{branch.name}</strong>
                    <p>{branch.location}</p>
                    <p>Manager: {branch.manager || 'Not assigned'}</p>
                    <small>{branch.description}</small>
                  </div>
                  <span className={`branch-status ${branch.status}`}>{branch.status}</span>
                </button>
                <div className="branch-card-actions">
                  <button type="button" className="secondary" onClick={() => openEditForm(branch)}>Edit</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Operations / {store?.name ?? 'Primary branch'}</span>
            <h2>Branch spaces</h2>
          </div>

          <div className="branch-space-list">
            {spaces.map((space) => (
              <article key={space.id}>
                <div>
                  <strong>{space.label}</strong>
                  <p>{store?.name ?? 'Primary branch'} / {space.kind.replace(/_/g, ' ')} / capacity {space.capacity}</p>
                </div>
                <span>{space.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Coverage</span>
            <h2>Assigned waiters</h2>
          </div>

          <div className="branch-staff-list">
            {[...assignedWaiters].map((waiter) => (
              <article key={waiter}>
                <strong>{waiter}</strong>
                <p>Assigned branch service</p>
              </article>
            ))}
            {!assignedWaiters.size ? <p className="empty">No waiters assigned yet.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

export default BranchPage;
