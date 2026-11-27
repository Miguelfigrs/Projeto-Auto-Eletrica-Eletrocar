/**
 * View: OverviewView
 * Painel inicial didático da Auto Elétrica Eletrocar.
 * Resume a operação do dia, explica o perfil RBAC do usuário conectado
 * e guia o operador passo a passo entre Caixa, Balcão PDV, OS e DRE.
 */
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Keyboard,
  Lock,
  Mic,
  Package,
  PieChart,
  ScanBarcode,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  Wrench,
} from "lucide-react";
import { Usuario } from "../../domain/entities/Usuario";
import { Caixa } from "../../domain/entities/Caixa";
import { OrdemServico } from "../../domain/entities/OrdemServico";
import { Peca } from "../../domain/entities/Peca";
import { StatusOS } from "../../domain/value-objects/Enums";
import { container } from "../../infra/di/container";
import { DidacticBanner, Page, PageHeader, StatCard } from "./../components/ui";
import { cn } from "../../lib/utils";

interface OverviewViewProps {
  usuario: Usuario;
  caixa: Caixa | null;
  modoDidatico: boolean;
  onIrParaAba: (aba: string) => void;
  onAbrirLockScreen: () => void;
}

const ETAPAS_OFICINA = [
  {
    numero: "01",
    aba: "caixa",
    titulo: "Abrir Turno do Caixa",
    atalho: "F6",
    icon: Wallet,
    descricao:
      "Informe o fundo de troco inicial da gaveta. Sem turno aberto, o PDV bloqueia vendas para proteger a conciliação.",
    quemUsa: "Balconista · Dono",
  },
  {
    numero: "02",
    aba: "balcao",
    titulo: "Vender Peças no Balcão",
    atalho: "F2",
    icon: ShoppingCart,
    descricao:
      "Passe o leitor de código de barras ou busque no catálogo (F4). Receba em Dinheiro, PIX ou Cartão e emita o recibo.",
    quemUsa: "Balconista · Dono",
  },
  {
    numero: "03",
    aba: "os",
    titulo: "Gerenciar Ordens de Serviço",
    atalho: "F3",
    icon: Wrench,
    descricao:
      "Acompanhe veículos da Triagem à Entrega, preencha o checklist elétrico ou simule a abertura por voz via Telegram IA.",
    quemUsa: "Eletricista · Balcão",
  },
  {
    numero: "04",
    aba: "dre",
    titulo: "Conferir Lucro & DRE",
    atalho: "F7",
    icon: PieChart,
    descricao:
      "Veja quanto entrou de peças e mão de obra, o custo das mercadorias (CMV) e o lucro líquido real da oficina.",
    quemUsa: "Exclusivo Dono / Admin",
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  usuario,
  caixa,
  modoDidatico,
  onIrParaAba,
  onAbrirLockScreen,
}) => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);

  useEffect(() => {
    Promise.all([container.osRepository.listar(), container.pecaRepository.listar()]).then(
      ([listaOs, listaPecas]) => {
        setOrdens(listaOs);
        setPecas(listaPecas);
      }
    );
  }, []);

  const osAtivas = ordens.filter(
    (o) => o.status !== StatusOS.ENTREGUE && o.status !== StatusOS.CANCELADO
  );
  const pecasCriticas = pecas.filter((p) => p.estoqueBaixo);

  const permissoes = [
    {
      modulo: "Balcão & PDV + Caixa",
      liberado: usuario.ehAdmin || usuario.ehBalconista,
      motivo: "Requer papel BALCONISTA ou ADMIN",
    },
    {
      modulo: "Ordens de Serviço & Diagnóstico",
      liberado: usuario.ehAdmin || usuario.ehBalconista || usuario.ehEletricista,
      motivo: "Disponível para toda a equipe operacional",
    },
    {
      modulo: "Peças & Estoque",
      liberado: true,
      motivo: "Consulta de saldo e código de barras liberada",
    },
    {
      modulo: "Financeiro & DRE Gerencial",
      liberado: usuario.ehAdmin,
      motivo: "Exclusivo do papel ADMIN (Dono)",
    },
    {
      modulo: "Usuários & Permissões (F8)",
      liberado: usuario.ehAdmin,
      motivo: "Exclusivo do papel ADMIN (Dono)",
    },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={`Sessão ativa · ${usuario.papelPrincipal}`}
        title={`Olá, ${usuario.nome.split(" ")[0]}`}
        description="Visão geral do pátio, balcão e finanças da Auto Elétrica Eletrocar."
        actions={
          <>
            <button type="button" onClick={onAbrirLockScreen} className="btn btn-secondary">
              <Keyboard size={16} /> Trocar operador (F12)
            </button>
            <button
              type="button"
              onClick={() => onIrParaAba(usuario.ehEletricista && !usuario.ehBalconista && !usuario.ehAdmin ? "os" : "balcao")}
              className="btn btn-primary"
            >
              {usuario.ehEletricista && !usuario.ehBalconista && !usuario.ehAdmin ? (
                <>
                  <Wrench size={17} /> Ir para Fila de OS
                </>
              ) : (
                <>
                  <ScanBarcode size={17} /> Abrir Balcão PDV
                </>
              )}
              <ArrowRight size={16} />
            </button>
          </>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        defaultAberto
        titulo="Como o sistema Eletrocar está organizado?"
        resumo="O dia a dia da oficina está dividido em telas simples. O que você vende no balcão ou faz na oficina já atualiza o estoque e o caixa sozinho."
        passos={[
          "Cada pessoa entra com o próprio usuário e vê só as telas da sua função.",
          "No começo do dia: abra o caixa (F6). Depois venda no balcão (F2) e acompanhe os carros (F3).",
          "No fim do dia: feche o caixa conferindo os valores. O dono vê o lucro em Financeiro (F7).",
        ]}
        regraNegocio="Esta caixa de ajuda pode ser escondida a qualquer momento no botão 'Ocultar ajuda', no alto da tela."
      />

      {/* Indicadores do dia */}
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Caixa do turno"
          value={
            caixa?.estaAberto
              ? caixa.visaoGerencial
                ? caixa.saldoEsperadoEmDinheiro.formatar()
                : "Aberto"
              : "Fechado"
          }
          hint={
            caixa?.estaAberto
              ? caixa.visaoGerencial
                ? `Turno ${caixa.rotuloTurno} aberto · ${caixa.movimentacoes.length} lançamentos`
                : `Turno ${caixa.rotuloTurno} · saldos visíveis só para a gerência`
              : "Abra um turno em Caixa (F6) para vender"
          }
          icon={Wallet}
          tone={caixa?.estaAberto ? "brand" : "neg"}
        />
        <StatCard
          label="OS em andamento"
          value={osAtivas.length}
          hint={`${ordens.length} ordens cadastradas na oficina`}
          icon={Wrench}
          tone="default"
        />
        <StatCard
          label="Estoque abaixo do mínimo"
          value={pecasCriticas.length}
          hint={
            pecasCriticas.length > 0
              ? `Atenção: ${pecasCriticas[0]?.descricao}`
              : "Todos os itens com saldo saudável"
          }
          icon={AlertTriangle}
          tone={pecasCriticas.length > 0 ? "neg" : "ok"}
        />
        <StatCard
          label="Catálogo ativo"
          value={`${pecas.length} itens`}
          hint="Prontos para leitura por código EAN-13 ou SKU"
          icon={Package}
          tone="ok"
        />
      </div>

      {/* Fluxo didático passo a passo */}
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="eyebrow text-brand-text">Roteiro Operacional</div>
            <h2 className="text-lg font-semibold text-fg">Fluxo da Oficina em 4 Etapas</h2>
          </div>
          <span className="text-xs text-fg-subtle">Clique em qualquer cartão para abrir a tela</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ETAPAS_OFICINA.map((etapa) => {
            const Icon = etapa.icon;
            const bloqueado = etapa.aba === "dre" && !usuario.ehAdmin;
            return (
              <button
                key={etapa.numero}
                type="button"
                onClick={() => onIrParaAba(etapa.aba)}
                className={cn(
                  "card card-interactive group flex flex-col p-5 text-left",
                  bloqueado && "opacity-75"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-brand-text">
                    ETAPA {etapa.numero}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {bloqueado && (
                      <span className="chip h-5 px-2 text-xs">
                        <Lock size={10} /> Admin
                      </span>
                    )}
                    <span className="kbd">{etapa.atalho}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                    <Icon size={19} />
                  </span>
                  <h3 className="text-base font-semibold text-fg">{etapa.titulo}</h3>
                </div>

                <p className="mt-3 flex-1 text-xs leading-relaxed text-fg-muted">
                  {etapa.descricao}
                </p>

                <div className="mt-4 flex w-full items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="text-fg-subtle">{etapa.quemUsa}</span>
                  <span className="flex items-center gap-1 font-semibold text-brand-text group-hover:translate-x-0.5 transition-transform">
                    Abrir <ArrowRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel RBAC & Recursos de Destaque */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-fg">
                  O que você pode acessar
                </h3>
                <p className="text-xs text-fg-muted">
                  Papéis atribuídos: {usuario.papeis.join(" · ")}
                </p>
              </div>
            </div>
            <span className={cn("chip", usuario.origemAuth === "API" ? "chip-ok" : "chip-brand")}>
              {usuario.origemAuth === "API" ? "API JWT" : "Demo Local"}
            </span>
          </div>

          <ul className="mt-5 flex flex-col gap-2.5">
            {permissoes.map((perm) => (
              <li
                key={perm.modulo}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg">{perm.modulo}</div>
                  <div className="text-xs text-fg-subtle">{perm.motivo}</div>
                </div>
                {perm.liberado ? (
                  <span className="chip chip-ok">
                    <CheckCircle2 size={12} /> Liberado
                  </span>
                ) : (
                  <span className="chip chip-neg">
                    <Lock size={12} /> Restrito
                  </span>
                )}
              </li>
            ))}
          </ul>

          {usuario.ehAdmin ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line/50 bg-brand-soft/60 px-3.5 py-2.5 text-xs">
              <span className="text-fg-muted">
                Como <strong className="text-fg">Administrador</strong>, você também gerencia a equipe.
              </span>
              <button
                type="button"
                onClick={() => onIrParaAba("usuarios")}
                className="font-semibold text-brand-text hover:underline"
              >
                Abrir aba Usuários (F8) →
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-fg-muted">
              Dica didática: pressione <span className="kbd">F12</span> e digite o PIN{" "}
              <strong className="font-mono text-fg">1234</strong> para alternar para o{" "}
              <strong className="text-fg">Administrador</strong> e testar o módulo financeiro DRE.
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
              <Mic size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-fg">
                Recursos Inteligentes &amp; Hardware
              </h3>
              <p className="text-xs text-fg-muted">
                Recursos criados para eliminar retrabalho no pátio e no balcão
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-canvas/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg">
                  Leitor USB / Bluetooth sem Perda de Foco
                </span>
                <button
                  type="button"
                  onClick={() => onIrParaAba("balcao")}
                  className="btn btn-secondary btn-sm"
                >
                  Testar no PDV
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                O adaptador <code className="font-mono text-fg">KeyboardWedgeGateway</code> mede o
                intervalo entre teclas (&lt;40ms) para identificar leituras de scanner mesmo que o
                cursor não esteja dentro do campo de busca.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-canvas/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg">
                  Telegram Voice Bot → Whisper → Claude IA
                </span>
                <button
                  type="button"
                  onClick={() => onIrParaAba("os")}
                  className="btn btn-secondary btn-sm"
                >
                  Simular áudio
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                O eletricista com as mãos sujas de graxa envia um áudio no Telegram; o sistema
                transcreve os sintomas, marca o checklist elétrico e abre a OS automaticamente em
                Triagem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

