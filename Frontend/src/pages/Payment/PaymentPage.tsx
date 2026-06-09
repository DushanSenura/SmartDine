import type { Order, Role } from '../../api';
import { useState } from 'react';
import './PaymentPage.css';

type PaymentPageProps = {
  orders: Order[];
  role?: Role;
  onRequestPayment?: (orderId: number) => Promise<void>;
  onCompletePayment?: (orderId: number, paymentMethod: string) => Promise<Order>;
};

const paymentMethods = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'mobile_wallet', label: 'Mobile wallet' },
  { id: 'bank_transfer', label: 'Bank transfer' },
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

export default function PaymentPage({ orders, role, onRequestPayment, onCompletePayment }: PaymentPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].id);

  const openOrder = (order: Order) => {
    setPaymentMethod(paymentMethods[0].id);
    setSelectedOrder(order);
  };
  const closeOrder = () => setSelectedOrder(null);

  async function handleComplete(orderId: number) {
    if (!onCompletePayment) return;
    setProcessing(true);
    try {
      const updated = await onCompletePayment(orderId, paymentMethod);
      setSelectedOrder({ ...selectedOrder!, ...updated });
    } catch {
      // caller shows messages
    } finally {
      setProcessing(false);
    }
  }

  async function handleRequest(orderId: number) {
    if (!onRequestPayment) return;
    setProcessing(true);
    try {
      await onRequestPayment(orderId);
    } catch {
      // caller shows messages
    } finally {
      setProcessing(false);
    }
  }

  const sorted = [...orders].sort((a, b) => b.id - a.id);
  const unpaid = sorted.filter((o) => o.payment_status !== 'paid');
  const totalDue = unpaid.reduce((s, o) => s + Number(o.total), 0);

  return (
    <section className="payment-page">
      <div className="payment-hero panel">
        <div>
          <span>Payments</span>
          <h2>Receive and record payments</h2>
          <p>Quick view of unpaid orders and recent receipts.</p>
        </div>
      </div>

      <div className="payment-stats">
        <article>
          <span>Unpaid</span>
          <b>{unpaid.length}</b>
        </article>
        <article>
          <span>Total due</span>
          <b>{formatMoney(totalDue)}</b>
        </article>
      </div>

      <section className="panel payment-list">
        <div className="section-title">
          <span>Orders</span>
          <h2>Unpaid & recent</h2>
        </div>

        <div className="payment-table">
          <div className="payment-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
          </div>

          <div className="payment-body">
            {sorted.map((order) => (
              <article className="payment-row" key={order.id} onClick={() => openOrder(order)} role="button" tabIndex={0}>
                <div>
                  <strong>#{order.id}</strong>
                  <small>{order.channel.toUpperCase()} / {order.waiter_name}</small>
                </div>
                <div>
                  <strong>{order.customer_name}</strong>
                  <small>{order.customer_email}</small>
                </div>
                <span className={`pill ${order.payment_status}`}>{readable(order.payment_status)}</span>
                <strong>{formatMoney(order.total)}</strong>
              </article>
            ))}

            {!sorted.length ? <p className="empty">No orders yet.</p> : null}
          </div>
        </div>
      </section>
      {selectedOrder ? (
        <div className="payment-modal">
          <div className="payment-modal-inner panel">
            <div className="invoice" id="invoice-print-area">
              <header className="invoice-header">
                <div className="invoice-brand">
                  <span>SmartDine</span>
                  <strong>Customer Invoice</strong>
                  <small>Thank you for dining with us.</small>
                </div>
                <div className="invoice-meta">
                  <b>Invoice #{String(selectedOrder.id).padStart(6, '0')}</b>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </header>

              <div className="invoice-info-grid">
                <section>
                  <span>Bill to</span>
                  <strong>{selectedOrder.customer_name}</strong>
                  <small>{selectedOrder.customer_email}</small>
                </section>
                <section>
                  <span>Served by</span>
                  <strong>{selectedOrder.waiter_name}</strong>
                  <small>{selectedOrder.channel.toUpperCase()} order</small>
                </section>
                <section>
                  <span>Payment</span>
                  <strong>{readable(selectedOrder.payment_status)}</strong>
                  <small>{readable(paymentMethod)}</small>
                </section>
              </div>

              <div className="invoice-items">
                <div className="invoice-items-head">
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                </div>
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="invoice-item-row">
                    <span>{it.name}</span>
                    <span>{it.quantity}</span>
                    <span>{formatMoney(it.price)}</span>
                    <strong>{formatMoney(it.price * it.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="invoice-summary">
                <div />
                <div>
                  <div className="invoice-line"><span>Subtotal</span><b>{formatMoney(selectedOrder.items.reduce((s, i) => s + i.price * i.quantity, 0))}</b></div>
                  <div className="invoice-line"><span>Tax</span><b>{formatMoney(0)}</b></div>
                  <div className="invoice-line total"><span>Total</span><b>{formatMoney(selectedOrder.total)}</b></div>
                </div>
              </div>
            </div>

            <section className="payment-method-panel">
              <span>Payment method</span>
              <div className="payment-method-grid">
                {paymentMethods.map((method) => (
                  <button
                    type="button"
                    key={method.id}
                    className={paymentMethod === method.id ? 'active' : ''}
                    onClick={() => setPaymentMethod(method.id)}
                    disabled={processing || selectedOrder.payment_status === 'paid'}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="payment-actions">
              <button type="button" className="secondary" onClick={closeOrder} disabled={processing}>Close</button>
              {role === 'cashier' || role === 'owner' || role === 'manager' ? (
                <>
                  <button type="button" className="secondary" onClick={() => void handleRequest(selectedOrder.id)} disabled={processing || selectedOrder.payment_status === 'paid'}>Request</button>
                  <button type="button" className="primary" onClick={() => void handleComplete(selectedOrder.id)} disabled={processing || selectedOrder.payment_status === 'paid'}>{processing ? 'Processing...' : 'Mark as Paid'}</button>
                  <button type="button" className="secondary" onClick={() => { const el = document.getElementById('invoice-print-area'); if (el) { window.print(); } }} disabled={processing}>Print</button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
