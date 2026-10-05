import {
  Clock3,
  CheckCheck,
  UserRoundPlus,
  Ban,
  RotateCcw,
} from 'lucide-react'
import type { SheetLead, LeadStatus } from '../leads-config'

export type Channel = 'whatsapp' | 'email'

export interface Template {
  id: number
  name: string
  channel: Channel
  subject: string
  body: string
}

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 1,
    name: '1º Contato - Apresentação Atacado (WhatsApp)',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá, tudo bem? Vi a {{empresa}} em {{cidade}} e achei o trabalho de vocês incrível! Nós somos a Glamour Joias no atacado. Trabalhamos com semijoias finas com alta margem de revenda para o seu segmento de {{nicho}}.\n\nVocê pode conferir nosso catálogo completo aqui: {{catalogo}}\n\nPodemos enviar nossa tabela de atacado para você?',
  },
  {
    id: 2,
    name: '2º Contato / Follow-up (WhatsApp)',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá! Passando apenas para saber se vocês da {{empresa}} conseguiram dar uma olhada no catálogo da Glamour Joias que enviei recentemente.\n\nSe quiser, posso te enviar uma seleção dos produtos mais vendidos para o nicho de {{nicho}} em {{cidade}} com condições especiais para novos parceiros!',
  },
  {
    id: 3,
    name: 'Apresentação Comercial (E-mail)',
    channel: 'email',
    subject: 'Parceria no atacado para {{empresa}} - Glamour Joias',
    body: 'Olá equipe da {{empresa}},\n\nEsperamos que este e-mail os encontre bem!\n\nConhecemos o trabalho de vocês em {{cidade}} e acreditamos que nossas semijoias e joias combinam perfeitamente com o público de {{nicho}} de vocês.\n\nOferecemos condições especiais para lojistas e revendedores, peças antialérgicas, banho de altíssima durabilidade e garantia.\n\nCatálogo online: {{catalogo}}\n\nFicamos à disposição para apresentar nossos produtos e condições!\n\nAtenciosamente,\nGlamour Atacado',
  },
]

export const STATUSES: { value: LeadStatus; label: string; style: string; badge: string }[] = [
  { value: 'novo', label: 'Novo Lead', style: 'bg-blue-50 text-blue-800 border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  { value: 'sem_resposta', label: '1º Contato Feito', style: 'bg-amber-50 text-amber-800 border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  { value: 'segundo_contato', label: '2º Contato (Follow-up)', style: 'bg-purple-50 text-purple-800 border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  { value: 'respondido', label: 'Respondido', style: 'bg-cyan-50 text-cyan-800 border-cyan-200', badge: 'bg-cyan-100 text-cyan-800' },
  { value: 'interessado', label: 'Interessado', style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'cliente', label: 'Cliente Fechado', style: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold', badge: 'bg-emerald-200 text-emerald-900' },
  { value: 'sem_interesse', label: 'Sem Interesse', style: 'bg-gray-100 text-gray-700 border-gray-200', badge: 'bg-gray-200 text-gray-700' },
]

export const SELECT_CLASS = 'h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-tinta cursor-pointer'

export function personalize(text: string, lead: SheetLead) {
  const values: Record<string, string> = {
    empresa: lead.empresa || 'sua empresa',
    cidade: lead.cidade || 'sua região',
    nicho: lead.nicho || 'seu segmento',
    catalogo: 'https://glamourlindoia.com.br/',
  }
  return text.replace(/\{\{\s*(empresa|cidade|nicho|catalogo)\s*\}\}/g, (_, key: string) => values[key] || '')
}

export type KanbanColumnKey = 'novos' | 'sem-resposta' | 'segundo-contato' | 'respondidos' | 'sem-interesse'

export interface ColumnDef {
  key: KanbanColumnKey
  title: string
  subtitle: string
  icon: typeof UserRoundPlus
  targetStatus: LeadStatus
  accentColor: string
  headerBg: string
  dropBorder: string
}

export const COLUMNS: ColumnDef[] = [
  {
    key: 'novos',
    title: 'Novos Leads',
    subtitle: 'Aguardando 1º contato',
    icon: UserRoundPlus,
    targetStatus: 'novo',
    accentColor: 'text-blue-700 border-blue-300 bg-blue-50',
    headerBg: 'bg-blue-50/70 border-blue-200',
    dropBorder: 'border-blue-400 bg-blue-50/40',
  },
  {
    key: 'sem-resposta',
    title: '1º Contato Enviado',
    subtitle: 'Aguardando retorno',
    icon: Clock3,
    targetStatus: 'sem_resposta',
    accentColor: 'text-amber-700 border-amber-300 bg-amber-50',
    headerBg: 'bg-amber-50/70 border-amber-200',
    dropBorder: 'border-amber-400 bg-amber-50/40',
  },
  {
    key: 'segundo-contato',
    title: '2º Contato / Follow-up',
    subtitle: 'Tentativa de repescagem',
    icon: RotateCcw,
    targetStatus: 'segundo_contato',
    accentColor: 'text-purple-700 border-purple-300 bg-purple-50',
    headerBg: 'bg-purple-50/70 border-purple-200',
    dropBorder: 'border-purple-400 bg-purple-50/40',
  },
  {
    key: 'respondidos',
    title: 'Respondidos & Clientes',
    subtitle: 'Em negociação ou ativos',
    icon: CheckCheck,
    targetStatus: 'respondido',
    accentColor: 'text-emerald-700 border-emerald-300 bg-emerald-50',
    headerBg: 'bg-emerald-50/70 border-emerald-200',
    dropBorder: 'border-emerald-400 bg-emerald-50/40',
  },
  {
    key: 'sem-interesse',
    title: 'Sem Interesse',
    subtitle: 'Recusados / Arquivados',
    icon: Ban,
    targetStatus: 'sem_interesse',
    accentColor: 'text-gray-600 border-gray-300 bg-gray-50',
    headerBg: 'bg-gray-100/70 border-gray-200',
    dropBorder: 'border-gray-400 bg-gray-50/40',
  },
]

export function getLeadColumnKey(lead: SheetLead): KanbanColumnKey {
  if (lead.status === 'novo') return 'novos'
  if (lead.status === 'sem_resposta') return 'sem-resposta'
  if (lead.status === 'segundo_contato') return 'segundo-contato'
  if (lead.status === 'sem_interesse') return 'sem-interesse'
  return 'respondidos'
}
