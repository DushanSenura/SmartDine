import { useEffect, useState, type FormEvent } from 'react';
import './App.css';
import {
  approveOrder,
  createBooking,
  createOrder,
  createSpace,
  createStaff,
  createStore,
  deleteStaff,
  getCurrentUser,
  loadDashboard,
  login,
  prepareItem,
  completePayment,
  requestPayment,
  serveItem,
  updateCurrentUser,
  updateStaff,
  updateStore,
  type DashboardSnapshot,
  type User,
} from './api';
import DashboardPage from './pages/Dashboard/DashboardPage';
import OrderPage from './pages/Order/OrderPage';
import StaffPage from './pages/Staff/StaffPage';
import BranchPage from './pages/Branch/BranchPage';
import MenuPage from './pages/Menu/MenuPage';
import BookingPage from './pages/Booking/BookingPage';
import TableRoomsPage from './pages/TableRooms/TableRoomsPage';
import ChashiarPage from './pages/Cashier/ChashiarPage';
import KitchenPage from './pages/Kitchen/KitchenPage';
import CompanySettingsPage from './pages/CompanySettings/CompanySettingsPage';
import PersonalSettingsPage from './pages/PersonalSettings/PersonalSettingsPage';
import FoodServiceOrderPage from './pages/FoodServiceOrder/FoodServiceOrderPage';
import logoImage from './assets/logo.png';

type DashboardPageId = 'dashboard' | 'orders' | 'ordering' | 'payment' | 'kitchen' | 'booking' | 'spaces' | 'staff' | 'branch' | 'chashiar' | 'menu' | 'company-settings' | 'personal-settings';
type SidebarItem = {
  id: DashboardPageId;
  label: string;
  marker: string;
  detail: string;
  hiddenFor?: Array<User['role']>;
};

const demoCredentials = [
  { role: 'Owner', email: 'owner@smartdine.test', password: 'Owner123!' },
  { role: 'Manager', email: 'manager@smartdine.test', password: 'Manager123!' },
  { role: 'Waiter', email: 'waiter@smartdine.test', password: 'Waiter123!' },
  { role: 'Kitchen', email: 'kitchen@smartdine.test', password: 'Kitchen123!' },
  { role: 'Cashier', email: 'cashier@smartdine.test', password: 'Cashier123!' },
];

const hiddenPagesByRole: Partial<Record<DashboardPageId, Array<User['role']>>> = {
  ordering: ['kitchen'],
  payment: ['waiter', 'kitchen', 'customer'],
  kitchen: ['waiter', 'cashier', 'customer'],
  booking: ['waiter', 'kitchen', 'customer'],
  spaces: ['waiter', 'kitchen', 'customer'],
  staff: ['waiter', 'kitchen', 'customer'],
  branch: ['waiter', 'kitchen', 'customer'],
  chashiar: ['waiter', 'kitchen', 'customer'],
  menu: ['waiter', 'kitchen', 'customer'],
  'company-settings': ['waiter', 'kitchen', 'customer'],
};

