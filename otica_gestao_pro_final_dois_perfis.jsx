import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './src/lib/supabase.js'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Home,
  LogOut,
  Plus,
  Printer,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const cidadesPorEstado = {
  SC: ['Garopaba', 'Imbituba', 'Laguna', 'Criciúma', 'Tubarão', 'Florianópolis', 'Joinville'],
  SP: ['São Paulo', 'Campinas', 'Santos', 'Guarulhos', 'Osasco'],
  PR: ['Curitiba', 'Londrina', 'Maringá'],
  RS: ['Porto Alegre', 'Caxias do Sul'],
  RJ: ['Rio de Janeiro', 'Niterói'],
  MG: ['Belo Horizonte', 'Uberlândia'],
}

const cidadesPadrao = ['Capital', 'Interior']
const unidadesSC = ['Garopaba', 'Imbituba', 'Laguna', 'Criciúma', 'Tubarão']
const diagnosticosOptions = ['Miopia', 'Hipermetropia', 'Astigmatismo', 'Presbiopia']
const lentesOptions = ['Multifocal', 'Bifocal', 'VS', 'Fotossensível', 'A.R.', 'Incolor']
const statusOptions = ['Confirmado', 'Agendado', 'Cancelado', 'Atendido']
const perfilAdministrador = 'Administrador'
const perfilOptometrista = 'Optometrista'
const perfilRecepcao = 'Recepcionista'
const perfilOptions = [perfilAdministrador, perfilOptometrista, perfilRecepcao]
const authLoginDomain = 'maisvisao.local'
const optometristasRegistros = {
  'Rodrigo Bastos': {
    nome: 'Rodrigo Bastos',
    cargo: 'Optometrista',
    registro: 'CROO-SC 1524',
  },
  'Brenda Macena': {
    nome: 'Brenda Macena',
    cargo: 'Optometrista',
    registro: 'CROO-SC 1575',
  },
  'Bruno Bastos': {
    nome: 'Bruno Bastos',
    cargo: 'Optometrista',
    registro: 'CROO-1580',
  },
}

const receitaVazia = {
  longe: {
    od: { esf: '', cil: '', eixo: '', dnp: '' },
    oe: { esf: '', cil: '', eixo: '', dnp: '' },
  },
  perto: {
    od: { esf: '', cil: '', eixo: '', dnp: '' },
    oe: { esf: '', cil: '', eixo: '', dnp: '' },
  },
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function isRecepcionista(usuario) {
  return usuario?.perfil === perfilRecepcao
}

function isAdministrador(usuario) {
  return usuario?.perfil === perfilAdministrador
}

function isOptometrista(usuario) {
  return usuario?.perfil === perfilOptometrista
}

function dataParaDia(value) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function mesmoDia(data, base) {
  return data === base
}

function mesmaSemana(data, base) {
  const date = dataParaDia(data)
  const current = dataParaDia(base)
  if (!date || !current) return false
  const inicio = new Date(current)
  inicio.setDate(current.getDate() - current.getDay())
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)
  return date >= inicio && date <= fim
}

function mesmoMes(data, base) {
  const date = dataParaDia(data)
  const current = dataParaDia(base)
  return Boolean(date && current && date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth())
}

function filtraPorVisao(items, visao, base = hojeISO()) {
  if (visao === 'Dia') return items.filter((item) => mesmoDia(item.data, base))
  if (visao === 'Semana') return items.filter((item) => mesmaSemana(item.data, base))
  if (visao === 'Mes') return items.filter((item) => mesmoMes(item.data, base))
  return items
}

function dataBR(value) {
  if (!value) return '-'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function dataPartesBR(value) {
  if (!value) return { dia: '', mes: '', ano: '' }
  const parts = value.split('-')
  if (parts.length !== 3) return { dia: '', mes: '', ano: '' }
  return { dia: parts[2], mes: parts[1], ano: parts[0] }
}

function calcularIdade(nascimento) {
  if (!nascimento) return '-'
  const hoje = new Date()
  const data = new Date(nascimento)
  let idade = hoje.getFullYear() - data.getFullYear()
  const mes = hoje.getMonth() - data.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) idade--
  return idade >= 0 ? `${idade} anos` : '-'
}

function onlyDigits(value, max = 20) {
  return value
    .split('')
    .filter((char) => '0123456789'.includes(char))
    .join('')
    .slice(0, max)
}

function formatCPF(value) {
  const d = onlyDigits(value, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatPhone(value) {
  const d = onlyDigits(value, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function onlyName(value) {
  return value
    .split('')
    .filter((char) => char === ' ' || char.toLowerCase() !== char.toUpperCase())
    .join('')
    .slice(0, 80)
}

function onlyOptical(value) {
  return value
    .split('')
    .filter((char) => '0123456789+-,.ADad '.includes(char))
    .join('')
    .toUpperCase()
    .slice(0, 12)
}

function onlyAxis(value) {
  const clean = onlyDigits(value, 3)
  if (!clean) return ''
  return String(Math.min(Number(clean), 180))
}

function getCidades(estado) {
  return cidadesPorEstado[estado] || cidadesPadrao
}

function dataISO(value) {
  return value ? String(value).slice(0, 10) : ''
}

function horaCurta(value) {
  return value ? String(value).slice(0, 5) : ''
}

function mapPerfil(row) {
  return {
    id: row.id,
    nome: row.nome || '',
    email: row.email || '',
    usuario: row.email ? row.email.split('@')[0] : '',
    perfil: row.perfil || perfilAdministrador,
    registro_profissional: row.registro_profissional || '',
    senha: '',
  }
}

function mapReceita(row) {
  return {
    id: row.id,
    data: dataISO(row.data),
    unidade: row.unidade || '',
    responsavel: row.responsavel_nome || '',
    diagnosticos: row.diagnosticos || [],
    lentes: row.tipos_lente || [],
    obs: row.observacoes || '',
    longe: row.longe || receitaVazia.longe,
    perto: row.perto || receitaVazia.perto,
  }
}

function mapPaciente(row, receitas = []) {
  return {
    id: row.id,
    nome: row.nome || '',
    cpf: row.cpf || '',
    nascimento: dataISO(row.nascimento),
    telefone: row.telefone || '',
    email: row.email || '',
    estado: row.estado || 'SC',
    cidade: row.cidade || 'Criciúma',
    unidade: row.unidade || row.cidade || 'Criciúma',
    observacoes: row.observacoes || '',
    receitas,
  }
}

function mapAgendamento(row) {
  return {
    id: row.id,
    patient_id: row.patient_id || null,
    nome: row.nome || '',
    telefone: row.telefone || '',
    estado: row.estado || 'SC',
    cidade: row.cidade || row.unidade || 'Criciúma',
    unidade: row.unidade || row.cidade || 'Criciúma',
    data: dataISO(row.data),
    hora: horaCurta(row.hora),
    status: row.status || 'Confirmado',
    origem: row.origem || 'Manual',
    obs: row.observacoes || '',
  }
}

function montarPacientes(pacientesRows, receitasRows) {
  const receitasPorPaciente = receitasRows.reduce((acc, row) => {
    const receita = mapReceita(row)
    acc[row.patient_id] = [receita, ...(acc[row.patient_id] || [])]
    return acc
  }, {})

  return pacientesRows.map((paciente) => mapPaciente(paciente, receitasPorPaciente[paciente.id] || []))
}

function getTodasReceitas(pacientes) {
  return pacientes.flatMap((paciente) => (paciente.receitas || []).map((receita) => ({ ...receita, paciente })))
}

function slugArquivo(value) {
  return (value || 'receita')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function usuarioParaEmailAuth(value) {
  return `${value.trim().toLowerCase()}@${authLoginDomain}`
}

function Button({ children, icon: Icon, variant = 'primary', onClick, type = 'button', full = false }) {
  const styles = {
    primary: 'bg-[#0F9AA8] text-white hover:bg-[#0b8995]',
    dark: 'bg-[#0D3B66] text-white hover:bg-[#092c4d]',
    light: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-500 hover:bg-slate-100',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${full ? 'w-full' : ''} inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${styles[variant]}`}
    >
      {Icon ? <Icon size={17} /> : null}
      {children}
    </button>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-500">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', max, min, readOnly = false }) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className={`min-w-0 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-[#0F9AA8] ${readOnly ? 'bg-slate-50 text-slate-500' : 'bg-white'}`}
    />
  )
}

function PageTitle({ title, subtitle, actions }) {
  return (
    <header className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div>
        <h2 className="text-2xl font-semibold text-[#0D3B66] md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  )
}

function Empty({ icon: Icon, title, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F9AA8]/10 text-[#0F9AA8]">
        <Icon size={24} />
      </div>
      <h3 className="mb-5 font-semibold text-[#0D3B66]">{title}</h3>
      {action}
    </div>
  )
}

function Login({ onLogin, initialError = '' }) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(initialError)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    setErro(initialError)
  }, [initialError])

  async function entrar(event) {
    event.preventDefault()
    const usuario = login.trim().toLowerCase()
    if (usuario.length < 3 || usuario.includes('@')) {
      setErro('Informe o usuário no formato nome.sobrenome.')
      return
    }
    if (!senha) {
      setErro('Informe a senha.')
      return
    }
    setEnviando(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: usuarioParaEmailAuth(usuario), password: senha })
    setEnviando(false)
    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }
    setErro('')
    onLogin(data.session)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F5F7FA] p-5">
      <form onSubmit={entrar} className="mx-auto min-w-0 w-[calc(100vw-2.5rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F9AA8] font-semibold text-white">MV</div>
          <div>
            <h1 className="text-xl font-semibold text-[#0D3B66]">Ótica Gestão Pro</h1>
            <p className="text-sm text-slate-500">Sistema interno Mais Visão</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Usuário">
            <TextInput value={login} onChange={(value) => setLogin(value.replace(/\s/g, '').slice(0, 40))} placeholder="Digite seu usuário" />
          </Field>
          <Field label="Senha">
            <TextInput value={senha} onChange={setSenha} type="password" placeholder="Digite sua senha" />
          </Field>
        </div>
        {erro ? <p className="mt-4 text-sm text-red-500">{erro}</p> : null}
        <div className="mt-5">
          <Button type="submit" full icon={CheckCircle2}>{enviando ? 'Entrando...' : 'Entrar'}</Button>
        </div>
      </form>
    </div>
  )
}

