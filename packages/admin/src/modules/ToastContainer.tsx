type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: "success" | "error"
}

type ToastContainerProps = {
  toasts: ToastItem[]
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.variant || ""}`.trim()}>
          <strong>{toast.title}</strong>
          {toast.description && <span>{toast.description}</span>}
        </div>
      ))}
    </div>
  )
}
