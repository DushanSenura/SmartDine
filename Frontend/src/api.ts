export type Role = 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  store_id?: number;
}

export interface Store {
  id: number;
  name: string;
  location: string;
  description: string;
  manager?: string;
  status: string;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  login_email?: string;
  role: string;
  status: string;
  shift: string;
}

export interface Space {
  id: number;
  label: string;
  kind: 'table' | 'private_room';
  capacity: number;
  qr_token: string;
  status: string;
  assigned_waiter: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  available: boolean;
}

export interface Booking {
  id: number;
  customer_name: string;
  customer_email: string;
  space_kind: string;
  space_label: string;
  party_size: number;
  booking_time: string;
  notes: string;
  status: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  status: string;
}

export interface Order {
  id: number;
  store_id: number;
  space_id: number;
  waiter_name: string;
  customer_name: string;
  customer_email: string;
  channel: string;
  status: string;
  payment_status: string;
  notes: string;
  total: number;
  items: OrderItem[];
  history: Array<{ at: string; status: string; by: string; payment_method?: string }>;
}

export interface Notification {
  id: number;
  target_role: string;
  type: string;
  message: string;
  created_at: string;
}

export interface DashboardSnapshot {
  store: Store | null;
  stores: Store[];
  staff: StaffMember[];
  spaces: Space[];
  menuItems: MenuItem[];
  bookings: Booking[];
  orders: Order[];
  notifications: Notification[];
  stats: {
    stores: number;
    staff: number;
    spaces: number;
    menuItems: number;
    activeBookings: number;
    pendingOrders: number;
    readyToServe: number;
    completedOrders: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const rawBody = await response.text();
  let payload: unknown = {};

  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const message = (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string')
      ? payload.message
      : `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  return payload as T;
}

export function login(email: string, password: string) {
  return request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(token: string) {
  return request<{ user: User; store: Store | null }>('/auth/me', {}, token);
}

export function updateCurrentUser(token: string, payload: { name: string; email: string; phone: string; address: string; date_of_birth: string; password?: string }) {
  return request<{ token: string; user: User }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

export function loadDashboard(token: string) {
  return request<DashboardSnapshot>('/dashboard', {}, token);
}

export function loadCatalog(spaceToken: string) {
  return request<{ space: Space; spaces?: Space[]; store: Store | null; menuItems: MenuItem[]; staff: StaffMember[] }>(`/catalog/${spaceToken}`);
}

export function createPublicOrder(payload: {
  token: string;
  customer_name: string;
  customer_email: string;
  waiter_name?: string;
  notes?: string;
  items: Array<{ menu_item_id: number; name: string; quantity: number; price: number }>;
}) {
  return request<Order>('/public/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createPublicBooking(payload: {
  customer_name: string;
  customer_email: string;
  space_kind: string;
  space_label: string;
  party_size: number;
  booking_time: string;
  notes: string;
}) {
  return request<Booking>('/public/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createBooking(token: string, payload: {
  customer_name: string;
  customer_email: string;
  space_kind: string;
  space_label: string;
  party_size: number;
  booking_time: string;
  notes: string;
}) {
  return request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createStore(token: string, payload: { name: string; location: string; description: string; manager: string; status?: string }) {
  return request<Store>('/stores', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateStore(token: string, storeId: number, payload: { name: string; location: string; description: string; manager: string; status: string }) {
  return request<Store>(`/stores/${storeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

export function createStaff(token: string, payload: {
  name: string;
  email: string;
  phone: string;
  address: string;
  login_email: string;
  password: string;
  role: string;
  shift: string;
  status?: string;
}) {
  return request<StaffMember & { default_password?: string }>('/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateStaff(token: string, staffId: number, payload: {
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
  return request<StaffMember>(`/staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

export function deleteStaff(token: string, staffId: number) {
  return request<{ message: string; staff: StaffMember }>(`/staff/${staffId}`, {
    method: 'DELETE',
  }, token);
}

export function createSpace(token: string, payload: { label: string; kind: string; capacity: number; qr_token: string; assigned_waiter: string; status?: string }) {
  return request<Space>('/spaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createMenuItem(token: string, payload: { name: string; category: string; description: string; price: number; available?: boolean }) {
  return request<MenuItem>('/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createOrder(token: string, payload: {
  space_token: string;
  waiter_name?: string;
  customer_name: string;
  customer_email: string;
  notes?: string;
  items: Array<{ menu_item_id: number; name: string; quantity: number; price: number }>;
}) {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function approveOrder(token: string, orderId: number, items?: OrderItem[]) {
  return request<Order>(`/orders/${orderId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(items ? { items } : {}),
  }, token);
}

export function prepareItem(token: string, orderId: number, itemId: string) {
  return request<Order>(`/orders/${orderId}/items/${itemId}/prepare`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  }, token);
}

export function serveItem(token: string, orderId: number, itemId: string) {
  return request<Order>(`/orders/${orderId}/items/${itemId}/serve`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  }, token);
}

export function callWaiter(orderId: number) {
  return request<{ message: string }>(`/orders/${orderId}/call-waiter`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function requestPayment(token: string, orderId: number) {
  return request<Order>(`/orders/${orderId}/request-payment`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, token);
}

export function completePayment(token: string, orderId: number, paymentMethod: string) {
  return request<Order>(`/orders/${orderId}/complete-payment`, {
    method: 'POST',
    body: JSON.stringify({ payment_method: paymentMethod }),
  }, token);
}
