import type { Order } from '../../api';
import './ChashiarPage.css';

type ChashiarPageProps = {
  orders: Order[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function ChashiarPage({ orders }: ChashiarPageProps) {
  const sortedOrders = [...orders].sort((left, right) => right.id - left.id);
  const paidOrders = sortedOrders.filter((order) => order.payment_status === 'paid' || order.status === 'completed');
  const unpaidOrders = sortedOrders.filter((order) => order.payment_status === 'unpaid');
  const billQueue = sortedOrders.filter((order) => ['pending_bill', 'unpaid'].includes(order.payment_status));
  const requestedBills = sortedOrders.filter((order) => order.status === 'payment_requested');
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const pendingTotal = billQueue.reduce((sum, order) => sum + Number(order.total), 0);

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
              {sortedOrders.map((order) => (
                <article className="chashiar-row" key={order.id}>
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

              {!sortedOrders.length ? <p className="empty">No billing records yet.</p> : null}
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

          <section className="panel">
            <div className="section-title">
              <span>Paid</span>
              <h2>Completed bills</h2>
            </div>
            <div className="mini-bill-list">
              {paidOrders.map((order) => (
                <article key={order.id}>
                  <strong>Order #{order.id}</strong>
                  <p>{formatMoney(order.total)} / {order.customer_name}</p>
                </article>
              ))}
              {!paidOrders.length ? <p className="empty">No completed payments yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default ChashiarPage;
