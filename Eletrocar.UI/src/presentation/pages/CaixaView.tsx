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
} from "lucide-react";
import { useCaixa } from "../../adapters/view-models/useCaixa";
import { FormaPagamento, TipoMovimentacaoCaixa } from "../../domain/value-objects/Enums";
import { Alerts, EmptyState, Modal, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";

interface CaixaViewProps {
  operadorNome: string;
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

export const CaixaView: React.FC<CaixaViewProps> = ({ operadorNome }) => {
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

  const handleSubmeterSangria = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorSangria.replace(",", "."));
    if (!isNaN(val) && val > 0 && motivoSangria) {
      realizarSangria(val, motivoSangria);
      setValorSangria("");
      setMotivoSangria("");
    }
  };

  const handleSubmeterSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorSuprimento.replace(",", "."));
    if (!isNaN(val) && val > 0 && motivoSuprimento) {
      realizarSuprimento(val, motivoSuprimento);
      setValorSuprimento("");
      setMotivoSuprimento("");
    }
  };

  const handleSubmeterAbertura = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(saldoInicialAbertura.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      abrirTurno(val);
    }
  };

  const aberto = !!caixa?.estaAberto;

  return (
    <Page>
      <Alerts sucesso={mensagemSucesso} erro={mensagemErro} onFecharErro={() => setMensagemErro(null)} />

      <PageHeader
        title="Caixa & turnos"
        description="Sangrias, suprimentos de troco e fechamento do turno com conferência."
        actions={
          caixa && aberto ? (
            <>
              <button onClick={() => setModalSuprimentoAberto(true)} className="btn btn-secondary">
                <PlusCircle size={16} className="text-ok-text" /> Suprimento
              </button>
              <button onClick={() => setModalSangriaAberto(true)} className="btn btn-secondary">
                <MinusCircle size={16} className="text-neg-text" /> Sangria
              </button>
              <button onClick={fecharTurno} className="btn btn-primary">
                <Lock size={16} /> Fechar turno #{caixa.turnoNumero}
              </button>
            </>
          ) : (
            <button onClick={() => setModalAberturaAberto(true)} className="btn btn-primary">
              <Wallet size={17} /> Abrir turno
            </button>
          )
        }
      />

      {caixa && aberto ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">Total do turno por forma de pagamento</h3>
            </div>
            <div className="grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
              {[
                { forma: FormaPagamento.DINHEIRO, label: "Dinheiro" },
                { forma: FormaPagamento.PIX, label: "PIX" },
                { forma: FormaPagamento.CARTAO_CREDITO, label: "Cartão de crédito" },
                { forma: FormaPagamento.CARTAO_DEBITO, label: "Cartão de débito" },
              ].map((item) => (
                <div key={item.forma} className="px-5 py-4">
                  <div className="text-xs text-fg-subtle">{item.label}</div>
                  <div className="money mt-1 text-lg font-semibold text-fg">
                    {caixa.totalPorFormaPagamento(item.forma).formatar()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <h3 className="card-title">
                Movimentações do turno #{caixa.turnoNumero}
                <span className="chip h-6 px-2">{caixa.movimentacoes.length}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Forma</th>
                    <th>Operador</th>
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
                          {new Date(mov.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td>
                          <span className={cn("chip h-6 px-2", ehEntrada ? "chip-ok" : "chip-neg")}>
                            {mov.tipo.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </td>
                        <td className="font-medium text-fg">{mov.descricao}</td>
                        <td className="text-fg-muted">{mov.formaPagamento.replace(/_/g, " ").toLowerCase()}</td>
                        <td className="text-fg-muted">{mov.operadorNome}</td>
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
    </Page>
  );
};
