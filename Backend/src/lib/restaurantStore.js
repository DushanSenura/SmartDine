const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DEFAULT_STORE = {
  name: 'SmartDine Central',
  location: 'Downtown district',
  description: 'Multi-zone restaurant with tables, private rooms, and QR ordering.',
  manager: 'Riley Brooks',
  status: 'open',
};

const defaultMenu = [
  {
    name: 'Charred Salmon Bowl',
    category: 'Mains',
    description: 'Saffron rice, greens, pickled cucumber, citrus glaze.',
    price: 18.5,
    available: true,
  },
  {
    name: 'Heritage Burger',
    category: 'Burgers',
    description: 'Aged cheddar, brioche bun, fries, house sauce.',
    price: 16,
    available: true,
  },
  {
    name: 'Truffle Pasta',
    category: 'Pasta',
    description: 'Fresh pasta, mushrooms, parmesan cream, herbs.',
    price: 17.25,
    available: true,
  },
  {
    name: 'Roasted Veg Platter',
    category: 'Sharing',
    description: 'Seasonal vegetables, hummus, flatbread, chili oil.',
    price: 14,
    available: true,
  },
];

const defaultSpaces = [
  {
    label: 'Table 12',
    kind: 'table',
    capacity: 4,
    qr_token: 'table-12',
    status: 'available',
    assigned_waiter: 'Maya Patel',
  },
  {
    label: 'Table 18',
    kind: 'table',
    capacity: 2,
    qr_token: 'table-18',
    status: 'available',
    assigned_waiter: 'Maya Patel',
  },
  {
    label: 'Private Room Aurora',
    kind: 'private_room',
    capacity: 10,
    qr_token: 'room-aurora',
    status: 'bookable',
    assigned_waiter: 'Jonas Reed',
  },
];

const defaultStaff = [
  { name: 'Avery King', email: 'owner@smartdine.test', phone: '+1 555 0101', address: 'SmartDine Central office', date_of_birth: '1990-04-12', login_email: 'owner@smartdine.test', role: 'owner', status: 'active', shift: 'all day' },
  { name: 'Riley Brooks', email: 'manager@smartdine.test', phone: '+1 555 0102', address: 'SmartDine Central office', date_of_birth: '1988-09-24', login_email: 'manager@smartdine.test', role: 'manager', status: 'active', shift: 'day shift' },
  { name: 'Maya Patel', email: 'waiter@smartdine.test', phone: '+1 555 0103', address: 'Service team quarters', date_of_birth: '1996-02-18', login_email: 'waiter@smartdine.test', role: 'waiter', status: 'active', shift: 'lunch and dinner' },
  { name: 'Jonas Reed', email: 'kitchen@smartdine.test', phone: '+1 555 0104', address: 'Kitchen operations office', date_of_birth: '1992-07-03', login_email: 'kitchen@smartdine.test', role: 'kitchen', status: 'active', shift: 'all day' },
  { name: 'Sofia Chen', email: 'cashier@smartdine.test', phone: '+1 555 0105', address: 'Cashier desk', date_of_birth: '1994-11-15', login_email: 'cashier@smartdine.test', role: 'cashier', status: 'active', shift: 'all day' },
];

const demoUsers = [
  {
    name: 'Avery King',
    email: 'owner@smartdine.test',
    password: 'Owner123!',
    role: 'owner',
  },
  {
    name: 'Riley Brooks',
    email: 'manager@smartdine.test',
    password: 'Manager123!',
    role: 'manager',
  },
  {
    name: 'Maya Patel',
    email: 'waiter@smartdine.test',
    password: 'Waiter123!',
    role: 'waiter',
  },
  {
    name: 'Jonas Reed',
    email: 'kitchen@smartdine.test',
    password: 'Kitchen123!',
    role: 'kitchen',
  },
  {
    name: 'Sofia Chen',
    email: 'cashier@smartdine.test',
    password: 'Cashier123!',
    role: 'cashier',
  },
  {
    name: 'Jordan Guest',
    email: 'customer@smartdine.test',
    password: 'Customer123!',
    role: 'customer',
  },
];

