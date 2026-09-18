"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { UserRole } from "@/domain/model";
import { accessLevelForRole } from "./access-levels";
import type { LoginState } from "./actions";

type LoginAction = (
  previousState: LoginState,
  formData: FormData,
) => Promise<LoginState>;

interface LoginFormProps {
  action: LoginAction;
  intendedRole: UserRole;
  onChangeAccessLevel: () => void;
}

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="login-submit" type="submit" disabled={pending}>
      {pending ? "Verifying…" : "Sign in"}
      <span aria-hidden="true">→</span>
    </button>
  );
}

export function LoginForm({
  action,
  intendedRole,
  onChangeAccessLevel,
}: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const accessLevel = accessLevelForRole(intendedRole);

  return (
    <div className="auth-stage">
      <div>
        <p className="login-kicker">Identity verification</p>
        <h2>{accessLevel.heading}</h2>
        <p className="login-role-badge">{accessLevel.badge}</p>
      </div>

      <form className="login-form" action={formAction} noValidate>
        <input type="hidden" name="intendedRole" value={intendedRole} />

        <div className="field-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            required
          />
          {state.fieldErrors?.email ? (
            <p className="field-error" id="email-error">
              {state.fieldErrors.email[0]}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="password">Password</label>
          </div>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              aria-describedby={
                state.fieldErrors?.password ? "password-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.password)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-pressed={passwordVisible}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {state.fieldErrors?.password ? (
            <p className="field-error" id="password-error">
              {state.fieldErrors.password[0]}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <button
        className="login-back"
        type="button"
        aria-label="Change access level"
        onClick={onChangeAccessLevel}
      >
        <span aria-hidden="true">←</span>
        Back to access levels
      </button>
    </div>
  );
}
