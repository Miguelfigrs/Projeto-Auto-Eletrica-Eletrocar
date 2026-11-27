/**
 * View: CaixaView
 * Gestão do fluxo de caixa diário, sangrias, suprimentos, conciliação e fechamento de turno.
 */
import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  PlusCircle,
  MinusCircle,
  Clock,
  Banknote,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useCaixa } from "../../adapters/view-models/useCaixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, TipoMovimentacaoCaixa } from "../../domain/value-objects/Enums";
import { Alerts, DidacticBanner, EmptyState, Modal, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";
import { lerValorBR, valorParaCampo } from "../../lib/numeroBR";
import { ROTULO_FORMA_PAGAMENTO } from "../components/DetalhamentoDREPanel";

interface CaixaViewProps {
  operadorNome: string;
  modoDidatico?: boolean;
}

const parseValorDecimal = lerValorBR;

const ROTULO_MOVIMENTO: Record<string, string> = {
  ENTRADA_VENDA: "Venda",
  ENTRADA_OS: "Ordem de serviço",
  SUPRIMENTO: "Suprimento",
  SANGRIA: "Sangria",
  ESTORNO_VENDA: "Estorno",
};

/** "14:43" se for de hoje; "24/11 14:43" se o turno atravessou dias. */
function horarioMovimento(data: Date): string {
  const d = new Date(data);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? hora
    : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

const MovimentoForm: React.FC<{
  valor: string;
  setValor: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  labelValor: string;
  labelMotivo: string;
  placeholderValor: string;
  placeholderMotivo: string;
  cta: string;
  onSubmit: (e: React.FormEvent) => void;
}> = (p) => (
  <form onSubmit={p.onSubmit} className="flex flex-col gap-4">
    <div>
      <label className="label">{p.labelValor}</label>
      <input
        type="text"
        inputMode="decimal"
        required
        placeholder={p.placeholderValor}
        value={p.valor}
        onChange={(e) => p.setValor(e.target.value)}
        className="field money"
      />
    </div>
    <div>
      <label className="label">{p.labelMotivo}</label>
      <input
        type="text"
        required
        placeholder={p.placeholderMotivo}
        value={p.motivo}
        onChange={(e) => p.setMotivo(e.target.value)}
        className="field"
      />
    </div>
    <button type="submit" className="btn btn-primary btn-lg mt-1 w-full">
      {p.cta}
    </button>
  </form>
);

export const CaixaView: React.FC<CaixaViewProps> = ({ operadorNome, modoDidatico = true }) => {
  const {
    caixa,
    abrirTurno,
    fecharTurno,
    realizarSangria,
    realizarSuprimento,
    modalSangriaAberto,
    setModalSangriaAberto,
    modalSuprimentoAberto,
    setModalSuprimentoAberto,
    modalAberturaAberto,
    setModalAberturaAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
  } = useCaixa(operadorNome);

  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");
  const [valorSuprimento, setValorSuprimento] = useState("");
  const [motivoSuprimento, setMotivoSuprimento] = useState("");
  const [saldoInicialAbertura, setSaldoInicialAbertura] = useState("200,00");

  // Fechamento Cego
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);
  const [contadoDinheiro, setContadoDinheiro] = useState("");
  const [contadoPix, setContadoPix] = useState("");
  const [contadoCredito, setContadoCredito] = useState("");
  const [contadoDebito, setContadoDebito] = useState("");

  const handleSubmeterSangria = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseValorDecimal(valorSangria);
    if (Number.isNaN(val) || val <= 0) {
      setMensagemErro("Digite o valor da sangria. Exemplo: 150,00");
      return;
    }
    if (!motivoSangria.trim()) return;
    void realizarSangria(val, motivoSangria).then((ok) => {
      if (ok) {
        setValorSangria("");
        setMotivoSangria("");
      }
    });
  };

  const handleSubmeterSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseValorDecimal(valorSuprimento);
    if (Number.isNaN(val) || val <= 0) {
      setMensagemErro("Digite o valor do suprimento. Exemplo: 100,00");
      return;
    }
    if (!motivoSuprimento.trim()) return;
    void realizarSuprimento(val, motivoSuprimento).then((ok) => {
      if (ok) {
        setValorSuprimento("");
        setMotivoSuprimento("");
      }
    });
  };

  const handleSubmeterAbertura = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseValorDecimal(saldoInicialAbertura);
    if (!isNaN(val) && val >= 0) {
      abrirTurno(val);
    }
  };

  const abrirFechamentoCego = () => {
    setContadoDinheiro("");
    setContadoPix("");
    setContadoCredito("");
    setContadoDebito("");
    setModalFechamentoAberto(true);
  };

  const preencherValoresEsperados = () => {
    if (!caixa) return;
    setContadoDinheiro(valorParaCampo(caixa.saldoEsperadoEmDinheiro.valor));
    setContadoPix(valorParaCampo(caixa.totalPorFormaPagamento(FormaPagamento.PIX).valor));
    setContadoCredito(valorParaCampo(caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_CREDITO).valor));
    setContadoDebito(valorParaCampo(caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_DEBITO).valor));
  };

  const handleConfirmarFechamentoCego = (e: React.FormEvent) => {
    e.preventDefault();
    const contado = (raw: string) => {
      const v = parseValorDecimal(raw);
      return new Dinheiro(Number.isNaN(v) ? 0 : Math.max(0, v), false);
    };
    fecharTurno({
      [FormaPagamento.DINHEIRO]: contado(contadoDinheiro),
      [FormaPagamento.PIX]: contado(contadoPix),
      [FormaPagamento.CARTAO_CREDITO]: contado(contadoCredito),
      [FormaPagamento.CARTAO_DEBITO]: contado(contadoDebito),
    });
    setModalFechamentoAberto(false);
  };

  // O servidor não informa o operador de cada lançamento; sem a informação a coluna some.
  const mostrarOperador = !!caixa?.movimentacoes.some((m) => m.operadorNome && m.operadorNome !== "—");

  // Fechamento cego de verdade: o operador sem visão gerencial não vê o que o sistema espera.
  const verValores = !!caixa?.visaoGerencial;

  const aberto = !!caixa?.estaAberto;

  const itensPagamento = caixa
    ? [
        {
          forma: FormaPagamento.DINHEIRO,
          label: "Dinheiro (vendas)",
          valor: caixa.totalPorFormaPagamento(FormaPagamento.DINHEIRO),
          nota: "Soma na gaveta física",
        },
        {
          forma: FormaPagamento.PIX,
          label: "PIX",
          valor: caixa.totalPorFormaPagamento(FormaPagamento.PIX),
          nota: "Cai direto na conta",
        },
        {
          forma: FormaPagamento.CARTAO_CREDITO,
          label: "Cartão de crédito",
          valor: caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_CREDITO),
          nota: "Liquidação adquirente",
        },
        {
          forma: FormaPagamento.CARTAO_DEBITO,
          label: "Cartão de débito",
          valor: caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_DEBITO),
          nota: "Liquidação D+1",
        },
      ]
    : [];

  const totalFormasCentavos = itensPagamento.reduce((acc, i) => acc + i.valor.centavos, 0);

  const linhasConferencia = caixa
    ? [
        {
          id: "dinheiro",
          rotulo: "Dinheiro físico na gaveta (c/ fundo de troco)",
          esperado: caixa.saldoEsperadoEmDinheiro.valor,
          raw: contadoDinheiro,
          setRaw: setContadoDinheiro,
        },
        {
          id: "pix",
          rotulo: "Comprovantes PIX",
          esperado: caixa.totalPorFormaPagamento(FormaPagamento.PIX).valor,
          raw: contadoPix,
          setRaw: setContadoPix,
        },
        {
          id: "credito",
          rotulo: "Resumo Maquininha Crédito",
          esperado: caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_CREDITO).valor,
          raw: contadoCredito,
          setRaw: setContadoCredito,
        },
        {
          id: "debito",
          rotulo: "Resumo Maquininha Débito",
          esperado: caixa.totalPorFormaPagamento(FormaPagamento.CARTAO_DEBITO).valor,
          raw: contadoDebito,
          setRaw: setContadoDebito,
        },
      ].map((linha) => {
        const parsed = parseValorDecimal(linha.raw);
        const conferido = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
        return {
          ...linha,
          conferido,
          diferenca: conferido - linha.esperado,
        };
      })
    : [];

  const totalEsperadoFechamento = linhasConferencia.reduce((acc, l) => acc + l.esperado, 0);
  const totalConferidoFechamento = linhasConferencia.reduce((acc, l) => acc + l.conferido, 0);
  const diferencaTotalFechamento = totalConferidoFechamento - totalEsperadoFechamento;

  return (
    <Page>
      <Alerts sucesso={mensagemSucesso} erro={mensagemErro} onFecharErro={() => setMensagemErro(null)} />

      <PageHeader
        title="Caixa & turnos"
        description="Sangrias, suprimentos de troco e fechamento cego do turno com conferência por meio de pagamento."
        actions={
          caixa && aberto ? (
            <>
              <button onClick={() => setModalSuprimentoAberto(true)} className="btn btn-secondary">
                <PlusCircle size={16} className="text-ok-text" /> Suprimento
              </button>
              <button onClick={() => setModalSangriaAberto(true)} className="btn btn-secondary">
                <MinusCircle size={16} className="text-neg-text" /> Sangria
              </button>
              <button onClick={abrirFechamentoCego} className="btn btn-primary">
                <Lock size={16} /> Fechar turno {caixa.rotuloTurno}
              </button>
            </>
          ) : (
            <button onClick={() => setModalAberturaAberto(true)} className="btn btn-primary">
              <Wallet size={17} /> Abrir turno
            </button>
          )
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como funciona o caixa do dia"
        resumo="Só o dinheiro em espécie entra e sai da gaveta. PIX e cartão são conferidos pelo extrato e pelas maquininhas."
        passos={[
          "Ao abrir: informe quanto dinheiro de troco tem na gaveta.",
          "Durante o dia: 'Suprimento' quando colocar dinheiro na gaveta e 'Sangria' quando tirar dinheiro para o cofre.",
          "Ao fechar: conte a gaveta e os comprovantes e digite os valores. O sistema mostra se sobrou ou faltou.",
        ]}
        regraNegocio="Dinheiro esperado na gaveta = troco inicial + vendas em dinheiro + suprimentos − sangrias."
      />

      {caixa && aberto && !verValores ? (
        <div className="card">
          <EmptyState
            icon={Lock}
            title={`Turno ${caixa.rotuloTurno} aberto`}
            description={`Operador: ${caixa.operadorNome}. Fundo de troco: ${caixa.saldoInicial.formatar()}. No fechamento cego os saldos e lançamentos ficam visíveis só para a gerência; registre sangrias e suprimentos normalmente e conte a gaveta ao fechar.`}
          />
        </div>
      ) : caixa && aberto ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Saldo na gaveta"
              value={caixa.saldoEsperadoEmDinheiro.formatar()}
              hint="Valor físico esperado na contagem"
              icon={Banknote}
              tone="brand"
            />
            <StatCard
              label="Fundo de troco"
              value={caixa.saldoInicial.formatar()}
              icon={Clock}
              hint={`Aberto às ${caixa.dataAbertura.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            />
            <StatCard
              label="Entradas em dinheiro"
              value={`+ ${caixa.totalEntradasDinheiro.formatar()}`}
              icon={ArrowUpRight}
              tone="ok"
              hint="Vendas e suprimentos"
            />
            <StatCard
              label="Sangrias"
              value={`- ${caixa.totalSaidasDinheiro.formatar()}`}
              icon={ArrowDownLeft}
              tone="neg"
              hint="Recolhido para o cofre"
            />
          </div>

          {/* Equação visual da gaveta */}
          <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 bg-surface-2/60 px-5 py-3.5 text-xs">
            <span className="eyebrow text-fg-muted">Equação da gaveta em tempo real</span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
              <span className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-fg">
                Troco {caixa.saldoInicial.formatar()}
              </span>
              <span className="text-fg-subtle">+</span>
              <span className="rounded-lg border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok-text">
                Entradas {caixa.totalEntradasDinheiro.formatar()}
              </span>
              <span className="text-fg-subtle">−</span>
              <span className="rounded-lg border border-neg/30 bg-neg-soft px-2.5 py-1 text-neg-text">
                Sangrias {caixa.totalSaidasDinheiro.formatar()}
              </span>
              <span className="text-fg-subtle">=</span>
              <span className="rounded-lg border border-brand-line bg-brand-soft px-3 py-1 font-semibold text-brand-text">
                Gaveta {caixa.saldoEsperadoEmDinheiro.formatar()}
              </span>
            </div>
          </div>

          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">Total do turno por forma de pagamento</h3>
              <span className="money text-xs text-fg-muted">
                Movimentado: {new Dinheiro(totalFormasCentavos / 100).formatar()}
              </span>
            </div>
            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {itensPagamento.map((item) => {
                const pct =
                  totalFormasCentavos > 0
                    ? Math.round((item.valor.centavos / totalFormasCentavos) * 100)
                    : 0;
                return (
                  <div key={item.forma} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
                      <span>{item.label}</span>
                      <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="money mt-1 text-lg font-semibold text-fg">
                      {item.valor.formatar()}
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${Math.max(item.valor.centavos > 0 ? 6 : 0, pct)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-fg-subtle">{item.nota}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <h3 className="card-title">
                Movimentações do turno {caixa.rotuloTurno}
                <span className="chip h-6 px-2">{caixa.movimentacoes.length}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Pagamento</th>
                    {mostrarOperador && <th>Operador</th>}
                    <th className="text-right!">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {caixa.movimentacoes.map((mov) => {
                    const ehEntrada =
                      mov.tipo === TipoMovimentacaoCaixa.ENTRADA_VENDA ||
                      mov.tipo === TipoMovimentacaoCaixa.ENTRADA_OS ||
                      mov.tipo === TipoMovimentacaoCaixa.SUPRIMENTO;
                    return (
                      <tr key={mov.id}>
                        <td className="money text-fg-subtle">
                          {horarioMovimento(mov.dataHora)}
                        </td>
                        <td>
                          <span className={cn("chip h-6 px-2", ehEntrada ? "chip-ok" : "chip-neg")}>
                            {ROTULO_MOVIMENTO[mov.tipo] ?? mov.tipo}
                          </span>
                        </td>
                        <td className="font-medium text-fg">{mov.descricao}</td>
                        <td className="text-fg-muted">
                          {ROTULO_FORMA_PAGAMENTO[mov.formaPagamento] ?? mov.formaPagamento}
                        </td>
                        {mostrarOperador && <td className="text-fg-muted">{mov.operadorNome}</td>}
                        <td className={cn("money text-right font-semibold", ehEntrada ? "text-ok-text" : "text-neg-text")}>
                          {ehEntrada ? "+" : "-"} {mov.valor.formatar()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={Lock}
            title="Nenhum turno de caixa aberto"
            description="Para registrar vendas e emitir comprovantes, abra o turno informando o fundo de troco."
            action={
              <button onClick={() => setModalAberturaAberto(true)} className="btn btn-primary">
                <Wallet size={17} /> Abrir turno de caixa
              </button>
            }
          />
        </div>
      )}

      <Modal
        aberto={modalSangriaAberto}
        onFechar={() => setModalSangriaAberto(false)}
        titulo="Sangria"
        descricao="Retirada de dinheiro da gaveta."
        icon={MinusCircle}
        largura={440}
      >
        <MovimentoForm
          valor={valorSangria}
          setValor={setValorSangria}
          motivo={motivoSangria}
          setMotivo={setMotivoSangria}
          labelValor="Valor da retirada (R$)"
          labelMotivo="Motivo"
          placeholderValor="Ex: 150,00"
          placeholderMotivo="Ex: Recolhimento para o cofre"
          cta="Confirmar sangria"
          onSubmit={handleSubmeterSangria}
        />
      </Modal>

      <Modal
        aberto={modalSuprimentoAberto}
        onFechar={() => setModalSuprimentoAberto(false)}
        titulo="Suprimento de troco"
        descricao="Entrada de dinheiro para troco."
        icon={PlusCircle}
        largura={440}
      >
        <MovimentoForm
          valor={valorSuprimento}
          setValor={setValorSuprimento}
          motivo={motivoSuprimento}
          setMotivo={setMotivoSuprimento}
          labelValor="Valor do aporte (R$)"
          labelMotivo="Motivo"
          placeholderValor="Ex: 100,00"
          placeholderMotivo="Ex: Moedas e notas de R$ 5"
          cta="Confirmar suprimento"
          onSubmit={handleSubmeterSuprimento}
        />
      </Modal>

      <Modal
        aberto={modalAberturaAberto}
        onFechar={() => setModalAberturaAberto(false)}
        titulo="Abrir turno de caixa"
        descricao={`Operador responsável: ${operadorNome}`}
        icon={Wallet}
        largura={440}
      >
        <form onSubmit={handleSubmeterAbertura} className="flex flex-col gap-4">
          <div>
            <label className="label">Fundo de troco inicial (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={saldoInicialAbertura}
              onChange={(e) => setSaldoInicialAbertura(e.target.value)}
              className="field money h-12 text-lg"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg mt-1 w-full">
            Abrir turno
          </button>
        </form>
      </Modal>

      {/* Modal de Fechamento Cego */}
      <Modal
        aberto={modalFechamentoAberto}
        onFechar={() => setModalFechamentoAberto(false)}
        titulo={`Fechamento cego · Turno ${caixa?.rotuloTurno ?? ""}`}
        descricao="Conte os valores físicos da gaveta e dos comprovantes antes de encerrar o turno."
        icon={Calculator}
        largura={560}
      >
        <form onSubmit={handleConfirmarFechamentoCego} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line/60 bg-brand-soft/60 px-3.5 py-2.5 text-xs text-fg-muted">
            <span>Informe o que você contou em cada meio de pagamento.</span>
            {verValores && (
              <button
                type="button"
                onClick={preencherValoresEsperados}
                className="font-semibold text-brand-text hover:underline"
              >
                Preencher valores exatos do sistema
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {linhasConferencia.map((linha) => {
              const temInput = linha.raw.trim() !== "";
              const batido = temInput && Math.abs(linha.diferenca) < 0.01;
              return (
                <div
                  key={linha.id}
                  className="grid items-center gap-3 rounded-xl border border-line bg-canvas/80 p-3 sm:grid-cols-[1fr_140px]"
                >
                  <div>
                    <label htmlFor={`fechamento-${linha.id}`} className="text-xs font-semibold text-fg">
                      {linha.rotulo}
                    </label>
                    <div className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                      {verValores && <span>Sistema: {new Dinheiro(linha.esperado).formatar()}</span>}
                      {verValores && temInput && (
                        <span
                          className={cn(
                            "font-mono font-semibold",
                            batido
                              ? "text-ok-text"
                              : linha.diferenca > 0
                              ? "text-warn-text"
                              : "text-neg-text"
                          )}
                        >
                          {batido
                            ? "• Batido"
                            : linha.diferenca > 0
                            ? `• Sobra +${new Dinheiro(linha.diferenca).formatar()}`
                            : `• Quebra -${new Dinheiro(Math.abs(linha.diferenca)).formatar()}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    id={`fechamento-${linha.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={linha.raw}
                    onChange={(e) => linha.setRaw(e.target.value)}
                    className="field money h-10 text-right"
                  />
                </div>
              );
            })}
          </div>

          {/* Resumo Conferido vs Esperado (só para quem tem visão gerencial) */}
          {verValores && (
          <div className="rounded-xl border border-line-strong bg-surface-2 p-4">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-fg-subtle">Esperado sistema</div>
                <div className="money mt-1 text-sm font-semibold text-fg">
                  {new Dinheiro(totalEsperadoFechamento).formatar()}
                </div>
              </div>
              <div>
                <div className="text-fg-subtle">Total conferido</div>
                <div className="money mt-1 text-sm font-semibold text-fg">
                  {new Dinheiro(totalConferidoFechamento).formatar()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-fg-subtle">Diferença</div>
                <div
                  className={cn(
                    "money mt-1 flex items-center justify-end gap-1 text-sm font-bold",
                    Math.abs(diferencaTotalFechamento) < 0.01
                      ? "text-ok-text"
                      : diferencaTotalFechamento > 0
                      ? "text-warn-text"
                      : "text-neg-text"
                  )}
                >
                  {Math.abs(diferencaTotalFechamento) < 0.01 ? (
                    <>
                      <CheckCircle2 size={14} /> R$ 0,00
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} />
                      {diferencaTotalFechamento > 0 ? "+" : "-"}
                      {new Dinheiro(Math.abs(diferencaTotalFechamento)).formatar()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalFechamentoAberto(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Lock size={15} /> Confirmar fechamento do turno
            </button>
          </div>
        </form>
      </Modal>
    </Page>
  );
};
