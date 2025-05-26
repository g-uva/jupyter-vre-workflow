// types/entities.d.ts
declare module 'entities/decode' {
  export interface EntityDecoder {
    decode: (input: string) => string;
  }

  export const defaultDecoder: EntityDecoder;
}
