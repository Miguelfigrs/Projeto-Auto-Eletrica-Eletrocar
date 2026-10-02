"""
Exceções ricas de Domínio para o sistema Auto Elétrica Eletrocar.
Seguindo Clean Architecture & DDD: erros de negócio expressivos e independentes de frameworks.
"""


class DomainException(Exception):
    """Exceção base para todas as exceções de domínio."""
    def __init__(self, mensagem: str):
        self.mensagem = mensagem
        super().__init__(self.mensagem)


class RegraNegocioException(DomainException):
    """Lançada quando uma regra de negócio ou invariante do domínio é violada."""
    pass


class EstoqueInsuficienteException(DomainException):
    """Lançada quando a quantidade requisitada de uma peça excede o estoque disponível."""
    def __init__(self, peca_descricao: str, estoque_atual: int, quantidade_requisitada: int):
        self.peca_descricao = peca_descricao
        self.estoque_atual = estoque_atual
        self.quantidade_requisitada = quantidade_requisitada
        mensagem = (
            f"Estoque insuficiente para a peça '{peca_descricao}'. "
            f"Disponível: {estoque_atual}, Requisitado: {quantidade_requisitada}."
        )
        super().__init__(mensagem)


class TransicaoStatusInvalidaException(DomainException):
    """Lançada quando ocorre tentativa de transição ilegal na máquina de estados da OS."""
    def __init__(self, status_atual: str, status_destino: str):
        self.status_atual = status_atual
        self.status_destino = status_destino
        mensagem = f"Transição de status inválida na Ordem de Serviço: '{status_atual}' -> '{status_destino}'."
        super().__init__(mensagem)


class CaixaFechadoException(DomainException):
    """Lançada quando uma movimentação financeira é tentada em um caixa fechado."""
    pass


class EntidadeNaoEncontradaException(DomainException):
    """Lançada quando uma entidade do domínio não for localizada."""
    pass


class CredenciaisInvalidasException(DomainException):
    """Lançada quando credenciais de autenticação são inválidas."""
    pass
