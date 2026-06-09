const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const store = require('../lib/restaurantStore');
const { requireAuth, permit } = require('../middleware/auth');

const router = express.Router();

function signUser(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
      store_id: user.store_id || 1,
    },
    process.env.JWT_SECRET || 'smartdine-dev-secret',
    { expiresIn: '12h' },
  );
}

function lineItemTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function buildOrderHistory(entry, previous = []) {
  return [...previous, { at: new Date().toISOString(), ...entry }];
}

function isTerminalOrder(order) {
  return ['completed', 'cancelled'].includes(order.status);
}

function ensureOrderState(res, order, allowedStates, action) {
  if (isTerminalOrder(order)) {
    res.status(409).json({ message: `Completed or cancelled orders cannot be changed` });
    return false;
  }

  if (!allowedStates.includes(order.status)) {
    res.status(409).json({ message: `Order must be ${allowedStates.join(' or ')} before it can be ${action}` });
    return false;
  }

  return true;
}

function normalizeEditableItems(items, orderId) {
  return items.map((item, index) => ({
    id: item.id || `item-${orderId}-${index}`,
    menu_item_id: item.menu_item_id,
    name: item.name,
    quantity: Number(item.quantity),
    price: Number(item.price),
    status: item.status || 'pending',
  }));
}

async function createBookingWithGuards(res, payload) {
  const space = (await store.list('spaces')).find((entry) => entry.label === payload.space_label);
  if (!space) {
    res.status(404).json({ message: 'Selected table or private room does not exist' });
    return null;
  }

  if (space.kind !== payload.space_kind) {
    res.status(400).json({ message: 'Booking space type does not match selected space' });
    return null;
  }

  if (Number(payload.party_size) > Number(space.capacity)) {
    res.status(400).json({ message: `${space.label} only supports ${space.capacity} guests` });
    return null;
  }

  const conflict = await store.hasBookingConflict(payload.space_label, payload.booking_time);
  if (conflict) {
    res.status(409).json({ message: `${payload.space_label} already has a booking near that time` });
    return null;
  }

  return store.createBooking(payload);
}

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await store.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json({
    token: signUser(user),
    user,
  });
});

router.get('/auth/me', requireAuth, async (req, res) => {
  const overview = await store.fetchOverview();
  const staff = await store.list('staff');
  const staffAccount = staff.find((member) => String(member.login_email || member.email).toLowerCase() === String(req.user.email).toLowerCase());
  const user = {
    id: Number(req.user.sub),
    email: req.user.email,
    role: req.user.role,
    name: req.user.name,
    phone: staffAccount?.phone || '',
    address: staffAccount?.address || '',
    date_of_birth: staffAccount?.date_of_birth || '',
    store_id: req.user.store_id,
  };

  return res.json({
    user,
    store: overview.store,
  });
});

router.patch('/auth/me', requireAuth, async (req, res) => {
  const { name, email, phone, address, date_of_birth, password } = req.body || {};
  const nextName = String(name || '').trim();
  const nextEmail = String(email || '').trim().toLowerCase();
  const nextPhone = String(phone || '').trim();
  const nextAddress = String(address || '').trim();
  const nextDateOfBirth = String(date_of_birth || '').trim();

  if (!nextName || !nextEmail || !nextPhone || !nextAddress || !nextDateOfBirth) {
    return res.status(400).json({ message: 'Name, email, phone, address, and date of birth are required' });
  }

  if (password && String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  if (nextEmail !== String(req.user.email).toLowerCase()) {
    const existingUser = await store.findUserByEmail(nextEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'A login already exists for this email' });
    }
  }

  const changes = {
    name: nextName,
    email: nextEmail,
  };

  if (password) {
    changes.password_hash = bcrypt.hashSync(password, 10);
  }

  const updatedUser = await store.updateUserByEmail(req.user.email, changes);
  if (!updatedUser) {
    return res.status(404).json({ message: 'User account not found' });
  }

  const staff = await store.list('staff');
  const staffAccount = staff.find((member) => String(member.login_email || member.email).toLowerCase() === String(req.user.email).toLowerCase());
  if (staffAccount) {
    await store.updateStaffMember(staffAccount.id, {
      ...staffAccount,
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      address: nextAddress,
      date_of_birth: nextDateOfBirth,
      login_email: nextEmail,
    });
  }

  return res.json({
    token: signUser(updatedUser),
    user: {
      ...updatedUser,
      phone: nextPhone,
      address: nextAddress,
      date_of_birth: nextDateOfBirth,
    },
  });
});