function pageIsHiddenForRole(pageId: DashboardPageId, role: User['role']) {
  return hiddenPagesByRole[pageId]?.includes(role) ?? false;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('smartdine-token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loginForm, setLoginForm] = useState({ email: 'owner@smartdine.test', password: 'Owner123!' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<DashboardPageId>('dashboard');

  useEffect(() => {
    if (token) {
      void openDashboard(token);
    }
  }, [token]);

  function canUseDashboard(role: string) {
    return ['owner', 'manager', 'waiter', 'kitchen', 'cashier'].includes(role);
  }

  async function openDashboard(nextToken = token) {
    setLoading(true);
    try {
      const profile = await getCurrentUser(nextToken);
      if (!canUseDashboard(profile.user.role)) {
        localStorage.removeItem('smartdine-token');
        setToken('');
        setUser(null);
        setDashboard(null);
        setMessage('Customers cannot access the company dashboard.');
        return;
      }

      const snapshot = await loadDashboard(nextToken);
      setUser(profile.user);
      setDashboard(snapshot);
    } catch (error) {
      localStorage.removeItem('smartdine-token');
      setToken('');
      setUser(null);
      setDashboard(null);
      setMessage(error instanceof Error ? error.message : 'Could not open dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await login(loginForm.email, loginForm.password);
      if (!canUseDashboard(result.user.role)) {
        setMessage('Customers cannot access the company dashboard.');
        return;
      }

      localStorage.setItem('smartdine-token', result.token);
      setToken(result.token);
      setUser(result.user);
      await openDashboard(result.token);
      setMessage(`Signed in as ${result.user.name} (${result.user.role}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('smartdine-token');
    setToken('');
    setUser(null);
    setDashboard(null);
    setMessage('');
  }

  async function handleUpdateCurrentUser(payload: { name: string; email: string; phone: string; address: string; date_of_birth: string; password?: string }) {
    if (!token) {
      setMessage('You must be signed in to update personal settings.');
      return;
    }

    setLoading(true);
    try {
      const result = await updateCurrentUser(token, payload);
      localStorage.setItem('smartdine-token', result.token);
      setToken(result.token);
      setUser(result.user);
      await openDashboard(result.token);
      setMessage('Personal settings updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update personal settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStaff(payload: {
    name: string;
    email: string;
    phone: string;
    address: string;
    login_email: string;
    password: string;
    role: string;
    shift: string;
    status: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to add staff.');
      return;
    }

    setLoading(true);
    try {
      const created = await createStaff(token, payload);
      await openDashboard(token);
      setMessage(`Created ${created.name}. Login account: ${created.login_email ?? payload.login_email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create staff member');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStaff(staffId: number, payload: {
    name: string;
    email: string;
    phone: string;
    address: string;
    login_email: string;
    password?: string;
    role: string;
    shift: string;
    status: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to edit staff.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateStaff(token, staffId, payload);
      await openDashboard(token);
      setMessage(`Updated ${updated.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update staff member');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStaff(staffId: number) {
    if (!token) {
      setMessage('You must be signed in to delete staff.');
      return;
    }

    setLoading(true);
    try {
      const result = await deleteStaff(token, staffId);
      await openDashboard(token);
      setMessage(`Deleted ${result.staff.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete staff member');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBooking(payload: {
    customer_name: string;
    customer_email: string;
    space_kind: string;
    space_label: string;
    party_size: number;
    booking_time: string;
    notes: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to add bookings.');
      return;
    }

    setLoading(true);
    try {
      const created = await createBooking(token, payload);
      await openDashboard(token);
      setMessage(`Booked ${created.space_label} for ${created.customer_name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create booking');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFoodServiceOrder(payload: {
    space_token: string;
    waiter_name: string;
    customer_name: string;
    customer_email: string;
    notes: string;
    items: Array<{ menu_item_id: number; name: string; quantity: number; price: number }>;
  }) {
    if (!token) {
      setMessage('You must be signed in to create orders.');
      return;
    }

    setLoading(true);
    try {
      const created = await createOrder(token, payload);
      await openDashboard(token);
      setMessage(`Created order #${created.id} for ${created.customer_name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create order');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveOrder(orderId: number) {
    if (!token) {
      setMessage('You must be signed in to approve orders.');
      return;
    }

    setLoading(true);
    try {
      const updated = await approveOrder(token, orderId);
      await openDashboard(token);
      setMessage(`Order #${updated.id} approved and sent to kitchen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not approve order');
    } finally {
      setLoading(false);
    }
  }

  async function handleReadyToServe(orderId: number) {
    if (!token) {
      setMessage('You must be signed in to prepare orders.');
      return;
    }

    const currentOrder = dashboard?.orders.find((order) => order.id === orderId);
    if (!currentOrder) {
      setMessage('Order not found. Refresh and try again.');
      return;
    }

    const pendingItems = currentOrder.items.filter((item) => item.status === 'pending');
    if (!pendingItems.length) {
      setMessage(`Order #${orderId} is already ready to serve.`);
      return;
    }

    setLoading(true);
    try {
      for (const item of pendingItems) {
        await prepareItem(token, orderId, item.id);
      }

      await openDashboard(token);
      setMessage(`Order #${orderId} is ready to serve.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not prepare order');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepareItem(orderId: number, itemId: string) {
    if (!token) {
      setMessage('You must be signed in to prepare items.');
      return;
    }

    setLoading(true);
    try {
      await prepareItem(token, orderId, itemId);
      await openDashboard(token);
      setMessage(`Prepared item for order #${orderId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not prepare item');
    } finally {
      setLoading(false);
    }
  }

  async function handleServeOrder(orderId: number) {
    if (!token) {
      setMessage('You must be signed in to serve orders.');
      return;
    }

    const currentOrder = dashboard?.orders.find((order) => order.id === orderId);
    if (!currentOrder) {
      setMessage('Order not found. Refresh and try again.');
      return;
    }

    const preparedItems = currentOrder.items.filter((item) => item.status === 'prepared');
    if (!preparedItems.length) {
      setMessage(`Order #${orderId} has no prepared items to serve.`);
      return;
    }

    setLoading(true);
    try {
      for (const item of preparedItems) {
        await serveItem(token, orderId, item.id);
      }

      await openDashboard(token);
      setMessage(`Order #${orderId} served and sent to cashier.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not serve order');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPayment(orderId: number) {
    if (!token) {
      setMessage('You must be signed in to request payment.');
      return;
    }

    setLoading(true);
    try {
      const updated = await requestPayment(token, orderId);
      await openDashboard(token);
      setMessage(`Payment requested for order #${updated.id}. Cashier has been notified.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not request payment');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompletePayment(orderId: number, paymentMethod: string, paymentDetails: { paid_amount: number; change_amount: number }) {
    if (!token) {
      setMessage('You must be signed in to complete payments.');
      throw new Error('Missing token');
    }

    setLoading(true);
    try {
      const updated = await completePayment(token, orderId, paymentMethod, paymentDetails);
      await openDashboard(token);
      setMessage(`Payment recorded for order #${updated.id} by ${paymentMethod.replace(/_/g, ' ')}.`);
      return updated;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete payment');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSpace(payload: {
    label: string;
    kind: string;
    capacity: number;
    qr_token: string;
    assigned_waiter: string;
    status: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to add tables or private rooms.');
      return;
    }

    setLoading(true);
    try {
      const created = await createSpace(token, payload);
      await openDashboard(token);
      setMessage(`Created ${created.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create table or private room');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBranch(payload: {
    name: string;
    location: string;
    description: string;
    manager: string;
    status: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to add a branch.');
      return;
    }

    setLoading(true);
    try {
      const created = await createStore(token, payload);
      await openDashboard(token);
      setMessage(`Created branch ${created.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create branch');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateBranch(branchId: number, payload: {
    name: string;
    location: string;
    description: string;
    manager: string;
    status: string;
  }) {
    if (!token) {
      setMessage('You must be signed in to update a branch.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateStore(token, branchId, payload);
      await openDashboard(token);
      setMessage(`Updated branch ${updated.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update branch');
    } finally {
      setLoading(false);
    }
  }

  if (token && user && dashboard) {
    const visibleActivePage = pageIsHiddenForRole(activePage, user.role) ? 'dashboard' : activePage;
    const sidebarItems = ([
      { id: 'dashboard', label: 'Dashboard', marker: 'D', detail: 'Company overview' },
      { id: 'orders', label: 'Orders', marker: 'O', detail: `${dashboard.orders.length} total` },
    { id: 'ordering', label: 'Ordering', marker: 'F', detail: 'Foods & services' },
      { id: 'kitchen', label: 'Kitchen', marker: 'K', detail: `${dashboard.orders.filter((order) => ['approved', 'preparing'].includes(order.status)).length} in queue`, hiddenFor: ['waiter', 'cashier', 'customer'] },
      { id: 'booking', label: 'Booking', marker: 'B', detail: `${dashboard.bookings.length} reservations`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'spaces', label: 'Tables', marker: 'T', detail: `${dashboard.spaces.length} spaces`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'staff', label: 'Staff', marker: 'S', detail: `${dashboard.staff.length} active`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'branch', label: 'Branch', marker: 'B', detail: dashboard.store?.status ?? 'open', hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'chashiar', label: 'Cashier', marker: 'C', detail: `${dashboard.orders.filter((order) => order.payment_status !== 'paid').length} bills`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'menu', label: 'Menu', marker: 'M', detail: `${dashboard.menuItems.length} items`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'company-settings', label: 'Settings', marker: 'G', detail: `${dashboard.stores.length} branches`, hiddenFor: ['waiter', 'kitchen', 'customer'] },
      { id: 'personal-settings', label: 'Personal', marker: 'P', detail: 'Account settings' },
    ] satisfies SidebarItem[]).filter((item) => !pageIsHiddenForRole(item.id, user.role));

    return (
      <main className={isSidebarOpen ? 'app-shell dashboard-shell' : 'app-shell dashboard-shell sidebar-collapsed'}>
        <aside className="side-panel" aria-label="Dashboard navigation">
          <div className="side-panel-main">
            <div className="side-panel-header">
              <div className="brand-mark">
                <img src={logoImage} alt="SmartDine logo" />
              </div>
              <div className="side-panel-text">
                <strong>SmartDine</strong>
                <span>{user.role}</span>
              </div>
            </div>

            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-label={isSidebarOpen ? 'Minimize side panel' : 'Expand side panel'}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? '<' : '>'}
            </button>

            <nav className="side-nav">
              {sidebarItems.map((item) => (
                <button
                  type="button"
                  className={visibleActivePage === item.id ? 'side-nav-item active' : 'side-nav-item'}
                  key={item.label}
                  title={item.label}
                  onClick={() => setActivePage(item.id as DashboardPageId)}
                >
                  <span className="side-marker">{item.marker}</span>
                  <span className="side-label">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
              <button type="button" className="side-nav-item mobile-account-item" title={user.name}>
                <span className="side-marker">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="side-label">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
              </button>
              <button type="button" className="side-nav-item mobile-logout-item" onClick={logout} title="Logout">
                <span className="logout-marker">L</span>
                <span className="side-label">
                  <strong>Logout</strong>
                  <small>Sign out</small>
                </span>
              </button>
            </nav>
          </div>

          <div className="side-panel-account">
            <div className="side-user">
              <span className="side-marker">{user.name.slice(0, 1).toUpperCase()}</span>
              <div className="side-label">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
            <button type="button" className="sidebar-logout" onClick={logout} title="Logout">
              <span className="logout-marker">L</span>
              <span className="logout-label">Logout</span>
            </button>
          </div>
        </aside>

        <section className="dashboard-content">
          <header className="topbar">
            <div>
              <span>SmartDine Dashboard</span>
              <h1>{dashboard.store?.name ?? 'Company dashboard'}</h1>
              <p>{user.name} / {user.role}</p>
            </div>
            <div>
              <button type="button" className="secondary" onClick={() => void openDashboard()}>Refresh</button>
            </div>
          </header>

          {visibleActivePage === 'dashboard' ? (
            <DashboardPage
              dashboard={dashboard}
              store={dashboard.store}
              orders={dashboard.orders}
              menuItems={dashboard.menuItems}
              notifications={dashboard.notifications}
              onRefresh={() => void openDashboard()}
            />
          ) : null}

          {visibleActivePage === 'orders' ? (
            <OrderPage
              orders={dashboard.orders}
              role={user.role}
              loading={loading}
              onApproveOrder={handleApproveOrder}
              onServeOrder={handleServeOrder}
              onRequestPayment={handleRequestPayment}
            />
          ) : null}
          {visibleActivePage === 'ordering' ? (
            <FoodServiceOrderPage
              menuItems={dashboard.menuItems}
              spaces={dashboard.spaces}
              staff={dashboard.staff}
              loading={loading}
              onCreateOrder={handleCreateFoodServiceOrder}
            />
          ) : null}
          {visibleActivePage === 'kitchen' ? (
            <KitchenPage
              orders={dashboard.orders}
              loading={loading}
              onReadyToServe={handleReadyToServe}
              onPrepareItem={handlePrepareItem}
            />
          ) : null}
          {visibleActivePage === 'booking' ? (
            <BookingPage
              bookings={dashboard.bookings}
              spaces={dashboard.spaces}
              onAddBooking={handleAddBooking}
            />
          ) : null}
          {visibleActivePage === 'spaces' ? (
            <TableRoomsPage
              spaces={dashboard.spaces}
              bookings={dashboard.bookings}
              staff={dashboard.staff}
              onAddSpace={handleAddSpace}
            />
          ) : null}
          {visibleActivePage === 'staff' ? (
            <StaffPage
              staff={dashboard.staff}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
            />
          ) : null}
          {visibleActivePage === 'branch' ? (
            <BranchPage
              store={dashboard.store}
              stores={dashboard.stores}
              spaces={dashboard.spaces}
              staff={dashboard.staff}
              orders={dashboard.orders}
              onAddBranch={handleAddBranch}
              onUpdateBranch={handleUpdateBranch}
            />
          ) : null}
          {visibleActivePage === 'chashiar' ? (
            <ChashiarPage
              orders={dashboard.orders}
              store={dashboard.store}
              staff={dashboard.staff}
              onCompletePayment={handleCompletePayment}
            />
          ) : null}
          {visibleActivePage === 'menu' ? <MenuPage menuItems={dashboard.menuItems} /> : null}
          {visibleActivePage === 'company-settings' ? (
            <CompanySettingsPage
              store={dashboard.store}
              stores={dashboard.stores}
              staff={dashboard.staff}
              spaces={dashboard.spaces}
              onUpdateCompany={handleUpdateBranch}
            />
          ) : null}

          {visibleActivePage === 'personal-settings' ? (
            <PersonalSettingsPage
              user={user}
              loading={loading}
              onSave={handleUpdateCurrentUser}
            />
          ) : null}

          {message ? <div className="toast">{message}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell login-only-shell">
      <section className="intro-panel login-hero">
        <div>
          <span>SmartDine</span>
          <h1>Staff sign in</h1>
          <p className="muted">Access orders, staff, menus, kitchen flows, and billing.</p>

          <div className="credential-grid">
            {demoCredentials.map((credential) => (
              <button
                key={credential.email}
                type="button"
                onClick={() => {
                  setLoginForm({ email: credential.email, password: credential.password });
                  setMessage('Credential filled. Press Sign in.');
                }}
              >
                <b>{credential.role}</b>
                <span>{credential.email}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="login-card" onSubmit={(event) => void handleLogin(event)}>
          <div className="card-inner">
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            <div className="form-row">
              <label className="checkbox">
                <input type="checkbox" />
                Remember
              </label>
              <a
                className="link"
                href="#forgot"
                onClick={(event) => {
                  event.preventDefault();
                  setMessage('Forgot password flow is not configured yet.');
                }}
              >
                Forgot?
              </a>
            </div>

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </section>

      {message ? <div className="toast">{message}</div> : null}
    </main>
  );
}

export default App;
