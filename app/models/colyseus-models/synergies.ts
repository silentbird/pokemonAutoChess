import { MapSchema } from "@colyseus/schema"
import { IPokemon } from "../../types"
import { SynergyTriggers } from "../../types/Config"
import { SynergyGivenByItem, SynergyItems } from "../../types/enum/Item"
import { Passive } from "../../types/enum/Passive"
import { Pkm, PkmFamily } from "../../types/enum/Pokemon"
import { Synergy } from "../../types/enum/Synergy"
import { values } from "../../utils/schemas"

export default class Synergies
  extends MapSchema<number, Synergy>
  implements Map<Synergy, number>
{
  constructor() {
    super()
    Object.keys(Synergy).forEach((key) => {
      this.set(key as Synergy, 0)
    })
  }
}

export function computeSynergies(board: IPokemon[]): Map<Synergy, number> {
  const synergies = new Map<Synergy, number>()
  Object.keys(Synergy).forEach((key) => {
    synergies.set(key as Synergy, 0)
  })

  const typesPerFamily = new Map<Pkm, Set<Synergy>>()
  const dragonDoubleTypes = new Map<Pkm, Set<Synergy>>()

  board.forEach((pkm: IPokemon) => {
    // reset dynamic synergies
    if (pkm.passive === Passive.PROTEAN2 || pkm.passive === Passive.PROTEAN3) {
      //pkm.types.clear()
      pkm.types.forEach((type) => pkm.types.delete(type))
    }

    addSynergiesGivenByItems(pkm)
    if (pkm.positionY != 0) {
      const family = PkmFamily[pkm.name]
      if (!typesPerFamily.has(family)) typesPerFamily.set(family, new Set())
      const types: Set<Synergy> = typesPerFamily.get(family)!
      pkm.types.forEach((type) => types.add(type))
      if (pkm.types.has(Synergy.DRAGON) && pkm.types.size > 1) {
        if (!dragonDoubleTypes.has(family))
          dragonDoubleTypes.set(family, new Set())
        dragonDoubleTypes.get(family)!.add(values(pkm.types)[1])
      }
    }
  })

  typesPerFamily.forEach((types) => {
    types.forEach((type, i) => {
      synergies.set(type, (synergies.get(type) ?? 0) + 1)
    })
  })

  // add dynamic synergies (Arceus & Kecleon)
  board.forEach((pkm: IPokemon) => {
    if (
      pkm.positionY !== 0 &&
      (pkm.passive === Passive.PROTEAN2 || pkm.passive === Passive.PROTEAN3)
    ) {
      const n = pkm.passive === Passive.PROTEAN3 ? 3 : 2
      const synergiesSorted = [...synergies.keys()].sort(
        (a, b) => +synergies.get(b)! - synergies.get(a)!
      )

      for (let i = 0; i < n; i++) {
        const type = synergiesSorted.shift()
        if (type && !pkm.types.has(type) && synergies.get(type)! > 0) {
          pkm.types.add(type)
          synergies.set(type, (synergies.get(type) ?? 0) + 1)
        }
      }
    }
  })

  // apply dragon double synergies
  if (
    (synergies.get(Synergy.DRAGON) ?? 0) >= SynergyTriggers[Synergy.DRAGON][0]
  ) {
    dragonDoubleTypes.forEach((types) => {
      types.forEach((type, i) => {
        synergies.set(type, (synergies.get(type) ?? 0) + 1)
      })
    })
  }

  return synergies
}

export function addSynergiesGivenByItems(pkm: IPokemon) {
  for (const item of SynergyItems) {
    if (pkm.items.has(item)) {
      pkm.types.add(SynergyGivenByItem[item])
    }
  }
}