router.get('/dashboard', requireAuth, permit('owner', 'manager', 'waiter', 'kitchen', 'cashier'), async (req, res) => {
  const snapshot = await store.fetchOverview();
  return res.json(snapshot);
});

router.get('/catalog/:token', async (req, res) => {
  const space = await store.findSpaceByToken(req.params.token);
  if (!space) {
    return res.status(404).json({ message: 'QR token not found' });
  }

  const snapshot = await store.fetchOverview();
  return res.json({
    space,
    spaces: snapshot.spaces,
    store: snapshot.store,
    menuItems: snapshot.menuItems.filter((item) => item.available),
    staff: snapshot.staff,
  });
});

router.post('/public/orders', async (req, res) => {
  const { token, customer_name, customer_email, waiter_name, notes, items } = req.body || {};
  const space = await store.findSpaceByToken(token);

  if (!space) {
    return res.status(404).json({ message: 'The QR token does not match a restaurant space' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one menu item is required' });
  }

  const order = await store.createOrderFromPayload({
    store_id: space.store_id,
    space_id: space.id,
    waiter_name: waiter_name || space.assigned_waiter,
    customer_name,
    customer_email,
    channel: 'qr',
    status: 'ready_to_approve',
    payment_status: 'unpaid',
    notes: notes || '',
    total: lineItemTotal(items),
    items: items.map((item, index) => ({
      id: item.id || `item-${Date.now()}-${index}`,
      menu_item_id: item.menu_item_id,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      status: 'pending',
    })),
    history: buildOrderHistory({ status: 'ready_to_approve', by: 'customer' }),
  });

  await store.addDemoNotification(space.store_id, order.id, 'waiter', 'order_created', `New QR order for ${space.label} requires approval.`);
  await store.addDemoNotification(space.store_id, order.id, 'customer', 'order_submitted', `Your order ${order.id} is waiting for waiter approval.`);

  return res.status(201).json(order);
});

router.post('/public/bookings', async (req, res) => {
  const { customer_name, customer_email, space_kind, space_label, party_size, booking_time, notes } = req.body || {};
  const snapshot = await store.fetchOverview();

  if (!customer_name || !customer_email || !space_kind || !space_label || !booking_time) {
    return res.status(400).json({ message: 'Missing required booking details' });
  }

  const booking = await createBookingWithGuards(res, {
    store_id: snapshot.store.id,
    customer_name,
    customer_email,
    space_kind,
    space_label,
    party_size: Number(party_size || 2),
    booking_time,
    notes: notes || '',
    status: 'confirmed',
  });
  if (!booking) {
    return null;
  }

  await store.addDemoNotification(snapshot.store.id, null, 'waiter', 'booking_created', `${customer_name} booked ${space_label}.`);
  return res.status(201).json(booking);
});

router.get('/stores', requireAuth, permit('owner', 'manager'), async (req, res) => {
  return res.json(await store.list('stores'));
});

router.post('/stores', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const { name, location, description, manager, status } = req.body || {};

  if (!name || !location || !description || !manager) {
    return res.status(400).json({ message: 'Name, location, description, and manager are required' });
  }

  const row = await store.createStore({ name, location, description, manager, status: status || 'open' });
  return res.status(201).json(row);
});

router.patch('/stores/:id', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const current = await store.findById('stores', req.params.id);
  if (!current) {
    return res.status(404).json({ message: 'Branch not found' });
  }

  const { name, location, description, manager, status } = req.body || {};
  if (!name || !location || !description || !manager || !status) {
    return res.status(400).json({ message: 'Name, location, description, manager, and status are required' });
  }

  const row = await store.update('stores', current.id, { name, location, description, manager, status });
  return res.json(row);
});

router.get('/staff', requireAuth, permit('owner', 'manager'), async (req, res) => {
  return res.json(await store.list('staff'));
});

router.post('/staff', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const { store_id, name, email, phone, address, login_email, role, shift, status, password } = req.body || {};
  if (!name || !email || !phone || !address || !login_email || !password || !role || !shift) {
    return res.status(400).json({ message: 'Missing staff details' });
  }

  const existingUser = await store.findUserByEmail(login_email);
  if (existingUser) {
    return res.status(409).json({ message: 'A login already exists for this login email' });
  }

  const normalizedRole = String(role).toLowerCase();
  const allowedRoles = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];
  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: 'Staff role must be owner, manager, waiter, kitchen, or cashier' });
  }

  const row = await store.createStaffMember({
    store_id: Number(store_id || req.user.store_id || 1),
    name,
    email,
    phone,
    address,
    login_email,
    role: normalizedRole,
    shift,
    status: status || 'active',
  });

  await store.createUser({
    store_id: row.store_id,
    name,
    email: login_email,
    role: normalizedRole,
    status: status || 'active',
    password_hash: bcrypt.hashSync(password, 10),
  });

  return res.status(201).json(row);
});

