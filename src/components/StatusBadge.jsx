const statusStyles = {
  P1: 'badge-critical',
  P2: 'badge-warning',
  P3: 'badge-info',
  P4: 'badge-neutral',
  High: 'badge-critical',
  Medium: 'badge-warning',
  Low: 'badge-info',
  available: 'badge-success',
  occupied: 'badge-neutral',
  success: 'badge-success',
  warning: 'badge-warning',
  neutral: 'badge-neutral',
  info: 'badge-info',
  critical: 'badge-critical',
  CONTENTION: 'badge-warning',
  STRUCTURALLY_INFEASIBLE: 'badge-critical',
  Critical: 'badge-critical',
  Warning: 'badge-warning',
  Info: 'badge-info',
  default: 'badge-neutral',
};

const StatusBadge = ({ label, type = 'default' }) => {
  const className = statusStyles[type] || statusStyles.default;
  return <span className={`status-badge ${className}`}>{label}</span>;
};

export default StatusBadge;
