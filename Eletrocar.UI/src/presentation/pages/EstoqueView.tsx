/**
 * View: EstoqueView
 * Catálogo inteligente de peças e componentes elétricos, ponto de reposição
 * e visualização de códigos de barras (EAN-13, SKU).
 */
import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Barcode,
  AlertTriangle,
  Tag,
  MapPin,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { Peca } from "../../domain/entities/Peca";
import { container } from "../../infra/di/container";

interface EstoqueViewProps {
  onBiparPecaNoBalcao: (codigo: string) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({ onBiparPecaNoBalcao }) => {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [fabricanteFiltro, setFabricanteFiltro] = useState<string>("TODOS");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    container.pecaRepository.listar().then(setPecas);
  }, []);

  const copiarCodigo = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const fabricantes = ["TODOS", ...Array.from(new Set(pecas.map((p) => p.marcaFabricante)))];

  const pecasFiltradas = pecas.filter((p) => {
    const matchTermo =
      !termoBusca ||
      p.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.sku.toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.codigoBarras.valor.includes(termoBusca) ||
      p.aplicacaoVeicular.toLowerCase().includes(termoBusca.toLowerCase());

    const matchFabricante = fabricanteFiltro === "TODOS" || p.marcaFabricante === fabricanteFiltro;

    return matchTermo && matchFabricante;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1500px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "4px" }}>
            Catálogo de Peças & Gestão de Estoque
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Controle de saldo em tempo real, localização de prateleira e códigos originais.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: "320px" }}>
            <Search size={18} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              placeholder="Buscar por descrição, código, SKU, aplicação..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 10px 10px 38px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "var(--text-main)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Filtros por Fabricante */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", overflowX: "auto" }}>
        {fabricantes.map((fab) => {
          const ativo = fabricanteFiltro === fab;
          return (
            <button
              key={fab}
              onClick={() => setFabricanteFiltro(fab)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: ativo ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                border: ativo ? "1px solid var(--border-cyan)" : "1px solid var(--border-subtle)",
                color: ativo ? "var(--cyan-primary)" : "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: ativo ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {fab}
            </button>
          );
        })}
      </div>

      {/* Grid de Cards de Peças */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "18px" }}>
        {pecasFiltradas.map((peca) => (
          <div
            key={peca.id}
            className="glass-panel"
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderTop: peca.estoqueBaixo ? "3px solid #f87171" : "3px solid var(--border-cyan)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--cyan-primary)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {peca.sku}
                </span>

                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-muted)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {peca.marcaFabricante}
                </span>
              </div>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px", lineHeight: 1.3 }}>
                {peca.descricao}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={14} />
                  <span>Aplicação: <strong style={{ color: "var(--text-muted)" }}>{peca.aplicacaoVeicular}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={14} />
                  <span>Localização: <strong style={{ color: "var(--text-muted)" }}>{peca.localizacao}</strong></span>
                </div>
              </div>
            </div>

            <div>
              {/* Código de barras com botão de cópia */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(0, 0, 0, 0.25)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Barcode size={15} color="var(--cyan-primary)" />
                  <span>{peca.codigoBarras.valor}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copiarCodigo(peca.codigoBarras.valor, peca.id)}
                  style={{ background: "none", border: "none", color: "var(--cyan-primary)", cursor: "pointer" }}
                  title="Copiar código de barras"
                >
                  {copiadoId === peca.id ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Preço e Estoque */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Preço Venda Balcão:</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                    {peca.precoVenda.formatar()}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: peca.estoqueBaixo ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: peca.estoqueBaixo ? "#f87171" : "#34d399",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {peca.estoqueBaixo && <AlertTriangle size={12} />}
                    {peca.estoqueAtual} un em estoque
                  </div>
                  {peca.estoqueBaixo && (
                    <div style={{ fontSize: "0.68rem", color: "#f87171", marginTop: "2px" }}>
                      Ponto de reposição atingido (mín: {peca.estoqueMinimo})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
