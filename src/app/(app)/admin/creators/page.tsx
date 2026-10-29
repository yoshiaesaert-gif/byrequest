import { redirect } from "next/navigation";

/* The creators overview lives in the users list; this keeps the short address working. */
export default function Creators() { redirect("/admin/users?kind=creators"); }