router.patch('/staff/:id', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const current = await store.findById('staff', req.params.id);
  if (!current) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  const { name, email, phone, address, login_email, role, shift, status, password } = req.body || {};
  if (!name || !email || !phone || !address || !login_email || !role || !shift) {
    return res.status(400).json({ message: 'Missing staff details' });
  }

  const normalizedRole = String(role).toLowerCase();
  const allowedRoles = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];
  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: 'Staff role must be owner, manager, waiter, kitchen, or cashier' });
  }

  if (String(login_email).toLowerCase() !== String(current.login_email || current.email).toLowerCase()) {
    const existingUser = await store.findUserByEmail(login_email);
    if (existingUser) {
      return res.status(409).json({ message: 'A login already exists for this login email' });
    }
  }

  const updated = await store.updateStaffMember(current.id, {
    name,
    email,
    phone,
    address,
    login_email,
    role: normalizedRole,
    shift,
    status: status || 'active',
  });

  const userChanges = {
    name,
    email: login_email,
    role: normalizedRole,
    status: status || 'active',
  };

  if (password) {
    userChanges.password_hash = bcrypt.hashSync(password, 10);
  }

  const previousLoginEmail = current.login_email || current.email;
  const updatedUser = await store.updateUserByEmail(previousLoginEmail, userChanges);
  if (!updatedUser) {
    await store.createUser({
      store_id: updated.store_id,
      name,
      email: login_email,
      role: normalizedRole,
      status: status || 'active',
      password_hash: bcrypt.hashSync(password || 'SmartDine123!', 10),
    });
  }

  return res.json(updated);
});

router.delete('/staff/:id', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const current = await store.findById('staff', req.params.id);
  if (!current) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  const removed = await store.deleteStaffMember(current.id);
  await store.deleteUserByEmail(current.login_email || current.email);

  return res.json({ message: 'Staff member deleted', staff: removed });
});

router.get('/spaces', requireAuth, async (req, res) => {
  return res.json(await store.list('spaces'));
});

router.post('/spaces', requireAuth, permit('owner', 'manager'), async (req, res) => {
  const { store_id, label, kind, capacity, qr_token, status, assigned_waiter } = req.body || {};
  if (!label || !kind || !capacity || !qr_token || !assigned_waiter) {
    return res.status(400).json({ message: 'Missing space details' });
  }

  const row = await store.createSpace({
    store_id: Number(store_id || req.user.store_id || 1),
    label,
    kind,
    capacity: Number(capacity),
    qr_token,
    status: status || 'available',
    assigned_waiter,
  });

  return res.status(201).json(row);
});

router.get('/menu-items', requireAuth, async (req, res) => {
  return res.json(await store.list('menuItems'));
});

router.post('/menu-items', requireAuth, permit('owner', 'manager', 'cashier'), async (req, res) => {
  const { store_id, name, category, description, price, available } = req.body || {};
  if (!name || !category || !description || price === undefined) {
    return res.status(400).json({ message: 'Missing menu item details' });
  }

  const row = await store.createMenuItem({
    store_id: Number(store_id || req.user.store_id || 1),
    name,
    category,
    description,
    price: Number(price),
    available: available !== false,
  });

  return res.status(201).json(row);
});

router.get('/bookings', requireAuth, async (req, res) => {
  return res.json(await store.list('bookings'));
});

router.post('/bookings', requireAuth, async (req, res) => {
  const { customer_name, customer_email, space_kind, space_label, party_size, booking_time, notes } = req.body || {};
  if (!customer_name || !customer_email || !space_kind || !space_label || !booking_time) {
    return res.status(400).json({ message: 'Missing booking details' });
  }

  const row = await createBookingWithGuards(res, {
    store_id: Number(req.user.store_id || 1),
    customer_name,
    customer_email,
    space_kind,
    space_label,
    party_size: Number(party_size || 2),
    booking_time,
    notes: notes || '',
    status: 'confirmed',
  });
  if (!row) {
    return null;
  }

  return res.status(201).json(row);
});

