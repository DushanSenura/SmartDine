import type { Order, StaffMember, Store } from '../../api';
import { useState } from 'react';
import './ChashiarPage.css';
import logoImage from '../../assets/logo.png';

type ChashiarPageProps = {
  orders: Order[];
  store?: Store | null;
  staff?: StaffMember[];
  onCompletePayment?: (orderId: number, paymentMethod: string, paymentDetails: { paid_amount: number; change_amount: number }) => Promise<Order>;
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

function getSavedPayment(order: Order) {
  return [...(order.history || [])].reverse().find((entry) => entry.status === 'completed' && entry.payment_method);
}

function ChashiarPage({ orders, store, staff = [], onCompletePayment }: ChashiarPageProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].id);
  const [cashAmount, setCashAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const sortedOrders = [...orders].sort((left, right) => right.id - left.id);
  const paidOrders = sortedOrders.filter((order) => order.payment_status === 'paid' || order.status === 'completed');
  const unpaidOrders = sortedOrders.filter((order) => order.payment_status === 'unpaid');
  const billQueue = sortedOrders.filter((order) => ['pending_bill', 'unpaid'].includes(order.payment_status));
  const activeBills = sortedOrders.filter((order) => order.payment_status !== 'paid' && order.status !== 'completed');
  const requestedBills = sortedOrders.filter((order) => order.status === 'payment_requested');
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const pendingTotal = billQueue.reduce((sum, order) => sum + Number(order.total), 0);
  const cashValue = Number(cashAmount || 0);
  const cashChange = selectedOrder ? cashValue - Number(selectedOrder.total) : 0;
  const canConfirmCash = paymentMethod !== 'cash' || cashValue >= Number(selectedOrder?.total || 0);
  const canComplete = Boolean(
    selectedOrder
      && selectedOrder.payment_status !== 'paid'
      && !['completed', 'cancelled'].includes(selectedOrder.status)
      && canConfirmCash,
  );
  const invoiceContact = staff.find((member) => member.role === 'manager')
    ?? staff.find((member) => member.role === 'owner')
    ?? staff[0];
  const companyName = store?.name || 'SmartDine';
  const branchName = store?.location || store?.name || 'Main branch';
  const companyPhone = invoiceContact?.phone || 'Not provided';
  const companyAddress = store?.location || invoiceContact?.address || 'Not provided';
  const selectedSavedPayment = selectedOrder ? getSavedPayment(selectedOrder) : undefined;
  const invoicePaymentMethod = selectedSavedPayment?.payment_method || paymentMethod;
  const invoicePaidAmount = selectedSavedPayment?.paid_amount ?? (paymentMethod === 'cash' ? cashValue : Number(selectedOrder?.total || 0));
  const invoiceChangeAmount = selectedSavedPayment?.change_amount ?? (paymentMethod === 'cash' ? Math.max(cashChange, 0) : 0);

  const openBill = (order: Order) => {
    const savedPayment = getSavedPayment(order);
    setSelectedOrder(order);
    setPaymentMethod(savedPayment?.payment_method || paymentMethods[0].id);
    setCashAmount(savedPayment?.paid_amount !== undefined ? String(savedPayment.paid_amount) : '');
  };

  const closeBill = () => {
    setSelectedOrder(null);
    setCashAmount('');
  };

  async function handleCompleteBill() {
    if (!selectedOrder || !onCompletePayment || !canComplete) return;

    setProcessing(true);
    try {
      const paidAmount = paymentMethod === 'cash' ? cashValue : Number(selectedOrder.total);
      const changeAmount = paymentMethod === 'cash' ? Math.max(cashChange, 0) : 0;
      const updated = await onCompletePayment(selectedOrder.id, paymentMethod, {
        paid_amount: paidAmount,
        change_amount: changeAmount,
      });
      setSelectedOrder({ ...selectedOrder, ...updated });
    } catch {
      // App shows the error message.
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="chashiar-page">
      <div className="chashiar-page-hero panel">
        <div>
          <span>Cashier</span>
          <h2>Billing and payments</h2>
          <p>Review bill requests, unpaid orders, completed payments, and total restaurant revenue.</p>
        </div>
      </div>

      <div className="chashiar-stats">
        <article><span>Revenue</span><b>{formatMoney(revenue)}</b></article>
        <article><span>Bill queue</span><b>{billQueue.length}</b></article>
        <article><span>Requested</span><b>{requestedBills.length}</b></article>
        <article><span>Unpaid</span><b>{unpaidOrders.length}</b></article>
      </div>

      <div className="chashiar-layout">
        <section className="panel">
          <div className="section-title">
            <span>Billing</span>
            <h2>Cashier queue</h2>
          </div>

          <div className="chashiar-table">
            <div className="chashiar-table-head">
              <span>Order</span>
              <span>Customer</span>
              <span>Order status</span>
              <span>Payment</span>
              <span>Total</span>
            </div>

            <div className="chashiar-table-body">
              {activeBills.map((order) => (
                <article className="chashiar-row" key={order.id} onClick={() => openBill(order)} role="button" tabIndex={0}>
                  <div>
                    <strong>#{order.id}</strong>
                    <small>{order.channel.toUpperCase()} / {order.waiter_name}</small>
                  </div>
                  <div>
                    <strong>{order.customer_name}</strong>
                    <small>{order.customer_email}</small>
                  </div>
                  <span className={`chashiar-pill ${order.status}`}>{readable(order.status)}</span>
                  <span className={`chashiar-pill payment-${order.payment_status}`}>{readable(order.payment_status)}</span>
                  <strong>{formatMoney(order.total)}</strong>
                </article>
              ))}

              {!activeBills.length ? <p className="empty">No bills waiting for payment.</p> : null}
            </div>
          </div>
        </section>

        <section className="panel completed-bills-panel">
          <div className="completed-bills-block">
            <div className="section-title">
              <span>Paid</span>
              <h2>Completed bills</h2>
            </div>

            <div className="chashiar-table">
              <div className="chashiar-table-head">
                <span>Order</span>
                <span>Customer</span>
                <span>Order status</span>
                <span>Payment</span>
                <span>Total</span>
              </div>

              <div className="chashiar-table-body">
                {paidOrders.map((order) => {
                  const savedPayment = getSavedPayment(order);

                  return (
                    <article className="chashiar-row completed-bill-row" key={order.id} onClick={() => openBill(order)} role="button" tabIndex={0}>
                      <div>
                        <strong>#{order.id}</strong>
                        <small>{order.channel.toUpperCase()} / {order.waiter_name}</small>
                      </div>
                      <div>
                        <strong>{order.customer_name}</strong>
                        <small>{order.customer_email}</small>
                      </div>
                      <span className={`chashiar-pill ${order.status}`}>{readable(order.status)}</span>
                      <div>
                        <span className="chashiar-pill payment-paid">{readable(savedPayment?.payment_method || order.payment_status)}</span>
                        <small>Paid {formatMoney(savedPayment?.paid_amount ?? order.total)} / change {formatMoney(savedPayment?.change_amount ?? 0)}</small>
                      </div>
                      <strong>{formatMoney(order.total)}</strong>
                    </article>
                  );
                })}

                {!paidOrders.length ? <p className="empty">No completed payments yet.</p> : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="chashiar-side">
          <section className="panel">
            <div className="section-title">
              <span>Pending</span>
              <h2>Amounts due</h2>
            </div>
            <strong className="chashiar-total">{formatMoney(pendingTotal)}</strong>
            <p>{billQueue.length} orders still need billing or payment.</p>
          </section>
        </aside>
      </div>

      {selectedOrder ? (
        <div className="cashier-modal">
          <div className="cashier-modal-inner panel">
            <div className="cashier-invoice">
              <header className="cashier-invoice-header">
                <div className="cashier-invoice-brand">
                  <img src={logoImage} alt={`${companyName} logo`} />
                  <div>
                    <span>{companyName}</span>
                    <h2>Invoice</h2>
                    <p>Order #{String(selectedOrder.id).padStart(6, '0')}</p>
                  </div>
                </div>
                <div>
                  <strong>{formatMoney(selectedOrder.total)}</strong>
                  <small>{new Date().toLocaleString()}</small>
                </div>
              </header>

              <div className="cashier-company-info">
                <section>
                  <span>Company</span>
                  <strong>{companyName}</strong>
                </section>
                <section>
                  <span>Branch</span>
                  <strong>{branchName}</strong>
                </section>
                <section>
                  <span>Phone</span>
                  <strong>{companyPhone}</strong>
                </section>
                <section>
                  <span>Address</span>
                  <strong>{companyAddress}</strong>
                </section>
              </div>

              <div className="cashier-invoice-info">
                <section>
                  <span>Customer</span>
                  <strong>{selectedOrder.customer_name}</strong>
                  <small>{selectedOrder.customer_email}</small>
                </section>
                <section>
                  <span>Waiter</span>
                  <strong>{selectedOrder.waiter_name}</strong>
                  <small>{selectedOrder.channel.toUpperCase()}</small>
                </section>
                <section>
                  <span>Status</span>
                  <strong>{readable(selectedOrder.payment_status)}</strong>
                  <small>{readable(selectedOrder.status)}</small>
                </section>
              </div>

              <div className="cashier-invoice-items">
                <div className="cashier-invoice-head">
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                </div>
                {selectedOrder.items.map((item) => (
                  <div className="cashier-invoice-row" key={item.id}>
                    <span>{item.name}</span>
                    <span>{item.quantity}</span>
                    <span>{formatMoney(item.price)}</span>
                    <strong>{formatMoney(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="cashier-invoice-summary">
                <div><span>Subtotal</span><b>{formatMoney(selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</b></div>
                <div><span>Tax</span><b>{formatMoney(0)}</b></div>
                <div className="total"><span>Total</span><b>{formatMoney(selectedOrder.total)}</b></div>
              </div>

              <div className="cashier-invoice-payment">
                <div><span>Payment method</span><b>{readable(invoicePaymentMethod)}</b></div>
                <div><span>{invoicePaymentMethod === 'cash' ? 'Cash amount' : 'Paid amount'}</span><b>{formatMoney(invoicePaidAmount)}</b></div>
                <div><span>Change</span><b>{formatMoney(invoiceChangeAmount)}</b></div>
                {invoicePaymentMethod === 'cash' ? (
                  <>
                    {!selectedSavedPayment && cashChange < 0 ? <div><span>Still due</span><b>{formatMoney(Math.abs(cashChange))}</b></div> : null}
                  </>
                ) : null}
              </div>
            </div>

            <section className="cashier-payment-box">
              <span>Payment method</span>
              <div className="cashier-methods">
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

              {paymentMethod === 'cash' ? (
                <div className="cashier-cash-grid">
                  <label>
                    <span>Cash amount</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashAmount}
                      onChange={(event) => setCashAmount(event.target.value)}
                      placeholder="0.00"
                      disabled={processing || selectedOrder.payment_status === 'paid'}
                    />
                  </label>
                  <article>
                    <span>Change</span>
                    <strong className={cashChange < 0 ? 'negative' : ''}>{formatMoney(Math.max(cashChange, 0))}</strong>
                    {cashChange < 0 ? <small>{formatMoney(Math.abs(cashChange))} still due</small> : null}
                  </article>
                </div>
              ) : null}
            </section>

            <div className="cashier-actions">
              <button type="button" className="secondary" onClick={closeBill} disabled={processing}>Close</button>
              <button type="button" className="primary" onClick={() => void handleCompleteBill()} disabled={processing || !canComplete}>
                {processing ? 'Processing...' : 'Confirm payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ChashiarPage;
