import type { VariablesOf } from 'gql.tada'
import request from 'graphql-request'
import type { SushiSwapV2ChainId } from 'sushi/config'
import { SUSHISWAP_V2_SUBGRAPH_URL } from 'sushi/config/subgraph'

import { FetchError } from 'src/lib/fetch-error'
import type { ChainIdVariable } from 'src/lib/types/chainId'
import type { Hex } from 'src/lib/types/hex'
import { transformBucketsV2ToStd } from 'src/subgraphs/sushi-v2/transforms/bucket-v2-to-std'
import { transformPoolV2ToStd } from 'src/subgraphs/sushi-v2/transforms/pool-v2-to-std'
import type { SushiPoolV2, SushiPoolWithBuckets } from 'sushi/types'
import { PoolFieldsFragment } from '../fragments/pool-fields'
import { graphql } from '../graphql'

export const SushiV2PoolBucketsQuery = graphql(
  `
  query PoolBuckets($id: ID!, $id_Bytes: Bytes!, $block: Block_height, $hourDataFirst: Int = 168, $dayDataFirst: Int = 1000) {
    pool: pair(id: $id, block: $block) {
      ...PoolFields

      poolHourData: pairHourData(first: $hourDataFirst, orderBy: hourStartUnix, orderDirection: desc) {
        id
        date: hourStartUnix
        liquidityUSD: reserveUSD
        volumeUSD: hourlyVolumeUSD
        txCount: hourlyTxns
      }
    }

    poolDayData: pairDayDatas(first: $dayDataFirst, orderBy: date, orderDirection: desc, where: { pairAddress: $id_Bytes }) {
      id
      date
      liquidityUSD: reserveUSD
      volumeUSD: dailyVolumeUSD
      txCount: dailyTxns
    }
  }
`,
  [PoolFieldsFragment],
)

export type GetSushiV2PoolBuckets = Omit<
  VariablesOf<typeof SushiV2PoolBucketsQuery>,
  'id_Bytes'
> &
  ChainIdVariable<SushiSwapV2ChainId>

export type SushiV2PoolBuckets = SushiPoolWithBuckets<SushiPoolV2>

export async function getSushiV2PoolBuckets({
  chainId,
  ...variables
}: GetSushiV2PoolBuckets): Promise<SushiV2PoolBuckets> {
  const url = `https://${SUSHISWAP_V2_SUBGRAPH_URL[chainId]}`

  if (variables?.dayDataFirst || 0 > 1000) {
    throw new Error(
      'dayDataFirst must be less than or equal to 1000, paging is not implemented',
    )
  }

  const result = await request(url, SushiV2PoolBucketsQuery, {
    ...variables,
    id: variables.id.toLowerCase(),
    id_Bytes: variables.id.toLowerCase() as Hex,
  })

  if (result.pool) {
    return {
      ...transformPoolV2ToStd(result.pool, chainId),
      poolHourData: transformBucketsV2ToStd(result.pool.poolHourData),
      poolDayData: transformBucketsV2ToStd(result.poolDayData),
    }
  }

  throw new FetchError(
    chainId,
    `Failed to fetch pool ${chainId}:${variables.id}`,
  )
}
