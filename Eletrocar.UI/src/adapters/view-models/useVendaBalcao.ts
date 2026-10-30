/**
 * ViewModel: useVendaBalcao
 * Orquestra as vendas no balcão rápido com captura contínua de leitor físico,
 * atalhos de teclado (F2, F4, F9, Esc) e finalização com conciliação.
 */
import { useState, useEffect, useCallback } from "react";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Peca } from "../../domain/entities/Peca";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento } from "../../domain/value-objects/Enums";
import { container } from "../../infra/di/container";

export function useVendaBalcao(operadorNome: string) {
  const [venda, setVenda] = useState<VendaBalcao>(() => new VendaBalcao());
  const [catalogo, setCatalogo] = useState<Peca[]>([]);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [modalBuscaAberto, setModalBuscaAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregarCatalogo = useCallback(async (termo?: string) => {
    const pecas = await container.pecaRepository.listar(termo);
    setCatalogo(pecas);
  }, []);

  useEffect(() => {
    carregarCatalogo();
  }, [carregarCatalogo]);

  const biparOuBuscarCodigo = useCallback(
    async (codigo: string) => {
      try {
        setMensagemErro(null);
        setMensagemSucesso(null);
        await container.adicionarItemVendaUC.executar(venda, codigo, 1);
        setVenda(venda.clone());
        setMensagemSucesso(`Item adicionado via leitor/código: ${codigo}`);
        setTimeout(() => setMensagemSucesso(null), 3000);
      } catch (err: unknown) {
        setMensagemErro(err instanceof Error ? err.message : "Erro ao processar item.");
      }
    },
    [venda]
  );

  // Escuta contínua do leitor físico USB / Bluetooth (Cunha de teclado)
  useEffect(() => {
    const unbind = container.barcodeGateway.iniciarEscuta((codigo) => {
      biparOuBuscarCodigo(codigo);
    });
    return unbind;
  }, [biparOuBuscarCodigo]);

  const alterarQuantidade = (itemId: string, qtd: number) => {
    venda.alterarQuantidade(itemId, qtd);
    setVenda(venda.clone());
  };

  const removerItem = (itemId: string) => {
    venda.removerItem(itemId);
    setVenda(venda.clone());
  };

  const aplicarDesconto = (valorDesconto: number) => {
    venda.aplicarDesconto(new Dinheiro(valorDesconto, false));
    setVenda(venda.clone());
  };

  const cancelarVenda = () => {
    setVenda(new VendaBalcao());
    setMensagemErro(null);
    setMensagemSucesso("Venda cancelada / carrinho limpo.");
    setTimeout(() => setMensagemSucesso(null), 2500);
  };

  const finalizarVenda = async (formaPagamento: FormaPagamento) => {
    try {
      setProcessando(true);
      setMensagemErro(null);
      const vendaConcluida = await container.finalizarVendaUC.executar(
        venda,
        formaPagamento,
        operadorNome
      );
      setModalPagamentoAberto(false);
      setMensagemSucesso(`Venda #${vendaConcluida.numeroVenda} finalizada com sucesso! Comprovante emitido.`);
      setVenda(new VendaBalcao());
      carregarCatalogo();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setProcessando(false);
    }
  };

  return {
    venda,
    itens: venda.itens,
    subtotal: venda.subtotal,
    desconto: venda.desconto,
    total: venda.total,
    catalogo,
    filtroBusca,
    setFiltroBusca,
    carregarCatalogo,
    biparOuBuscarCodigo,
    alterarQuantidade,
    removerItem,
    aplicarDesconto,
    cancelarVenda,
    finalizarVenda,
    modalPagamentoAberto,
    setModalPagamentoAberto,
    modalBuscaAberto,
    setModalBuscaAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
    processando,
  };
}
