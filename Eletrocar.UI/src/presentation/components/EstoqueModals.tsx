/**
 * Modais da tela de Estoque:
 *  - NovaPecaModal: cadastra um novo tipo de peça no catálogo.
 *  - EntradaEstoqueModal: aumenta o saldo de uma peça já existente
 *    (busca por código de barras/SKU, compatível com o leitor).
 */
import React, { useEffect, useState } from "react";
import { PackagePlus, PackageCheck } from "lucide-react";
import { Peca } from "../../domain/entities/Peca";
import type { NovaPecaDados } from "../../application/ports/repositories/IPecaRepository";
import { Modal } from "./ui";

function lerNumero(valor: string): number {
  return Number(valor.replace(",", "."));
}

const Campo: React.FC<{ id: string; label: string; children: React.ReactNode; className?: string }> = ({
  id,
  label,
  children,
  className,
}) => (
  <div className={className}>
    <label className="label" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Nova peça                                                                  */
/* -------------------------------------------------------------------------- */

const FORM_VAZIO = {
  descricao: "",
  sku: "",
  codigoBarras: "",
  marcaFabricante: "",
  aplicacaoVeicular: "",
  localizacao: "",
  precoCusto: "",
  precoVenda: "",
  estoqueAtual: "0",
  estoqueMinimo: "2",
};

export const NovaPecaModal: React.FC<{
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (dados: NovaPecaDados) => Promise<void>;
}> = ({ aberto, onFechar, onSalvar }) => {
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setForm(FORM_VAZIO);
      setErro(null);
    }
  }, [aberto]);

  const set = (campo: keyof typeof FORM_VAZIO) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await onSalvar({
        descricao: form.descricao,
        sku: form.sku,
        codigoBarras: form.codigoBarras || form.sku,
        marcaFabricante: form.marcaFabricante,
        aplicacaoVeicular: form.aplicacaoVeicular,
        localizacao: form.localizacao,
        precoCusto: lerNumero(form.precoCusto || "0"),
        precoVenda: lerNumero(form.precoVenda),
        estoqueAtual: lerNumero(form.estoqueAtual || "0"),
        estoqueMinimo: lerNumero(form.estoqueMinimo || "0"),
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar a peça.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Nova peça"
      descricao="Cadastre um novo item no catálogo com saldo inicial."
      icon={PackagePlus}
      largura={620}
    >
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Campo id="np-descricao" label="Descrição *" className="sm:col-span-2">
          <input id="np-descricao" className="field" required autoFocus value={form.descricao} onChange={set("descricao")} placeholder="Ex.: Relé Auxiliar 4 Pinos 12V 40A" />
        </Campo>
        <Campo id="np-sku" label="SKU *">
          <input id="np-sku" className="field font-mono uppercase" required value={form.sku} onChange={set("sku")} placeholder="REL-DNI-0102" />
        </Campo>
        <Campo id="np-barras" label="Código de barras (EAN)">
          <input id="np-barras" className="field font-mono" value={form.codigoBarras} onChange={set("codigoBarras")} placeholder="Bipe ou digite (vazio = usa o SKU)" />
        </Campo>
        <Campo id="np-fabricante" label="Fabricante">
          <input id="np-fabricante" className="field" value={form.marcaFabricante} onChange={set("marcaFabricante")} placeholder="Bosch, Valeo, Moura..." />
        </Campo>
        <Campo id="np-local" label="Localização">
          <input id="np-local" className="field" value={form.localizacao} onChange={set("localizacao")} placeholder="Prateleira A-01" />
        </Campo>
        <Campo id="np-aplicacao" label="Aplicação veicular" className="sm:col-span-2">
          <input id="np-aplicacao" className="field" value={form.aplicacaoVeicular} onChange={set("aplicacaoVeicular")} placeholder="Gol, Fox, Polo 1.0/1.6" />
        </Campo>
        <Campo id="np-custo" label="Preço de custo (R$)">
          <input id="np-custo" className="field" inputMode="decimal" value={form.precoCusto} onChange={set("precoCusto")} placeholder="0,00" />
        </Campo>
        <Campo id="np-venda" label="Preço de venda (R$) *">
          <input id="np-venda" className="field" inputMode="decimal" required value={form.precoVenda} onChange={set("precoVenda")} placeholder="0,00" />
        </Campo>
        <Campo id="np-estoque" label="Estoque inicial (un)">
          <input id="np-estoque" className="field" type="number" min={0} step={1} value={form.estoqueAtual} onChange={set("estoqueAtual")} />
        </Campo>
        <Campo id="np-minimo" label="Estoque mínimo (un)">
          <input id="np-minimo" className="field" type="number" min={0} step={1} value={form.estoqueMinimo} onChange={set("estoqueMinimo")} />
        </Campo>

        {erro && (
          <p role="alert" className="text-sm text-neg-text sm:col-span-2">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            <PackagePlus size={16} /> {salvando ? "Salvando..." : "Cadastrar peça"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Entrada de estoque                                                         */
/* -------------------------------------------------------------------------- */

export const EntradaEstoqueModal: React.FC<{
  aberto: boolean;
  onFechar: () => void;
  pecas: Peca[];
  pecaInicial?: Peca | null;
  onConfirmar: (peca: Peca, quantidade: number) => Promise<void>;
}> = ({ aberto, onFechar, pecas, pecaInicial, onConfirmar }) => {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setCodigo(pecaInicial ? pecaInicial.sku : "");
      setQuantidade("1");
      setErro(null);
    }
  }, [aberto, pecaInicial]);

  const termo = codigo.trim().toLowerCase();
  const peca =
    termo.length > 0
      ? pecas.find(
          (p) => p.sku.toLowerCase() === termo || p.codigoBarras.valor.toLowerCase() === termo
        ) ?? null
      : null;
  const sugestoes =
    !peca && termo.length >= 2
      ? pecas
          .filter(
            (p) =>
              p.descricao.toLowerCase().includes(termo) ||
              p.sku.toLowerCase().includes(termo) ||
              p.codigoBarras.valor.includes(termo)
          )
          .slice(0, 5)
      : [];

  const qtd = Number(quantidade);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!peca) {
      setErro("Selecione uma peça existente (código de barras, SKU ou busca pela descrição).");
      return;
    }
    if (!Number.isInteger(qtd) || qtd <= 0) {
      setErro("A quantidade deve ser um número inteiro maior que zero.");
      return;
    }
    setSalvando(true);
    try {
      await onConfirmar(peca, qtd);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar a entrada.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Entrada de estoque"
      descricao="Aumente o saldo de uma peça já cadastrada."
      icon={PackageCheck}
      largura={520}
    >
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo id="ee-codigo" label="Peça (código de barras, SKU ou descrição)">
          <input
            id="ee-codigo"
            className="field font-mono"
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Bipe o código ou digite para buscar"
          />
        </Campo>

        {sugestoes.length > 0 && (
          <ul className="-mt-2 overflow-hidden rounded-lg border border-line">
            {sugestoes.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setCodigo(s.sku)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="truncate text-fg">{s.descricao}</span>
                  <span className="shrink-0 font-mono text-xs text-fg-muted">{s.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {peca && (
          <div className="rounded-xl border border-line bg-canvas/70 p-3 text-sm">
            <div className="font-semibold text-fg">{peca.descricao}</div>
            <div className="mt-1 text-xs text-fg-muted">
              {peca.sku} • {peca.marcaFabricante} • Saldo atual: <strong>{peca.estoqueAtual} un</strong>
              {Number.isInteger(qtd) && qtd > 0 && (
                <>
                  {" "}→ <strong className="text-ok-text">{peca.estoqueAtual + qtd} un</strong>
                </>
              )}
            </div>
          </div>
        )}

        <Campo id="ee-qtd" label="Quantidade recebida (un)">
          <input
            id="ee-qtd"
            className="field"
            type="number"
            min={1}
            step={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Campo>

        {erro && (
          <p role="alert" className="text-sm text-neg-text">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando || !peca}>
            <PackageCheck size={16} /> {salvando ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
