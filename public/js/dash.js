// === CONFIGURAÇÃO GLOBAL ===
const maquina = {
    nome: "INFRA-EDGE-01",
    so: "Ubuntu 22.04 LTS",
};

const thresholds = {
    cpu: 80,
    memoria: 80,
    disco: 80,
    rede: 150
};

let estadoApp = {
    tempoRealAtivo: true,
    paginaAtual: 1,
    intervaloPaginacao: 25,
    dadosFiltrados: [],
    dadosCompletos: [],
    usuarioLogado: false,
    ultimosValoresTrend: {
        cpu: [],
        memoria: [],
        disco: [],
        rede: []
    },
    filtros: {
        cpu: true,
        memoria: true,
        disco: true,
        rede: true
    }
};

// === SISTEMA DE LOGIN ===
class SistemaLogin {
    constructor() {
        this.usuarios = {
            'admin': 'admin123',
            'operador': 'op123',
            'monitor': 'mon123'
        };
    }

    validarCredenciais(usuario, senha) {
        return this.usuarios[usuario] === senha;
    }

    realizarLogin(usuario, senha) {
        if (this.validarCredenciais(usuario, senha)) {
            estadoApp.usuarioLogado = true;
            localStorage.setItem('infraflow_user', usuario);
            this.mostrarDashboard();
            return true;
        }
        return false;
    }

    realizarLogout() {
        estadoApp.usuarioLogado = false;
        localStorage.removeItem('infraflow_user');
        this.mostrarLogin();
        pararMockTempoReal();
    }

    verificarSessao() {
        const usuarioSalvo = localStorage.getItem('infraflow_user');
        if (usuarioSalvo && this.usuarios[usuarioSalvo]) {
            estadoApp.usuarioLogado = true;
            this.mostrarDashboard();
            return true;
        }
        return false;
    }

    mostrarLogin() {
        const login = document.getElementById('loginScreen');
        const dash = document.getElementById('dashboard');
        if (login) login.classList.remove('hidden');
        if (dash) dash.classList.add('hidden');
    }

    mostrarDashboard() {
        const login = document.getElementById('loginScreen');
        const dash = document.getElementById('dashboard');
        if (login) login.classList.add('hidden');
        if (dash) dash.classList.remove('hidden');
    }

}

// === FONTE DE DADOS MKADOS ===
function dadosMocados() {
    // 20–30 valores por componente
    const mk = (n, base, amp, min = 0, max = 100) =>
        Array.from({ length: n }, () => {
            const v = base + (Math.random() - 0.5) * amp;
            return Math.max(min, Math.min(max, Math.round(v * 10) / 10));
        });

    // Simula 200 Mbps para rede como teto, depois normalizamos se precisar
    const cpuArr = mk(30, 35, 20, 5, 95);
    const memArr = mk(30, 55, 18, 20, 90);
    const dskArr = mk(30, 60, 10, 40, 90);
    const netArr = mk(30, 90, 60, 5, 200);

    // Para pórticos diferentes
    const porPortico = {
        'INFRA-EDGE-01': { cpu: cpuArr, memoria: memArr, disco: dskArr, rede: netArr },
        'INFRA-EDGE-02': { cpu: mk(30, 45, 22, 5, 95), memoria: mk(30, 50, 15, 20, 90), disco: mk(30, 55, 12, 40, 90), rede: mk(30, 70, 80, 5, 200) },
        'INFRA-EDGE-03': { cpu: mk(30, 30, 18, 5, 95), memoria: mk(30, 48, 16, 20, 90), disco: mk(30, 62, 8, 40, 90), rede: mk(30, 110, 50, 5, 200) },
        'INFRA-EDGE-04': { cpu: mk(30, 55, 20, 5, 95), memoria: mk(30, 60, 20, 20, 90), disco: mk(30, 58, 10, 40, 90), rede: mk(30, 95, 70, 5, 200) },
    };

    // Retorna um gerador que a cada tick entrega um "ponto"
    let idx = 0;
    return {
        proximoPonto(edge = 'INFRA-EDGE-01') {
            const pool = porPortico[edge] || porPortico['INFRA-EDGE-01'];
            idx = (idx + 1) % 30;

            // CPU por núcleo (8) com ruído em torno do valor CPU
            const cpu = pool.cpu[idx];
            const nucleos = Array.from({ length: 8 }, () => {
                const v = cpu + (Math.random() - 0.5) * 12;
                return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
            });

            return {
                ts: new Date().toISOString().slice(0, 19).replace('T', ' '),
                timestamp: new Date(),
                cpu,
                memoria: pool.memoria[idx],
                disco: pool.disco[idx],
                rede: pool.rede[idx],
                nucleos
            };
        }
    };
}

const mockGen = dadosMocados();

// Sempre apresentamos os dados em "tempo real" a cada ~2s
let timerMock = null;
function iniciarMockTempoReal() {
    pararMockTempoReal();
    console.log('Iniciando mock tempo real...');
    timerMock = setInterval(() => {
        const edge = document.getElementById('edgeSelector')?.value || 'INFRA-EDGE-01';
        const ponto = mockGen.proximoPonto(edge);

        // Adicionar aos dados
        dadosTempoReal.push(ponto);
        estadoApp.dadosCompletos.push(ponto);

        // Limitar dados em tempo real
        if (dadosTempoReal.length > 50) {
            dadosTempoReal.shift();
        }

        gerenciadorInterface.atualizarInformacoesSistema();
        gerenciadorInterface.atualizarKPIs();
        gerenciadorInterface.atualizarStatusSistema();

        if (graficos.tempoReal) {
            atualizarGraficoTempoReal();
        }
        if (graficos.cpuNucleos) {
            atualizarGraficoCpuNucleos();
        }
        atualizarTabelaMonitoramento();

    }, 2000);
}

