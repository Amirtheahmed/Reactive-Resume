export const templatesList = [
  "azurill",
  "bronzor",
  "chikorita",
  "ditto",
  "gengar",
  "glalie",
  "goldstar",
  "kakuna",
  "leafish",
  "nosepass",
  "onyx",
  "pikachu",
  "rhyhorn",
] as const;

export type Template = (typeof templatesList)[number];
