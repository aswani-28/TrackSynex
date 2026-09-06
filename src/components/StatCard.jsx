const StatCard = ({ title, value, subtitle, tone = 'default' }) => {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card__label">{title}</div>
      <div className="stat-card__value">{value}</div>
      {subtitle ? <div className="stat-card__subtitle">{subtitle}</div> : null}
    </div>
  );
};

export default StatCard;