function pararMockTempoReal() {
    if (timerMock) {
        clearInterval(timerMock);
        console.log('Mock tempo real parado');
    }
}

// === FONTE REAL (DB) — DEIXAR COMENTADA AGORA, SCRINT 3 LIBERAMOS ===
/*

let timerDB = null;
async function fetchLeiturasDB(params = { maquinaId: 1, empresaToken: 123456789, limite: 50 }) {
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch(`/api/leituras?${qs}`, { method: 'GET' });
    if (!resp.ok) throw new Error('Falha ao buscar leituras');
    const arr = await resp.json(); // Espera: [{horario, cpu, ram, disco, rede}]
    // Normalizar campos para seu estado atual
    const parsed = arr.map(r => ({
        ts: r.horario,                        // dd/MM/yyyy HH:mm:ss
        timestamp: new Date(),                // ou parse do r.horario se vier ISO
        cpu: Number(r.cpu ?? 0),
        memoria: Number(r.ram ?? 0),
        disco: Number(r.disco ?? 0),
        rede: Number(r.rede ?? 0),
        nucleos: [] // se vierem nucleos, mapear aqui
    }));
    return parsed;
}

function iniciarPollingDB() {
    pararPollingDB();
    timerDB = setInterval(async () => {
        try {
            const dados = await fetchLeiturasDB();
            // TODO: substituir fonte mock pelos dados do DB (atualizar arrays/gráficos/tabela)
            dadosTempoReal = dados.slice(-50);
            estadoApp.dadosCompletos = dados;
            // Atualizar interface
            gerenciadorInterface.atualizarKPIs();
            atualizarGraficoTempoReal();
            atualizarTabelaMonitoramento();
        } catch (e) {
            console.error('Erro ao buscar dados:', e);
        }
    }, 3000);
}
function pararPollingDB() { if (timerDB) clearInterval(timerDB); }
*/

// === GERENCIAMENTO DE INTERFACE ===
class GerenciadorInterface {
    constructor() {
        this.animacaoRefresh = null;
    }

    atualizarInformacoesSistema() {
        const edge = document.getElementById('edgeSelector')?.value || 'INFRA-EDGE-01';
        maquina.nome = edge;
        document.getElementById('lastUpdateTime').textContent =
            new Date().toLocaleTimeString('pt-BR');
    }

    calcularTendencia(valores) {
        if (valores.length < 2) return { direcao: 'neutral', percentual: 0 };

        const valorAtual = valores[valores.length - 1];
        const valorAnterior = valores[valores.length - 2];
        const diferenca = valorAtual - valorAnterior;
        const percentual = Math.abs(diferenca);

        if (percentual < 0.5) return { direcao: 'neutral', percentual: 0 };

        return {
            direcao: diferenca > 0 ? 'up' : 'down',
            percentual: percentual
        };
    }

    atualizarTendencias() {
        const componentes = ['cpu', 'memoria', 'disco', 'rede'];

        componentes.forEach(comp => {
            const valores = estadoApp.ultimosValoresTrend[comp];
            const tendencia = this.calcularTendencia(valores);
            const elemento = document.getElementById(`${comp}Trend`);

            if (elemento) {
                const icone = elemento.querySelector('i');
                const texto = elemento.childNodes[elemento.childNodes.length - 1];

                elemento.className = `kpi-trend ${tendencia.direcao}`;

                switch (tendencia.direcao) {
                    case 'up':
                        icone.className = 'fas fa-arrow-up';
                        texto.textContent = `+${tendencia.percentual.toFixed(1)}%`;
                        break;
                    case 'down':
                        icone.className = 'fas fa-arrow-down';
                        texto.textContent = `-${tendencia.percentual.toFixed(1)}%`;
                        break;
                    default:
                        icone.className = 'fas fa-minus';
                        texto.textContent = '0.0%';
                }
            }
        });
    }

    atualizarKPIs() {
        if (dadosTempoReal.length === 0) return;

        const ultimoDado = dadosTempoReal[dadosTempoReal.length - 1];

        // Atualizar valores
        document.getElementById('kpiCpuValue').textContent = `${ultimoDado.cpu.toFixed(1)}%`;
        document.getElementById('kpiMemoriaValue').textContent = `${ultimoDado.memoria.toFixed(1)}%`;
        document.getElementById('kpiDiscoValue').textContent = `${ultimoDado.disco.toFixed(1)}%`;
        document.getElementById('kpiRedeValue').textContent = `${ultimoDado.rede.toFixed(1)} Mbps`;

        // Atualizar progresso
        document.getElementById('cpuProgress').style.width = `${ultimoDado.cpu}%`;
        document.getElementById('memoriaProgress').style.width = `${ultimoDado.memoria}%`;
        document.getElementById('discoProgress').style.width = `${ultimoDado.disco}%`;
        document.getElementById('redeProgress').style.width = `${(ultimoDado.rede / 200) * 100}%`;

        // Atualizar tendências
        estadoApp.ultimosValoresTrend.cpu.push(ultimoDado.cpu);
        estadoApp.ultimosValoresTrend.memoria.push(ultimoDado.memoria);
        estadoApp.ultimosValoresTrend.disco.push(ultimoDado.disco);
        estadoApp.ultimosValoresTrend.rede.push(ultimoDado.rede);

        // Manter apenas últimos 10 valores para cálculo de tendência
        Object.keys(estadoApp.ultimosValoresTrend).forEach(key => {
            if (estadoApp.ultimosValoresTrend[key].length > 10) {
                estadoApp.ultimosValoresTrend[key].shift();
            }
        });

        // Atualizar status dos cards
        const status = this.calcularStatusSistema();
        ['kpiCpu', 'kpiMemoria', 'kpiDisco', 'kpiRede'].forEach(id => {
            const card = document.getElementById(id);
            card.className = `kpi-card ${status}`;
        });

        this.atualizarTendencias();
        this.atualizarAlertas();
    }

