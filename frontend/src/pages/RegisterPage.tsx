import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';
import { Button, Card, Field, Input } from '../components/ui';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(email, password, displayName);
    setIsSubmitting(false);

    if (result.ok) {
      navigate('/today', { replace: true });
    } else {
      setError(result.errorMessage ?? 'Registration failed.');
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
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Create an account</h1>
          <p className="text-sm text-fg-muted">Start tracking your tasks and priorities.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Field label="Name" htmlFor="register-name" hint="Optional.">
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="register-email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="register-password" hint="At least 8 characters.">
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-fg-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
