import { useState, useEffect } from 'react'
import axios from 'axios'
import Chart from 'react-apexcharts'
import { type ApexOptions } from 'apexcharts'

export interface Leitura {
  id: string
  fazenda: string
  setor: string
  temperaturaAr: number
  umidadeAr: number
  umidadeSolo: number
  recebidoEm: string
}

export default function App() {
  const [leituras, setLeituras] = useState<Leitura[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [erroConexao, setErroConexao] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeituras = async () => {
      try {
        const response = await axios.get<{ total: number; dados: Leitura[] }>(
          'http://localhost:3333/api/leituras'
        )

        const listaBruta = response.data?.dados
        const dados = Array.isArray(listaBruta) ? listaBruta : []

        const ordenados = dados.sort((a, b) =>
          new Date(a.recebidoEm).getTime() - new Date(b.recebidoEm).getTime()
        )

        setLeituras(ordenados.slice(-15))
        setErroConexao(null)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErroConexao(err.message)
        } else {
          setErroConexao('Erro desconhecido ao conectar com a API')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLeituras()

    const intervalId = setInterval(fetchLeituras, 5000)

    return () => clearInterval(intervalId)
  }, [])


  const [statusBomba, setStatusBomba] = useState<'LIGADA' | 'DESLIGADA'>('DESLIGADA')
  const [erroComandoBomba, setErroComandoBomba] = useState<string | null>(null)

  const enviarComandoBomba = async (acao: 'LIGAR' | 'DESLIGAR') => {
    try {
      setErroComandoBomba(null)
      await axios.post('http://localhost:3333/api/bomba', { acao })
      setStatusBomba(acao === 'LIGAR' ? 'LIGADA' : 'DESLIGADA')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErroComandoBomba(`Falha ao acionar bomba: ${err.message}`)
      } else {
        setErroComandoBomba('Falha ao acionar bomba: erro desconhecido')
      }
    }
  }

  const ultimaLeitura = leituras.length > 0 ? leituras[leituras.length - 1] : null

  // Lógica de cores para Umidade do Solo:
  // Vermelho se < 30%, esmeralda se <= 70%, azul se maior
  const getSoloColorClass = (valor: number | undefined) => {
    if (valor === undefined) {
      return {
        textColor: 'text-slate-400',
        bgBadge: 'bg-slate-700 text-slate-300',
        borderColor: 'border-slate-700',
        statusText: 'Sem dados',
      }
    }
    if (valor < 30) {
      return {
        textColor: 'text-red-400',
        bgBadge: 'bg-red-500/20 text-red-400 border border-red-500/30',
        borderColor: 'border-red-500/40',
        statusText: 'Crítica (< 30%)',
      }
    }
    if (valor <= 70) {
      return {
        textColor: 'text-emerald-400',
        bgBadge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        borderColor: 'border-emerald-500/40',
        statusText: 'Ideal (30% - 70%)',
      }
    }
    return {
      textColor: 'text-blue-400',
      bgBadge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      borderColor: 'border-blue-500/40',
      statusText: 'Saturada (> 70%)',
    }
  }

  const soloVisual = getSoloColorClass(ultimaLeitura?.umidadeSolo)

  // Configuração do gráfico ApexCharts
  const categoriasHorario = leituras.map((item) =>
    new Date(item.recebidoEm).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  )

  const series = [
    {
      name: 'Umidade do Solo (%)',
      data: leituras.map((item) => Number(item.umidadeSolo.toFixed(1))),
    },
  ]

  const chartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 1000,
        },
      },
      background: 'transparent',
    },
    theme: {
      mode: 'dark',
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    colors: ['#10b981'], // Verde esmeralda para harmonizar com a temática agrícola
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.55,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    xaxis: {
      categories: categoriasHorario,
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
      },
      axisBorder: {
        color: '#334155',
      },
      axisTicks: {
        color: '#334155',
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        formatter: (val) => `${val.toFixed(0)}%`,
      },
      title: {
        text: 'Umidade (%)',
        style: {
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 500,
        },
      },
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `${val}%`,
      },
    },
    dataLabels: {
      enabled: false,
    },
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header do Dashboard */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                AgroTech Telemetria
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Monitoramento contínuo de irrigação e sensores em tempo real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {ultimaLeitura && (
              <div className="text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                <span className="text-slate-400">Fazenda:</span>{' '}
                <strong className="text-white font-medium">{ultimaLeitura.fazenda}</strong> |{' '}
                <span className="text-slate-400">Setor:</span>{' '}
                <strong className="text-white font-medium">{ultimaLeitura.setor}</strong>
              </div>
            )}
            <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Polling a cada 5s
            </div>
          </div>
        </header>

        {/* Alerta de erro de conexão */}
        {erroConexao && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Backend indisponível em <code>http://localhost:3333/api/leituras</code>. Tentando reconectar a cada 5 segundos...
              </span>
            </div>
          </div>
        )}

        {/* 3 Cards de Indicadores de Topo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Umidade do Solo */}
          <div
            className={`bg-slate-800 border ${soloVisual.borderColor} rounded-2xl p-6 shadow-lg shadow-black/20 transition-all hover:border-slate-600`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Umidade do Solo</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${soloVisual.bgBadge}`}>
                {soloVisual.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${soloVisual.textColor}`}>
                {ultimaLeitura ? `${ultimaLeitura.umidadeSolo}%` : '--'}
              </span>
              <span className="text-xs text-slate-400">sensor capacitivo</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <span>Faixas: &lt;30% | 30-70% | &gt;70%</span>
              <span className="capitalize">{ultimaLeitura ? 'Atualizado' : 'Aguardando'}</span>
            </div>
          </div>

          {/* Card 2: Temperatura Ambiente */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-black/20 transition-all hover:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Temperatura Ambiente</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                Sensor de Ar
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-amber-400">
                {ultimaLeitura ? `${ultimaLeitura.temperaturaAr.toFixed(1)}` : '--'}
              </span>
              <span className="text-2xl font-semibold text-slate-400">°C</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <span>Sensor DHT/Termopar</span>
              <span>Precisão: 1 decimal</span>
            </div>
          </div>

          {/* Card 3: Umidade do Ar */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-black/20 transition-all hover:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Umidade do Ar</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">
                Higrômetro
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-cyan-400">
                {ultimaLeitura ? `${ultimaLeitura.umidadeAr}%` : '--'}
              </span>
              <span className="text-xs text-slate-400">umidade relativa</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <span>Condições atmosféricas</span>
              <span>Faixa: 0 a 100%</span>
            </div>
          </div>
        </div>

        {/* Card de Controle: Atuador Remoto da Bomba */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Atuador Remoto: Bomba d'Água
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Controle manual de acionamento do sistema de irrigação via API HTTP
              </p>
            </div>

            {/* Indicador Visual de Status */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  statusBomba === 'LIGADA'
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              ></span>
              <span className="text-slate-300 font-medium">
                Status:{' '}
                <strong
                  className={
                    statusBomba === 'LIGADA' ? 'text-blue-400 font-semibold' : 'text-slate-400 font-semibold'
                  }
                >
                  {statusBomba}
                </strong>
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => enviarComandoBomba('LIGAR')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                statusBomba === 'LIGADA'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/40'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }`}
            >
              💧 Ligar Irrigação
            </button>

            <button
              type="button"
              onClick={() => enviarComandoBomba('DESLIGAR')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                statusBomba === 'DESLIGADA'
                  ? 'bg-slate-700/70 hover:bg-slate-700 text-red-300 border border-red-500/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }`}
            >
              🛑 Desligar
            </button>
          </div>

          {/* Mensagem de erro caso a requisição HTTP falhe */}
          {erroComandoBomba && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{erroComandoBomba}</span>
            </div>
          )}
        </div>

        {/* Gráfico de Área de Umidade do Solo */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Histórico de Variação da Umidade do Solo
              </h2>
              <p className="text-xs text-slate-400">
                Últimos {leituras.length} registros (limite de 15 pontos em tempo real)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Curva Suave (Smooth Area)</span>
            </div>
          </div>

          {loading && leituras.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-sm">Buscando leituras na API...</p>
            </div>
          ) : leituras.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-700 rounded-xl">
              <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Nenhuma leitura encontrada ainda.</p>
              <p className="text-xs text-slate-500">Certifique-se de que o backend Fastify esteja rodando e enviando dados.</p>
            </div>
          ) : (
            <div className="w-full">
              <Chart
                options={chartOptions}
                series={series}
                type="area"
                height={350}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
