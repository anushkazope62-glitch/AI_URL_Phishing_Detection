function StatCard({ title, value, icon, description }) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-content">
        <p>{title}</p>

        <h2>{value}</h2>

        <span>{description}</span>
      </div>

    </div>
  );
}

export default StatCard;