import { useMemo, useState, type FormEvent } from 'react';
import type { MenuItem, Space, StaffMember } from '../../api';
import './FoodServiceOrderPage.css';

type FoodServiceOrderPayload = {
  space_token: string;
  waiter_name: string;
  customer_name: string;
  customer_email: string;
  notes: string;
  items: Array<{ menu_item_id: number; name: string; quantity: number; price: number }>;
};

type FoodServiceOrderPageProps = {
  menuItems: MenuItem[];
  spaces: Space[];
  staff: StaffMember[];
  loading: boolean;
  onCreateOrder: (payload: FoodServiceOrderPayload) => Promise<void>;
};

type Cart = Record<number, number>;

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function FoodServiceOrderPage({ menuItems, spaces, staff, loading, onCreateOrder }: FoodServiceOrderPageProps) {
  const availableItems = menuItems.filter((item) => item.available);
  const categories = ['All', ...new Set(availableItems.map((item) => item.category))];
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<Cart>({});
  const [form, setForm] = useState({
    spaceToken: spaces[0]?.qr_token || '',
    waiterName: spaces[0]?.assigned_waiter || '',
    customerName: '',
    customerEmail: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const visibleItems = activeCategory === 'All'
    ? availableItems
    : availableItems.filter((item) => item.category === activeCategory);

  const cartItems = useMemo(() => availableItems
    .filter((item) => cart[item.id])
    .map((item) => ({ ...item, quantity: cart[item.id] })), [availableItems, cart]);

  const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const selectedSpace = spaces.find((space) => space.qr_token === form.spaceToken);
  const waiterOptions = staff.filter((member) => member.role === 'waiter' && member.status === 'active');
  const selectedSpaceWaiter = waiterOptions.find((member) => member.name === selectedSpace?.assigned_waiter)?.name || '';
  const assignedWaiter = form.waiterName || selectedSpaceWaiter || waiterOptions[0]?.name || 'Not assigned';

  function changeQuantity(itemId: number, amount: number) {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[itemId] || 0) + amount);
      const next = { ...current };

      if (nextQuantity === 0) {
        delete next[itemId];
      } else {
        next[itemId] = nextQuantity;
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!form.spaceToken) {
      setError('Select a table or private room.');
      return;
    }

    if (!form.waiterName.trim()) {
      setError('Select a waiter name.');
      return;
    }

    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      setError('Customer name and email are required.');
      return;
    }

    if (!cartItems.length) {
      setError('Add at least one food item.');
      return;
    }

    await onCreateOrder({
      space_token: form.spaceToken,
      waiter_name: form.waiterName.trim(),
      customer_name: form.customerName.trim(),
      customer_email: form.customerEmail.trim(),
      notes: form.notes.trim(),
      items: cartItems.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    setCart({});
    setForm((current) => ({ ...current, customerName: '', customerEmail: '', notes: '' }));
  }

  return (
    <section className="food-service-page">
      <div className="food-service-hero panel">
        <div>
          <span>Ordering</span>
          <h2>Foods and services</h2>
          <p>Create food orders and service requests for tables or private rooms.</p>
        </div>
      </div>

      <div className="food-service-layout">
        <section className="panel food-menu-panel">
          <div className="section-title">
            <div>
              <span>Food menu</span>
              <h2>Select items</h2>
            </div>
          </div>

          <div className="food-category-tabs" role="tablist" aria-label="Food categories">
            {categories.map((category) => (
              <button
                type="button"
                className={activeCategory === category ? 'active' : ''}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="food-menu-grid">
            {visibleItems.map((item) => (
              <article className="food-menu-card" key={item.id}>
                <div>
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="food-menu-card-footer">
                  <strong>{formatMoney(item.price)}</strong>
                  <div className="food-quantity">
                    <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove ${item.name}`}>-</button>
                    <b>{cart[item.id] || 0}</b>
                    <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Add ${item.name}`}>+</button>
                  </div>
                </div>
              </article>
            ))}

            {!visibleItems.length ? <p className="empty">No available menu items in this category.</p> : null}
          </div>
        </section>

        <form className="panel food-order-panel" onSubmit={(event) => void handleSubmit(event)}>
          <div className="section-title">
            <div>
              <span>Order details</span>
              <h2>Customer request</h2>
            </div>
          </div>

          <label>
            Table or room
            <select
              value={form.spaceToken}
              onChange={(event) => {
                const nextSpace = spaces.find((space) => space.qr_token === event.target.value);
                setForm((current) => ({
                  ...current,
                  spaceToken: event.target.value,
                  waiterName: waiterOptions.find((member) => member.name === nextSpace?.assigned_waiter)?.name || current.waiterName,
                }));
              }}
              required
            >
              <option value="" disabled>Select space</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.qr_token}>
                  {space.label} / {readable(space.kind)} / {space.status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Waiter name
            <select
              value={form.waiterName}
              onChange={(event) => setForm((current) => ({ ...current, waiterName: event.target.value }))}
              required
            >
              <option value="" disabled>Select waiter</option>
              {waiterOptions.map((member) => (
                <option key={member.id} value={member.name}>{member.name} / {member.role}</option>
              ))}
            </select>
          </label>

          <div className="food-form-grid">
            <label>
              Customer name
              <input
                value={form.customerName}
                onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                required
              />
            </label>

            <label>
              Customer email
              <input
                type="email"
                value={form.customerEmail}
                onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                required
              />
            </label>
          </div>

          <label>
            Extra notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Allergies, timing, special service notes"
            />
          </label>

          <div className="food-order-summary">
            <div>
              <span>Assigned waiter</span>
              <strong>{assignedWaiter}</strong>
            </div>
            <div>
              <span>Items</span>
              <strong>{cartItems.length}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          <div className="food-cart-list">
            {cartItems.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.quantity} x {formatMoney(item.price)}</small>
                </div>
                <b>{formatMoney(Number(item.price) * item.quantity)}</b>
              </article>
            ))}

            {!cartItems.length ? <p className="empty">No food items selected.</p> : null}
          </div>

          {error ? <p className="food-order-error">{error}</p> : null}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Sending order...' : 'Send order'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default FoodServiceOrderPage;
