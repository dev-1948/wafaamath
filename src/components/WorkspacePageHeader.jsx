export default function WorkspacePageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="workspace-page-header">
      <div>
        {eyebrow && <span className="workspace-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="workspace-header-action">{action}</div>}
    </div>
  );
}
