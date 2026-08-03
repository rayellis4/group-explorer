/*

# Mapping

```javascript
 */

import type { Group } from './Group.ts'

export type definingPairType = [groupElement, groupElement]

export class Mapping {
    domain: Group;
    codomain: Group;
    definingPairs: [groupElement, groupElement][]
    image!: Maybe<groupElement>[]  // image[domainElement] = codomainElement
    fullMapping_: Maybe<Maybe<groupElement>[]>

  constructor (domain: Group, codomain: Group, definingPairs: Array<[groupElement, groupElement]> = []) {
    this.domain = domain
    this.codomain = codomain
    this.definingPairs = definingPairs
    this.update()
  }

  update () {
    const savedPairs = this.definingPairs
    this.definingPairs = []
    this.image = Array.from({ length: this.domain.order }, () => undefined)
    this.image[0] = 0
    savedPairs.forEach(
      ([domainElement, codomainElement]) => this.extend(domainElement, codomainElement)
    )
    this.fullMapping_ = null
  }

  removeDefiningPair (domainElement: groupElement) {
    this.definingPairs.splice(this.definingPairs.findIndex(([g, _h]) => g === domainElement), 1)
    this.update()
  }

  addDefiningPair (domainElement: groupElement, codomainElement: groupElement) {
    this.extend(domainElement, codomainElement)
  }

  // no element in the codomain is the image of two different domain elements
  get isInjective (): boolean {
    const fullMapping = this.fullMapping
    const inverse = Array.from({ length: this.codomain.order }, () => undefined) as Maybe<groupElement>[]
    for (let domainElement = 0; domainElement < fullMapping.length; domainElement++) {
      const codomainElement = fullMapping[domainElement]
      if (inverse[codomainElement] !== undefined) {
        return false
      }
      inverse[codomainElement] = domainElement
    }

    return true
  }

  // every codomain element has an inverse image
  get isSurjective (): boolean {
    const fullMapping = this.fullMapping
    const inverse = fullMapping.reduce<Maybe<groupElement>[]>(
      (inverse, codomainElement, domainElement) => {
        inverse[codomainElement] = domainElement
        return inverse
      }, Array.from({ length: this.codomain.order }, () => undefined))
    return !inverse.includes(undefined)
  }

  // check whether relations in G map to relations in H
  get isHomomorphism (): boolean {
     const G = this.domain
     const H = this.codomain
     const evaluateRelation = (relation: groupElement[]) =>
        relation.reduce<[[groupElement, groupElement, groupElement][], groupElement]>(
           ([gs, g], el) => {
              const next = G.mult(el, g)
              gs.push([g, el, next])
              return [gs, next]
           }, [[], 0])[0]
     const mappingPreservesRelation = (mapping: groupElement[], relation: groupElement[]) =>
        evaluateRelation(relation).every(([prev, step, next]) =>
           mapping[next] === H.mult(mapping[step], mapping[prev])
    )
     return G.relations.every((relation) => mappingPreservesRelation(this.fullMapping, relation))
  }

  clone (): Mapping {
    const mapping = new Mapping(this.domain, this.codomain, [])
    mapping.definingPairs.push(...this.definingPairs)
    mapping.image = [...this.image]
    return mapping
  }

   
  extend (domainElement: groupElement, codomainElement: groupElement): Mapping {
    const G = this.domain
    const H = this.codomain

    const previousImage = [...this.image]

    this.definingPairs.push([domainElement, codomainElement])

    previousImage.forEach(
      (h, g) => {
        if (h != null) {
          this.image[G.mult(g, domainElement)] = H.mult(h, codomainElement)
        }
      })

    const cosetRepresentatives = [domainElement]
    for (const r of cosetRepresentatives) {
      for (const [s] of this.definingPairs) {
        const rXs = G.mult(r, s)
        if (this.image[rXs] === undefined) {
          cosetRepresentatives.push(rXs)
          this.image[rXs] = H.mult((this.image as groupElement[])[r], (this.image as groupElement[])[s])
          previousImage.forEach(
            (h, g) => {
              if (h != null) {
                this.image[G.mult(g, rXs)] = H.mult(h, this.image[rXs] as groupElement)
              }
            })
        }
      }
    }

    this.fullMapping_ = null
    return this
  }

  validSources (codomainElement: groupElement): groupElement[] {
    let validSources
    const unmappedSources = this.domain.elements.filter((g) => this.image[g] === undefined)
    if (codomainElement === undefined) {
      validSources = unmappedSources
    } else {
      validSources = unmappedSources
        .filter(
          (source) => this.domain.elementOrders[source] % this.codomain.elementOrders[codomainElement] === 0
        )
        .reduce<groupElement[]>(
          (validSources, maybeSource) => {
            const copy = this.clone()
            copy.extend(maybeSource, codomainElement)
            if (copy.extendedMap(copy) !== undefined) {
              validSources.push(maybeSource)
            }
            return validSources
          }, [])
    }
    return validSources
  }

  validTargets (domainElement: groupElement): groupElement[] {
    const validTargets = this.codomain.elements
      .filter(
        (target) => this.domain.elementOrders[domainElement] % this.codomain.elementOrders[target] === 0
      )
      .reduce<groupElement[]>(
        (validTargets, maybeTarget) => {
          const copy = this.clone()
          copy.extend(domainElement, maybeTarget)
          if (copy.extendedMap(copy) !== undefined) {
            validTargets.push(maybeTarget)
          }
          return validTargets
        }, [])
    return validTargets
  }

  get fullMapping (): groupElement[] {
    if (this.fullMapping_ == null) {
      if (this.image.includes(undefined)) {
        this.fullMapping_ = (this.extendedMap(this) as Mapping).image
      } else {
        this.fullMapping_ = this.image
      }
    }

    return this.fullMapping_ as groupElement[]
  }

  extendedMap (mapping: Mapping): Maybe<Mapping> {
    const G = this.domain
    const H = this.codomain
    const map = mapping.image

    if (map.includes(undefined)) {
      for (const maybeSource of G.generators.filter((maybeSource) => map[maybeSource] === undefined)) {
        for (const maybeTarget of H.elements) {
          const mappingCopy = mapping.clone()
          mappingCopy.extend(maybeSource, maybeTarget)
          const result = this.extendedMap(mappingCopy)
          if (result !== undefined) {
            return result
          }
        }
      }
      return undefined
    } else {
      return mapping.isHomomorphism ? mapping : undefined
    }
  }
}
