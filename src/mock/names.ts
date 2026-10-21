// A mix of Yoruba, Igbo, and Hausa names for plausible Nigerian merchant data.
export const firstNames = [
  "Adaeze", "Adebayo", "Aisha", "Amaka", "Babatunde", "Bola", "Chika", "Chinedu",
  "Chioma", "Damilola", "Ebere", "Emeka", "Fatima", "Folake", "Funmi", "Halima",
  "Ibrahim", "Ifeoma", "Kehinde", "Kemi", "Lateef", "Mariam", "Musa", "Ngozi",
  "Nkechi", "Obinna", "Olumide", "Oluwaseun", "Sade", "Segun", "Tobi", "Tunde",
  "Uche", "Yetunde", "Yusuf", "Zainab", "Olamide", "Chidinma", "Hauwa", "Adetola",
];

export const lastNames = [
  "Adekunle", "Adeyemi", "Afolabi", "Akinwale", "Aliyu", "Anozie", "Bakare",
  "Balogun", "Chukwu", "Danjuma", "Eze", "Ibe", "Ibrahim", "Ifeanyi", "Iroegbu",
  "Lawal", "Mohammed", "Nwosu", "Obi", "Ogundimu", "Okafor", "Okeke", "Okonkwo",
  "Okoro", "Olawale", "Olusegun", "Onyekachi", "Oyelowo", "Sanusi", "Suleiman",
  "Umar", "Yakubu", "Adesanya", "Babatunde", "Eke", "Ezekiel",
];

export const businessNames = [
  "Lagos Threadworks",
  "Yaba Tech Hub",
  "Aso Rock Logistics",
  "Aje Foods & Catering",
  "Niger Delta Crafts",
  "Ikoyi Gardens Spa",
  "Surulere Books",
  "Abuja Ride-Hail",
  "Oshodi Mart",
  "Mainland Coffee Co.",
  "Calabar Cuisine",
  "Port Harcourt Steel",
  "Kano Cotton Co-op",
  "Benin Naturals",
  "Enugu Music Group",
];

let _seed = 1;
function rand() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}
export function pseudoRandom(reset?: number) {
  if (reset !== undefined) _seed = reset;
  return rand();
}
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
export function int(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
export function fakeName(): string {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}
export function fakeEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@${pick([
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "icloud.com",
  ])}`;
}
export function fakePhone(): string {
  return `+234${pick(["703", "806", "812", "815", "905", "913", "916"])}${int(
    1000000,
    9999999,
  )}`;
}
export function fakeRef(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(rand() * chars.length)];
  return `T_${s}`;
}