function SidebarItem({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-white text-[#0D3B66] shadow-lg shadow-cyan-950/20' : 'text-cyan-50/75 hover:bg-white/10 hover:text-white'}`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? 'bg-[#0F9AA8]/10 text-[#0F9AA8]' : 'bg-white/10 text-cyan-50 group-hover:bg-white/15'}`}>
        <Icon size={18} />
      </span>
      {label}
    </button>
  )
}

function getMenu(usuario) {
  if (isRecepcionista(usuario)) {
    return [
      { page: 'dashboard', icon: Home, label: 'Inicio' },
      { page: 'agenda', icon: CalendarDays, label: 'Agenda' },
      { page: 'novoAgendamento', icon: Plus, label: 'Novo agendamento' },
      { page: 'pacientes', icon: Search, label: 'Pacientes' },
      { page: 'novoPaciente', icon: UserPlus, label: 'Novo paciente' },
    ]
  }

  const menu = [
    { page: 'dashboard', icon: Home, label: 'Inicio' },
    { page: 'pacientes', icon: Search, label: 'Pacientes' },
    { page: 'novoExame', icon: ClipboardList, label: 'Novo exame' },
    { page: 'agenda', icon: CalendarDays, label: 'Agenda' },
    { page: 'relatorios', icon: Activity, label: 'Relatorios' },
    { page: 'backup', icon: Download, label: 'Backup' },
  ]

  if (isAdministrador(usuario)) {
    menu.splice(5, 0, { page: 'perfis', icon: Users, label: 'Perfis' })
  }

  return menu
}

function Sidebar({ page, setPage, usuario, onLogout }) {
  const menu = getMenu(usuario)

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col bg-[#0A314F] p-5 text-white shadow-2xl shadow-slate-900/20 lg:flex">
      <div className="mb-8 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F9AA8] font-semibold text-white shadow-lg shadow-cyan-950/30">MV</div>
          <div>
            <h1 className="font-semibold tracking-wide">Mais Visão</h1>
            <p className="text-xs text-cyan-50/60">Gestão optométrica</p>
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-50/50">Sessão ativa</p>
        <h2 className="mt-1 truncate text-lg font-semibold">{usuario.nome}</h2>
        <p className="mt-1 w-fit rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-50">{usuario.perfil}</p>
      </div>

      <nav className="space-y-2">
        {menu.map((item) => (
          <SidebarItem key={item.page} active={page === item.page} icon={item.icon} label={item.label} onClick={() => setPage(item.page)} />
        ))}
      </nav>

      <div className="mt-auto rounded-3xl bg-white/10 p-4 text-xs text-cyan-50/70 ring-1 ring-white/10">
        <p className="font-medium text-white">Acesso seguro</p>
        <button onClick={onLogout} className="mt-3 inline-flex items-center gap-2 text-cyan-50 transition hover:text-white">
          <LogOut size={15} /> Sair
        </button>
      </div>
    </aside>
  )
}

function MobileNav({ page, setPage, usuario }) {
  const items = getMenu(usuario)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-x-auto border-t border-slate-200 bg-white px-1 py-2 lg:hidden">
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const shortLabel = item.label === 'Novo agendamento' ? 'Agendar' : item.label === 'Novo paciente' ? 'Novo' : item.label
          return (
            <button key={item.page} onClick={() => setPage(item.page)} className={`flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] ${page === item.page ? 'bg-[#0F9AA8]/10 text-[#0F9AA8]' : 'text-slate-500'}`}>
              <Icon size={18} /><span className="max-w-full truncate">{shortLabel}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function Info({ title, value, icon: Icon }) {
  return (
    <div className="group h-full rounded-3xl border border-white/70 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/80">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-[#0D3B66]">{value}</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F9AA8]/10 text-[#0F9AA8] transition group-hover:bg-[#0F9AA8] group-hover:text-white">
          <Icon size={21} />
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-[#0F9AA8]" />
      </div>
    </div>
  )
}

function Action({ title, text, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} className="group rounded-3xl border border-white/70 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-[#0F9AA8]/40 hover:shadow-xl hover:shadow-cyan-900/10">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D3B66] text-white shadow-lg shadow-slate-300/60 transition group-hover:bg-[#0F9AA8]">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-[#0D3B66]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </button>
  )
}

function DashboardShell({ children }) {
  return <div className="space-y-6">{children}</div>
}

function HeroPanel({ usuario, pacientes, agendamentos, receitasTotal }) {
  const agendaAberta = agendamentos.filter((item) => item.status !== 'Cancelado').length
  return (
    <section className="overflow-hidden rounded-[2rem] bg-[#0A314F] p-4 text-white shadow-2xl shadow-slate-300/60 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr] xl:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Painel operacional</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Visão geral da Mais Visão</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/75">Atendimentos, agenda e prescrições reunidos em uma central rápida para tomada de decisão.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-cyan-50">{usuario.nome}</span>
            <span className="rounded-full bg-[#0F9AA8] px-4 py-2 text-sm font-medium text-white">{usuario.perfil}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/10 p-3 ring-1 ring-white/10 sm:p-4"><p className="text-xs text-cyan-50/60">Pacientes</p><b className="mt-2 block text-3xl">{pacientes.length}</b></div>
          <div className="rounded-3xl bg-white/10 p-3 ring-1 ring-white/10 sm:p-4"><p className="text-xs text-cyan-50/60">Receitas</p><b className="mt-2 block text-3xl">{receitasTotal}</b></div>
          <div className="rounded-3xl bg-white/10 p-3 ring-1 ring-white/10 sm:p-4"><p className="text-xs text-cyan-50/60">Agenda</p><b className="mt-2 block text-3xl">{agendaAberta}</b></div>
        </div>
      </div>
    </section>
  )
}

function ModernBarChart({ title, subtitle, data, tall = false }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className={`rounded-[2rem] border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70 ${tall ? 'xl:col-span-2' : ''}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#0D3B66]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="rounded-full bg-[#0F9AA8]/10 px-3 py-1 text-xs font-medium text-[#0F9AA8]">Analytics</span>
      </div>
      <div className="flex h-56 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-44 w-full items-end rounded-2xl bg-slate-50 p-1">
              <div className="w-full rounded-xl bg-gradient-to-t from-[#0D3B66] to-[#0F9AA8]" style={{ height: `${Math.max((item.value / max) * 100, item.value ? 8 : 2)}%` }} />
            </div>
            <span className="max-w-full truncate text-xs text-slate-500">{item.label}</span>
            <b className="text-xs text-[#0D3B66]">{item.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankingChart({ title, data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70">
      <h3 className="font-semibold text-[#0D3B66]">{title}</h3>
      <div className="mt-5 space-y-4">
        {data.map((item, index) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">{index + 1}. {item.label}</span>
              <b className="text-[#0D3B66]">{item.value}</b>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0F9AA8]" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutPanel({ title, value, total, items }) {
  const percent = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70">
      <h3 className="font-semibold text-[#0D3B66]">{title}</h3>
      <div className="mt-5 flex items-center gap-5">
        <div className="grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(#0F9AA8 ${percent * 3.6}deg, #E2E8F0 0deg)` }}>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-inner">
            <b className="text-2xl text-[#0D3B66]">{percent}%</b>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">{item.label}</span>
              <b className="text-[#0D3B66]">{item.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ setPage, pacientes, agendamentos, usuario }) {
  const hoje = hojeISO()
  const agHoje = agendamentos.filter((item) => item.data === hoje)
  const recepcao = isRecepcionista(usuario)

  return (
    <DashboardShell>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Action title="Buscar paciente" text={recepcao ? 'Consultar cadastro.' : 'Consultar histórico e imprimir receita.'} icon={Search} onClick={() => setPage('pacientes')} />
        {recepcao ? (
          <Action title="Novo paciente" text="Cadastrar ficha inicial." icon={UserPlus} onClick={() => setPage('novoPaciente')} />
        ) : (
          <Action title="Novo exame" text="Preencher prescrição." icon={ClipboardList} onClick={() => setPage('novoExame')} />
        )}
        <Action title={recepcao ? 'Novo agendamento' : 'Agenda'} text="Registrar horarios." icon={CalendarDays} onClick={() => setPage(recepcao ? 'novoAgendamento' : 'agenda')} />
      </section>

      <section>
        <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#0D3B66]">Agenda do dia</h3>
          <Button variant="light" onClick={() => setPage('agenda')}>Abrir</Button>
        </div>
        {agHoje.length === 0 ? (
          <Empty icon={CalendarDays} title="Sem agendamentos hoje" action={<Button icon={Plus} onClick={() => setPage('novoAgendamento')}>Novo agendamento</Button>} />
        ) : (
          <AgendaList items={agHoje} />
        )}
        </div>
      </section>
    </DashboardShell>
  )
}

function EstadoCidadeFiltro({ estado, setEstado, cidade, setCidade }) {
  const cidades = getCidades(estado)
  return (
    <div className="grid grid-cols-2 gap-3">
      <select value={estado} onChange={(e) => { setEstado(e.target.value); setCidade('Todas') }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
        {estadosBrasil.map((uf) => <option key={uf}>{uf}</option>)}
      </select>
      <select value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
        <option>Todas</option>
        {cidades.map((cidadeItem) => <option key={cidadeItem}>{cidadeItem}</option>)}
      </select>
    </div>
  )
}

function Pacientes({ pacientes, setPacienteAtual, setPage, canOpenHistorico = true }) {
  const [busca, setBusca] = useState('')
  const [estado, setEstado] = useState('SC')
  const [cidade, setCidade] = useState('Todas')
  const lista = pacientes
    .filter((p) => `${p.nome} ${p.cpf} ${p.telefone} ${p.cidade}`.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => p.estado === estado)
    .filter((p) => cidade === 'Todas' || p.cidade === cidade)

  return (
    <>
      <PageTitle title="Pacientes" subtitle={canOpenHistorico ? 'Busque e abra o prontuário.' : 'Busque cadastros e registre novos pacientes.'} actions={<Button icon={UserPlus} onClick={() => setPage('novoPaciente')}>Novo paciente</Button>} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_320px]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={19} className="text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-transparent text-base outline-none" placeholder="Nome, CPF ou telefone" />
          </div>
          <EstadoCidadeFiltro estado={estado} setEstado={setEstado} cidade={cidade} setCidade={setCidade} />
        </div>

        {lista.length === 0 ? (
          <Empty icon={Search} title="Nenhum paciente encontrado" action={<Button onClick={() => setPage('novoPaciente')}>Cadastrar</Button>} />
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {lista.map((p) => {
              const ultima = p.receitas?.[0]
              return (
                <button key={p.id} disabled={!canOpenHistorico} onClick={() => { if (canOpenHistorico) { setPacienteAtual(p.id); setPage('historico') } }} className={`w-full p-4 text-left transition ${canOpenHistorico ? 'hover:bg-slate-50' : 'cursor-default'}`}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h4 className="font-medium text-[#0D3B66]">{p.nome}</h4>
                      <p className="text-sm text-slate-500">{p.telefone} • {p.cidade}/{p.estado} • {calcularIdade(p.nascimento)}</p>
                      <p className="mt-1 text-xs text-slate-400">Última receita: {ultima ? dataBR(ultima.data) : 'sem histórico'}</p>
                    </div>
                    <span className="w-fit rounded-full bg-[#0F9AA8]/10 px-3 py-1 text-xs font-medium text-[#0F9AA8]">{canOpenHistorico ? 'Abrir' : 'Cadastro'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function NovoPaciente({ onSave, setPage }) {
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', cpf: '', nascimento: '', telefone: '', email: '', estado: 'SC', cidade: 'Criciúma', unidade: 'Criciúma', observacoes: '' })

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }))
  }

  async function salvar() {
    if (form.nome.trim().length < 3) return setErro('Nome precisa ter pelo menos 3 letras.')
    if (onlyDigits(form.cpf).length !== 11) return setErro('CPF precisa ter 11 números.')
    if (onlyDigits(form.telefone).length < 10) return setErro('Telefone precisa ter DDD.')
    if (!form.nascimento) return setErro('Informe a data de nascimento.')
    try {
      await onSave(form)
      setErro('')
      setPage('pacientes')
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar o paciente.')
    }
  }

  return (
    <>
      <PageTitle title="Novo paciente" subtitle="Ficha rápida." />
      <div className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Nome completo"><TextInput value={form.nome} onChange={(v) => update('nome', onlyName(v))} placeholder="Ex: Maria Oliveira" /></Field>
          <Field label="CPF"><TextInput value={form.cpf} onChange={(v) => update('cpf', formatCPF(v))} placeholder="000.000.000-00" /></Field>
          <Field label="Nascimento" hint={form.nascimento ? calcularIdade(form.nascimento) : ''}><TextInput type="date" max={hojeISO()} value={form.nascimento} onChange={(v) => update('nascimento', v)} /></Field>
          <Field label="Telefone"><TextInput value={form.telefone} onChange={(v) => update('telefone', formatPhone(v))} placeholder="(48) 99999-9999" /></Field>
          <Field label="E-mail"><TextInput type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="email@exemplo.com" /></Field>
          <Field label="Estado">
            <select value={form.estado} onChange={(e) => { update('estado', e.target.value); update('cidade', getCidades(e.target.value)[0]) }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
              {estadosBrasil.map((uf) => <option key={uf}>{uf}</option>)}
            </select>
          </Field>
          <Field label="Cidade">
            <select value={form.cidade} onChange={(e) => update('cidade', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
              {getCidades(form.estado).map((cidadeItem) => <option key={cidadeItem}>{cidadeItem}</option>)}
            </select>
          </Field>
          <Field label="Unidade">
            <select value={form.unidade} onChange={(e) => update('unidade', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
              {unidadesSC.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Observações">
          <textarea value={form.observacoes} onChange={(e) => update('observacoes', e.target.value.slice(0, 300))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]" rows={4} />
        </Field>
        {erro ? <p className="mt-4 text-sm text-red-500">{erro}</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
          <Button variant="light" onClick={() => setPage('dashboard')}>Cancelar</Button>
          <Button icon={CheckCircle2} onClick={salvar}>Salvar paciente</Button>
        </div>
      </div>
    </>
  )
}

function ReceitaTable({ dados, onChange, editable = false, titulo }) {
  const quickValues = ['+0,25', '+0,50', '+0,75', '-0,25', '-0,50', '-0,75', 'AD 2,00', 'AD 2,50', 'AD 3,00']

  function change(olho, campo, value) {
    const next = campo === 'eixo' ? onlyAxis(value) : campo === 'dnp' ? onlyDigits(value, 3) : onlyOptical(value)
    onChange?.({ ...dados, [olho]: { ...dados[olho], [campo]: next } })
  }

  function aplicarRapido(valor) {
    onChange?.({ od: { ...dados.od, esf: valor }, oe: { ...dados.oe, esf: valor } })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 bg-[#0D3B66] px-4 py-3 text-sm font-semibold text-white md:flex-row md:items-center md:justify-between">
        <span>{titulo}</span>
        {editable ? (
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {quickValues.map((valor) => <button key={valor} type="button" onClick={() => aplicarRapido(valor)} className="whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/25">{valor}</button>)}
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>{['Olho', 'Esférico', 'Cilíndrico', 'Eixo', 'DNP'].map((h) => <th key={h} className="border-b border-slate-200 px-3 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {['od', 'oe'].map((olho) => (
              <tr key={olho}>
                <td className="border-b border-slate-100 px-3 py-2 font-medium uppercase">O.{olho === 'od' ? 'D' : 'E'}.</td>
                {['esf', 'cil', 'eixo', 'dnp'].map((campo) => (
                  <td key={campo} className="border-b border-slate-100 px-2 py-2">
                    {editable ? (
                      <input value={dados[olho][campo]} onChange={(e) => change(olho, campo, e.target.value)} inputMode={campo === 'eixo' || campo === 'dnp' ? 'numeric' : 'text'} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none focus:border-[#0F9AA8]" />
                    ) : (
                      dados[olho][campo] || '-'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CheckGroup({ title, options, selected, toggle }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-sm text-slate-500">{title}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {options.map((opt) => (
          <label key={opt} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm ${selected.includes(opt) ? 'border-[#0F9AA8] bg-[#0F9AA8]/5 text-[#0D3B66]' : 'border-slate-200'}`}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}

function NovoExame({ paciente, pacientes, usuario, onSave, setPage }) {
  const [pacienteSelecionado, setPacienteSelecionado] = useState(paciente || null)
  const [pacienteNome, setPacienteNome] = useState(paciente?.nome || '')
  const [pacienteAberto, setPacienteAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [data, setData] = useState(hojeISO())
  const [unidade, setUnidade] = useState(paciente?.unidade || 'Criciúma')
  const [receita, setReceita] = useState(receitaVazia)
  const [diag, setDiag] = useState([])
  const [obs, setObs] = useState('')
  const [status, setStatus] = useState('Rascunho salvo')

  function toggle(arr, setArr, item) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item])
  }

  async function salvar(destino = 'historico') {
    if (!pacienteSelecionado) {
      setErro('Selecione um paciente cadastrado antes de salvar o exame.')
      return
    }
    const nova = { data, unidade, responsavel: usuario.nome, diagnosticos: diag, lentes: [], obs, ...receita }
    try {
      await onSave(pacienteSelecionado.id, nova)
      setStatus('Exame salvo')
      setErro('')
      setPage(destino)
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar o exame.')
    }
  }

  const pacientesEncontrados = pacienteNome.trim().length
    ? pacientes
      .filter((item) => `${item.nome} ${item.cpf} ${item.telefone}`.toLowerCase().includes(pacienteNome.toLowerCase()))
      .slice(0, 6)
    : []

  function selecionarPaciente(item) {
    setPacienteSelecionado(item)
    setPacienteNome(item.nome)
    setUnidade(item.unidade || unidade)
    setPacienteAberto(false)
    setErro('')
    setStatus('Rascunho salvo')
  }

  return (
    <>
      <PageTitle title="Novo exame" subtitle="Prescrição no padrão da ficha física." actions={<span className="flex items-center gap-2 text-sm font-medium text-[#0F9AA8]"><CheckCircle2 size={17} /> {status}</span>} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Paciente">
            <div className="relative">
              <input
                value={pacienteNome}
                onFocus={() => setPacienteAberto(true)}
                onChange={(event) => {
                  setPacienteNome(event.target.value)
                  setPacienteSelecionado(null)
                  setPacienteAberto(true)
                  setStatus('Rascunho salvo')
                }}
                placeholder="Busque por nome, CPF ou telefone"
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-[#0F9AA8]"
              />
              {pacienteAberto && pacientesEncontrados.length ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
                  {pacientesEncontrados.map((item) => (
                    <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selecionarPaciente(item)} className="w-full px-4 py-3 text-left transition hover:bg-slate-50">
                      <span className="block font-medium text-[#0D3B66]">{item.nome}</span>
                      <span className="text-xs text-slate-500">{item.cpf || 'sem CPF'} • {item.telefone || 'sem telefone'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Field>
          <Field label="Unidade">
            <select value={unidade} onChange={(e) => { setUnidade(e.target.value); setStatus('Rascunho salvo') }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
              {unidadesSC.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Data"><TextInput type="date" value={data} onChange={setData} /></Field>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReceitaTable titulo="Para longe" dados={receita.longe} editable onChange={(longe) => { setReceita((old) => ({ ...old, longe })); setStatus('Rascunho salvo') }} />
          <ReceitaTable titulo="Para perto" dados={receita.perto} editable onChange={(perto) => { setReceita((old) => ({ ...old, perto })); setStatus('Rascunho salvo') }} />
        </div>
        <CheckGroup title="Diagnósticos" options={diagnosticosOptions} selected={diag} toggle={(x) => toggle(diag, setDiag, x)} />
        <Field label="Observações">
          <textarea value={obs} onChange={(e) => { setObs(e.target.value.slice(0, 400)); setStatus('Rascunho salvo') }} rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]" />
        </Field>
        {erro ? <p className="mt-4 text-sm text-red-500">{erro}</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
          <Button variant="light" onClick={() => salvar('historico')}>Salvar exame</Button>
          <Button variant="dark" icon={Printer} onClick={() => salvar('pdf')}>Salvar e imprimir</Button>
        </div>
      </div>
    </>
  )
}

function InfoMini({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><h4 className="font-medium text-slate-800">{value}</h4></div>
}

function InfoBox({ title, items = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-sm text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => <span key={item} className="rounded-full bg-[#0F9AA8]/10 px-3 py-1 text-sm font-medium text-[#0F9AA8]">{item}</span>) : <span className="text-sm text-slate-400">Nenhum informado</span>}
      </div>
    </div>
  )
}

function ReceitaCompleta({ paciente, receita }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-5 flex justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-xl font-semibold text-[#0D3B66]">Prescrição de óculos</h3>
          <p className="text-sm text-slate-500">{paciente.nome} • {dataBR(receita.data)}</p>
        </div>
        <p className="text-right text-sm text-slate-500">{receita.unidade}<br />{receita.responsavel}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReceitaTable titulo="Para longe" dados={receita.longe} />
        <ReceitaTable titulo="Para perto" dados={receita.perto} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoBox title="Diagnósticos" items={receita.diagnosticos} />
        <InfoBox title="Tipos de lente" items={receita.lentes} />
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-2 text-sm text-slate-500">Observações</p>
          <p className="text-sm">{receita.obs || '-'}</p>
        </div>
      </div>
    </div>
  )
}

function Historico({ paciente, setPage }) {
  if (!paciente) return <Empty icon={Search} title="Nenhum paciente selecionado" action={<Button onClick={() => setPage('pacientes')}>Buscar paciente</Button>} />
  const receita = paciente.receitas[0]

  return (
    <>
      <PageTitle title="Histórico do paciente" subtitle="Receita mais recente no topo." actions={<><Button icon={Plus} onClick={() => setPage('novoExame')}>Novo exame</Button><Button variant="light" icon={Printer} onClick={() => setPage('pdf')}>Imprimir</Button></>} />
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-5 md:p-5">
        <InfoMini label="Paciente" value={paciente.nome} />
        <InfoMini label="Idade" value={calcularIdade(paciente.nascimento)} />
        <InfoMini label="CPF" value={paciente.cpf || '-'} />
        <InfoMini label="Telefone" value={paciente.telefone} />
        <InfoMini label="Receitas" value={paciente.receitas.length} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-[#0D3B66]">Linha do tempo</h3>
          <div className="space-y-3">
            {paciente.receitas.map((item, index) => (
              <div key={item.id} className={`rounded-xl border p-3 ${index === 0 ? 'border-[#0F9AA8] bg-[#0F9AA8]/5' : 'border-slate-200'}`}>
                <p className="text-sm font-medium">{dataBR(item.data)}</p>
                <p className="text-xs text-slate-500">{item.responsavel}</p>
                {index === 0 ? <p className="mt-1 text-xs font-medium text-[#0F9AA8]">Mais recente</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div>{receita ? <ReceitaCompleta paciente={paciente} receita={receita} /> : <Empty icon={FileText} title="Sem receitas" action={<Button onClick={() => setPage('novoExame')}>Novo exame</Button>} />}</div>
      </div>
    </>
  )
}

function AgendaList({ items }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((a) => (
        <div key={a.id} className="flex flex-col justify-between gap-3 p-4 xl:flex-row xl:items-center">
          <div>
            <h4 className="font-medium text-[#0D3B66]">{a.nome}</h4>
            <p className="text-sm text-slate-500">{dataBR(a.data)} às {a.hora} • {a.unidade} • {a.telefone}</p>
            <p className="mt-1 text-xs text-slate-400">{a.obs}</p>
          </div>
          <span className="w-fit rounded-full bg-[#0F9AA8]/10 px-3 py-1 text-xs font-medium text-[#0F9AA8]">{a.status}</span>
        </div>
      ))}
    </div>
  )
}

function Agenda({ agendamentos, setPage }) {
  const [visao, setVisao] = useState('Dia')
  const [status, setStatus] = useState('Todos')
  const [estado, setEstado] = useState('SC')
  const [cidade, setCidade] = useState('Todas')
  const lista = filtraPorVisao(agendamentos, visao)
    .filter((a) => (status === 'Todos' || a.status === status) && (cidade === 'Todas' || a.unidade === cidade))

  return (
    <>
      <PageTitle title="Agenda" subtitle="Agendamentos registrados." actions={<Button icon={Plus} onClick={() => setPage('novoAgendamento')}>Novo agendamento</Button>} />
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4 md:p-5">
        <Field label="Visão"><select value={visao} onChange={(e) => setVisao(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"><option>Dia</option><option>Semana</option><option value="Mes">Mês</option></select></Field>
        <Field label="Estado"><select value={estado} onChange={(e) => { setEstado(e.target.value); setCidade('Todas') }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base">{estadosBrasil.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Cidade"><select value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"><option>Todas</option>{getCidades(estado).map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"><option>Todos</option>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      {lista.length ? <AgendaList items={lista} /> : <Empty icon={CalendarDays} title="Nenhum agendamento" action={<Button onClick={() => setPage('novoAgendamento')}>Novo agendamento</Button>} />}
    </>
  )
}

function NovoAgendamento({ onSave, setPage, agendamentos }) {
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', telefone: '', estado: 'SC', cidade: 'Criciúma', unidade: 'Criciúma', data: hojeISO(), hora: '09:00', status: 'Confirmado', obs: '' })

  function update(k, v) {
    setForm((old) => ({ ...old, [k]: v }))
  }

  async function salvar() {
    if (form.nome.trim().length < 3) return setErro('Informe o nome.')
    if (onlyDigits(form.telefone).length < 10) return setErro('Telefone inválido.')
    const conflito = agendamentos.some((item) => item.data === form.data && item.hora === form.hora && item.unidade === form.unidade && item.status !== 'Cancelado')
    if (conflito) return setErro('Já existe um agendamento nesse horário e unidade.')
    try {
      await onSave(form)
      setErro('')
      setPage('agenda')
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar o agendamento.')
    }
  }

  return (
    <>
      <PageTitle title="Novo agendamento" subtitle="Registro manual do horário confirmado." />
      <div className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Nome"><TextInput value={form.nome} onChange={(v) => update('nome', onlyName(v))} /></Field>
          <Field label="Telefone"><TextInput value={form.telefone} onChange={(v) => update('telefone', formatPhone(v))} placeholder="(48) 99999-9999" /></Field>
          <Field label="Estado"><select value={form.estado} onChange={(e) => { update('estado', e.target.value); update('cidade', getCidades(e.target.value)[0]); update('unidade', getCidades(e.target.value)[0]) }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base">{estadosBrasil.map((uf) => <option key={uf}>{uf}</option>)}</select></Field>
          <Field label="Cidade"><select value={form.cidade} onChange={(e) => { update('cidade', e.target.value); update('unidade', e.target.value) }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base">{getCidades(form.estado).map((u) => <option key={u}>{u}</option>)}</select></Field>
          <Field label="Data"><TextInput type="date" min={hojeISO()} value={form.data} onChange={(v) => update('data', v)} /></Field>
          <Field label="Hora"><TextInput type="time" value={form.hora} onChange={(v) => update('hora', v)} /></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => update('status', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base">{statusOptions.filter((s) => s !== 'Atendido').map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Observações"><textarea value={form.obs} onChange={(e) => update('obs', e.target.value.slice(0, 300))} rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]" /></Field>
        {erro ? <p className="mt-4 text-sm text-red-500">{erro}</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
          <Button variant="light" onClick={() => setPage('agenda')}>Cancelar</Button>
          <Button icon={CheckCircle2} onClick={salvar}>Salvar agendamento</Button>
        </div>
      </div>
    </>
  )
}

function BarChart({ title, data }) {
  return <ModernBarChart title={title} data={data} />
}

function Relatorios({ pacientes, agendamentos }) {
  const [visao, setVisao] = useState('Mês')
  const [estado, setEstado] = useState('SC')
  const [cidade, setCidade] = useState('Todas')
  const receitas = getTodasReceitas(pacientes)
  const totalReceitas = receitas.length
  const pacientesFiltrados = pacientes.filter((p) => p.estado === estado && (cidade === 'Todas' || p.cidade === cidade))
  const receitasPorCidade = getCidades(estado).map((c) => ({ label: c, value: pacientes.filter((p) => p.cidade === c).reduce((s, p) => s + p.receitas.length, 0) }))
  const agendaPorStatus = statusOptions.map((s) => ({ label: s, value: agendamentos.filter((a) => a.status === s).length }))
  const base = hojeISO()
  const periodo = (() => {
    if (visao === 'Dia') {
      return ['08', '10', '12', '14', '16', '18'].map((hora) => ({
        label: `${hora}h`,
        value: agendamentos.filter((item) => item.data === base && item.hora?.startsWith(hora)).length,
      }))
    }
    if (visao === 'Semana') {
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      return dias.map((label, index) => ({
        label,
        value: receitas.filter((item) => {
          const data = dataParaDia(item.data)
          return data && data.getDay() === index && mesmaSemana(item.data, base)
        }).length,
      }))
    }
    if (visao === 'Ano') {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const anoAtual = dataParaDia(base)?.getFullYear()
      return meses.map((label, index) => ({
        label,
        value: receitas.filter((item) => {
          const data = dataParaDia(item.data)
          return data && data.getFullYear() === anoAtual && data.getMonth() === index
        }).length,
      }))
    }
    const mesAtual = dataParaDia(base)?.getMonth()
    const anoAtual = dataParaDia(base)?.getFullYear()
    return ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'].map((label, index) => ({
      label,
      value: receitas.filter((item) => {
        const data = dataParaDia(item.data)
        if (!data || data.getMonth() !== mesAtual || data.getFullYear() !== anoAtual) return false
        return Math.floor((data.getDate() - 1) / 7) === index
      }).length,
    }))
  })()
  const mapaEstados = ['SC', 'SP', 'PR', 'RS'].map((uf) => ({ label: uf, value: pacientes.filter((p) => p.estado === uf).length + agendamentos.filter((a) => a.estado === uf).length }))

  return (
    <DashboardShell>
      <section className="rounded-[2rem] bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F9AA8]">Analytics</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#0D3B66]">Relatórios</h2>
            <p className="mt-1 text-sm text-slate-500">Indicadores de atendimentos, receitas, agenda, cidades e estados.</p>
          </div>
          <Button variant="dark" icon={Download}>Exportar {visao}</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-[2rem] border border-white/70 bg-white p-4 shadow-sm shadow-slate-200/70 md:grid-cols-3">
        <Field label="Mês / visão"><select value={visao} onChange={(e) => setVisao(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]"><option>Dia</option><option>Semana</option><option>Mês</option><option>Ano</option></select></Field>
        <Field label="Estado"><select value={estado} onChange={(e) => { setEstado(e.target.value); setCidade('Todas') }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]">{estadosBrasil.map((uf) => <option key={uf}>{uf}</option>)}</select></Field>
        <Field label="Cidade"><select value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-[#0F9AA8]"><option>Todas</option>{getCidades(estado).map((c) => <option key={c}>{c}</option>)}</select></Field>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Info title="Receitas" value={totalReceitas} icon={FileText} />
        <Info title="Agendamentos" value={agendamentos.length} icon={CalendarDays} />
        <Info title="Pacientes" value={pacientesFiltrados.length} icon={Users} />
        <Info title="Estado" value={estado} icon={Home} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ModernBarChart title={`Atendimentos por ${visao.toLowerCase()}`} subtitle="Leitura consolidada do período selecionado." data={periodo} />
        <DonutPanel title="Agenda confirmada" value={agendamentos.filter((a) => a.status === 'Confirmado').length} total={Math.max(agendamentos.length, 1)} items={agendaPorStatus} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RankingChart title="Receitas por cidade" data={receitasPorCidade} />
        <RankingChart title="Mapa por estado" data={mapaEstados} />
        <RankingChart title="Agenda por status" data={agendaPorStatus} />
      </section>
    </DashboardShell>
  )
}

function Perfis({ usuarios, usuarioAtual, pacientes, onAddUsuario, onRemoveUsuario, onUpdateUsuarioPerfil }) {
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: perfilOptometrista })
  const [confirmacaoAdmin, setConfirmacaoAdmin] = useState(null)

  const atendimentos = pacientes.flatMap((paciente) => (paciente.receitas || []).map((receita) => ({
    paciente: paciente.nome,
    data: receita.data,
    responsavel: receita.responsavel,
  })))

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }))
  }

  async function adicionar() {
    const login = form.email.trim().toLowerCase()
    if (form.nome.trim().length < 3) return setErro('Informe o nome do usuário.')
    if (login.length < 3) return setErro('Informe um usuário com pelo menos 3 caracteres.')
    if (form.senha.trim().length < 6) return setErro('Informe uma senha com pelo menos 6 caracteres.')
    if (usuarios.some((item) => (item.usuario || '').toLowerCase() === login)) return setErro('Esse usuário já existe.')
    try {
      await onAddUsuario({ nome: form.nome.trim(), usuario: login, senha: form.senha.trim(), perfil: form.perfil })
      setForm({ nome: '', email: '', senha: '', perfil: perfilOptometrista })
      setErro('')
    } catch (error) {
      setErro(error.message || 'Não foi possível adicionar o usuário.')
    }
  }

  async function alterarPerfil(userId, novoPerfil) {
    const alvo = usuarios.find((item) => item.id === userId)
    if (!alvo || alvo.perfil === novoPerfil) return
    if (novoPerfil === perfilAdministrador && alvo.perfil !== perfilAdministrador) {
      setConfirmacaoAdmin({ userId, nome: alvo.nome })
      return
    }
    try {
      await onUpdateUsuarioPerfil(userId, novoPerfil)
      setErro('')
    } catch (error) {
      setErro(error.message || 'Não foi possível alterar o nível de acesso.')
    }
  }

  async function confirmarAdministrador() {
    if (!confirmacaoAdmin) return
    try {
      await onUpdateUsuarioPerfil(confirmacaoAdmin.userId, perfilAdministrador)
      setConfirmacaoAdmin(null)
      setErro('')
    } catch (error) {
      setErro(error.message || 'Não foi possível promover o usuário.')
    }
  }

  return (
    <>
      <PageTitle title="Perfis" subtitle="Gestão de usuários e acessos." />
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Nome"><TextInput value={form.nome} onChange={(v) => update('nome', onlyName(v))} placeholder="Nome completo" /></Field>
          <Field label="Usuário"><TextInput value={form.email} onChange={(v) => update('email', v.replace(/\s/g, '').slice(0, 40))} placeholder="ex: usuario.nome" /></Field>
          <Field label="Senha"><TextInput value={form.senha} onChange={(v) => update('senha', v.slice(0, 30))} placeholder="Senha provisória" /></Field>
          <Field label="Nível de acesso">
            <select value={form.perfil} onChange={(e) => update('perfil', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base">
              {perfilOptions.map((perfil) => <option key={perfil}>{perfil}</option>)}
            </select>
          </Field>
        </div>
        {erro ? <p className="mt-4 text-sm text-red-500">{erro}</p> : null}
        <div className="mt-5 flex justify-end"><Button icon={UserPlus} onClick={adicionar}>Adicionar usuário</Button></div>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {usuarios.map((u) => {
          const historico = atendimentos.filter((item) => item.responsavel === u.nome)
          return (
          <div key={u.id} className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h4 className="font-medium">{u.nome}</h4>
              <p className="text-sm text-slate-500">Usuário: {u.usuario || u.email || '-'} • Autenticação: Supabase Auth</p>
              <p className="mt-1 text-xs text-slate-400">Atendimentos feitos: {historico.length}</p>
              {historico.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {historico.slice(0, 4).map((item) => (
                    <span key={`${u.id}-${item.paciente}-${item.data}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                      {item.paciente} • {dataBR(item.data)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={u.perfil} onChange={(e) => alterarPerfil(u.id, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {perfilOptions.map((perfil) => <option key={perfil}>{perfil}</option>)}
              </select>
              {u.id === usuarioAtual.id ? (
                <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-400">Seu usuário</span>
              ) : u.perfil === perfilAdministrador ? (
                <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-400">Administrador protegido</span>
              ) : (
                <Button variant="light" onClick={() => onRemoveUsuario(u.id)}>Remover</Button>
              )}
            </div>
          </div>
        )})}
      </div>
      {confirmacaoAdmin ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0D3B66]">Promover para Administrador?</h3>
            <p className="mt-2 text-sm text-slate-500">
              {confirmacaoAdmin.nome} passará a ter acesso total ao sistema, incluindo adicionar usuários, remover usuários permitidos, visualizar senhas e consultar histórico de atendimentos.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="light" onClick={() => setConfirmacaoAdmin(null)}>Cancelar</Button>
              <Button variant="dark" onClick={confirmarAdministrador}>Confirmar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Backup() {
  return (
    <>
      <PageTitle title="Backup" subtitle="Exportação dos dados." />
      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5"><Button icon={Download}>Exportar backup</Button></div>
    </>
  )
}

function GrauCell({ value }) {
  return <td>{value || ''}</td>
}

function ReceitaPdfTabela({ titulo, dados }) {
  return (
    <table className="pdf-table">
      <thead>
        <tr>
          <th>{titulo}</th>
          <th>Esférico</th>
          <th>Cilíndrico</th>
          <th>Eixo</th>
          <th>DNP</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>OD</th>
          <GrauCell value={dados?.od?.esf} />
          <GrauCell value={dados?.od?.cil} />
          <GrauCell value={dados?.od?.eixo} />
          <GrauCell value={dados?.od?.dnp} />
        </tr>
        <tr>
          <th>OE</th>
          <GrauCell value={dados?.oe?.esf} />
          <GrauCell value={dados?.oe?.cil} />
          <GrauCell value={dados?.oe?.eixo} />
          <GrauCell value={dados?.oe?.dnp} />
        </tr>
      </tbody>
    </table>
  )
}

function CurvaOptica({ label }) {
  const rays = Array.from({ length: 17 }, (_, index) => index)
  const baseY = 68
  return (
    <div className="pdf-curve">
      <svg viewBox="0 0 170 76" aria-hidden="true">
        <path d={`M20 ${baseY} A65 65 0 0 1 150 ${baseY}`} />
        <path d={`M30 ${baseY} A55 55 0 0 1 140 ${baseY}`} />
        <path d={`M40 ${baseY} A45 45 0 0 1 130 ${baseY}`} />
        {rays.map((item) => {
          const angle = 180 - item * 11.25
          const x = 85 + Math.cos((angle * Math.PI) / 180) * 65
          const y = baseY - Math.sin((angle * Math.PI) / 180) * 65
          return <line key={item} x1="85" y1={baseY} x2={x} y2={y} />
        })}
      </svg>
      <span>{label}</span>
    </div>
  )
}

function PdfInfoItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function PdfCheckbox({ label, checked }) {
  return (
    <span className={`pdf-check ${checked ? 'is-checked' : ''}`}>
      <span>{checked ? '✓' : ''}</span>
      <span className="pdf-check-label">{label}</span>
    </span>
  )
}

function CarimboOptometrista({ responsavel }) {
  const registro = optometristasRegistros[responsavel] || {
    nome: responsavel || '',
    cargo: 'Optometrista',
    registro: '',
  }

  return (
    <div className="pdf-stamp">
      <strong>{registro.nome}</strong>
      <span>{registro.cargo}</span>
      {registro.registro ? <b>{registro.registro}</b> : null}
    </div>
  )
}

function ReceitaPdfLayout({ paciente, receita }) {
  const data = dataPartesBR(receita?.data)
  const diagnosticos = receita?.diagnosticos || []

  return (
    <section className="pdf-page">
      <header className="pdf-header">
        <img src="/logo-optica-plus.jpg" alt="Optic+ Clínica de Optometria" />
        <div>
          <h1>Prescrição de Óculos</h1>
          <p>Documento de atendimento optométrico</p>
        </div>
      </header>

      <section className="pdf-patient-card">
        <PdfInfoItem label="Paciente" value={paciente?.nome} />
        <PdfInfoItem label="CPF" value={paciente?.cpf} />
        <PdfInfoItem label="Idade" value={calcularIdade(paciente?.nascimento)} />
        <PdfInfoItem label="Telefone" value={paciente?.telefone} />
        <PdfInfoItem label="Unidade" value={receita?.unidade || paciente?.unidade} />
        <PdfInfoItem label="Responsável" value={receita?.responsavel} />
      </section>

      <div className="pdf-curves">
        <div className="pdf-curve-card"><CurvaOptica label="O.D." /></div>
        <div className="pdf-curve-card"><CurvaOptica label="O.E." /></div>
      </div>

      <div className="pdf-tables">
        <ReceitaPdfTabela titulo="Longe" dados={receita?.longe} />
        <ReceitaPdfTabela titulo="Perto" dados={receita?.perto} />
      </div>

      <section className="pdf-section">
        <h2>Diagnósticos</h2>
        <div className="pdf-diagnosticos">
          <PdfCheckbox label="Miopia" checked={diagnosticos.includes('Miopia')} />
          <PdfCheckbox label="Hipermetropia" checked={diagnosticos.includes('Hipermetropia')} />
          <PdfCheckbox label="Astigmatismo" checked={diagnosticos.includes('Astigmatismo')} />
          <PdfCheckbox label="Presbiopia" checked={diagnosticos.includes('Presbiopia')} />
        </div>
      </section>

      <section className="pdf-obs">
        <span>Observações</span>
        <p>{receita?.obs || ''}</p>
      </section>

      <div className="pdf-footer">
        <div>
          <div className="pdf-signature-line" />
          <p className="pdf-signature-label">Assinatura do responsável</p>
          <div className="pdf-date">
            <span className="pdf-date-label">Data</span>
            <span className="pdf-date-field">{data.dia}</span>
            <span className="pdf-date-separator">/</span>
            <span className="pdf-date-field">{data.mes}</span>
            <span className="pdf-date-separator">/</span>
            <span className="pdf-date-field pdf-date-year">{data.ano}</span>
          </div>
        </div>
        <CarimboOptometrista responsavel={receita?.responsavel} />
      </div>
    </section>
  )
}

function Pdf({ paciente, usuario }) {
  const receita = paciente?.receitas?.[0]
  const printRef = useRef(null)
  const [statusPdf, setStatusPdf] = useState('')

  async function gerarPdf() {
    if (!paciente || !receita || !printRef.current) return
    setStatusPdf('Gerando PDF...')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      let canvas
      document.body.classList.add('pdf-export-mode')
      try {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const pageElement = printRef.current.querySelector('.pdf-page')
        canvas = await html2canvas(pageElement, {
          backgroundColor: '#ffffff',
          scale: 1.35,
          useCORS: true,
          logging: false,
          windowWidth: 794,
          windowHeight: 1123,
        })
      } finally {
        document.body.classList.remove('pdf-export-mode')
      }
      const imgData = canvas.toDataURL('image/jpeg', 0.82)
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 0
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, Math.min(imgHeight, pageHeight - margin * 2), undefined, 'FAST')
      const blob = pdf.output('blob')
      if (blob.size > 25 * 1024 * 1024) {
        throw new Error('O PDF ficou grande demais. Reduza as observações ou tente gerar novamente.')
      }
      const nomeArquivo = `receita-${slugArquivo(paciente.nome)}-${receita.data || hojeISO()}.pdf`
      const storagePath = `${paciente.id}/${receita.id}-${Date.now()}.pdf`

      const upload = await supabase.storage
        .from('prescriptions')
        .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true })
      if (upload.error) throw upload.error

      const arquivo = await supabase.from('prescription_files').insert({
        prescription_id: receita.id,
        patient_id: paciente.id,
        storage_path: storagePath,
        file_name: nomeArquivo,
        mime_type: 'application/pdf',
        size_bytes: blob.size,
        created_by: usuario.id,
      })
      if (arquivo.error) throw arquivo.error

      await supabase.from('audit_logs').insert({
        actor_user_id: usuario.id,
        action: 'geracao_pdf',
        entity_type: 'prescriptions',
        entity_id: receita.id,
        metadata: { storage_path: storagePath, file_name: nomeArquivo },
      })

      const signed = await supabase.storage.from('prescriptions').createSignedUrl(storagePath, 300)
      if (signed.error) throw signed.error
      window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer')
      setStatusPdf('PDF salvo no Supabase.')
    } catch (error) {
      setStatusPdf(error.message || 'Não foi possível gerar o PDF.')
    }
  }

  return (
    <>
      <div className="no-print">
        <PageTitle title="PDF / Impressão" subtitle="Prévia no formato da ficha física." actions={<Button variant="light" icon={Printer} onClick={gerarPdf}>Exportar PDF</Button>} />
        {statusPdf ? <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">{statusPdf}</p> : null}
      </div>
      {receita ? (
        <div ref={printRef} className="print-area">
          <ReceitaPdfLayout paciente={paciente} receita={receita} />
        </div>
      ) : <Empty icon={FileText} title="Nenhuma receita" />}
    </>
  )
}

const paginasRecepcao = ['dashboard', 'agenda', 'novoAgendamento', 'pacientes', 'novoPaciente']
const paginasOptometrista = ['dashboard', 'pacientes', 'novoPaciente', 'novoExame', 'historico', 'agenda', 'novoAgendamento', 'relatorios', 'backup', 'pdf']

export default function OticaGestaoProFinal() {
  const [usuario, setUsuario] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [usuarios, setUsuarios] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [pacienteAtualId, setPacienteAtualId] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [erroGlobal, setErroGlobal] = useState('')
  const pacienteAtual = useMemo(() => pacientes.find((p) => p.id === pacienteAtualId), [pacientes, pacienteAtualId])

  async function carregarDados() {
    setLoadingData(true)
    const [perfisResult, pacientesResult, receitasResult, agendamentosResult] = await Promise.all([
      supabase.from('profiles').select('*').order('nome', { ascending: true }),
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('prescriptions').select('*').order('data', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('data', { ascending: true }).order('hora', { ascending: true }),
    ])
    setLoadingData(false)

    const erro = perfisResult.error || pacientesResult.error || receitasResult.error || agendamentosResult.error
    if (erro) throw erro

    const pacientesMapeados = montarPacientes(pacientesResult.data || [], receitasResult.data || [])
    setUsuarios((perfisResult.data || []).map(mapPerfil))
    setPacientes(pacientesMapeados)
    setAgendamentos((agendamentosResult.data || []).map(mapAgendamento))
    setPacienteAtualId((old) => pacientesMapeados.some((paciente) => paciente.id === old) ? old : pacientesMapeados[0]?.id || null)
  }

  async function carregarSessao(session) {
    if (!session?.user) {
      setUsuario(null)
      setUsuarios([])
      setPacientes([])
      setAgendamentos([])
      setPacienteAtualId(null)
      return
    }

    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error || !perfil) {
      await supabase.auth.signOut()
      setUsuario(null)
      setErroGlobal('Usuário autenticado, mas sem perfil autorizado para acessar o sistema.')
      return
    }

    const perfilMapeado = mapPerfil(perfil)
    setUsuario(perfilMapeado)
    setErroGlobal('')
    try {
      await carregarDados()
    } catch (erro) {
      setErroGlobal(erro.message || 'Não foi possível carregar os dados do Supabase.')
    }
  }

  useEffect(() => {
    let ativo = true

    async function iniciar() {
      const { data } = await supabase.auth.getSession()
      if (ativo) await carregarSessao(data.session)
      if (ativo) setLoadingAuth(false)
    }

    iniciar()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (ativo) carregarSessao(nextSession)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function addPaciente(form) {
    const payload = {
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      nascimento: form.nascimento || null,
      telefone: form.telefone || null,
      email: form.email || null,
      estado: form.estado || 'SC',
      cidade: form.cidade || null,
      unidade: form.unidade || form.cidade || null,
      observacoes: form.observacoes || null,
      created_by: usuario.id,
      updated_by: usuario.id,
    }
    const { data, error } = await supabase.from('patients').insert(payload).select('*').single()
    if (error) throw new Error(error.message.includes('duplicate') ? 'Já existe um paciente com esse CPF.' : error.message)
    const paciente = mapPaciente(data, [])
    setPacientes((old) => [paciente, ...old])
    setPacienteAtualId(paciente.id)
    return paciente
  }

  async function addReceita(patientId, receita) {
    const payload = {
      patient_id: patientId,
      responsavel_id: usuario.id,
      responsavel_nome: receita.responsavel || usuario.nome,
      data: receita.data,
      unidade: receita.unidade,
      longe: receita.longe,
      perto: receita.perto,
      diagnosticos: receita.diagnosticos || [],
      tipos_lente: receita.lentes || [],
      observacoes: receita.obs || null,
      created_by: usuario.id,
      updated_by: usuario.id,
    }
    const { data, error } = await supabase.from('prescriptions').insert(payload).select('*').single()
    if (error) throw error
    const receitaMapeada = mapReceita(data)
    setPacientes((old) => old.map((p) => p.id === patientId ? { ...p, receitas: [receitaMapeada, ...p.receitas] } : p))
    setPacienteAtualId(patientId)
    return receitaMapeada
  }

  async function addAgendamento(form) {
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      estado: form.estado || 'SC',
      cidade: form.cidade || null,
      unidade: form.unidade || form.cidade || null,
      data: form.data,
      hora: form.hora,
      status: form.status,
      origem: 'Manual',
      observacoes: form.obs || null,
      created_by: usuario.id,
      updated_by: usuario.id,
    }
    const { data, error } = await supabase.from('appointments').insert(payload).select('*').single()
    if (error) throw error
    const agendamento = mapAgendamento(data)
    setAgendamentos((old) => [agendamento, ...old])
    return agendamento
  }

  async function addUsuario(novoUsuario) {
    const { data, error } = await supabase.functions.invoke('create-system-user', {
      body: novoUsuario,
    })
    if (error) throw new Error(error.message || 'Não foi possível criar o usuário.')
    if (data?.error) throw new Error(data.error)
    if (!data?.profile) throw new Error('Usuário criado, mas o perfil não foi retornado.')
    const perfilMapeado = mapPerfil(data.profile)
    setUsuarios((old) => [perfilMapeado, ...old])
    return perfilMapeado
  }

  async function removeUsuario() {
    throw new Error('A remoção de usuários é feita no Supabase Auth para manter auditoria e segurança.')
  }

  async function updateUsuarioPerfil(userId, perfil) {
    const { data, error } = await supabase.from('profiles').update({ perfil }).eq('id', userId).select('*').single()
    if (error) throw error
    const perfilMapeado = mapPerfil(data)
    setUsuarios((old) => old.map((item) => item.id === userId ? perfilMapeado : item))
    if (usuario?.id === userId) setUsuario(perfilMapeado)
  }

  async function sair() {
    await supabase.auth.signOut()
    setUsuario(null)
    setErroGlobal('')
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-[#0D3B66]">Carregando sessão...</p>
          <p className="mt-1 text-sm text-slate-500">Conectando ao Supabase.</p>
        </div>
      </div>
    )
  }

  if (!usuario) return <Login onLogin={carregarSessao} initialError={erroGlobal} />

  function abrirPagina(pageName) {
    if (pageName === 'novoExame') {
      setPacienteAtualId(null)
    }
    setPage(pageName)
  }

  const currentPage = isRecepcionista(usuario)
    ? (paginasRecepcao.includes(page) ? page : 'dashboard')
    : isOptometrista(usuario)
      ? (paginasOptometrista.includes(page) ? page : 'dashboard')
      : page

  const pages = {
    dashboard: <Dashboard setPage={abrirPagina} pacientes={pacientes} agendamentos={agendamentos} usuario={usuario} />,
    pacientes: <Pacientes pacientes={pacientes} setPacienteAtual={setPacienteAtualId} setPage={setPage} canOpenHistorico={!isRecepcionista(usuario)} />,
    novoPaciente: <NovoPaciente setPage={setPage} onSave={addPaciente} />,
    novoExame: <NovoExame key={pacienteAtual?.id || 'novo-exame-sem-paciente'} paciente={pacienteAtual} pacientes={pacientes} usuario={usuario} onSave={addReceita} setPage={setPage} />,
    historico: <Historico paciente={pacienteAtual} setPage={setPage} />,
    agenda: <Agenda agendamentos={agendamentos} setPage={setPage} />,
    novoAgendamento: <NovoAgendamento setPage={setPage} agendamentos={agendamentos} onSave={addAgendamento} />,
    relatorios: <Relatorios pacientes={pacientes} agendamentos={agendamentos} />,
    perfis: <Perfis usuarios={usuarios} usuarioAtual={usuario} pacientes={pacientes} onAddUsuario={addUsuario} onRemoveUsuario={removeUsuario} onUpdateUsuarioPerfil={updateUsuarioPerfil} />,
    backup: <Backup />,
    pdf: <Pdf paciente={pacienteAtual} usuario={usuario} />,
  }

  return (
    <div className="flex min-h-screen bg-[#EEF4F7] text-slate-800">
      <Sidebar page={currentPage} setPage={abrirPagina} usuario={usuario} onLogout={sair} />
      <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8">
        {loadingData ? <p className="mb-4 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm text-[#0D3B66]">Sincronizando dados do Supabase...</p> : null}
        {erroGlobal ? <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{erroGlobal}</p> : null}
        {pages[currentPage]}
      </main>
      <MobileNav page={currentPage} setPage={abrirPagina} usuario={usuario} />
    </div>
  )
}
