import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("provides an accessible credential form without exposing role-specific errors", () => {
    render(
      <LoginForm
        action={vi.fn()}
        intendedRole={UserRole.Investigator}
        onChangeAccessLevel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
    expect(screen.getByDisplayValue(UserRole.Investigator)).toHaveAttribute(
      "name",
      "intendedRole",
    );
    expect(screen.queryByText(/administrator/i)).not.toBeInTheDocument();
  });

  it("does not label the credential form as demo access", () => {
    render(
      <LoginForm
        action={vi.fn()}
        intendedRole={UserRole.Investigator}
        onChangeAccessLevel={vi.fn()}
      />,
    );

    expect(screen.queryByText(/demo access only/i)).not.toBeInTheDocument();
  });

  it("lets the operator reveal and conceal the password", async () => {
    const user = userEvent.setup();
    render(
      <LoginForm
        action={vi.fn()}
        intendedRole={UserRole.DepartmentUser}
        onChangeAccessLevel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveAttribute(
      "type",
      "text",
    );

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveAttribute(
      "type",
      "password",
    );
  });
});
