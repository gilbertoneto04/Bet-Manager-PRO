// ⚠️ TEMPORÁRIO — dados extraídos da aba "Saldos" da planilha de CONTROLE (snapshot 2026-07-09).
// Usado só pelo importador (SaldosImport.tsx). A versão final NÃO terá importador:
// para remover, apague este arquivo + SaldosImport.tsx e a linha <SaldosImport/> no Balances.tsx.
export interface SaldoSeedRow {
  kind: 'ACCOUNT' | 'BANK';
  casa: string;
  titular: string;
  saldo: number;
  pendente: number;
  limitada: boolean;
  investment: boolean;
  nota: string;
}

export const SALDOS_SEED: SaldoSeedRow[] = [
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Igor",
    "saldo": 23913.21,
    "pendente": 1500.0,
    "limitada": true,
    "investment": false,
    "nota": "Sacar"
  },
  {
    "kind": "ACCOUNT",
    "casa": "João Ailton",
    "titular": "",
    "saldo": 8500.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bateu",
    "titular": "Cristiane",
    "saldo": 3265.95,
    "pendente": 0.0,
    "limitada": true,
    "investment": false,
    "nota": "Sacar"
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Hevelyn",
    "saldo": 19342.12,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bet365",
    "titular": "Igor",
    "saldo": 744.71,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": "SMS"
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bet365",
    "titular": "Ellen",
    "saldo": 6693.75,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Ellen",
    "saldo": 12413.72,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Greg",
    "saldo": 2568.72,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "SuperBet",
    "titular": "Igor",
    "saldo": 8107.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": "Facial + Não paguei"
  },
  {
    "kind": "ACCOUNT",
    "casa": "SuperBet",
    "titular": "Ellen",
    "saldo": 7615.3,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": "Facial"
  },
  {
    "kind": "ACCOUNT",
    "casa": "SuperBet",
    "titular": "Greg",
    "saldo": 1966.64,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Novibet",
    "titular": "Ellen",
    "saldo": 2677.82,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Pinnacle",
    "titular": "",
    "saldo": 1613.52,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "BETEsporte",
    "titular": "Walter",
    "saldo": 0.0,
    "pendente": 900.0,
    "limitada": false,
    "investment": false,
    "nota": "Depositar"
  },
  {
    "kind": "ACCOUNT",
    "casa": "PIN",
    "titular": "",
    "saldo": 975.41,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "EstrelaBet",
    "titular": "Ellen",
    "saldo": 2607.57,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "UP",
    "titular": "",
    "saldo": 0.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "CoinBase",
    "titular": "",
    "saldo": 0.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "PolyMarket",
    "titular": "",
    "saldo": 1544.8,
    "pendente": 3380.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Fortune Jack",
    "titular": "",
    "saldo": 1404.75,
    "pendente": 1500.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "Bebidas vô",
    "titular": "",
    "saldo": 255.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "Greg",
    "titular": "",
    "saldo": 1300.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "Aliados",
    "titular": "",
    "saldo": 2500.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "MP",
    "titular": "",
    "saldo": 18801.77,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "NUBANK",
    "titular": "PF",
    "saldo": 0.0,
    "pendente": -1078.99,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "NUBANK",
    "titular": "PJ",
    "saldo": 0.0,
    "pendente": -3744.35,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "SICREDI",
    "titular": "PJ",
    "saldo": 114240.64,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "NUBANK",
    "titular": "CAIXINHA",
    "saldo": 5446.11,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": "115%"
  },
  {
    "kind": "BANK",
    "casa": "99PAY",
    "titular": "CAIXINHA",
    "saldo": 4863.17,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": "114%"
  },
  {
    "kind": "BANK",
    "casa": "MP",
    "titular": "CAIXINHA",
    "saldo": 5434.56,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": "120%"
  },
  {
    "kind": "BANK",
    "casa": "KFB",
    "titular": "",
    "saldo": 97000.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": "Investido Broker (Valendo a partir de Julho)"
  }
];
