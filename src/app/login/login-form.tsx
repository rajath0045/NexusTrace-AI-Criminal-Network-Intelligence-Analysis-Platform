"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LoginState } from "./actions";

type LoginAction = (
  previousState: LoginState,
  formData: FormData,
) => Promise<LoginState>;

interface LoginFormProps {
  action: LoginAction;
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

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form className="login-form" action={formAction} noValidate>
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
          <span>Demo access only</span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          required
        />
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
  );
}