class RestaurantStore {
  constructor() {
    this.mode = process.env.DATABASE_URL ? 'postgres' : 'memory';
    this.pool = this.mode === 'postgres' ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
    this.memory = {
      stores: [],
      staff: [],
      spaces: [],
      menuItems: [],
      users: [],
      bookings: [],
      orders: [],
      notifications: [],
      counters: {
        stores: 1,
        staff: 1,
        spaces: 1,
        menuItems: 1,
        users: 1,
        bookings: 1,
        orders: 1,
        notifications: 1,
      },
    };
    this.ready = this.initialize();
  }

  resolveTable(tableName) {
    const map = {
      stores: { memory: 'stores', sql: 'stores' },
      staff: { memory: 'staff', sql: 'staff' },
      spaces: { memory: 'spaces', sql: 'spaces' },
      menuItems: { memory: 'menuItems', sql: 'menu_items' },
      bookings: { memory: 'bookings', sql: 'bookings' },
      orders: { memory: 'orders', sql: 'orders' },
      users: { memory: 'users', sql: 'users' },
      notifications: { memory: 'notifications', sql: 'notifications' },
    };

    return map[tableName] || { memory: tableName, sql: tableName };
  }

  async initialize() {
    if (this.mode === 'postgres') {
      await this.ensureSchema();
      return;
    }

    this.seedMemory();
  }

