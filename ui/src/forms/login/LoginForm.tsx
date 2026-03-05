import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextInput, PasswordInput, Button, Text } from '@mantine/core'
import { IconUser, IconLock } from '@tabler/icons-react'
import { useLogin } from '@services/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema
//
// Password min is 1 — in dev mode (AUTH_* not set) any credentials work.
// In production, the server enforces the real password, not the client.
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ─────────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<number, string> = {
  401: 'Invalid username or password',
  429: 'Too many attempts — please try again later',
}

const FIELD_CONFIG = {
  username: {
    leftSection: <IconUser size={16} stroke={1.5} />,
    label: 'Username',
    placeholder: 'admin',
    autoComplete: 'username',
  },
  password: {
    leftSection: <IconLock size={16} stroke={1.5} />,
    label: 'Password',
    placeholder: '••••••••',
    autoComplete: 'current-password',
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export function LoginForm() {
  // useLogin mutation navigates to /datasets on success — no manual redirect needed
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  })

  const isLoading = isSubmitting || loginMutation.isPending

  const onSubmit = async (formData: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(formData)
      // Navigation is handled inside useLogin onSuccess
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const message = (status && ERROR_MESSAGES[status]) || 'Login failed — check your credentials'
      setError('root', { message })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <TextInput
        id="username"
        error={errors.username?.message}
        inputWrapperOrder={['label', 'input', 'error']}
        mih={76}
        disabled={isLoading}
        {...FIELD_CONFIG.username}
        {...register('username')}
      />

      <PasswordInput
        id="password"
        error={errors.password?.message}
        inputWrapperOrder={['label', 'input', 'error']}
        mih={76}
        disabled={isLoading}
        {...FIELD_CONFIG.password}
        {...register('password')}
        // explicit name — avoids react-hook-form + PasswordInput ref conflict
        name="password"
      />

      <Button
        type="submit"
        fullWidth
        size="md"
        mt={8}
        color="orange"
        loading={isLoading}
        style={{ fontWeight: 600 }}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>

      {errors.root?.message && (
        <Text
          size="sm"
          ta="center"
          mt={4}
          style={{ color: 'var(--mantine-color-red-5)' }}
        >
          {errors.root.message}
        </Text>
      )}
    </form>
  )
}