interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
