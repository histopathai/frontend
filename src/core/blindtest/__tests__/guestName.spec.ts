import { describe, expect, it } from 'vitest';
import { guestNameInput } from '../guestName';

describe('guestNameInput', () => {
  it('writes Turkish names in ASCII capitals', () => {
    expect(guestNameInput('ayşe yılmaz')).toBe('AYSE YILMAZ');
    expect(guestNameInput('Çağrı Öztürk')).toBe('CAGRI OZTURK');
    expect(guestNameInput('İlknur Işık')).toBe('ILKNUR ISIK');
    expect(guestNameInput('şükrü gökçe')).toBe('SUKRU GOKCE');
    expect(guestNameInput('hâlâ îmece')).toBe('HALA IMECE');
  });

  it('keeps spaces while typing, one character for one', () => {
    expect(guestNameInput('ayşe ')).toBe('AYSE ');
    const typed = 'ığüşöç İĞÜŞÖÇ';
    expect(guestNameInput(typed)).toHaveLength(typed.length);
  });
});
