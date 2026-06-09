import { useState } from 'react';
import type { Order } from '../../api';
import './KitchenPage.css';

type KitchenPageProps = {
  orders: Order[];
  loading: boolean;
  onReadyToServe: (orderId: number) => Promise<void>;
  onPrepareItem: (orderId: number, itemId: string) => Promise<void>;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function KitchenPage({ orders, loading, onReadyToServe, onPrepareItem }: KitchenPageProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const sortedOrders = [...orders].sort((left, right) => right.id - left.id);
  const kitchenOrders = sortedOrders.filter((order) => ['approved', 'preparing'].includes(order.status));
  const readyOrders = sortedOrders.filter((order) => order.status === 'ready_to_serve');
  const totalPlatesInQueue = kitchenOrders.reduce((sum, order) => sum + order.items.reduce((line, item) => line + Number(item.quantity), 0), 0);
  const selectedOrder = selectedOrderId == null ? null : sortedOrders.find((o) => o.id === selectedOrderId) ?? null;
  const [preparing, setPreparing] = useState<Record<string, boolean>>({});
  const [preparingAll, setPreparingAll] = useState(false);

  function setPreparingItem(itemId: string, value: boolean) {
    setPreparing((cur) => ({ ...cur, [itemId]: value }));
  }

  async function handlePrepareAll() {
    if (!selectedOrder) return;
    const pendingItems = selectedOrder.items.filter((it) => it.status === 'pending');
    if (!pendingItems.length) return;

    setPreparingAll(true);
    for (const item of pendingItems) {
      setPreparingItem(item.id, true);
      try {
        await onPrepareItem(selectedOrder.id, item.id);
      } catch {
        // ignore individual errors; parent will show messages
      } finally {
        setPreparingItem(item.id, false);
      }
    }
    setPreparingAll(false);
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-page-hero panel">
        <div>
          <span>Kitchen</span>
          <h2>Waiter approved orders</h2>
          <p>Cook items from waiter-approved orders and mark them ready to serve.</p>
        </div>
      </div>

      <div className="kitchen-stats">
        <article><span>Kitchen queue</span><b>{kitchenOrders.length}</b></article>
        <article><span>Ready to serve</span><b>{readyOrders.length}</b></article>
        <article><span>Plates in queue</span><b>{totalPlatesInQueue}</b></article>
      </div>

      <div className="kitchen-table panel">
        <div className="kitchen-table-head">
          <span>Order</span>
          <span>Waiter</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Action</span>
        </div>

        <div className="kitchen-table-body">
          {kitchenOrders.map((order) => {
            const pendingCount = order.items.filter((item) => item.status === 'pending').length;
            const statusLabel = pendingCount > 0 ? `${pendingCount} pending` : 'all prepared';

            return (
              <article className="kitchen-row" key={order.id}>
                <div>
                  <strong>#{order.id}</strong>
                  <small>{readable(order.status)}</small>
                </div>
                <div>
                  <strong>{order.waiter_name}</strong>
                  <small>waiter approved</small>
                </div>
                <div>
                  <strong>{order.customer_name}</strong>
                  <small>{order.customer_email}</small>
                </div>
                <div>
                  <strong>{order.items.length} items</strong>
                  <small>{statusLabel}</small>
                </div>
                <strong>{formatMoney(order.total)}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="secondary" onClick={() => setSelectedOrderId(order.id)}>View items</button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void onReadyToServe(order.id)}
                    disabled={loading || !(pendingCount === 0 && order.items.length > 0)}
                  >
                    {loading ? 'Updating...' : 'Ready to Serve'}
                  </button>
                </div>
              </article>
            );
          })}

          {!kitchenOrders.length ? <p className="empty">No waiter-approved orders in kitchen queue.</p> : null}
        </div>
      </div>
      {selectedOrder ? (
        <div className="kitchen-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Order ${selectedOrder.id} items`}>
          <section className="kitchen-modal panel">
            <header className="kitchen-modal-header">
              <div>
                <span>Order items</span>
                <h3>Order #{selectedOrder.id}</h3>
              </div>
              <button type="button" className="secondary" onClick={() => setSelectedOrderId(null)}>Close</button>
            </header>

            <div className="kitchen-modal-items">
              {selectedOrder.items.length ? (
                selectedOrder.items.map((item) => (
                  <div className="kitchen-modal-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                    </div>
                    <span>x{item.quantity}</span>
                    <strong>{formatMoney(item.price * item.quantity)}</strong>
                    <div>
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          className="primary"
                          onClick={async () => {
                            setPreparingItem(item.id, true);
                            try {
                              await onPrepareItem(selectedOrder.id, item.id);
                            } finally {
                              setPreparingItem(item.id, false);
                            }
                          }}
                          disabled={!!preparing[item.id]}
                        >
                          {preparing[item.id] ? 'Preparing...' : 'Mark prepared'}
                        </button>
                      ) : (
                        <button type="button" className="secondary" disabled>{readable(item.status)}</button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">No items for this order.</p>
              )}
            </div>

            <div className="kitchen-modal-actions">
              <button type="button" className="secondary" onClick={() => setSelectedOrderId(null)}>Close</button>
              <button
                type="button"
                className="secondary"
                onClick={() => void handlePrepareAll()}
                disabled={preparingAll || !selectedOrder || !selectedOrder.items.some((it) => it.status === 'pending')}
              >
                {preparingAll ? 'Preparing...' : 'Prepare all'}
              </button>
              <button
                type="button"
                className="primary"
                onClick={async () => {
                  if (!selectedOrder) return;
                  await onReadyToServe(selectedOrder.id);
                  setSelectedOrderId(null);
                }}
                disabled={loading || !selectedOrder || !selectedOrder.items.length || !selectedOrder.items.every((it) => it.status !== 'pending')}
              >
                {loading ? 'Updating...' : 'Ready to Serve'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default KitchenPage;
