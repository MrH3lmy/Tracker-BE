import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import { Button, Card, Field, Input } from '../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.ok) {
      navigate('/today', { replace: true });
    } else {
      setError(result.errorMessage ?? 'Login failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-fg">
      <Card className="w-full max-w-sm">
        <div className="mb-5 flex flex-col gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg"
            aria-hidden="true"
          >
            T
          </span>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Sign in</h1>
          <p className="text-sm text-fg-muted">Welcome back to Tracker.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && (
            <p className="text-sm font-medium text-critical" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-fg-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
