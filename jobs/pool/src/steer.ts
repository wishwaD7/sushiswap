import { getPools, getTokenPricesChain } from '@sushiswap/client'
import { Prisma, SteerStrategy, VaultState } from '@sushiswap/database'
import { STEER_ENABLED_NETWORKS, STEER_SUBGRAPGH_NAME, SteerChainId, SUBGRAPH_HOST } from '@sushiswap/graph-config'
import { isPromiseFulfilled } from '@sushiswap/validate'

import { getBuiltGraphSDK } from '../.graphclient/index.js'
import { updatePoolsWithSteerVaults } from './etl/pool/load.js'
import { upsertVaults } from './etl/steer/load.js'

export async function steer() {
  try {
    const startTime = performance.now()
    const chainsWithVaults = await extract()

    const transformed = transform(chainsWithVaults)

    await upsertVaults(transformed)
    await updatePoolsWithSteerVaults()

    const endTime = performance.now()
    console.log(`COMPLETE - Script ran for ${((endTime - startTime) / 1000).toFixed(1)} seconds. `)
  } catch (e) {
    console.error(e)
  }
}

interface Payload {
  strategyConfigData: {
    period: number
    standardDeviations: number
    poolFee: number
    epochStart: number
    epochLength: string
    name: string
    description: string
    appImgUrl: string
  }
  vaultPayload: {
    fee: number
    slippage: number
    ratioErrorTolerance: number
    maxTicksChange: number
    twapInterval: number
  }
}

async function getPayload(ipfsHash: string): Promise<Payload> {
  const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`)
  return response.json()
}

async function getApr(chainId: SteerChainId, vaultId: string): Promise<{ apr: number }> {
  const response = await fetch(
    `https://ro81h8hq6b.execute-api.us-east-1.amazonaws.com/pool/weekly-apr?address=${vaultId}&chain=${chainId}`
  )
  return response.json()
}

async function extractChain(chainId: SteerChainId) {
  const sdk = getBuiltGraphSDK({ host: SUBGRAPH_HOST[chainId], name: STEER_SUBGRAPGH_NAME[chainId] })

  const prices = await getTokenPricesChain({ chainId })
  const { vaults } = await sdk.SteerVaults()
  const pools = await getPools({
    ids: vaults.map((vault) => `${chainId}:${vault.pool.toLowerCase()}`),
    chainIds: [chainId],
  })

  const vaultsWithPayloads = await Promise.allSettled(
    vaults.map(async (vault) => {
      const poolId = `${chainId}:${vault.pool.toLowerCase()}`
      const pool = pools.find((pool) => pool.id === poolId)

      const token0Price = prices[vault.token0] || 0
      const token1Price = prices[vault.token1] || 0

      const reserve0USD = pool ? (Number(vault.reserve0) / 10 ** pool.token0.decimals) * token0Price : 0
      const fees0USD = pool ? (Number(vault.fees0) / 10 ** pool.token0.decimals) * token0Price : 0

      const reserve1USD = pool ? (Number(vault.reserve1) / 10 ** pool.token1.decimals) * token1Price : 0
      const fees1USD = pool ? (Number(vault.fees1) / 10 ** pool.token1.decimals) * token1Price : 0

      const reserveUSD = reserve0USD + reserve1USD
      const feesUSD = Number(fees0USD) + Number(fees1USD)

      const [payloadP, aprP] = await Promise.allSettled([getPayload(vault.payloadIpfs), getApr(chainId, vault.id)])

      const payload = isPromiseFulfilled(payloadP) ? payloadP.value : null
      const apr = isPromiseFulfilled(aprP) ? aprP.value.apr / 100 : '0'

      return {
        ...vault,
        poolId,
        payload,
        annualFeeAPR: apr,
        reserve0USD,
        fees0USD,
        reserve1USD,
        fees1USD,
        reserveUSD,
        feesUSD,
      }
    })
  )

  return { chainId, vaults: vaultsWithPayloads.filter(isPromiseFulfilled).map((r) => r.value) }
}

async function extract() {
  const result = await Promise.allSettled(STEER_ENABLED_NETWORKS.map(extractChain))
  return result.filter(isPromiseFulfilled).map((r) => r.value)
}

const StrategyTypes: Record<string, SteerStrategy> = {
  'Classic Rebalance Strategy': SteerStrategy.ClassicRebalance,
  'Delta Neutral - Stables': SteerStrategy.DeltaNeutralStables,
  'Elastic Expansion Strategy': SteerStrategy.ElasticExpansion,
  'High Low Channel Strategy': SteerStrategy.HighLowChannel,
  'Moving Volatility Channel Strategy - Medium': SteerStrategy.MovingVolatilityChannelMedium,
  'Static Stable Strategy': SteerStrategy.StaticStable,
}

function transform(chainsWithVaults: Awaited<ReturnType<typeof extract>>): Prisma.SteerVaultCreateManyInput[] {
  return chainsWithVaults.flatMap(({ chainId, vaults }) =>
    vaults.flatMap((vault) => {
      const lowestTick = vault.positions.reduce(
        (lowest, position) => (Number(position.lowerTick) < lowest ? Number(position.lowerTick) : lowest),
        0
      )
      const highestTick = vault.positions.reduce(
        (highest, position) => (Number(position.upperTick) > highest ? Number(position.upperTick) : highest),
        0
      )

      // ! Missing strategies will be ignored
      const strategyType = StrategyTypes[vault?.payload?.strategyConfigData.name]
      if (!strategyType) return []

      return {
        id: `${chainId}:${vault.id}`.toLowerCase(),
        poolId: vault.poolId,
        feeTier: Number(vault.feeTier) / 1000000,

        // APR is the weekly APR, temporary solution, waiting for Steer to fix the subgraph
        // apr1d, apr1m, apr1y are inaccurate
        apr: Number(vault.annualFeeAPR),
        apr1d: Number(vault.annualPercentageDailyYield),
        apr1m: Number(vault.annualPercentageMonthlyYield),
        apr1y: Number(vault.annualPercentageYearlyYield),

        token0Id: `${chainId}:${vault.token0}`.toLowerCase(),
        reserve0: vault.reserve0 as string,
        reserve0USD: vault.reserve1USD,
        fees0: vault.fees0 as string,
        fees0USD: vault.fees0USD,

        token1Id: `${chainId}:${vault.token1}`.toLowerCase(),
        reserve1: vault.reserve1 as string,
        reserve1USD: vault.reserve1USD,
        fees1: vault.fees1 as string,
        fees1USD: vault.fees1USD,

        reserveUSD: vault.reserveUSD,
        feesUSD: vault.feesUSD,

        strategy: strategyType,
        payloadHash: vault.payloadIpfs,
        description: vault.payload.strategyConfigData.description,
        state: Object.values(VaultState)[vault.state],

        performanceFee: 0.15, // currently constant

        lowerTick: lowestTick,
        upperTick: highestTick,

        adjustmentFrequency: Number(vault.payload.strategyConfigData.epochLength),
        lastAdjustmentTimestamp: Math.floor(vault.payload.strategyConfigData.epochStart),

        admin: vault.strategyToken.admin,
        creator: vault.strategyToken.creator.id,
        manager: vault.manager,
      } satisfies Prisma.SteerVaultCreateManyInput
    })
  )
}