router.get('/orders', requireAuth, async (req, res) => {
  return res.json(await store.list('orders'));
});

router.post('/orders', requireAuth, permit('waiter', 'manager', 'owner'), async (req, res) => {
  const { space_token, waiter_name, customer_name, customer_email, notes, items } = req.body || {};
  const space = await store.findSpaceByToken(space_token);
  const orderItems = Array.isArray(items) ? items : [];

  if (!space) {
    return res.status(404).json({ message: 'Space not found' });
  }

  if (orderItems.length === 0 && !String(notes || '').trim()) {
    return res.status(400).json({ message: 'Add food items or a service request' });
  }

  const order = await store.createOrderFromPayload({
    store_id: space.store_id,
    space_id: space.id,
    waiter_name: waiter_name || space.assigned_waiter,
    customer_name,
    customer_email,
    channel: 'staff',
    status: 'ready_to_approve',
    payment_status: 'unpaid',
    notes: notes || '',
    total: lineItemTotal(orderItems),
    items: orderItems.map((item, index) => ({
      id: item.id || `item-${Date.now()}-${index}`,
      menu_item_id: item.menu_item_id,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      status: 'pending',
    })),
    history: buildOrderHistory({ status: 'ready_to_approve', by: 'waiter' }),
  });

  await store.addDemoNotification(space.store_id, order.id, 'kitchen', 'order_created', `Order ${order.id} is waiting for approval.`);
  await store.addDemoNotification(space.store_id, order.id, 'waiter', 'assisted_order_created', `Assisted order ${order.id} is ready for waiter approval.`);

  return res.status(201).json(order);
});

router.patch('/orders/:id/approve', requireAuth, permit('waiter', 'manager', 'owner'), async (req, res) => {
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!ensureOrderState(res, order, ['ready_to_approve'], 'approved')) {
    return null;
  }

  const nextItems = Array.isArray(req.body?.items) && req.body.items.length
    ? normalizeEditableItems(req.body.items, order.id)
    : order.items;

  const updated = await store.replaceOrder(order.id, {
    ...order,
    items: nextItems,
    total: lineItemTotal(nextItems),
    status: 'approved',
    history: buildOrderHistory({ status: 'approved', by: req.user.role }, order.history),
    updated_at: new Date().toISOString(),
  });

  await store.addDemoNotification(order.store_id, order.id, 'kitchen', 'order_approved', `Order ${order.id} was approved and sent to the kitchen.`);
  await store.addDemoNotification(order.store_id, order.id, 'cashier', 'order_approved', `Order ${order.id} was approved and sent to cashier.`);

  return res.json(updated);
});

router.patch('/orders/:id/items/:itemId/prepare', requireAuth, permit('kitchen', 'manager', 'owner'), async (req, res) => {
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!ensureOrderState(res, order, ['approved', 'preparing', 'ready_to_serve'], 'prepared')) {
    return null;
  }

  const targetItem = order.items.find((item) => String(item.id) === String(req.params.itemId));
  if (!targetItem) {
    return res.status(404).json({ message: 'Order item not found' });
  }

  if (targetItem.status === 'served') {
    return res.status(409).json({ message: 'Served items cannot be changed back to prepared' });
  }

  const nextItems = order.items.map((item) => (
    String(item.id) === String(req.params.itemId)
      ? { ...item, status: 'prepared' }
      : item
  ));
  const allPrepared = nextItems.every((item) => item.status === 'prepared');

  const updated = await store.replaceOrder(order.id, {
    ...order,
    items: nextItems,
    status: allPrepared ? 'ready_to_serve' : 'preparing',
    history: buildOrderHistory({ status: allPrepared ? 'ready_to_serve' : 'preparing', by: req.user.role }, order.history),
    updated_at: new Date().toISOString(),
  });

  await store.addDemoNotification(order.store_id, order.id, 'waiter', 'item_prepared', `${targetItem.name} for order ${order.id} is prepared and ready to serve.`);
  if (allPrepared) {
    await store.addDemoNotification(order.store_id, order.id, 'waiter', 'order_prepared', `Order ${order.id} is prepared and ready for service.`);
  }

  return res.json(updated);
});

