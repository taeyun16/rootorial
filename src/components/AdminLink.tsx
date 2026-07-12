import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function AdminLink() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    import("../features/admin/admin.functions")
      .then(({ getAdminAccess }) => getAdminAccess())
      .then((access) => { if (active) setVisible(access.isAdmin); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!visible) return null;
  return <Link className="admin-nav-link" to="/admin">관리자</Link>;
}
