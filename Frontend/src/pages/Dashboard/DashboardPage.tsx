import type { DashboardSnapshot, MenuItem, Notification, Order, Store } from '../../api';
import './DashboardPage.css';

type DashboardPageProps = {
  dashboard: DashboardSnapshot | null;
  store: Store | null;
  orders: Order[];
  menuItems: MenuItem[];
  notifications: Notification[];
  onRefresh: () => void;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function notificationPanel(items: Notification[]) {
  return (
    <section className="panel">
      <div className="section-title">
        <span>Notifications</span>
        <h2>Company feed</h2>
      </div>
      <div className="notice-list">
        {items.slice(0, 10).map((notice) => (
          <article key={notice.id}>
            <b>{notice.target_role}</b>
            <strong>{readable(notice.type)}</strong>
            <p>{notice.message}</p>
          </article>
        ))}
        {!items.length ? <p className="empty">No notifications yet.</p> : null}
      </div>
    </section>
  );
}

function DashboardPage({ dashboard, store, orders, menuItems, notifications, onRefresh }: DashboardPageProps) {
  const completedOrders = orders.filter((order) => order.status === 'completed');
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingApprovals = orders.filter((order) => order.status === 'ready_to_approve').length;
  const kitchenQueue = orders.filter((order) => ['approved', 'preparing'].includes(order.status)).length;
  const billingQueue = orders.filter((order) => order.status === 'payment_requested').length;
  const activeStaff = dashboard?.staff.filter((member) => member.status === 'active') ?? [];
  const availableMenu = menuItems.filter((item) => item.available);

  return (
    <section className="owner-dashboard">
      <div className="owner-hero panel">
        <div>
          <span>Company Owner Dashboard</span>
          <h2>{store?.name ?? 'SmartDine Company'}</h2>
          <p>Monitor restaurant performance, live orders, team activity, menu readiness, and billing from one page.</p>
        </div>
        <button type="button" onClick={onRefresh}>Refresh dashboard</button>
      </div>

      <div className="owner-kpis">
        <article><span>Revenue</span><b>{formatMoney(revenue)}</b><p>Completed paid orders</p></article>
        <article><span>Active orders</span><b>{activeOrders.length}</b><p>Open kitchen and service work</p></article>
        <article><span>Approvals</span><b>{pendingApprovals}</b><p>Waiting for waiter approval</p></article>
        <article><span>Billing</span><b>{billingQueue}</b><p>Waiting for cashier</p></article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <span>Operations</span>
            <h2>Order status overview</h2>
          </div>
          <div className="pipeline-grid">
            <article><b>{pendingApprovals}</b><span>Needs approval</span></article>
            <article><b>{kitchenQueue}</b><span>Kitchen queue</span></article>
            <article><b>{dashboard?.stats.readyToServe ?? 0}</b><span>Ready to serve</span></article>
            <article><b>{completedOrders.length}</b><span>Completed</span></article>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Team</span>
            <h2>Staff summary</h2>
          </div>
          <div className="summary-list">
            {activeStaff.map((member) => (
              <article key={member.id}>
                <strong>{member.name}</strong>
                <p>{member.role} / {member.shift}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Menu</span>
            <h2>Available food items</h2>
          </div>
          <div className="summary-list">
            {availableMenu.slice(0, 6).map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <p>{item.category} / {formatMoney(item.price)}</p>
              </article>
            ))}
          </div>
        </section>

        {notificationPanel(notifications)}
      </div>
    </section>
  );
}

export default DashboardPage;
