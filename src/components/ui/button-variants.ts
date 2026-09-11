import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-malva-700',
        outline: 'border border-malva-600 bg-white/70 text-malva-700 hover:bg-malva-100',
        soft: 'bg-malva-100 text-malva-800 hover:bg-malva-200',
        ghost: 'text-malva-800 hover:bg-malva-100',
        whatsapp: 'bg-whats text-white hover:bg-whats-escuro',
        light: 'bg-white text-malva-700 hover:bg-malva-50',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'rounded-none text-malva-700 underline underline-offset-4 hover:text-malva-800',
      },
      size: {
        default: 'h-11 px-5 text-[15px] [&_svg]:size-[18px]',
        sm: 'h-9 px-3.5 text-[13px] [&_svg]:size-4',
        lg: 'h-13 px-7 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
