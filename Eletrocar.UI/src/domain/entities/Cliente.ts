/**
 * Entidade: Cliente e Carro
 * Cadastro de clientes e veículos vinculados para ordens de serviço.
 * Espelha fielmente src/domain/entities/cliente.py e carro.py.
 */

export interface Carro {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  ano: string;
  placa: string;
}

export interface ClienteProps {
  id: string;
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  carros?: Carro[];
}

export class Cliente {
  public readonly id: string;
  public nome: string;
  public cpfCnpj?: string;
  public telefone?: string;
  public email?: string;
  public carros: Carro[];

  constructor(props: ClienteProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.cpfCnpj = props.cpfCnpj;
    this.telefone = props.telefone;
    this.email = props.email;
    this.carros = props.carros || [];
  }

  public adicionarCarro(carro: Carro): void {
    this.carros.push(carro);
  }
}
