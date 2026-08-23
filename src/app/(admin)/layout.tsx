/**
 * The admin group sits outside (app): no BottomNav, no mobile frame, and a dark
 * desktop-first surface. It is a tool, not part of the student-facing product.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#0B1020] text-slate-100">{children}</div>
}
