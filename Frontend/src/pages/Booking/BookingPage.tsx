import { useState, type FormEvent } from 'react';
import type { Booking, Space } from '../../api';
import './BookingPage.css';

type BookingFormPayload = {
  customer_name: string;
  customer_email: string;
  space_kind: string;
  space_label: string;
  party_size: number;
  booking_time: string;
  notes: string;
};

type BookingPageProps = {
  bookings: Booking[];
  spaces: Space[];
  onAddBooking: (payload: BookingFormPayload) => Promise<void>;
};

function readable(value: string) {
  return value.replace(/_/g, ' ');
}

function formatBookingTime(value: string) {
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

const initialBookingForm = {
  customer_name: '',
  customer_email: '',
  space_kind: 'table',
  space_label: '',
  party_size: 2,
  booking_time: '',
  notes: '',
};

function BookingPage({ bookings, spaces, onAddBooking }: BookingPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const sortedBookings = [...bookings].sort((left, right) => (
    new Date(right.booking_time).getTime() - new Date(left.booking_time).getTime()
  ));
  const confirmedBookings = sortedBookings.filter((booking) => booking.status === 'confirmed');
  const pendingBookings = sortedBookings.filter((booking) => booking.status === 'pending');
  const roomBookings = sortedBookings.filter((booking) => booking.space_kind === 'private_room');
  const availableSpaces = spaces.filter((space) => space.kind === bookingForm.space_kind);
  const selectedSpace = availableSpaces.find((space) => space.label === bookingForm.space_label);

  function openForm() {
    const firstTable = spaces.find((space) => space.kind === 'table');
    setBookingForm({
      ...initialBookingForm,
      space_label: firstTable?.label || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setBookingForm(initialBookingForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAddBooking(bookingForm);
    closeForm();
  }

  return (
    <section className="booking-page">
      <div className="booking-page-hero panel">
        <div>
          <span>Bookings</span>
          <h2>Table and room reservations</h2>
          <p>Manage confirmed and pending reservations for tables, private rooms, party size, customer details, and notes.</p>
        </div>
        <button type="button" onClick={showForm ? closeForm : openForm}>
          {showForm ? 'Close form' : 'Add booking'}
        </button>
      </div>

      {showForm ? (
        <div className="booking-modal-backdrop" role="presentation">
          <section className="booking-modal panel" role="dialog" aria-modal="true" aria-labelledby="booking-form-title">
            <div className="section-title">
              <div>
                <span>New booking</span>
                <h2 id="booking-form-title">Add table or private room booking</h2>
              </div>
              <button type="button" className="booking-modal-close" onClick={closeForm}>Close</button>
            </div>

            <form className="add-booking-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                Customer name
                <input
                  value={bookingForm.customer_name}
                  onChange={(event) => setBookingForm((current) => ({ ...current, customer_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Customer email
                <input
                  type="email"
                  value={bookingForm.customer_email}
                  onChange={(event) => setBookingForm((current) => ({ ...current, customer_email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Booking type
                <select
                  value={bookingForm.space_kind}
                  onChange={(event) => {
                    const nextKind = event.target.value;
                    const firstSpace = spaces.find((space) => space.kind === nextKind);
                    setBookingForm((current) => ({
                      ...current,
                      space_kind: nextKind,
                      space_label: firstSpace?.label || '',
                    }));
                  }}
                >
                  <option value="table">Table</option>
                  <option value="private_room">Private room</option>
                </select>
              </label>
              <label>
                Table or room
                <select
                  value={bookingForm.space_label}
                  onChange={(event) => setBookingForm((current) => ({ ...current, space_label: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select space</option>
                  {availableSpaces.map((space) => (
                    <option key={space.id} value={space.label}>
                      {space.label} / {space.capacity} guests
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Party size
                <input
                  type="number"
                  min="1"
                  max={selectedSpace?.capacity}
                  value={bookingForm.party_size}
                  onChange={(event) => setBookingForm((current) => ({ ...current, party_size: Number(event.target.value) }))}
                  required
                />
              </label>
              <label>
                Booking time
                <input
                  type="datetime-local"
                  value={bookingForm.booking_time}
                  onChange={(event) => setBookingForm((current) => ({ ...current, booking_time: event.target.value }))}
                  required
                />
              </label>
              <label className="full-field">
                Notes
                <textarea
                  value={bookingForm.notes}
                  onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit">Create booking</button>
            </form>
          </section>
        </div>
      ) : null}

      <div className="booking-stats">
        <article><span>Total</span><b>{sortedBookings.length}</b></article>
        <article><span>Confirmed</span><b>{confirmedBookings.length}</b></article>
        <article><span>Pending</span><b>{pendingBookings.length}</b></article>
        <article><span>Private rooms</span><b>{roomBookings.length}</b></article>
      </div>

      <div className="booking-table panel">
        <div className="booking-table-head">
          <span>Customer</span>
          <span>Space</span>
          <span>Party</span>
          <span>Time</span>
          <span>Status</span>
        </div>

        <div className="booking-table-body">
          {sortedBookings.map((booking) => (
            <article className="booking-row" key={booking.id}>
              <div>
                <strong>{booking.customer_name}</strong>
                <small>{booking.customer_email}</small>
              </div>
              <div>
                <strong>{booking.space_label}</strong>
                <small>{readable(booking.space_kind)}</small>
              </div>
              <strong>{booking.party_size} guests</strong>
              <span className="booking-time">{formatBookingTime(booking.booking_time)}</span>
              <span className={`booking-pill ${booking.status}`}>{readable(booking.status)}</span>
              {booking.notes ? <p className="booking-notes">{booking.notes}</p> : null}
            </article>
          ))}

          {!sortedBookings.length ? <p className="empty">No bookings yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

export default BookingPage;
