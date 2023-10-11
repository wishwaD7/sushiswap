import { ChainId } from 'sushi/chain'

export const BENTOBOX_SUPPORTED_CHAIN_IDS = [
  ChainId.ARBITRUM,
  ChainId.ARBITRUM_NOVA,
  ChainId.AVALANCHE,
  ChainId.BOBA,
  ChainId.BOBA_AVAX,
  ChainId.BOBA_BNB,
  ChainId.BSC,
  ChainId.BTTC,
  ChainId.CELO,
  ChainId.ETHEREUM,
  ChainId.FANTOM,
  ChainId.FUSE,
  ChainId.GNOSIS,
  ChainId.HARMONY,
  ChainId.HECO,
  ChainId.KAVA,
  ChainId.METIS,
  ChainId.MOONBEAM,
  ChainId.MOONRIVER,
  ChainId.OPTIMISM,
  ChainId.POLYGON,
] as const

export type BentoBoxChainId = typeof BENTOBOX_SUPPORTED_CHAIN_IDS[number]

export const BENTOBOX_ADDRESS: Record<BentoBoxChainId, `0x${string}`> = {
  [ChainId.ARBITRUM]: '0x74c764D41B77DBbb4fe771daB1939B00b146894A',
  [ChainId.ARBITRUM_NOVA]: '0xbE811A0D44E2553d25d11CB8DC0d3F0D0E6430E6',
  [ChainId.AVALANCHE]: '0x0711B6026068f736bae6B213031fCE978D48E026',
  [ChainId.BOBA]: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
  [ChainId.BOBA_AVAX]: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
  [ChainId.BOBA_BNB]: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
  [ChainId.BSC]: '0xF5BCE5077908a1b7370B9ae04AdC565EBd643966',
  [ChainId.BTTC]: '0x8dacffa7F69Ce572992132697252E16254225D38',
  [ChainId.CELO]: '0x0711B6026068f736bae6B213031fCE978D48E026',
  [ChainId.ETHEREUM]: '0xF5BCE5077908a1b7370B9ae04AdC565EBd643966',
  [ChainId.FANTOM]: '0xF5BCE5077908a1b7370B9ae04AdC565EBd643966',
  [ChainId.FUSE]: '0x0BE808376Ecb75a5CF9bB6D237d16cd37893d904',
  [ChainId.GNOSIS]: '0xE2d7F5dd869Fc7c126D21b13a9080e75a4bDb324',
  [ChainId.HARMONY]: '0x6b2A3FF504798886862Ca5ce501e080947A506A2',
  [ChainId.HECO]: '0xF5BCE5077908a1b7370B9ae04AdC565EBd643966',
  [ChainId.KAVA]: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  [ChainId.METIS]: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  [ChainId.MOONBEAM]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [ChainId.MOONRIVER]: '0x145d82bCa93cCa2AE057D1c6f26245d1b9522E6F',
  [ChainId.OPTIMISM]: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  [ChainId.POLYGON]: '0x0319000133d3AdA02600f0875d2cf03D442C3367',
} as const

export const isBentoBoxChainId = (
  chainId: ChainId,
): chainId is BentoBoxChainId =>
  BENTOBOX_SUPPORTED_CHAIN_IDS.includes(chainId as BentoBoxChainId)
