type Maybe<T> = T | null | undefined
type groupElement = number
type float = number
type integer = number
type html = string
type color = string
type TimeoutID = number
type NumberLocation = { clientX: number, clientY: number }
interface Serializable<T> {
    toJSON: () => T;
    fromJSON: (json: T) => void;
}
