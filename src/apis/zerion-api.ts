import ky from 'ky'
import { ChainGasPrice } from './types'

type ResponseBody<T> = {
  data: T
  errors?: { title: string; detail: string }[]
}

const API_URL = 'https://zpi.zerion.io/'

export type Options = {
  headers?: Record<string, string | undefined>
}

function createHeaders(options: Options = {}) {
  return {
    'X-Request-Id': crypto.randomUUID(),
    'Zerion-Client-Type': 'web',
    'Zerion-Client-Version': '0.0.1',
    'Content-Type': 'application/json',
    ...options.headers,
  }
}

interface GetGasPricesParams {
  chain: string
}

interface GetGasPricesResponse {
  data: ChainGasPrice
  errors?: { title: string; detail: string }[]
}

export function getGasPrices({ chain }: GetGasPricesParams) {
  const params = new URLSearchParams({ chain: chain.toString() })
  const endpoint = `chain/get-gas-prices/v1?${params}`
  return ky
    .get(new URL(endpoint, API_URL), {
      headers: createHeaders(),
    })
    .json<GetGasPricesResponse>()
}

/** ======== Paymaster Requests =============== */
type HexString = string

interface PaymasterEligibilityParams {
  transaction: {
    from: HexString
    to: HexString
    nonce: HexString
    chainId: HexString
    gas: HexString
    gasPerPubdataByte: HexString
    value: HexString
    data: HexString
  }
}

type PaymasterEligibilityResponse = ResponseBody<{
  eligible: boolean
  eta: null | number
}>

export function paymasterCheckEligibility(params: PaymasterEligibilityParams) {
  const endpoint = '/paymaster/check-eligibility/v2'
  return ky
    .post(new URL(endpoint, API_URL), {
      body: JSON.stringify(params),
      headers: createHeaders(),
    })
    .json<PaymasterEligibilityResponse>()
}

interface PaymasterParamsRequest {
  transaction: {
    from: HexString
    to: HexString
    nonce: HexString
    chainId: HexString
    gas: HexString
    gasPerPubdataByte: HexString
    value: HexString
    data: HexString
    maxFee: HexString
    maxPriorityFee: HexString
  }
}

export type PaymasterParamsResponse = ResponseBody<{
  eligible: boolean
  paymasterParams: {
    paymaster: string
    paymasterInput: string
  }
}>

export function getPaymasterParams(params: PaymasterParamsRequest) {
  const endpoint = '/paymaster/get-params/v2'
  return ky
    .post(new URL(endpoint, API_URL), {
      body: JSON.stringify(params),
      headers: createHeaders(),
    })
    .json<PaymasterParamsResponse>()
}
