import { useMemo, useState } from 'react';
import type { Order, Role } from '../../api';
import './OrderPage.css';

type OrderPageProps = {
  orders: Order[];
  role: Role;
  loading: boolean;
  onApproveOrder: (orderId: number) => Promise<void>;
  onServeOrder: (orderId: number) => Promise<void>;
  onRequestPayment: (orderId: number) => Promise<void>;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

const APPROVER_ROLES: Role[] = ['waiter', 'manager', 'owner'];

function OrderPage({ orders, role, loading, onApproveOrder, onServeOrder, onRequestPayment }: OrderPageProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const sortedOrders = [...orders].sort((left, right) => right.id - left.id);
  const selectedOrder = useMemo(() => (
    selectedOrderId == null ? null : sortedOrders.find((order) => order.id === selectedOrderId) ?? null
  ), [selectedOrderId, sortedOrders]);
  const pendingOrders = sortedOrders.filter((order) => ['ready_to_approve', 'approved', 'preparing'].includes(order.status));
  const readyOrders = sortedOrders.filter((order) => order.status === 'ready_to_serve');
  const completedOrders = sortedOrders.filter((order) => order.status === 'completed');
  const canApproveOrders = APPROVER_ROLES.includes(role);
  const canHandleService = APPROVER_ROLES.includes(role);

  function canOpenOrder(order: Order) {
    if (order.status === 'ready_to_approve' && canApproveOrders) {
      return true;
    }

    return canHandleService && ['ready_to_serve', 'served'].includes(order.status);
  }

  async function handleApproveSelectedOrder() {
    if (!selectedOrder || selectedOrder.status !== 'ready_to_approve' || !canApproveOrders || loading) {
      return;
    }

    await onApproveOrder(selectedOrder.id);
    setSelectedOrderId(null);
  }

  async function handleServeSelectedOrder() {
    if (!selectedOrder || selectedOrder.status !== 'ready_to_serve' || !canHandleService || loading) {
      return;
    }

    await onServeOrder(selectedOrder.id);
    setSelectedOrderId(null);
  }

  async function handleRequestSelectedPayment() {
    if (!selectedOrder || selectedOrder.status !== 'served' || !canHandleService || loading) {
      return;
    }

    await onRequestPayment(selectedOrder.id);
    setSelectedOrderId(null);
  }

  return (
    <section className="order-page">
      <div className="order-page-hero panel">
        <div>
          <span>Orders</span>
          <h2>Live order management</h2>
          <p>Track every order from waiter approval through kitchen preparation, service, billing, and completion.</p>
        </div>
      </div>

      <div className="order-stats">
        <article><span>Total</span><b>{sortedOrders.length}</b></article>
        <article><span>Pending</span><b>{pendingOrders.length}</b></article>
        <article><span>Ready for service</span><b>{readyOrders.length}</b></article>
        <article><span>Completed</span><b>{completedOrders.length}</b></article>
      </div>

      <div className="order-table panel">
        <div className="order-table-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Total</span>
        </div>

        <div className="order-table-body">
          {sortedOrders.map((order) => (
            <article
              className={canOpenOrder(order) ? 'order-row selectable' : 'order-row'}
              key={order.id}
              onClick={() => {
                if (canOpenOrder(order)) {
                  setSelectedOrderId(order.id);
                }
              }}
              role={canOpenOrder(order) ? 'button' : undefined}
              tabIndex={canOpenOrder(order) ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canOpenOrder(order)) {
                  setSelectedOrderId(order.id);
                }
              }}
            >
              <div>
                <strong>#{order.id}</strong>
                <small>{order.channel.toUpperCase()} / {order.waiter_name}</small>
              </div>
              <div>
                <strong>{order.customer_name}</strong>
                <small>{order.customer_email}</small>
              </div>
              <span className={`order-pill ${order.status}`}>{readable(order.status)}</span>
              <span className="order-pill muted-pill">{readable(order.payment_status)}</span>
              <strong>{formatMoney(order.total)}</strong>
            </article>
          ))}

          {!sortedOrders.length ? <p className="empty">No orders yet.</p> : null}
        </div>
      </div>

      {selectedOrder ? (
        <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Order ${selectedOrder.id} details`}>
          <section className="order-modal panel">
            <header className="order-modal-header">
              <div>
                <span>Order details</span>
                <h3>Order #{selectedOrder.id}</h3>
              </div>
              <button type="button" className="secondary" onClick={() => setSelectedOrderId(null)}>Close</button>
            </header>

            <div className="order-modal-grid">
              <article>
                <b>Customer</b>
                <p>{selectedOrder.customer_name}</p>
                <small>{selectedOrder.customer_email}</small>
              </article>
              <article>
                <b>Waiter</b>
                <p>{selectedOrder.waiter_name}</p>
                <small>{selectedOrder.channel.toUpperCase()}</small>
              </article>
              <article>
                <b>Status</b>
                <p>{readable(selectedOrder.status)}</p>
                <small>{readable(selectedOrder.payment_status)}</small>
              </article>
              <article>
                <b>Total</b>
                <p>{formatMoney(selectedOrder.total)}</p>
                <small>{selectedOrder.items.length} items</small>
              </article>
            </div>

            <section className="order-modal-items">
              <h4>Items</h4>
              {selectedOrder.items.length ? (
                selectedOrder.items.map((item) => (
                  <div className="order-modal-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{readable(item.status)}</small>
                    </div>
                    <span>x{item.quantity}</span>
                    <strong>{formatMoney(item.price * item.quantity)}</strong>
                  </div>
                ))
              ) : (
                <p className="empty">No food items. Service request only.</p>
              )}
            </section>

            <section className="order-modal-notes">
              <h4>Notes</h4>
              <p>{selectedOrder.notes || 'No notes provided.'}</p>
            </section>

            <section className="order-modal-history">
              <h4>History</h4>
              {selectedOrder.history.map((entry) => (
                <p key={`${entry.at}-${entry.status}`}>
                  <strong>{new Date(entry.at).toLocaleString()}</strong> - {readable(entry.status)} by {entry.by}
                </p>
              ))}
            </section>

            <div className="order-modal-actions">
              <button type="button" className="secondary" onClick={() => setSelectedOrderId(null)}>Cancel</button>
              {selectedOrder.status === 'ready_to_approve' ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleApproveSelectedOrder()}
                  disabled={!canApproveOrders || loading}
                >
                  {loading ? 'Approving...' : 'Approve and Send to Kitchen'}
                </button>
              ) : null}
              {selectedOrder.status === 'ready_to_serve' ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleServeSelectedOrder()}
                  disabled={!canHandleService || loading}
                >
                  {loading ? 'Approving...' : 'Approve Service Completed'}
                </button>
              ) : null}
              {selectedOrder.status === 'served' ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleRequestSelectedPayment()}
                  disabled={!canHandleService || loading}
                >
                  {loading ? 'Requesting...' : 'Send to Cashier'}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default OrderPage;
