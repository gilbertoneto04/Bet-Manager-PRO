// ⚠️ TEMPORÁRIO — dados extraídos da aba "Saldos" da planilha de CONTROLE (snapshot 2026-06-15).
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
    "casa": "Avião",
    "titular": "",
    "saldo": 500.0,
    "pendente": 0.0,
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
    "casa": "Bet365 AR",
    "titular": "Mardaroc",
    "saldo": 4305.61,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bet365",
    "titular": "Igor",
    "saldo": 2368.74,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bet365",
    "titular": "Ellen",
    "saldo": 0.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": "Depositar"
  },
  {
    "kind": "ACCOUNT",
    "casa": "Bet365",
    "titular": "Greg",
    "saldo": 0.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": "Conta bloqueada"
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Igor",
    "saldo": 2486.54,
    "pendente": 535.36,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Ellen",
    "saldo": 600.93,
    "pendente": 203.61,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Betano",
    "titular": "Greg",
    "saldo": 705.28,
    "pendente": 199.72,
    "limitada": false,
    "investment": false,
    "nota": "Depositar"
  },
  {
    "kind": "ACCOUNT",
    "casa": "SuperBet",
    "titular": "Ellen",
    "saldo": 10465.3,
    "pendente": 100.0,
    "limitada": false,
    "investment": false,
    "nota": "Acho que limitou"
  },
  {
    "kind": "ACCOUNT",
    "casa": "SuperBet",
    "titular": "Greg",
    "saldo": 4882.14,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Novibet",
    "titular": "Ellen",
    "saldo": 1955.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Pinnacle",
    "titular": "",
    "saldo": 3369.47,
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
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Lance de Sorte",
    "titular": "Walter",
    "saldo": 900.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "EstrelaBet",
    "titular": "Ellen",
    "saldo": 2350.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Ice",
    "titular": "",
    "saldo": 927.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "UP",
    "titular": "",
    "saldo": 2925.0,
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
    "saldo": 365.6,
    "pendente": 45.99,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "ACCOUNT",
    "casa": "Fortune Jack",
    "titular": "",
    "saldo": 0.05,
    "pendente": 3256.2,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "Aliados",
    "titular": "",
    "saldo": 5000.0,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "MP",
    "titular": "",
    "saldo": 36404.11,
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
    "pendente": -765.36,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "NUBANK",
    "titular": "PJ",
    "saldo": 0.0,
    "pendente": -3626.61,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "SICREDI",
    "titular": "PJ",
    "saldo": 116794.64,
    "pendente": 0.0,
    "limitada": false,
    "investment": false,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "NUBANK",
    "titular": "CAIXINHA",
    "saldo": 5388.64,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "99PAY",
    "titular": "CAIXINHA",
    "saldo": 4805.15,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": ""
  },
  {
    "kind": "BANK",
    "casa": "MP",
    "titular": "CAIXINHA",
    "saldo": 4380.08,
    "pendente": 0.0,
    "limitada": false,
    "investment": true,
    "nota": ""
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
