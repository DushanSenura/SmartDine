import type { MenuItem } from '../../api';
import './MenuPage.css';

type MenuPageProps = {
  menuItems: MenuItem[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function MenuPage({ menuItems }: MenuPageProps) {
  const availableItems = menuItems.filter((item) => item.available);
  const unavailableItems = menuItems.filter((item) => !item.available);
  const categories = [...new Set(menuItems.map((item) => item.category))];

  return (
    <section className="menu-page">
      <div className="menu-page-hero panel">
        <div>
          <span>Menu</span>
          <h2>Food catalog</h2>
          <p>Review menu availability, categories, pricing, and dish descriptions for the restaurant ordering flow.</p>
        </div>
      </div>

      <div className="menu-stats">
        <article><span>Total items</span><b>{menuItems.length}</b></article>
        <article><span>Available</span><b>{availableItems.length}</b></article>
        <article><span>Unavailable</span><b>{unavailableItems.length}</b></article>
        <article><span>Categories</span><b>{categories.length}</b></article>
      </div>

      <section className="panel">
        <div className="section-title">
          <span>Catalog</span>
          <h2>Menu items</h2>
        </div>

        <div className="menu-catalog-grid">
          {menuItems.map((item) => (
            <article className={item.available ? 'menu-catalog-card' : 'menu-catalog-card unavailable'} key={item.id}>
              <div>
                <span>{item.category}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <div className="menu-card-footer">
                <strong>{formatMoney(item.price)}</strong>
                <b>{item.available ? 'Available' : 'Unavailable'}</b>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default MenuPage;
