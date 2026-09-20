# Patch Izgarası — deneme düzeneği

Patch Izgarası sekmesini **backend, giriş ve gerçek veri olmadan** çalıştırır: gerçek
`PatchGridWorkspace` bileşeni, gerçek worker ve gerçek hesap; yalnızca ağ sahte.

```bash
python dev-harness/generate_data.py   # bir kez: sentetik slaytlar → dev-harness/data (gitignore'da, ~50 MB)
npm run harness                       # http://localhost:5199/dev-harness/patch-grid.html
```

Gerçek maske ve annotation'larla denemek için (dev-ingestor'ın yerel aynasından okur, buluta dokunmaz):

```bash
python dev-harness/from_mirror.py Zenodo-Dataset Gleason_CNN --images 4
```

Slayt pikselleri okunmaz: karolar doku maskesinden çizilir (en fazla 4096 px; daha derin zoom'da düz gri karo),
poligonlar ve onlardan hesaplanan her şey gerçektir. Her annotator'dan görüntü seçer. `histopathai` paketi gerekir.

`generate_data.py` Pillow ve numpy ister (`ml/.venv/bin/python` ikisini de içerir).

| Görüntü | Ne gösterir |
|---|---|
| `resection_01.svs` | Delikli büyük parça + delik içinde ada + fragmanlar; iki kişinin "Gleason Pattern" bölgeleri (iç içe G4 ⊂ G3 → karışık bölgeler) |
| `biopsy_glands_07.svs` | İçe aktarılmış 520 bez poligonu: ızgara neredeyse hiç patch vermez → "Merkezli yerleşime geç", `merge`, kalabalık uyarısı |
| `biopsy_rejected_mask.svs` | Reddedilmiş doku maskesi |
| `resection_no_mask.svs` | Doku maskesi yok |
| `resection_no_mpp.png` | `mpp` yok → ızgara hesaplanmaz |
| `biopsy_no_annotations.svs` | Poligonlu annotation yok |

`main.ts` sekmenin yaptığı dört repository çağrısını `data/api.json`'dan cevaplar (annotation'lar
main-service gibi 100'lük sayfalarla); `vite.config.ts` karo proxy'sinin yolunu (`/api/v1/proxy/...`)
`data/tiles`'tan sunar. Production build'e hiçbir şey girmez.

## Kullanıcı Yönetimi

`http://localhost:5199/dev-harness/users.html` — admin kullanıcı listesini 130 uydurma kullanıcıyla açar (100'lük
sayfalamayı da sınar). Admin repository'si bellekte sahtedir: onay, askıya alma ve grup değiştirme çalışır,
hiçbir şey sayfanın dışına çıkmaz. Veri üretmek gerekmez.


## Bitenleri Gizle

`http://localhost:5199/dev-harness/finished.html?mode=labeling` (`tissue`, `none`) — gerçek sidebar, gerçek
gezinme ve store'lar; repository'ler bellekte sahte. Uydurma veri daha önce bozulan durumları taşır: 25 görüntülü
ve en yeni 20'si bitmiş hasta (API 20'şer sayfalar), baştan sona bitmiş bir hasta sayfası, bitmiş bir veri seti ve
listede kalması gereken görüntüsüz yeni veri seti. "İşaretleme Tamamlandı" / "Maskeyi onayla" düğmeleri sekmelerin
yaptığını yapar; sayfa yenilenince veri başa döner. Veri üretmek gerekmez.