  seedMemory() {
    const store = { id: this.memory.counters.stores++, ...DEFAULT_STORE, created_at: new Date().toISOString() };
    this.memory.stores.push(store);

    defaultMenu.forEach((item) => {
      this.memory.menuItems.push({
        id: this.memory.counters.menuItems++,
        store_id: 1,
        ...item,
        created_at: new Date().toISOString(),
      });
    });

    defaultSpaces.forEach((space) => {
      this.memory.spaces.push({
        id: this.memory.counters.spaces++,
        store_id: 1,
        ...space,
        created_at: new Date().toISOString(),
      });
    });

    defaultStaff.forEach((staff) => {
      this.memory.staff.push({
        id: this.memory.counters.staff++,
        store_id: 1,
        ...staff,
        created_at: new Date().toISOString(),
      });
    });

    demoUsers.forEach((user) => {
      this.memory.users.push({
        id: this.memory.counters.users++,
        store_id: 1,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'active',
        password_hash: bcrypt.hashSync(user.password, 10),
        created_at: new Date().toISOString(),
      });
    });

    this.memory.orders.push({
      id: this.memory.counters.orders++,
      store_id: 1,
      space_id: 1,
      waiter_name: 'Maya Patel',
      customer_name: 'Jordan Guest',
      customer_email: 'customer@smartdine.test',
      channel: 'qr',
      status: 'ready_to_approve',
      payment_status: 'unpaid',
      notes: 'Extra lemon on the salmon.',
      total: 35.5,
      items: [
        {
          id: 'item-1',
          menu_item_id: 1,
          name: 'Charred Salmon Bowl',
          quantity: 1,
          price: 18.5,
          status: 'prepared',
        },
        {
          id: 'item-2',
          menu_item_id: 2,
          name: 'Heritage Burger',
          quantity: 1,
          price: 16,
          status: 'served',
        },
      ],
      history: [
        { at: new Date().toISOString(), status: 'ready_to_approve', by: 'customer' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.memory.bookings.push({
      id: this.memory.counters.bookings++,
      store_id: 1,
      customer_name: 'Jordan Guest',
      customer_email: 'customer@smartdine.test',
      space_kind: 'private_room',
      space_label: 'Private Room Aurora',
      party_size: 6,
      booking_time: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Birthday dinner',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    });
  }

  async ensureSchema() {
    const ddl = `
      create table if not exists stores (
        id serial primary key,
        name text not null,
        location text not null,
        description text not null,
        manager text not null default '',
        status text not null default 'open',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists users (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        name text not null,
        email text not null unique,
        role text not null,
        status text not null default 'active',
        password_hash text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists staff (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        name text not null,
        email text not null,
        phone text not null default '',
        address text not null default '',
        date_of_birth text not null default '',
        login_email text not null default '',
        role text not null,
        status text not null default 'active',
        shift text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists spaces (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        label text not null,
        kind text not null,
        capacity integer not null,
        qr_token text not null unique,
        status text not null default 'available',
        assigned_waiter text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists menu_items (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        name text not null,
        category text not null,
        description text not null,
        price numeric(10,2) not null,
        available boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists bookings (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        customer_name text not null,
        customer_email text not null,
        space_kind text not null,
        space_label text not null,
        party_size integer not null,
        booking_time timestamptz not null,
        notes text not null default '',
        status text not null default 'pending',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists orders (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        space_id integer references spaces(id) on delete set null,
        waiter_name text not null,
        customer_name text not null,
        customer_email text not null,
        channel text not null,
        status text not null,
        payment_status text not null,
        notes text not null default '',
        total numeric(10,2) not null,
        items jsonb not null,
        history jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists notifications (
        id serial primary key,
        store_id integer references stores(id) on delete cascade,
        order_id integer references orders(id) on delete cascade,
        target_role text not null,
        type text not null,
        message text not null,
        read_at timestamptz null,
        created_at timestamptz not null default now()
      );
    `;

    await this.pool.query(ddl);
    await this.pool.query("alter table stores add column if not exists manager text not null default ''");
    await this.pool.query('update stores set manager = $1 where manager = $2', [DEFAULT_STORE.manager, '']);
    await this.pool.query("alter table staff add column if not exists phone text not null default ''");
    await this.pool.query("alter table staff add column if not exists address text not null default ''");
    await this.pool.query("alter table staff add column if not exists date_of_birth text not null default ''");
    await this.pool.query("alter table staff add column if not exists login_email text not null default ''");
    await this.pool.query("update staff set login_email = email where login_email = ''");

    const storeResult = await this.pool.query('select count(*)::int as count from stores');
    if (storeResult.rows[0].count > 0) {
      return;
    }

    const store = await this.pool.query(
      `insert into stores (name, location, description, manager, status)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [DEFAULT_STORE.name, DEFAULT_STORE.location, DEFAULT_STORE.description, DEFAULT_STORE.manager, DEFAULT_STORE.status],
    );

    for (const item of defaultMenu) {
      await this.pool.query(
        `insert into menu_items (store_id, name, category, description, price, available)
         values ($1, $2, $3, $4, $5, $6)`,
        [store.rows[0].id, item.name, item.category, item.description, item.price, item.available],
      );
    }

    for (const space of defaultSpaces) {
      await this.pool.query(
        `insert into spaces (store_id, label, kind, capacity, qr_token, status, assigned_waiter)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [store.rows[0].id, space.label, space.kind, space.capacity, space.qr_token, space.status, space.assigned_waiter],
      );
    }

    for (const staff of defaultStaff) {
      await this.pool.query(
        `insert into staff (store_id, name, email, phone, address, date_of_birth, login_email, role, status, shift)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [store.rows[0].id, staff.name, staff.email, staff.phone, staff.address, staff.date_of_birth, staff.login_email, staff.role, staff.status, staff.shift],
      );
    }

    for (const user of demoUsers) {
      await this.pool.query(
        `insert into users (store_id, name, email, role, status, password_hash)
         values ($1, $2, $3, $4, $5, $6)`,
        [store.rows[0].id, user.name, user.email, user.role, 'active', bcrypt.hashSync(user.password, 10)],
      );
    }
  }

  async fetchOverview() {
    await this.ready;

    if (this.mode === 'memory') {
      const store = this.memory.stores[0] || null;
      return {
        store,
        stores: this.memory.stores,
        staff: this.memory.staff,
        spaces: this.memory.spaces,
        menuItems: this.memory.menuItems,
        bookings: this.memory.bookings,
        orders: this.memory.orders,
        notifications: this.memory.notifications,
        stats: this.buildStats(this.memory),
      };
    }

    const [stores, staff, spaces, menuItems, bookings, orders, notifications] = await Promise.all([
      this.pool.query('select * from stores order by id asc'),
      this.pool.query('select * from staff order by id asc'),
      this.pool.query('select * from spaces order by id asc'),
      this.pool.query('select * from menu_items order by id asc'),
      this.pool.query('select * from bookings order by id desc'),
      this.pool.query('select * from orders order by id desc'),
      this.pool.query('select * from notifications order by id desc limit 10'),
    ]);

    return {
      store: stores.rows[0] || null,
      stores: stores.rows,
      staff: staff.rows,
      spaces: spaces.rows,
      menuItems: menuItems.rows,
      bookings: bookings.rows,
      orders: orders.rows.map((order) => this.normalizeOrder(order)),
      notifications: notifications.rows,
      stats: this.buildStats({
        stores: stores.rows,
        staff: staff.rows,
        spaces: spaces.rows,
        menuItems: menuItems.rows,
        bookings: bookings.rows,
        orders: orders.rows.map((order) => this.normalizeOrder(order)),
        notifications: notifications.rows,
      }),
    };
  }

  buildStats(source) {
    const orders = source.orders || [];
    return {
      stores: source.stores ? source.stores.length : source.store ? 1 : 0,
      staff: source.staff.length,
      spaces: source.spaces.length,
      menuItems: source.menuItems.length,
      activeBookings: source.bookings.filter((booking) => booking.status !== 'cancelled').length,
      pendingOrders: orders.filter((order) => ['ready_to_approve', 'approved', 'preparing'].includes(order.status)).length,
      readyToServe: orders.filter((order) => order.status === 'ready_to_serve').length,
      completedOrders: orders.filter((order) => order.status === 'completed').length,
    };
  }

  normalizeOrder(order) {
    return {
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      history: typeof order.history === 'string' ? JSON.parse(order.history) : order.history,
      total: Number(order.total),
    };
  }

  async authenticate(email, password) {
    await this.ready;

    if (this.mode === 'memory') {
      const user = this.memory.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return null;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      return valid ? this.stripSecret(user) : null;
    }

    const result = await this.pool.query('select * from users where lower(email) = lower($1) limit 1', [email]);
    if (result.rowCount === 0) {
      return null;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? this.stripSecret(user) : null;
  }

  stripSecret(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async list(tableName) {
    await this.ready;

    const table = this.resolveTable(tableName);

    if (this.mode === 'memory') {
      return this.memory[table.memory];
    }

    const result = await this.pool.query(`select * from ${table.sql} order by id asc`);
    return tableName === 'orders' ? result.rows.map((row) => this.normalizeOrder(row)) : result.rows;
  }

  async create(tableName, payload) {
    await this.ready;

    const table = this.resolveTable(tableName);

    if (this.mode === 'memory') {
      const id = this.memory.counters[table.memory]++;
      const row = { id, ...payload, created_at: new Date().toISOString() };
      this.memory[table.memory].push(row);
      return row;
    }

    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const params = columns.map((column, index) => `$${index + 1}`);
    const result = await this.pool.query(
      `insert into ${table.sql} (${columns.join(', ')}) values (${params.join(', ')}) returning *`,
      values,
    );
    return tableName === 'orders' ? this.normalizeOrder(result.rows[0]) : result.rows[0];
  }

  async update(tableName, id, changes) {
    await this.ready;

    const table = this.resolveTable(tableName);
    const safeChanges = { ...changes };
    delete safeChanges.id;
    delete safeChanges.created_at;
    delete safeChanges.updated_at;

    if (this.mode === 'postgres' && tableName === 'orders') {
      if (safeChanges.items && typeof safeChanges.items !== 'string') {
        safeChanges.items = JSON.stringify(safeChanges.items);
      }

      if (safeChanges.history && typeof safeChanges.history !== 'string') {
        safeChanges.history = JSON.stringify(safeChanges.history);
      }
    }

    if (this.mode === 'memory') {
      const rows = this.memory[table.memory];
      const index = rows.findIndex((row) => row.id === Number(id));
      if (index === -1) {
        return null;
      }

      rows[index] = { ...rows[index], ...safeChanges, updated_at: new Date().toISOString() };
      return rows[index];
    }

    const columns = Object.keys(safeChanges);
    const values = Object.values(safeChanges);
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    const result = await this.pool.query(
      `update ${table.sql} set ${assignments.join(', ')}, updated_at = now() where id = $${columns.length + 1} returning *`,
      [...values, id],
    );
    return result.rowCount === 0 ? null : tableName === 'orders' ? this.normalizeOrder(result.rows[0]) : result.rows[0];
  }

  async findById(tableName, id) {
    await this.ready;

    const table = this.resolveTable(tableName);

    if (this.mode === 'memory') {
      return this.memory[table.memory].find((row) => row.id === Number(id)) || null;
    }

    const result = await this.pool.query(`select * from ${table.sql} where id = $1 limit 1`, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return tableName === 'orders' ? this.normalizeOrder(result.rows[0]) : result.rows[0];
  }

  async findSpaceByToken(token) {
    await this.ready;

    if (this.mode === 'memory') {
      return this.memory.spaces.find((space) => space.qr_token === token) || null;
    }

    const result = await this.pool.query('select * from spaces where qr_token = $1 limit 1', [token]);
    return result.rowCount === 0 ? null : result.rows[0];
  }

  async delete(tableName, id) {
    await this.ready;

    const table = this.resolveTable(tableName);

    if (this.mode === 'memory') {
      const rows = this.memory[table.memory];
      const index = rows.findIndex((row) => row.id === Number(id));
      if (index === -1) {
        return null;
      }

      const [removed] = rows.splice(index, 1);
      return removed;
    }

    const result = await this.pool.query(`delete from ${table.sql} where id = $1 returning *`, [id]);
    return result.rowCount === 0 ? null : result.rows[0];
  }

  async findUserByEmail(email) {
    await this.ready;

    if (this.mode === 'memory') {
      return this.memory.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null;
    }

    const result = await this.pool.query('select * from users where lower(email) = lower($1) limit 1', [email]);
    return result.rowCount === 0 ? null : result.rows[0];
  }

  async updateUserByEmail(email, changes) {
    await this.ready;

    if (this.mode === 'memory') {
      const index = this.memory.users.findIndex((user) => user.email.toLowerCase() === String(email).toLowerCase());
      if (index === -1) {
        return null;
      }

      this.memory.users[index] = { ...this.memory.users[index], ...changes, updated_at: new Date().toISOString() };
      return this.stripSecret(this.memory.users[index]);
    }

    const columns = Object.keys(changes);
    const values = Object.values(changes);
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    const result = await this.pool.query(
      `update users set ${assignments.join(', ')}, updated_at = now() where lower(email) = lower($${columns.length + 1}) returning *`,
      [...values, email],
    );

    return result.rowCount === 0 ? null : this.stripSecret(result.rows[0]);
  }

  async deleteUserByEmail(email) {
    await this.ready;

    if (this.mode === 'memory') {
      const index = this.memory.users.findIndex((user) => user.email.toLowerCase() === String(email).toLowerCase());
      if (index === -1) {
        return null;
      }

      const [removed] = this.memory.users.splice(index, 1);
      return this.stripSecret(removed);
    }

    const result = await this.pool.query('delete from users where lower(email) = lower($1) returning *', [email]);
    return result.rowCount === 0 ? null : this.stripSecret(result.rows[0]);
  }

  async hasBookingConflict(spaceLabel, bookingTime) {
    await this.ready;

    const requested = new Date(bookingTime).getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    if (Number.isNaN(requested)) {
      return false;
    }

    if (this.mode === 'memory') {
      return this.memory.bookings.some((booking) => (
        booking.status !== 'cancelled'
        && booking.space_label === spaceLabel
        && Math.abs(new Date(booking.booking_time).getTime() - requested) < twoHours
      ));
    }

    const result = await this.pool.query(
      `select id from bookings
       where status <> 'cancelled'
       and space_label = $1
       and booking_time between ($2::timestamptz - interval '2 hours') and ($2::timestamptz + interval '2 hours')
       limit 1`,
      [spaceLabel, bookingTime],
    );

    return result.rowCount > 0;
  }

  async createOrderFromPayload(payload) {
    await this.ready;

    const order = {
      store_id: payload.store_id,
      space_id: payload.space_id,
      waiter_name: payload.waiter_name,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      channel: payload.channel,
      status: payload.status,
      payment_status: payload.payment_status,
      notes: payload.notes || '',
      total: payload.total,
      items: payload.items,
      history: payload.history,
    };

    if (this.mode === 'memory') {
      const row = {
        id: this.memory.counters.orders++,
        ...order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.memory.orders.unshift(row);
      return row;
    }

    const result = await this.pool.query(
      `insert into orders (store_id, space_id, waiter_name, customer_name, customer_email, channel, status, payment_status, notes, total, items, history)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        order.store_id,
        order.space_id,
        order.waiter_name,
        order.customer_name,
        order.customer_email,
        order.channel,
        order.status,
        order.payment_status,
        order.notes,
        order.total,
        JSON.stringify(order.items),
        JSON.stringify(order.history),
      ],
    );

    return this.normalizeOrder(result.rows[0]);
  }

  async createNotification(payload) {
    await this.ready;

    if (this.mode === 'memory') {
      const row = {
        id: this.memory.counters.notifications++,
        ...payload,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      this.memory.notifications.unshift(row);
      return row;
    }

    const result = await this.pool.query(
      `insert into notifications (store_id, order_id, target_role, type, message)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [payload.store_id, payload.order_id, payload.target_role, payload.type, payload.message],
    );
    return result.rows[0];
  }

  async createBooking(payload) {
    return this.create('bookings', payload);
  }

  async createStaffMember(payload) {
    return this.create('staff', payload);
  }

  async updateStaffMember(id, payload) {
    return this.update('staff', id, payload);
  }

  async deleteStaffMember(id) {
    return this.delete('staff', id);
  }

  async createStore(payload) {
    return this.create('stores', payload);
  }

  async createSpace(payload) {
    return this.create('spaces', payload);
  }

  async createMenuItem(payload) {
    return this.create('menuItems', payload);
  }

  async createUser(payload) {
    return this.create('users', payload);
  }

  async updateOrderWorkflow(orderId, changes) {
    const current = await this.findById('orders', orderId);
    if (!current) {
      return null;
    }

    const history = [...(current.history || []), { at: new Date().toISOString(), ...changes.historyEntry }];
    const updated = await this.update('orders', orderId, {
      ...changes.fields,
      history,
      updated_at: new Date().toISOString(),
    });

    if (updated && this.mode === 'memory') {
      updated.items = changes.items || updated.items;
      updated.history = history;
    }

    return updated;
  }

  async replaceOrder(orderId, nextOrder) {
    return this.update('orders', orderId, nextOrder);
  }

  async addDemoNotification(storeId, orderId, role, type, message) {
    return this.createNotification({ store_id: storeId, order_id: orderId, target_role: role, type, message });
  }

  async makeOrderSnapshot(orderId) {
    return this.findById('orders', orderId);
  }
}

module.exports = new RestaurantStore();
