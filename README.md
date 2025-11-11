# Genel Proje & Maliyet Yönetimi Uygulaması

Bu depo, bir mühendislik firması için geliştirilen **Genel Proje & Maliyet Yönetimi** aracının Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Firebase Firestore (+Storage) tabanlı iskeletidir. Uygulama mobile‑first yaklaşımla tasarlanmış, Türkçe dilini ve `Europe/Istanbul` saat dilimini kullanmaktadır. Tüm veriler Firestore üzerinde saklanır ve gerçek zamanlı olarak güncellenir.

> **Önemli Not:** Bu iskelet, tam işlevsel bir uygulama için başlangıç sağlar. Kendi Firebase projenizi oluşturarak `.env.local` dosyasını doldurmanız ve `npm install` ile gerekli paketleri kurmanız gerekmektedir.

## Kurulum

1. **Proje Dizini**

   ```bash
   git clone <bu-repo-url> && cd pm-app
   ```

2. **Bağımlılıkları Kurun**

   Uygulama için gerekli paketler `package.json` dosyasında tanımlanmıştır. Kendi geliştirme ortamınızda çalıştırmadan önce bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

3. **Firebase Projesi Oluşturun**

   - Firebase konsolunda yeni bir proje oluşturun.
   - Firestore ve Storage servislerini etkinleştirin.
   - Web için bir uygulama ekleyip **API anahtarını** ve yapılandırma bilgilerinin tamamını alın.
   - Firestore güvenlik kurallarını aşağıdaki şablonla başlatın:

     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if request.time < timestamp.date(2100, 1, 1);
         }
       }
     }
     ```

4. **.env.local Dosyasını Oluşturun**

   Kök dizinde `.env.example` örneği bulunmaktadır. Kendi Firebase değerlerinizi `.env.local` olarak kopyalayıp doldurun:

   ```bash
   cp .env.example .env.local
   # ardından dosyayı düzenleyin
   ```

5. **Geliştirme Sunucusunu Başlatın**

   ```bash
   npm run dev
   ```

   Uygulamayı [http://localhost:3000](http://localhost:3000) adresinde görüntüleyebilirsiniz.

6. **Vercel’e Dağıtım**

   - Depoyu Vercel’e bağlayarak kolayca dağıtabilirsiniz. Vercel proje ayarlarında gerekli `.env` değişkenlerini tanımlamayı unutmayın.

## Proje Yapısı

```
pm-app/
├── app/               # Next.js App Router kök dizini
│   ├── layout.tsx     # Kök layout (shadcn/ui ve provider'lar)
│   ├── page.tsx       # Ana sayfa yönlendirmesi
│   ├── dashboard/     # Dashboard sayfası ve bileşenleri
│   ├── musteriler/    # Müşteriler listesi ve modallar
│   ├── projeler/      # Projeler listesi ve detayları
│   ├── katalog/       # Malzeme katalogu
│   ├── stok/          # Stok hareketleri
│   ├── tahsilatlar/   # Tahsilat listesi ve ekleme
│   └── raporlar/      # Raporlama sayfası
├── components/        # Paylaşılan UI bileşenleri
├── lib/               # Yardımcı fonksiyonlar ve Firestore DAO'lar
├── public/            # Statik dosyalar
├── seed/              # Örnek tohum verileri
├── .env.example       # Firebase yapılandırma örneği
├── package.json       # Bağımlılıklar ve script'ler
├── tsconfig.json      # TypeScript yapılandırması
├── tailwind.config.ts # Tailwind yapılandırması
└── README.md          # Bu dosya
```

## Temel Özellikler

- **Gerçek Zamanlı Firestore**: `onSnapshot` dinleyicileri ile listeler ve grafikler canlı olarak güncellenir.
- **Türkçe Arayüz**: Tarih formatı `GG.AA.YYYY`, para birimi `Türk Lirası` (`TRY`), arayüz mesajları ve etiketleri Türkçe.
- **Mobil Öncelikli Tasarım**: Tailwind CSS ve shadcn/ui bileşenleri ile duyarlı (responsive) ve erişilebilir arayüzler.
- **Formlar & Doğrulama**: `React Hook Form` ve `Zod` ile tip güvenli formlar.
- **Grafikler**: Recharts kullanılarak tahsilat/masraf trendleri ve proje dağılımları görselleştirilir.
- **Tip Güvenliği**: Firestore veri modelleri TypeScript tipleri ve Zod şemaları ile tanımlanır.
- **Yardımcı Kütüphaneler**: `lib/` klasöründe KDV hesaplama, para biçimlendirme, tarih yerelleştirme ve müşteri/proje/stoğa ait agregasyon fonksiyonları mevcuttur.
- **Tohum Verileri**: `seed/` dizininde örnek müşteriler, projeler, malzeme katalogu, stok hareketleri ve tahsilatlar bulunmaktadır. Bunları geliştirme sürecinde manuel olarak Firestore’a aktarabilirsiniz.

## Geliştirmeye Başlama

Bu iskelet, tüm sayfalar ve bileşenler için temel dosya yapısını sunar. Belirtilen iş kuralları ve formlar için örnek uygulamalar sağlanmıştır; projeyi kendi ihtiyaçlarınıza göre genişletebilir veya özelleştirebilirsiniz.

Sorularınız veya önerileriniz olursa lütfen katkıda bulunun!