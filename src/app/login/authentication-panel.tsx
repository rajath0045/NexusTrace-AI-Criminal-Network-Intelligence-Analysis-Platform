"use client";

import { useState, type ReactNode } from "react";
import { UserRole } from "@/domain/model";
import { accessLevels } from "./access-levels";
import type { LoginState } from "./actions";
import { LoginForm } from "./login-form";

type LoginAction = (
  previousState: LoginState,
  formData: FormData,
) => Promise<LoginState>;

interface AuthenticationPanelProps {
  action: LoginAction;
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none">
      <path
        d="M12 3.2 5.4 5.7v5.3c0 4.4 2.9 8.4 6.6 9.6 3.7-1.2 6.6-5.2 6.6-9.6V5.7L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9.1 12.1 1.9 1.9 3.9-3.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none">
      <path
        d="M4.8 20.2V9.4L12 4.6l7.2 4.8v10.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 20.2v-5.4h5.6v5.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 10.6h.1M12 10.6h.1M15.6 10.6h.1M8.4 13.6h.1M12 13.6h.1M15.6 13.6h.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none">
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m16 16 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const roleIcons: Record<UserRole, ReactNode> = {
  [UserRole.Administrator]: <ShieldIcon />,
  [UserRole.DepartmentUser]: <BuildingIcon />,
  [UserRole.Investigator]: <SearchIcon />,
};

function RoleSelector({
  onSelect,
}: {
  onSelect: (role: UserRole) => void;
}) {
  return (
    <div className="auth-stage">
      <div className="role-options" role="group" aria-label="Authorized access levels">
        {accessLevels.map((level) => (
          <button
            key={level.role}
            className="role-option"
            type="button"
            onClick={() => onSelect(level.role)}
          >
            <span className="role-option-icon">{roleIcons[level.role]}</span>
            <strong>{level.title}</strong>
            <span className="role-option-arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthenticationPanel({ action }: AuthenticationPanelProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <div className="login-card">
      <h1 className="auth-brand-title">NEXUSTRACE INTELLIGENCE SYSTEM</h1>

      {selectedRole ? (
        <LoginForm
          key={selectedRole}
          action={action}
          intendedRole={selectedRole}
          onChangeAccessLevel={() => setSelectedRole(null)}
        />
      ) : (
        <RoleSelector onSelect={setSelectedRole} />
      )}
    </div>
  );
}