    calcularStatusSistema() {
        if (dadosTempoReal.length === 0) return 'normal';

        const ultimoDado = dadosTempoReal[dadosTempoReal.length - 1];
        const valores = [
            ultimoDado.cpu,
            ultimoDado.memoria,
            ultimoDado.disco,
            (ultimoDado.rede / 200) * 100
        ];

        const maxValor = Math.max(...valores);

        if (maxValor > 90) return 'critical';
        if (maxValor > 80) return 'attention';
        return 'normal';
    }

    atualizarStatusSistema() {
        const status = this.calcularStatusSistema();
        const statusElement = document.getElementById('systemStatus');
        const descriptionElement = document.getElementById('statusDescription');

        statusElement.className = `status-badge ${status}`;

        switch (status) {
            case 'normal':
                statusElement.textContent = 'Normal';
                descriptionElement.textContent = 'Todos os componentes operando dentro dos parâmetros normais';
                break;
            case 'attention':
                statusElement.textContent = 'Atenção';
                descriptionElement.textContent = 'Um ou mais componentes próximos do limite de operação';
                break;
            case 'critical':
                statusElement.textContent = 'Crítico';
                descriptionElement.textContent = 'Sistema operando próximo ou acima dos limites críticos';
                break;
        }

        // Atualizar métricas do sistema
        document.getElementById('systemUptime').textContent = this.calcularUptime();
        document.getElementById('alertCount').textContent = this.contarAlertas();
    }

