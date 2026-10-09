export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const LEVELS: Omit<Strength, "score">[] = [
  { label: "Muy débil", color: "#ff6b6b" },
  { label: "Débil", color: "#ff9f43" },
  { label: "Aceptable", color: "#f6c945" },
  { label: "Fuerte", color: "#3ccf91" },
  { label: "Muy fuerte", color: "#2bb673" },
];

/**
 * A simple, explainable score: length and variety of characters.
 * The backend only requires 8 characters; this meter nudges for more.
 */
export function passwordStrength(password: string): Strength {
  if (password.length < 8) return { score: 0, ...LEVELS[0] };
  let points = 1;
  if (password.length >= 12) points += 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (kinds >= 2) points += 1;
  if (kinds >= 3) points += 1;
  if (/^(.)\1+$/.test(password) || /^(?:1234|qwer|pass|abcd)/i.test(password)) points = 1;
  const score = Math.min(4, points) as Strength["score"];
  return { score, ...LEVELS[score] };
}
