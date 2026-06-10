import { useState, type FormEvent } from 'react';
import type { Booking, Role, Space, StaffMember } from '../../api';
import './TableRoomsPage.css';

type SpaceFormPayload = {
  label: string;
  kind: string;
  capacity: number;
  qr_token: string;
  assigned_waiter: string;
  status: string;
};

type TableRoomsPageProps = {
  spaces: Space[];
  bookings: Booking[];
  staff: StaffMember[];
  role: Role;
  onAddSpace: (payload: SpaceFormPayload) => Promise<void>;
};

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

const initialSpaceForm = {
  label: '',
  kind: 'table',
  capacity: 2,
  qr_token: '',
  assigned_waiter: '',
  status: 'available',
};

function toDateTimeInputValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function TableRoomsPage({ spaces, bookings, staff, role, onAddSpace }: TableRoomsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [spaceForm, setSpaceForm] = useState(initialSpaceForm);
  const [selectedTime, setSelectedTime] = useState(() => toDateTimeInputValue());
  const [searchedTime, setSearchedTime] = useState(selectedTime);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const tables = spaces.filter((space) => space.kind === 'table');
  const privateRooms = spaces.filter((space) => space.kind === 'private_room');
  const totalCapacity = spaces.reduce((sum, space) => sum + Number(space.capacity), 0);
  const serviceStaff = staff.filter((member) => ['waiter', 'manager', 'owner'].includes(member.role));
  const visibleSpaces = [...tables, ...privateRooms];
  const searchedTimestamp = new Date(searchedTime).getTime();
  const canAddSpaces = role === 'manager' || role === 'owner';

  function bookingCountFor(space: Space) {
    return bookings.filter((booking) => (
      booking.status !== 'cancelled'
      && booking.space_kind === space.kind
      && normalizeLabel(booking.space_label) === normalizeLabel(space.label)
    )).length;
  }

  function hasBookingAtSelectedTime(space: Space) {
    return bookingsAtSelectedTime(space).length > 0;
  }

  function bookingsAtSelectedTime(space: Space) {
    if (Number.isNaN(searchedTimestamp)) {
      return [];
    }

    const twoHours = 2 * 60 * 60 * 1000;
    return bookings.filter((booking) => {
      const bookingTimestamp = new Date(booking.booking_time).getTime();

      return booking.status !== 'cancelled'
        && booking.space_kind === space.kind
        && normalizeLabel(booking.space_label) === normalizeLabel(space.label)
        && !Number.isNaN(bookingTimestamp)
        && Math.abs(bookingTimestamp - searchedTimestamp) < twoHours;
    });
  }

  function displayStatusFor(space: Space) {
    if (space.status === 'closed') {
      return 'closed';
    }

    if (space.status === 'occupied') {
      return 'occupied';
    }

    if (hasBookingAtSelectedTime(space)) {
      return 'booked';
    }

    return space.kind === 'private_room' ? 'bookable' : 'open';
  }

  const openSpaces = visibleSpaces.filter((space) => ['open', 'bookable'].includes(displayStatusFor(space)));
  const bookedSpaces = visibleSpaces.filter((space) => displayStatusFor(space) === 'booked');
  const openSeats = openSpaces.reduce((sum, space) => sum + Number(space.capacity), 0);
  const selectedSpaceStatus = selectedSpace ? displayStatusFor(selectedSpace) : '';
  const selectedSpaceBookings = selectedSpace ? bookingsAtSelectedTime(selectedSpace) : [];

  function openForm() {
    setSpaceForm({
      ...initialSpaceForm,
      assigned_waiter: serviceStaff[0]?.name || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setSpaceForm(initialSpaceForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAddSpace(spaceForm);
    closeForm();
  }

  function handleTimeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchedTime(selectedTime);
    setSelectedSpace(null);
  }

  return (
    <section className="table-rooms-page">
      <div className="table-rooms-hero panel">
        <div>
          <span>Tables and rooms</span>
          <h2>Dining space management</h2>
          <p>Review every table and private room, capacity, QR code token, service assignment, and active booking load.</p>
        </div>
        {canAddSpaces ? (
          <button type="button" onClick={showForm ? closeForm : openForm}>
            {showForm ? 'Close form' : 'Add table / room'}
          </button>
        ) : null}
      </div>

      {showForm && canAddSpaces ? (
        <div className="space-modal-backdrop" role="presentation">
          <section className="space-modal panel" role="dialog" aria-modal="true" aria-labelledby="space-form-title">
            <div className="section-title">
              <div>
                <span>New space</span>
                <h2 id="space-form-title">Add table or private room</h2>
              </div>
              <button type="button" className="space-modal-close" onClick={closeForm}>Close</button>
            </div>

            <form className="add-space-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                Type
                <select
                  value={spaceForm.kind}
                  onChange={(event) => setSpaceForm((current) => ({
                    ...current,
                    kind: event.target.value,
                    status: event.target.value === 'private_room' ? 'bookable' : 'available',
                  }))}
                >
                  <option value="table">Table</option>
                  <option value="private_room">Private room</option>
                </select>
              </label>
              <label>
                Name / label
                <input
                  value={spaceForm.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    setSpaceForm((current) => ({
                      ...current,
                      label,
                      qr_token: current.qr_token && current.qr_token !== slugify(current.label) ? current.qr_token : slugify(label),
                    }));
                  }}
                  placeholder={spaceForm.kind === 'table' ? 'Table 20' : 'Private Room Luna'}
                  required
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  value={spaceForm.capacity}
                  onChange={(event) => setSpaceForm((current) => ({ ...current, capacity: Number(event.target.value) }))}
                  required
                />
              </label>
              <label>
                Status
                <select value={spaceForm.status} onChange={(event) => setSpaceForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="available">Available</option>
                  <option value="bookable">Bookable</option>
                  <option value="occupied">Occupied</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label>
                Assigned waiter
                <select
                  value={spaceForm.assigned_waiter}
                  onChange={(event) => setSpaceForm((current) => ({ ...current, assigned_waiter: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select waiter</option>
                  {serviceStaff.map((member) => (
                    <option key={member.id} value={member.name}>{member.name} / {readable(member.role)}</option>
                  ))}
                </select>
              </label>
              <label>
                QR token
                <input
                  value={spaceForm.qr_token}
                  onChange={(event) => setSpaceForm((current) => ({ ...current, qr_token: event.target.value }))}
                  required
                />
              </label>
              <button type="submit">Create space</button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedSpace ? (
        <div className="space-modal-backdrop" role="presentation">
          <section className="space-detail-modal panel" role="dialog" aria-modal="true" aria-labelledby="space-detail-title">
            <div className="section-title">
              <div>
                <span>{readable(selectedSpaceStatus)}</span>
                <h2 id="space-detail-title">{selectedSpace.label}</h2>
              </div>
              <button type="button" className="space-modal-close" onClick={() => setSelectedSpace(null)}>Close</button>
            </div>

            <div className="space-detail-summary">
              <article><span>Type</span><b>{readable(selectedSpace.kind)}</b></article>
              <article><span>Capacity</span><b>{selectedSpace.capacity} seats</b></article>
              <article><span>Status</span><b>{readable(selectedSpaceStatus)}</b></article>
              <article><span>Selected time</span><b>{formatDateTime(searchedTime)}</b></article>
              <article><span>Waiter</span><b>{selectedSpace.assigned_waiter}</b></article>
              <article><span>QR token</span><b>{selectedSpace.qr_token}</b></article>
            </div>

            {selectedSpaceStatus === 'booked' ? (
              <div className="space-detail-bookings">
                <span>Booking details</span>
                {selectedSpaceBookings.map((booking) => (
                  <article key={booking.id}>
                    <div>
                      <strong>{booking.customer_name}</strong>
                      <p>{booking.customer_email}</p>
                    </div>
                    <div>
                      <strong>{booking.party_size} guests</strong>
                      <p>{formatDateTime(booking.booking_time)}</p>
                    </div>
                    <b>{readable(booking.status)}</b>
                    {booking.notes ? <p className="detail-note">{booking.notes}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="space-detail-message">
                {selectedSpaceStatus === 'open' || selectedSpaceStatus === 'bookable'
                  ? `${selectedSpace.label} is available for ${selectedSpace.capacity} guests at the selected time.`
                  : `${selectedSpace.label} is currently marked as ${readable(selectedSpaceStatus)}.`}
              </p>
            )}
          </section>
        </div>
      ) : null}

      <div className="table-rooms-stats">
        <article><span>Tables</span><b>{tables.length}</b></article>
        <article><span>Private rooms</span><b>{privateRooms.length}</b></article>
        <article><span>Booked now</span><b>{bookedSpaces.length}</b></article>
        <article><span>Total seats</span><b>{totalCapacity}</b></article>
      </div>

      <section className="live-map-panel panel">
        <div className="live-map-header">
          <div>
            <span>Dining room</span>
            <h2>Live table map</h2>
          </div>
          <form className="live-map-controls" onSubmit={(event) => handleTimeSearch(event)}>
            <label>
              Search date and time
              <input
                type="datetime-local"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
              />
            </label>
            <button type="submit">Search</button>
            <strong>{openSeats} seats open</strong>
          </form>
        </div>

        <div className="status-legend" aria-label="Space status legend">
          <span><b className="legend-dot open" />Open</span>
          <span><b className="legend-dot booked" />Booked</span>
          <span><b className="legend-dot occupied" />Occupied</span>
          <span><b className="legend-dot closed" />Closed</span>
        </div>

        <div className="live-space-map">
          {visibleSpaces.map((space) => {
            const displayStatus = displayStatusFor(space);
            const shortLabel = space.label.replace(/^(table|private room)\s*/i, '');

            return (
              <button
                type="button"
                className={`live-space-tile ${displayStatus} ${space.kind}`}
                key={space.id}
                onClick={() => setSelectedSpace(space)}
              >
                <strong>{shortLabel}</strong>
                <span>{space.capacity} seats</span>
                <b>{readable(displayStatus)}</b>
              </button>
            );
          })}
        </div>
      </section>

      <div className="table-rooms-layout">
        <section className="panel">
          <div className="section-title">
            <span>Floor</span>
            <h2>Tables</h2>
          </div>

          <div className="space-card-grid">
            {tables.map((space) => (
              <article className="space-card" key={space.id}>
                <div className="space-card-top">
                  <div>
                    <strong>{space.label}</strong>
                    <p>Capacity {space.capacity}</p>
                  </div>
                  <span className={`space-status ${space.status}`}>{readable(space.status)}</span>
                </div>
                <div className="space-meta">
                  <span>Waiter</span>
                  <strong>{space.assigned_waiter}</strong>
                </div>
                <div className="space-meta">
                  <span>QR token</span>
                  <strong>{space.qr_token}</strong>
                </div>
                <div className="space-booking-count">{bookingCountFor(space)} bookings</div>
              </article>
            ))}
            {!tables.length ? <p className="empty">No tables created yet.</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <span>Rooms</span>
            <h2>Private rooms</h2>
          </div>

          <div className="space-card-grid">
            {privateRooms.map((space) => (
              <article className="space-card private-room" key={space.id}>
                <div className="space-card-top">
                  <div>
                    <strong>{space.label}</strong>
                    <p>Capacity {space.capacity}</p>
                  </div>
                  <span className={`space-status ${space.status}`}>{readable(space.status)}</span>
                </div>
                <div className="space-meta">
                  <span>Waiter</span>
                  <strong>{space.assigned_waiter}</strong>
                </div>
                <div className="space-meta">
                  <span>QR token</span>
                  <strong>{space.qr_token}</strong>
                </div>
                <div className="space-booking-count">{bookingCountFor(space)} bookings</div>
              </article>
            ))}
            {!privateRooms.length ? <p className="empty">No private rooms created yet.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

export default TableRoomsPage;