    calcularUptime() {
        const agora = new Date();
        const inicio = new Date(agora.getTime() - (15 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 32 * 60 * 1000));
        const diff = agora - inicio;

        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${dias}d ${horas}h ${minutos}m`;
    }

    atualizarAlertas() {
        const alertsGrid = document.getElementById('alertsGrid');
        if (!alertsGrid) return;

        alertsGrid.innerHTML = '';

        if (dadosTempoReal.length === 0) {
            alertsGrid.innerHTML = '<p class="no-alerts">Nenhum alerta no momento</p>';
            return;
        }

        const ultimoDado = dadosTempoReal[dadosTempoReal.length - 1];
        const alertas = [];

        // Verificar alertas
        if (ultimoDado.cpu > 85) {
            alertas.push({
                tipo: 'critical',
                icone: 'fas fa-exclamation-triangle',
                titulo: 'CPU Crítica',
                descricao: `CPU em ${ultimoDado.cpu.toFixed(1)}% - Acima do limite crítico`
            });
        } else if (ultimoDado.cpu > 75) {
            alertas.push({
                tipo: 'warning',
                icone: 'fas fa-exclamation-circle',
                titulo: 'CPU Elevada',
                descricao: `CPU em ${ultimoDado.cpu.toFixed(1)}% - Próxima do limite`
            });
        }

        if (ultimoDado.memoria > 85) {
            alertas.push({
                tipo: 'critical',
                icone: 'fas fa-exclamation-triangle',
                titulo: 'Memória Crítica',
                descricao: `Memória em ${ultimoDado.memoria.toFixed(1)}% - Acima do limite crítico`
            });
        }

        if (ultimoDado.rede > 180) {
            alertas.push({
                tipo: 'warning',
                icone: 'fas fa-network-wired',
                titulo: 'Rede Saturada',
                descricao: `Tráfego de rede em ${ultimoDado.rede.toFixed(1)} Mbps - Próximo da saturação`
            });
        }

        if (alertas.length === 0) {
            alertsGrid.innerHTML = '<div class="no-alerts"><i class="fas fa-check-circle"></i> Nenhum alerta ativo</div>';
        } else {
            alertas.forEach(alerta => {
                const alertCard = document.createElement('div');
                alertCard.className = `alert-card ${alerta.tipo}`;
                alertCard.innerHTML = `
                    <div class="alert-icon">
                        <i class="${alerta.icone}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">${alerta.titulo}</div>
                        <div class="alert-description">${alerta.descricao}</div>
                    </div>
                `;
                alertsGrid.appendChild(alertCard);
            });
        }
    }

    contarAlertas() {
        if (dadosTempoReal.length === 0) return 0;

        const ultimoDado = dadosTempoReal[dadosTempoReal.length - 1];
        let count = 0;

        if (ultimoDado.cpu > 75) count++;
        if (ultimoDado.memoria > 75) count++;
        if (ultimoDado.disco > 75) count++;
        if (ultimoDado.rede > 150) count++;

        return count;
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;
        notification.textContent = mensagem;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;

        switch (tipo) {
            case 'success':
                notification.style.background = 'var(--success-color)';
                break;
            case 'error':
                notification.style.background = 'var(--error-color)';
                break;
            default:
                notification.style.background = 'var(--info-color)';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// === GRÁFICOS ===
let dadosTempoReal = [];
let dadosHistoricos = [];
let graficos = {};
const gerenciadorInterface = new GerenciadorInterface();
const sistemaLogin = new SistemaLogin();

function inicializarDados() {
    console.log('Inicializando dados...');
    const agora = new Date();
    for (let i = 100; i >= 0; i--) {
        const timestamp = new Date(agora.getTime() - (i * 60 * 1000));
        const ponto = mockGen.proximoPonto('INFRA-EDGE-01');
        ponto.timestamp = timestamp;
        ponto.ts = timestamp.toISOString().slice(0, 19).replace('T', ' ');
        dadosHistoricos.push(ponto);
    }
    estadoApp.dadosCompletos = [...dadosHistoricos];

    for (let i = 0; i < 10; i++) {
        const ponto = mockGen.proximoPonto('INFRA-EDGE-01');
        dadosTempoReal.push(ponto);
    }

    console.log('Dados inicializados:', dadosTempoReal.length, 'pontos em tempo real');
}
function inicializarGraficos() {
    console.log('Inicializando gráficos...');
    const ctx1 = document.getElementById('realTimeChart')?.getContext('2d');
    const ctx2 = document.getElementById('historicalChart')?.getContext('2d');
    if (!ctx1 || !ctx2) {
        console.log('Contextos de canvas não encontrados');
        return;
    }
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        family: 'Inter',
                        size: 12
                    },
                    color: '#0f172a'
                },
                onClick: (evt, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                font: {
                    family: 'Inter'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: 'Inter',
                        size: 11
                    },
                    color: '#64748b'
                }
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: 'Inter',
                        size: 11
                    },
                    color: '#64748b'
                }
            }
        },
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };
    graficos.tempoReal = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    fill: true,
                    hidden: !estadoApp.filtros.cpu
                },
                {
                    label: 'Memória (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    fill: true,
                    hidden: !estadoApp.filtros.memoria
                },
                {
                    label: 'Disco (%)',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    fill: true,
                    hidden: !estadoApp.filtros.disco
                },
                {
                    label: 'Rede (%)',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    fill: true,
                    hidden: !estadoApp.filtros.rede
                }
            ]
        },
        options: commonOptions
    });
    graficos.historico = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU Média (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    hidden: !estadoApp.filtros.cpu
                },
                {
                    label: 'Memória Média (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    hidden: !estadoApp.filtros.memoria
                },
                {
                    label: 'Disco Médio (%)',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    hidden: !estadoApp.filtros.disco
                },
                {
                    label: 'Rede Média (%)',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    hidden: !estadoApp.filtros.rede
                }
            ]
        },
        options: commonOptions
    });
}



function atualizarGraficoTempoReal() {
    if (!graficos.tempoReal || dadosTempoReal.length === 0) return;

    const maxPontos = 50;
    const dadosLimitados = dadosTempoReal.slice(-maxPontos);

    graficos.tempoReal.data.labels = dadosLimitados.map(d =>
        new Date(d.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );

    graficos.tempoReal.data.datasets[0].data = dadosLimitados.map(d => d.cpu);
    graficos.tempoReal.data.datasets[1].data = dadosLimitados.map(d => d.memoria);
    graficos.tempoReal.data.datasets[2].data = dadosLimitados.map(d => d.disco);
    graficos.tempoReal.data.datasets[3].data = dadosLimitados.map(d => (d.rede / 200) * 100); 

    // Aplicar filtros
    graficos.tempoReal.data.datasets[0].hidden = !estadoApp.filtros.cpu;
    graficos.tempoReal.data.datasets[1].hidden = !estadoApp.filtros.memoria;
    graficos.tempoReal.data.datasets[2].hidden = !estadoApp.filtros.disco;
    graficos.tempoReal.data.datasets[3].hidden = !estadoApp.filtros.rede;

    graficos.tempoReal.update('none');
}

function atualizarGraficoHistorico() {
    if (!graficos.historico) return;

    const dados = estadoApp.dadosCompletos.slice(-100);
    if (dados.length === 0) return;

    const intervalo = Math.max(1, Math.floor(dados.length / 24));
    const dadosAgregados = [];

    for (let i = 0; i < dados.length; i += intervalo) {
        const grupo = dados.slice(i, i + intervalo);
        if (grupo.length === 0) continue;

        const media = {
            timestamp: grupo[Math.floor(grupo.length / 2)].timestamp,
            cpu: grupo.reduce((acc, d) => acc + d.cpu, 0) / grupo.length,
            memoria: grupo.reduce((acc, d) => acc + d.memoria, 0) / grupo.length,
            disco: grupo.reduce((acc, d) => acc + d.disco, 0) / grupo.length,
            rede: grupo.reduce((acc, d) => acc + d.rede, 0) / grupo.length
        };
        dadosAgregados.push(media);
    }

    graficos.historico.data.labels = dadosAgregados.map(d =>
        new Date(d.timestamp).toLocaleString('pt-BR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    );

    graficos.historico.data.datasets[0].data = dadosAgregados.map(d => d.cpu);
    graficos.historico.data.datasets[1].data = dadosAgregados.map(d => d.memoria);
    graficos.historico.data.datasets[2].data = dadosAgregados.map(d => d.disco);
    graficos.historico.data.datasets[3].data = dadosAgregados.map(d => (d.rede / 200) * 100);

    graficos.historico.data.datasets[0].hidden = !estadoApp.filtros.cpu;
    graficos.historico.data.datasets[1].hidden = !estadoApp.filtros.memoria;
    graficos.historico.data.datasets[2].hidden = !estadoApp.filtros.disco;
    graficos.historico.data.datasets[3].hidden = !estadoApp.filtros.rede;

    graficos.historico.update();
}

// function atualizarGraficoCpuNucleos() {
//     if (!graficos.cpuNucleos) return;

//     const checkbox = document.getElementById('showCpuCores');
//     if (!checkbox || !checkbox.checked) {
//         graficos.cpuNucleos.data.datasets = [];
//         graficos.cpuNucleos.update();
//         return;
//     }

//     const maxPontos = 30;
//     const dadosLimitados = dadosTempoReal.slice(-maxPontos);

//     if (dadosLimitados.length === 0) return;

//     graficos.cpuNucleos.data.labels = dadosLimitados.map(d =>
//         new Date(d.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
//     );

//     const cores = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'];
//     graficos.cpuNucleos.data.datasets = [];

//     for (let i = 0; i < 8; i++) {
//         graficos.cpuNucleos.data.datasets.push({
//             label: `Núcleo ${i + 1}`,
//             data: dadosLimitados.map(d => d.nucleos[i] || 0),
//             borderColor: cores[i],
//             backgroundColor: cores[i] + '20',
//             tension: 0.4,
//             pointRadius: 2,
//             borderWidth: 2
//         });
//     }

//     graficos.cpuNucleos.options.plugins.legend.display = true;
//     graficos.cpuNucleos.update();
// }

// === TABELAS ===
function atualizarTabelaMonitoramento() {
    const tbody = document.getElementById('monitorTableBody');
    if (!tbody) return;

    const dados = dadosTempoReal.slice().reverse().slice(0, estadoApp.intervaloPaginacao);
    tbody.innerHTML = '';

    dados.forEach(dado => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(dado.timestamp).toLocaleString('pt-BR')}</td>
            <td>${dado.cpu.toFixed(1)}%</td>
            <td>${dado.memoria.toFixed(1)}%</td>
            <td>${dado.disco.toFixed(1)}%</td>
            <td>${dado.rede.toFixed(1)} Mbps</td>
        `;
        tbody.appendChild(tr);
    });

    const totalItens = dadosTempoReal.length;
    document.getElementById('monitorPaginationInfo').textContent =
        `Mostrando ${Math.min(estadoApp.intervaloPaginacao, totalItens)} de ${totalItens} registros`;
}

