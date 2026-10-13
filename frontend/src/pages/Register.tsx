import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../providers/auth";
import { AuthLayout } from "./AuthLayout";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.first_name.trim()) local.first_name = "Enter your first name.";
    if (!form.last_name.trim()) local.last_name = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = "Enter a valid email address.";
    if (form.password.length < 8) local.password = "Use at least 8 characters.";
    setErrors(local);
    if (Object.keys(local).length) return;

    setPending(true);
    try {
      const email = form.email.trim().toLowerCase();
      await api.auth.register({ ...form, email });
      await login(email, form.password);
      toast.success("Welcome to MediaVault");
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setErrors({ form: (err as Error).message });
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Create your vault"
      subtitle="Free, private storage for your photos."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" autoComplete="given-name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} autoFocus />
          <Field label="Last name" autoComplete="family-name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} />
        </div>
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters. Avoid common or all-numeric passwords."
        />
        {errors.form && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
