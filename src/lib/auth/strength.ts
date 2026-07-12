/** Lightweight password-strength estimate (0–4) with a label and hue. */
export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hint: string;
}

export function estimateStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "", hint: "" };
  let score = 0;
  const len = pw.length;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (len >= 16) score++;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
    r.test(pw),
  ).length;
  if (classes >= 3) score++;
  if (classes >= 4 && len >= 12) score++;
  const capped = Math.min(4, score) as Strength["score"];
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"];
  const hints = [
    "Use a longer passphrase.",
    "Add length and variety.",
    "Getting there — aim for 12+ characters.",
    "Good. A passphrase of several words is ideal.",
    "Excellent. Store it somewhere safe.",
  ];
  return { score: capped, label: labels[capped], hint: hints[capped] };
}

const WORDS = [
  "harbor", "willow", "ember", "cobalt", "meadow", "lantern", "cinder", "orchid",
  "granite", "velvet", "marble", "cypress", "saffron", "thistle", "amber", "quartz",
  "juniper", "beacon", "wander", "hollow", "nimbus", "pewter", "russet", "verdant",
];

/** Suggest a strong, memorable passphrase (for the generator in Notes/Passwords). */
export function generatePassphrase(words = 4): string {
  const out: string[] = [];
  const rand = new Uint32Array(words);
  crypto.getRandomValues(rand);
  for (let i = 0; i < words; i++) out.push(WORDS[rand[i] % WORDS.length]);
  const digits = new Uint32Array(1);
  crypto.getRandomValues(digits);
  return `${out.join("-")}-${digits[0] % 100}`;
}

export function generatePassword(length = 20): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_";
  const out: string[] = [];
  const rand = new Uint32Array(length);
  crypto.getRandomValues(rand);
  for (let i = 0; i < length; i++) out.push(alphabet[rand[i] % alphabet.length]);
  return out.join("");
}