router.patch('/orders/:id/items/:itemId/serve', requireAuth, permit('waiter', 'manager', 'owner'), async (req, res) => {
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!ensureOrderState(res, order, ['preparing', 'ready_to_serve', 'served'], 'served')) {
    return null;
  }

  const targetItem = order.items.find((item) => String(item.id) === String(req.params.itemId));
  if (!targetItem) {
    return res.status(404).json({ message: 'Order item not found' });
  }

  if (targetItem.status !== 'prepared' && targetItem.status !== 'served') {
    return res.status(409).json({ message: 'Only prepared food can be served' });
  }

  const nextItems = order.items.map((item) => (
    String(item.id) === String(req.params.itemId)
      ? { ...item, status: 'served' }
      : item
  ));
  const allServed = nextItems.every((item) => item.status === 'served');

  const updated = await store.replaceOrder(order.id, {
    ...order,
    items: nextItems,
    status: allServed ? 'served' : 'ready_to_serve',
    history: buildOrderHistory({ status: allServed ? 'served' : 'ready_to_serve', by: req.user.role }, order.history),
    updated_at: new Date().toISOString(),
  });

  if (allServed) {
    await store.addDemoNotification(order.store_id, order.id, 'customer', 'order_served', `All dishes for order ${order.id} have been served. Enjoy your meal.`);
  }

  return res.json(updated);
});

router.post('/orders/:id/call-waiter', async (req, res) => {
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  await store.addDemoNotification(order.store_id, order.id, 'waiter', 'waiter_call', `Customer requested help for order ${order.id}.`);
  return res.json({ message: 'Waiter has been notified', orderId: order.id });
});

router.post('/orders/:id/request-payment', requireAuth, permit('waiter', 'manager', 'owner'), async (req, res) => {
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!ensureOrderState(res, order, ['served'], 'sent to cashier for billing')) {
    return null;
  }

  const updated = await store.replaceOrder(order.id, {
    ...order,
    status: 'payment_requested',
    payment_status: 'pending_bill',
    history: buildOrderHistory({ status: 'payment_requested', by: req.user.role }, order.history),
    updated_at: new Date().toISOString(),
  });

  await store.addDemoNotification(order.store_id, order.id, 'cashier', 'payment_requested', `Start billing for order ${order.id}.`);
  await store.addDemoNotification(order.store_id, order.id, 'customer', 'payment_requested', `Your bill is being prepared for order ${order.id}.`);

  return res.json(updated);
});

router.post('/orders/:id/complete-payment', requireAuth, permit('cashier', 'manager', 'owner'), async (req, res) => {
  const paymentMethod = String(req.body?.payment_method || '').trim();
  const paidAmount = Number(req.body?.paid_amount || 0);
  const changeAmount = Number(req.body?.change_amount || 0);
  const order = await store.findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!paymentMethod) {
    return res.status(400).json({ message: 'Payment method is required' });
  }

  if (!Number.isFinite(paidAmount) || paidAmount < Number(order.total)) {
    return res.status(400).json({ message: 'Paid amount must cover the order total' });
  }

  if (!Number.isFinite(changeAmount) || changeAmount < 0) {
    return res.status(400).json({ message: 'Change amount cannot be negative' });
  }

  if (isTerminalOrder(order)) {
    return res.status(409).json({ message: 'Completed or cancelled orders cannot be changed' });
  }

  if (order.payment_status === 'paid') {
    return res.status(409).json({ message: 'Payment is already recorded for this order' });
  }

  const updated = await store.replaceOrder(order.id, {
    ...order,
    status: 'completed',
    payment_status: 'paid',
    history: buildOrderHistory({
      status: 'completed',
      by: req.user.role,
      payment_method: paymentMethod,
      paid_amount: paidAmount,
      change_amount: changeAmount,
    }, order.history),
    updated_at: new Date().toISOString(),
  });

  await store.addDemoNotification(order.store_id, order.id, 'customer', 'payment_complete', `Payment received by ${paymentMethod.replace(/_/g, ' ')} for order ${order.id}. Receipt sent to ${order.customer_email}.`);
  await store.addDemoNotification(order.store_id, order.id, 'cashier', 'receipt_sent', `Receipt email queued for ${order.customer_email}.`);

  return res.json(updated);
});

router.patch('/bookings/:id/status', requireAuth, permit('owner', 'manager', 'waiter'), async (req, res) => {
  const booking = await store.findById('bookings', req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const updated = await store.update('bookings', booking.id, {
    status: req.body?.status || 'confirmed',
  });

  return res.json(updated);
});

router.get('/notifications', requireAuth, async (req, res) => {
  return res.json(await store.list('notifications'));
});

module.exports = router;
