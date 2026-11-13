# Araç Takip — Garajım

Birden fazla aracın yakıt, bakım, masraf ve belgelerini cihazında takip eden, çevrimdışı çalışan kişisel PWA. Build adımı yoktur; GitHub Pages'te herhangi bir repo altında doğrudan açılır.

## Bölümler

- **Panel**: seçili aracın güncel kilometresi, ortalama tüketimi, bu ayki masrafı, yaklaşan hatırlatmaları ve son hareketleri.
- **Yakıt**: tarih, kilometre, litre, litre fiyatı, toplam tutar, istasyon ve not; dolu/kısmi dolum.
- **Bakım**: yağ, filtre, lastik, fren, muayene, sigorta, akü ve diğerleri; maliyet, sonraki tarih/KM.
- **Masraf**: vergi, sigorta, ceza, otopark, yıkama, köprü/otoyol ve diğer giderler.
- **Belgeler**: ruhsat, poliçe, muayene, ehliyet ve notlar; tarih, numara ve isteğe bağlı fotoğraf.
- **Ayarlar**: araç yönetimi, tema, para birimi, JSON yedekleme ve sıfırlama.

## Öne çıkanlar

- **Çoklu araç**: üstteki seçiciyle araç değiştirilir; tüm kayıtlar araca göre filtrelenir.
- **Tüketim**: dolu depo yöntemi. İki dolu dolum arasındaki mesafe ve toplanan litre ile **L/100km**, ayrıca **₺/km** ve ortalama litre fiyatı hesaplanır. Kısmi dolumlar bir sonraki dolu doluma eklenir.
- **Otomatik hatırlatmalar**: araç aralıkları (yağ km/ay, lastik km/ay, muayene ve sigorta tarihi) ile son servis kaydından üretilir. Gecikmiş, 30 gün / 1.000 km içinde ve planlı olarak sınıflandırılır.
- **Manuel hatırlatma**: tarih ve/veya kilometre bazlı; tamamlandı olarak işaretlenebilir.
- **Grafikler**: tüketim trendi (SVG çizgi), aylık toplam (çubuk) ve kategori dağılımı; harici kütüphane yoktur.
- **Yedekleme**: tüm metin verisi ve belge fotoğrafları tek JSON dosyasına aktarılır; içe aktarmada doğrulama yapılır.
- **KM kontrolü**: yeni yakıt kaydında girilen kilometre mevcut değerden düşükse onay istenir.
- **PWA**: manifest + service worker; ana ekrana eklenince tam ekran ve çevrimdışı çalışır.
- **Gizlilik**: hesap, sunucu ve takip yoktur. Metin verileri `localStorage`, belge fotoğrafları `IndexedDB` içinde yalnızca cihazda tutulur.
- **Tema**: otomatik / açık / koyu.
- **Tarih biçimi**: her yerde `GG/AA/YYYY` (örn. `13/11/2026`).

## Veri modeli

`localStorage` anahtarı: `aracTakip.v1`

```js
{
  version: 1,
  settings: { theme, currency, activeVehicleId },
  vehicles: [{ id, name, plate, brand, model, year, fuelType, tankL,
               purchaseOdometer, purchaseDate, intervals }],
  fuelLogs: [{ id, vehicleId, date, odometer, liters, pricePerL, total,
               full, station, note }],
  services: [{ id, vehicleId, type, date, odometer, cost, note,
               nextDate, nextOdometer }],
  expenses: [{ id, vehicleId, date, category, amount, odometer, note }],
  documents: [{ id, vehicleId, title, type, number, issuedDate,
                expiryDate, note, hasPhoto }],
  reminders: [{ id, vehicleId, title, dueDate, dueOdometer, done }]
}
```

- Fotoğraflar: IndexedDB `arac-takip-db` / `photos` (`id`, `vehicleId`, `blob`).
- Yedek dosyası: `{ app, version, exportedAt, state, photos: [{ id, vehicleId, dataUrl }] }`.

## Dosyalar

```
index.html      # kabuk, sekmeler, sheet
style.css       # tema ve bileşenler
logic.js        # saf hesaplamalar (tarih, tüketim, hatırlatma, maliyet)
db.js           # IndexedDB fotoğraf deposu
app.js          # yönlendirme, render, formlar, grafikler
sw.js           # çevrimdışı önbellek
manifest.json   # PWA tanımı
test/           # node:test birim testleri
tools_icon.py   # ikon üretimi (Pillow)
```

## Geliştirme

```bash
# yerel önizleme
python -m http.server 8080
# http://localhost:8080

# birim testleri
node --test test/
```

`file://` üzerinden service worker çalışmaz; önizleme için yerel sunucu kullan.

## Ana ekrana ekleme (iPhone / iPad)

1. Uygulamayı Safari'de aç.
2. **Paylaş → Ana Ekrana Ekle**.
3. iOS 26'da **“Web Uygulaması Olarak Aç”** seçeneğini açık bırak.

Bu seçenek kapalıysa simge bir yer imi olur ve Safari sekmesinde açılır; Safari küçültülünce uygulama da küçülür. Bu durumda simgeyi silip yukarıdaki adımlarla yeniden ekle. Uygulama içindeki **Ayarlar → Uygulama modu** satırı hangi modda çalıştığını gösterir.

## GitHub Pages

Repo kökünde yayınla:

1. `main` dalına push et.
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
3. Adres: `https://<kullanıcı>.github.io/arac-pwa/`

`.nojekyll` dosyası olduğu gibi korunmalıdır. Güncellemede `sw.js` içindeki `CACHE` sürümünü artır.

## Sınırlar

- Veriler cihazlar arasında senkronize olmaz; yedek JSON'u elle taşıman gerekir.
- `localStorage` tipik olarak ~5 MB'dir. Fotoğraflar IndexedDB'de tutulur ve yedeğe base64 olarak eklenir; çok sayıda fotoğraf büyük yedek dosyası oluşturabilir.
- Tüketim ve maliyet hesapları kayıtlarına dayanır; eksik veya hatalı kilometre değerleri sonucu etkiler.
- Uygulama tıbbi/finansal tavsiye vermez; yalnızca kişisel kayıt tutar.