function atualizarTabelaHistorico() {
    const tbody = document.getElementById('historicoTableBody');
    if (!tbody) return;

    const dadosAgregados = [];
    const agora = new Date();

    for (let i = 10; i >= 0; i--) {
        const inicio = new Date(agora.getTime() - (i + 1) * 60 * 60 * 1000);
        const fim = new Date(agora.getTime() - i * 60 * 60 * 1000);

        const ponto = mockGen.proximoPonto(document.getElementById('edgeSelector')?.value || 'INFRA-EDGE-01');

        dadosAgregados.push({
            periodo: `${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            cpu: ponto.cpu,
            memoria: ponto.memoria,
            disco: ponto.disco,
            rede: ponto.rede
        });
    }

    tbody.innerHTML = '';
    dadosAgregados.forEach(dado => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dado.periodo}</td>
            <td>${dado.cpu.toFixed(1)}%</td>
            <td>${dado.memoria.toFixed(1)}%</td>
            <td>${dado.disco.toFixed(1)}%</td>
            <td>${dado.rede.toFixed(1)} Mbps</td>
        `;
        tbody.appendChild(tr);
    });
}

// === EXPORTAÇÃO CSV ===
function exportarCSV(dados, nomeArquivo) {
    if (dados.length === 0) {
        gerenciadorInterface.mostrarNotificacao('Nenhum dado para exportar', 'error');
        return;
    }

    const cabecalho = ['Data/Hora', 'CPU (%)', 'Memória (%)', 'Disco (%)', 'Rede (Mbps)'];
    let csvContent = cabecalho.join(',') + '\n';

    dados.forEach(dado => {
        const linha = [
            `"${new Date(dado.timestamp).toLocaleString('pt-BR')}"`,
            dado.cpu.toFixed(1),
            dado.memoria.toFixed(1),
            dado.disco.toFixed(1),
            dado.rede.toFixed(1)
        ].join(',');
        csvContent += linha + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    gerenciadorInterface.mostrarNotificacao('Dados exportados com sucesso!', 'success');
}

// === NAVEGAÇÃO E FILTROS ===
function configurarNavegacao() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Clicou no menu:', btn.getAttribute('data-view'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.getAttribute('data-view');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`view-${view}`);
            if (targetView) {
                targetView.classList.add('active');
            }

            if (view === 'monitor' || view === 'overview') {
                iniciarMockTempoReal();
            } else {
                pararMockTempoReal();
            }

            if (view === 'historico') {
                atualizarTabelaHistorico();
                atualizarGraficoHistorico();
            }
        });
    });

    // // Filtros laterais
    // document.querySelectorAll('.flt-comp').forEach(cb => {
    //     cb.addEventListener('change', () => {
    //         estadoApp.filtros[cb.value] = cb.checked;
    //         atualizarGraficoTempoReal();
    //         atualizarGraficoHistorico();
    //     });
    // });

    // Troca de pórtico
    const edgeSelector = document.getElementById('edgeSelector');
    if (edgeSelector) {
        edgeSelector.addEventListener('change', () => {
            dadosTempoReal = [];
            gerenciadorInterface.atualizarInformacoesSistema();
            console.log('Trocou para:', edgeSelector.value);
        });
    }
}

