interface EIP1559 {
  maxFee: number
  priorityFee: number
}
type EIP1559Base = EIP1559 & {
  baseFee: number
}

interface OptimisticGasPrice {
  underlying: {
    classic: number | null
    eip1559: EIP1559Base | null
  }
  fixedOverhead: number
  dynamicOverhead: number
}

interface SpeedGasPrice {
  classic: number | null
  eip1559: EIP1559Base | null
  optimistic: OptimisticGasPrice | null
  eta: number | null
}

export interface ChainGasPrice {
  average: SpeedGasPrice
  fast: SpeedGasPrice
}
