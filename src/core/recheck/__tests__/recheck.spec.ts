import { describe, expect, it } from 'vitest';
import {
  groupRechecks,
  outcomeShortLabel,
  ownReasons,
  reasonSentence,
  recheckFromApi,
  type RecheckRequest,
} from '..';

function req(imageId: string, wsId: string, imageName: string, status: 'open' | 'done' = 'open'): RecheckRequest {
  return recheckFromApi({ image_id: imageId, ws_id: wsId, image_name: imageName, status });
}

describe('reasonSentence', () => {
  it('shows the fixed sentence of a reason', () => {
    expect(reasonSentence({ code: 'subtype', note: 'ignored' })).toBe('Alt tip yeniden incelenmeli');
    expect(reasonSentence({ code: 'polygon_missing', note: '' })).toBe('Poligon eksik');
  });

  it('shows the dataset reason as a fixed sentence (its note goes over the group)', () => {
    expect(reasonSentence({ code: 'dataset', note: 'Yeni yüklendi' })).toBe(
      'Veri seti uzman incelemesine gönderildi'
    );
  });

  it('shows the note of "other"', () => {
    expect(reasonSentence({ code: 'other', note: 'Hiç etiket yok' })).toBe('Hiç etiket yok');
  });
});

describe('recheckFromApi', () => {
  it('maps the server fields', () => {
    const r = recheckFromApi({
      image_id: 'i1',
      image_name: '24.jpg',
      patient_id: 'p1',
      patient_name: '24',
      ws_id: 'w1',
      status: 'done',
      reasons: [{ code: 'subtype', note: 'n', requested_by: 'u', requested_at: 't' }],
      completed_by: 'e',
      completed_at: 'c',
    });
    expect(r).toMatchObject({ imageId: 'i1', imageName: '24.jpg', patientName: '24', wsId: 'w1', status: 'done' });
    expect(r.reasons).toEqual([{ code: 'subtype', note: 'n', requestedBy: 'u', requestedAt: 't' }]);
    expect(r.completedBy).toBe('e');
  });

  it("maps the expert's answer and drops an unknown outcome", () => {
    const r = recheckFromApi({ image_id: 'i1', status: 'done', outcome: 'no_change', completion_note: 'IDC ile uyumlu' });
    expect(r.outcome).toBe('no_change');
    expect(r.completionNote).toBe('IDC ile uyumlu');
    expect(recheckFromApi({ image_id: 'i1', outcome: 'maybe' }).outcome).toBeNull();
    expect(outcomeShortLabel('undecided')).toBe('Karar verilemedi');
    expect(outcomeShortLabel(null)).toBe('Tamamlandı');
  });

  it('treats a missing status as open and a missing reason list as empty', () => {
    const r = recheckFromApi({ image_id: 'i1' });
    expect(r.status).toBe('open');
    expect(r.reasons).toEqual([]);
    expect(r.completedBy).toBeNull();
  });
});

describe('groupRechecks', () => {
  const list = [
    req('a', 'w2', '140.jpg'),
    req('b', 'w1', 'MSB-1.svs', 'done'),
    req('c', 'w2', '24.jpg'),
    req('d', 'w9', 'x.jpg'),
    req('e', 'w1', 'MSB-0.svs'),
  ];

  it('orders workspaces as given, unknown ones last, and image names numerically', () => {
    const groups = groupRechecks(list, ['w1', 'w2'], false);
    expect(groups.map((g) => g.wsId)).toEqual(['w1', 'w2', 'w9']);
    expect(groups[1]!.requests.map((r) => r.imageName)).toEqual(['24.jpg', '140.jpg']);
    expect(groups[0]!.open).toBe(1);
  });

  it('hides done requests but keeps the open one in the viewer', () => {
    expect(groupRechecks(list, ['w1', 'w2'], true)[0]!.requests.map((r) => r.imageId)).toEqual(['e']);
    expect(groupRechecks(list, ['w1', 'w2'], true, 'b')[0]!.requests.map((r) => r.imageId)).toEqual([
      'e',
      'b',
    ]);
  });

  it('drops a workspace whose requests are all done', () => {
    const groups = groupRechecks([req('b', 'w1', 'x', 'done'), req('a', 'w2', 'y')], [], true);
    expect(groups.map((g) => g.wsId)).toEqual(['w2']);
  });
});

describe('dataset reasons', () => {
  const withDataset = (imageId: string, wsId: string, note: string, extra: any[] = []) =>
    recheckFromApi({
      image_id: imageId,
      ws_id: wsId,
      image_name: imageId,
      reasons: [{ code: 'dataset', note }, ...extra],
    });

  it('collects the notes once per workspace', () => {
    const groups = groupRechecks(
      [withDataset('a', 'w1', 'Yeni yüklendi'), withDataset('b', 'w1', 'Yeni yüklendi'), withDataset('c', 'w2', 'Başka')],
      [],
      false
    );
    expect(groups.map((g) => g.datasetNotes)).toEqual([['Yeni yüklendi'], ['Başka']]);
    expect(groupRechecks([req('x', 'w1', 'x')], [], false)[0]!.datasetNotes).toEqual([]);
  });

  it("lists only an image's own reasons under it", () => {
    const r = withDataset('a', 'w1', 'n', [{ code: 'polygon', note: '' }]);
    expect(ownReasons(r).map((x) => x.code)).toEqual(['polygon']);
  });
});
