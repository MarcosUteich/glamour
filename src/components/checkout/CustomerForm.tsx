import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRPhone, isValidBRPhone, normalizeBRPhone } from '@/lib/phone'
import type { SavedCustomer } from '@/lib/storage'

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome')
    .max(80, 'Nome muito longo')
    .refine((v) => v.includes(' ') || v.length >= 3, 'Informe seu nome'),
})

type NameForm = z.infer<typeof nameSchema>

interface CustomerFormProps {
  defaultValues?: SavedCustomer | null
  onSubmit: (values: SavedCustomer) => void
}

export function CustomerForm({ defaultValues, onSubmit }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: defaultValues?.name ?? '' },
  })

  const [phone, setPhone] = useState(formatBRPhone(defaultValues?.phone ?? ''))
  const [phoneError, setPhoneError] = useState<string | null>(null)

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((values) => {
        if (!isValidBRPhone(phone)) {
          setPhoneError('Use DDD + número, como (51) 99999-9999')
          return
        }
        onSubmit({ name: values.name.trim().replace(/\s+/g, ' '), phone: normalizeBRPhone(phone) })
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" placeholder="Seu nome" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-[13px] text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">WhatsApp</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(51) 99999-9999"
          aria-invalid={!!phoneError}
          value={phone}
          onChange={(e) => {
            setPhone(formatBRPhone(e.target.value))
            if (phoneError) setPhoneError(null)
          }}
        />
        {phoneError && <p className="text-[13px] text-destructive">{phoneError}</p>}
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Usamos seus dados só para atender este pedido pelo WhatsApp.{' '}
        <Link to="/privacidade" className="underline underline-offset-2">
          Saiba mais
        </Link>
        .
      </p>

      <Button type="submit" size="lg" className="w-full">
        Revisar pedido
      </Button>
    </form>
  )
}
