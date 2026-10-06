const TURKISH_TO_ASCII: Record<string, string> = {
  ı: 'i',
  İ: 'I',
  ş: 's',
  Ş: 'S',
  ğ: 'g',
  Ğ: 'G',
  ü: 'u',
  Ü: 'U',
  ö: 'o',
  Ö: 'O',
  ç: 'c',
  Ç: 'C',
  â: 'a',
  Â: 'A',
  î: 'i',
  Î: 'I',
  û: 'u',
  Û: 'U',
};

/**
 * A blind test guest's name as it is typed: Turkish letters in ASCII, all
 * capitals ("ayşe yılmaz" -> "AYSE YILMAZ"), one character for one so the
 * cursor stays put. Spaces are left alone while typing; main-service tidies
 * them and keeps names the same way (usecase.GuestDisplayName).
 */
export function guestNameInput(raw: string): string {
  return [...raw].map((c) => (TURKISH_TO_ASCII[c] ?? c).toLocaleUpperCase('en')).join('');
}
