import type { ReactNode } from "react";
import "./adminlte.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="adminlte-shell hold-transition layout-fixed layout-navbar-fixed">
      {children}
    </div>
  );
}