function configurarCadastro() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });

    // Formulario do cadastro
    ['empresa', 'usuario', 'maquina', 'componente'].forEach(tipo => {
        const form = document.getElementById(`${tipo}Form`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                gerenciadorInterface.mostrarNotificacao(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} salvo com sucesso!`, 'success');
                form.reset();
            });
        }
    });
}

function configurarHistorico() {
    const periodoSelect = document.getElementById('historicoPeriodo');
    const customInputs = document.getElementById('customPeriodInputs');

    if (periodoSelect) {
        periodoSelect.addEventListener('change', (e) => {
            customInputs.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    }

    const aplicarBtn = document.getElementById('aplicarFiltroHistorico');
    if (aplicarBtn) {
        aplicarBtn.addEventListener('click', () => {
            atualizarGraficoHistorico();
            atualizarTabelaHistorico();
            gerenciadorInterface.mostrarNotificacao('Filtros aplicados!', 'info');
        });
    }
}

// === EVENT LISTENERS ===
function configurarEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usuario = document.getElementById('username')?.value;
            const senha = document.getElementById('password')?.value;

            if (sistemaLogin.realizarLogin(usuario, senha)) {
                gerenciadorInterface.mostrarNotificacao('Login realizado com sucesso!', 'success');
                setTimeout(() => {
                    inicializarDados();
                    inicializarGraficos();
                    configurarNavegacao();
                    configurarCadastro();
                    configurarHistorico();
                    iniciarMockTempoReal();
                }, 500);
            } else {
                gerenciadorInterface.mostrarNotificacao('Usuário ou senha inválidos', 'error');
            }
        });
    }

    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = togglePasswordBtn.querySelector('i');
            if (!passwordInput || !icon) return;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sistemaLogin.realizarLogout();
            gerenciadorInterface.mostrarNotificacao('Logout realizado com sucesso!', 'info');
            if (!document.getElementById('loginScreen')) {
                window.location.replace('../login.html');
            }
        });
    }

    // const showCpuCores = document.getElementById('showCpuCores');
    // if (showCpuCores) {
    //     showCpuCores.addEventListener('change', atualizarGraficoCpuNucleos);
    // }

    const exportMonitorBtn = document.getElementById('exportMonitorCsv');
    if (exportMonitorBtn) {
        exportMonitorBtn.addEventListener('click', () => {
            exportarCSV(dadosTempoReal, `infraflow_monitoramento_${new Date().toISOString().slice(0, 10)}.csv`);
        });
    }

    const exportHistoricoBtn = document.getElementById('exportHistoricoCsv');
    if (exportHistoricoBtn) {
        exportHistoricoBtn.addEventListener('click', () => {
            exportarCSV(estadoApp.dadosCompletos, `infraflow_historico_${new Date().toISOString().slice(0, 10)}.csv`);
        });
    }
}

function hidratarUsuarioSidebar() {
    const el = document.getElementById('sidebarUser');
    if (!el) return;

    const nome = sessionStorage.NOME_USUARIO
        || localStorage.getItem('infraflow_user')
        || 'Usuário';
    const funcao = sessionStorage.USER_ROLE || 'Admin';

    el.textContent = `${nome} (${funcao})`;
}



document.addEventListener('DOMContentLoaded', function () {
    console.log('Inicializando InfraFlow Dashboard...');

    const hasEmbeddedLogin = !!document.getElementById('loginForm');

    if (hasEmbeddedLogin) {
        if (!sistemaLogin.verificarSessao()) {
            sistemaLogin.mostrarLogin();
        } else {
            setTimeout(() => {
                inicializarDados();
                inicializarGraficos();
                configurarNavegacao();
                configurarCadastro();
                configurarHistorico();
                iniciarMockTempoReal();
                hidratarUsuarioSidebar();
            }, 100);
        }
    } else {
        setTimeout(() => {
            inicializarDados();
            inicializarGraficos();
            configurarNavegacao();
            configurarCadastro();
            configurarHistorico();
            iniciarMockTempoReal();
            hidratarUsuarioSidebar();
        }, 100);
    }

    configurarEventListeners();
    console.log('Dashboard inicializado com sucesso!');
});


// === LIMPEZA ===
window.addEventListener('beforeunload', function () {
    pararMockTempoReal();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .no-alerts {
        grid-column: 1 / -1;
        text-align: center;
        padding: 2rem;
        color: var(--gray-500);
        font-style: italic;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    
    .no-alerts i {
        color: var(--success-color);
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);

function criarBotaoSuporte() {
    const linkBotao = document.createElement('a');

    linkBotao.innerHTML = `
    <img src="../assets/icon/iconeJira.png" alt="Ícone de Suporte" width="24" height="24" />
    Suporte
  `;
    linkBotao.title = "Acessar o Help Desk do Jira";
    linkBotao.href = "https://infraflow-sptech.atlassian.net/servicedesk/customer/portal/2";
    linkBotao.target = "_blank";

    linkBotao.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 9999;
    margin: 0;
    padding: 12px 24px; 
    border-radius: 50px; 
    border: none; 
    text-decoration: none; 
    background-color: #0052CC;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    font-weight: 600;
    font-size: 16px; 
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px; 
    transition: background-color 0.3s, box-shadow 0.3s, transform 0.2s; 
  `;

    linkBotao.onmouseover = () => {
        linkBotao.style.backgroundColor = '#0065FF';
        linkBotao.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
    };

    linkBotao.onmouseout = () => {
        linkBotao.style.backgroundColor = '#0052CC';
        linkBotao.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        linkBotao.style.transform = 'scale(1)';
    };

    // Efeito de "clique"
    linkBotao.onmousedown = () => {
        linkBotao.style.transform = 'scale(0.98)';
    };

    linkBotao.onmouseup = () => {
        linkBotao.style.transform = 'scale(1)';
    };

    document.body.appendChild(linkBotao);
}

criarBotaoSuporte();

var selectMonitor = document.getElementById("edgeSelector");
var monitorSpan = document.getElementById("monitor-selecionado");

function atualizarTitulo() {
    if (selectMonitor.value === "") {
        monitorSpan.textContent = "";
    } else {
        monitorSpan.textContent = " - " + selectMonitor.value;
    }
}

selectMonitor.addEventListener("change", atualizarTitulo);

selectMonitor.selectedIndex = 0;
atualizarTitulo();

// aqui pra alerta


/* ============================================================
   TOPBAR FULL-WIDTH + FEED LATERAL FIXO (append-only)
   ============================================================ */
(function () {
    // ======= CONFIG =======
    const SIDEBAR_WIDTH = 360;                 // px
    const FEED_MAX = 400;                      // limite de itens
    const ENDPOINT_ACAO = '/api/incidentes/acao';

    // ======= CSS base (topbar + feed) =======
    const style = document.createElement('style');
    style.textContent = `
    /* Topbar ocupa a largura inteira do viewport */
    .topbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 64px;                     /* será recalculado se a sua topbar for maior */
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      z-index: 10000;                   /* acima de tudo */
      display: flex; align-items: center;
    }
    /* empurra o conteúdo para baixo da topbar */
    body.has-fixed-topbar { padding-top: 64px; }

    /* painel lateral fixo */
    #alertsSidebar {
      position: fixed;
      right: 0;
      width: ${SIDEBAR_WIDTH}px;
      height: calc(100vh - 64px);       /* top será recalculado via JS */
      z-index: 9990;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      box-shadow: -8px 0 24px rgba(2,6,23,.06);
      display: flex; flex-direction: column;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    #alertsSidebarHeader{
      padding: 12px 14px;
      border-bottom: 1px solid #e5e7eb;
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      background:#fff;
    }
    #alertsSidebarHeader .title { font-size: 14px; font-weight: 700; color: #0f172a; }
    #alertsSidebarHeader .subtitle { font-size: 12px; color:#64748b; font-weight: 500; }
    #alertsSidebarList{
      overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .a-card{
      border-radius: 10px; border: 1px solid #eef2f7;
      padding: 10px 12px; background: #fff;
      box-shadow: 0 1px 2px rgba(2,6,23,.04);
    }
    .a-head{display:flex; align-items:center; justify-content:space-between; gap:8px;}
    .a-time{font-size:12px; color:#64748b}
    .a-source{font-weight: 700; color:#0f172a; margin-top:4px;}
    .a-msg{color:#334155; margin-top:2px;}
    .a-action{margin-top:8px;}
    .a-action > button{
      padding: .38rem .6rem; border: 0; border-radius: 8px;
      background: #2563eb; color:#fff; font-weight: 700; font-size: 12px; cursor: pointer;
    }
    .a-done{ font-size:12px; color:#0369a1; margin-top:6px; }
    .a-card.CRITICAL{ border-left: 4px solid #e11d48; }
    .a-card.HIGH    { border-left: 4px solid #f59e0b; }
    .a-card.MEDIUM  { border-left: 4px solid #facc15; }
    .a-card.INFO    { border-left: 4px solid #3b82f6; }

    /* empurra o conteúdo central para não ficar por baixo do painel (somente desktop) */
    @media (min-width: 1100px){
      body.with-alerts-sidebar { margin-right: ${SIDEBAR_WIDTH}px; }
    }
    @media (max-width: 1099px){
      #alertsSidebar{ display:none; }
      body.with-alerts-sidebar { margin-right: 0; }
    }
  `;
    document.head.appendChild(style);

    // ======= cria sidebar =======
    const sidebar = document.createElement('aside');
    sidebar.id = 'alertsSidebar';
    sidebar.innerHTML = `
    <div id="alertsSidebarHeader">
      <div>
        <div class="title">Alertas Ativos (Todos os Pórticos)</div>
        <div class="subtitle">Feed de Ocorrências</div>
      </div>
      <button id="alertsSidebarToggle" title="Ocultar/mostrar feed"
  style="border:0;background:#f1f5f9;color:#0f172a;font-weight:700;
         border-radius:8px;padding:.38rem .6rem;cursor:pointer">
  <i class="fab fa-slack"></i>
</button>
    </div>
    <div id="alertsSidebarList" aria-live="polite"></div>
  `;

    function mountSidebar() {
        if (!document.body.contains(sidebar)) {
            document.body.appendChild(sidebar);
        }
        // marca body pra aplicar paddings
        document.body.classList.add('with-alerts-sidebar', 'has-fixed-topbar');
        // mede a topbar e ajusta
        fixPositions();
    }

    // mede a altura real da topbar e ajusta top/height do sidebar + padding do body
    function fixPositions() {
        const tb = document.querySelector('.topbar') || document.getElementById('topbar');
        const h = tb ? tb.offsetHeight : 64;

        // atualiza top/height do sidebar
        sidebar.style.top = h + 'px';
        sidebar.style.height = `calc(100vh - ${h}px)`;

        // atualiza padding-top do body para o conteúdo não ficar coberto
        document.body.style.paddingTop = h + 'px';
    }

    // re-ajusta em resize ou se a topbar mudar de altura
    window.addEventListener('resize', fixPositions);
    document.addEventListener('DOMContentLoaded', () => {
        mountSidebar();
        setTimeout(fixPositions, 0); // garante cálculo após fontes/carregamento
    });

    // ======= estado e helpers =======
    const state = { feed: [] };

    function prependAlertCard(item) {
        const list = document.getElementById('alertsSidebarList');
        if (!list) return;

        state.feed.unshift(item);
        if (state.feed.length > FEED_MAX) state.feed.pop();

        const card = document.createElement('div');
        card.className = 'a-card ' + (item.level || 'INFO');
        card.dataset.alertId = item.id || (Date.now() + '');
        card.innerHTML = `
      <div class="a-head">
        <span class="a-time">${item.time}</span>
        <span class="a-level" style="font-size:12px; font-weight:800; color:#0f172a">${item.level}</span>
      </div>
      <div class="a-source">${item.source}</div>
      <div class="a-msg">${item.msg}</div>
      <div class="a-action">
        <button class="btn-action" data-id="${card.dataset.alertId}">Ação</button>
      </div>
      ${item.action ? `<div class="a-done">Ação: ${item.action} • ${item.actionTime}</div>` : ``}
    `;
        list.prepend(card);
        list.scrollTop = 0;
    }

    // botão Limpar
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'alertsSidebarClear') {
            state.feed = [];
            const list = document.getElementById('alertsSidebarList');
            if (list) list.innerHTML = '';
        }
    });

    // botão Ação
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-action');
        if (!btn) return;

        const id = btn.getAttribute('data-id');
        const card = btn.closest('.a-card');
        const item = state.feed.find(x => String(x.id) === String(id));
        if (!item) return;

        const acao = window.prompt('Descreva a ação tomada para este incidente:', '');
        if (acao === null) return;

        const payload = {
            alertId: id, source: item.source, level: item.level,
            message: item.msg, time: item.time, action: acao
        };

        try {
            const resp = await fetch(ENDPOINT_ACAO, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error('Falha ao salvar ação');

            item.action = acao;
            item.actionTime = new Date().toLocaleString('pt-BR');

            btn.textContent = 'Registrado';
            btn.disabled = true;
            btn.style.background = '#0ea5e9';
            btn.style.cursor = 'default';

            const done = document.createElement('div');
            done.className = 'a-done';
            done.textContent = `Ação: ${item.action} • ${item.actionTime}`;
            card.appendChild(done);
        } catch (err) {
            alert('Erro ao registrar ação: ' + err.message);
        }
    });

    // API pública para empurrar alertas manualmente (se quiser)
    window.pushAlert = function ({ level = 'INFO', source = 'Pórtico', msg = '', time = null, id = null }) {
        prependAlertCard({
            id: id || Date.now() + Math.random().toString(16).slice(2),
            level, source, msg,
            time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
    };

    // ======= Seed “bem populado” (30+ itens) =======
    function seedMany(qtd = 36) {
        const fontes = [
            'INFRA-EDGE-01 (SP-333)', 'INFRA-EDGE-02 (SP-333)',
            'INFRA-EDGE-03 (SP-099)', 'INFRA-EDGE-04 (Km 414)'
        ];
        const levels = ['INFO', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const msgs = [
            'Processo de leitura travou. Necessário restart.',
            'Latência alta no link principal (210ms).',
            'CPU em 82°C por 3 minutos.',
            'Backup automático concluído com sucesso.',
            'Uso de disco 91% em /var/log.',
            'Perda de pacotes intermitente (2.5%).',
            'Failover de link (4G) ativado.',
            'Checksum inválido em 12 leituras.',
            'Reconexão de serviço concluída.',
            'Fila de processamento acima do normal.',
            'Tráfego de rede próximo da saturação.',
            'Temperatura normalizada (68°C).'
        ];
        const now = new Date();
        // gera itens com tempos decrescentes (pra parecer histórico)
        for (let i = qtd - 1; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 90 * 1000); // de 1min30s em 1min30s
            prependAlertCard({
                id: 'seed-' + i,
                level: levels[Math.floor(Math.random() * levels.length)],
                source: fontes[Math.floor(Math.random() * fontes.length)],
                msg: msgs[Math.floor(Math.random() * msgs.length)],
                time: t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
        }
    }
    document.addEventListener('DOMContentLoaded', () => seedMany(40));

    // ======= Integra com seu loop sem limpar DOM central =======
    const lastCross = { cpu: false, memoria: false, disco: false, rede: false };
    function evaluatePoint(ponto, fonte) {
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        function cross(key, cond, level, msg) {
            if (cond && !lastCross[key]) {
                prependAlertCard({ id: Date.now() + '-' + key, time: hora, level, source: fonte, msg });
            }
            lastCross[key] = cond;
        }
        cross('cpu', ponto.cpu > 85, 'CRITICAL', `CPU em ${ponto.cpu.toFixed(1)}% - Acima do limite crítico`);
        cross('memoria', ponto.memoria > 85, 'CRITICAL', `Memória em ${ponto.memoria.toFixed(1)}% - Acima do limite crítico`);
        cross('disco', ponto.disco > 85, 'HIGH', `Disco em ${ponto.disco.toFixed(1)}% - Alto uso de disco`);
        cross('rede', ponto.rede > 180, 'HIGH', `Rede em ${ponto.rede.toFixed(1)} Mbps - Próximo da saturação`);
    }

    // patch: usa seu ciclo de KPIs para detectar cruzamentos e mandar ao feed
    const patchAlerts = () => {
        if (!window.gerenciadorInterface) return;
        const original = gerenciadorInterface.atualizarAlertas?.bind(gerenciadorInterface);
        gerenciadorInterface.atualizarAlertas = () => {
            if (!window.dadosTempoReal || !dadosTempoReal.length) return;
            const u = dadosTempoReal[dadosTempoReal.length - 1];
            const fonte = document.getElementById('edgeSelector')?.value || (window.maquina && maquina.nome) || 'Pórtico';
            evaluatePoint(u, fonte);
            // se quiser manter algo do original, descomente:
            // if (original) original();
        };
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchAlerts);
    } else {
        patchAlerts();
    }

    window.SIDEBAR_WIDTH = SIDEBAR_WIDTH;

})();

let sidebarVisible = true;
let floatingBtn = null;

document.addEventListener('click', (e) => {
    const btn = e.target.closest('#alertsSidebarToggle');
    if (!btn) return;

    const sidebar = document.getElementById('alertsSidebar');
    if (!sidebar) return;

    sidebarVisible = !sidebarVisible;

    if (!sidebarVisible) {
        sidebar.style.transform = `translateX(${window.SIDEBAR_WIDTH || 360}px)`;
        document.body.classList.remove('with-alerts-sidebar');

        if (!floatingBtn) {
            floatingBtn = document.createElement('button');
            floatingBtn.id = 'floatingSlackBtn';
            floatingBtn.innerHTML = `<img src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png" 
  alt="Slack" width="24" height="24">`;
            floatingBtn.title = 'Mostrar alertas';
            floatingBtn.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background-color: #f1f5f9;
        color: #0f172a;
        font-size: 20px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, transform 0.2s;
      `;
            floatingBtn.addEventListener('mouseenter', () => {
                floatingBtn.style.backgroundColor = '#e2e8f0';
                floatingBtn.style.transform = 'scale(1.05)';
            });
            floatingBtn.addEventListener('mouseleave', () => {
                floatingBtn.style.backgroundColor = '#f1f5f9';
                floatingBtn.style.transform = 'scale(1)';
            });
            floatingBtn.addEventListener('click', () => {
                sidebar.style.transform = 'translateX(0)';
                document.body.classList.add('with-alerts-sidebar');
                sidebarVisible = true;
                floatingBtn.remove();
                floatingBtn = null;
            });
            document.body.appendChild(floatingBtn);
        }
    }

    else {
        sidebar.style.transform = 'translateX(0)';
        document.body.classList.add('with-alerts-sidebar');
        if (floatingBtn) {
            floatingBtn.remove();
            floatingBtn = null;
        }
    }
});
