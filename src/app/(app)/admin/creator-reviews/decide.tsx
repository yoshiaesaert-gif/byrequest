"use client";
import { useTransition } from "react";
import { reviewDecision } from "../actions";

export function Decide({ id, status, canPublish }: { id: string; status: string; canPublish: boolean }) {
  const [p, start] = useTransition();
  return (<span className="cv-act">
    {status !== "approved" && canPublish ? <button className="btn btn-primary btn-sm" disabled={p} onClick={() => start(() => reviewDecision(id, "approved"))}>Show on page</button> : null}
    {status !== "hidden" ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(() => reviewDecision(id, "hidden"))}>Hide</button> : null}
  </span>);
}
