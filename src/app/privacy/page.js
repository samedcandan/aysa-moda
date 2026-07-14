import Link from 'next/link';

export const metadata = {
  title: 'Gizlilik Politikası — Aysa Moda Giydirme',
  description: 'Aysa Moda Giydirme uygulamasının gizlilik politikası, KVKK uyumu ve veri güvenliği bilgileri.',
  robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      backgroundColor: '#0a0a12',
      color: '#cbd5e1',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      padding: '2rem 5%',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(22, 26, 37, 0.7)',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
      }}>

        <Link
          href="/"
          style={{
            color: '#d4a017',
            textDecoration: 'none',
            marginBottom: '2rem',
            display: 'inline-block',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          ← Ana Sayfaya Dön
        </Link>

        <h1 style={{
          color: '#f8fafc',
          fontSize: '2rem',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '1rem',
        }}>
          Gizlilik Politikası — Aysa Moda Giydirme
        </h1>

        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>1. AMAÇ VE KAPSAM</h3>
          <p>Karneyn Yazılım Hizmetleri Ltd. Şti. (&ldquo;Şirket&rdquo;) olarak, <strong>Aysa Moda Giydirme</strong> uygulaması (web ve mobil) aracılığıyla sunduğumuz hizmetlerden faydalanan kullanıcılarımızın kişisel verilerinin Türkiye Cumhuriyeti Anayasası ve 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) başta olmak üzere ilgili mevzuata uygun olarak işlenmesi ve verilerin güvenliğinin sağlanması en önemli önceliklerimizdendir.</p>
          <p>Bu politika, <strong>aysamoda.karneyn.com</strong> web sitesi ve Google Play Store&apos;dan indirilen mobil uygulama için geçerlidir.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>2. TOPLANAN BİLGİLER</h3>
          <p>Uygulamamız aşağıdaki verileri toplar ve işler:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '1rem' }}>
            <li><strong>Hesap Bilgileri:</strong> E-posta adresi, ad-soyad (Google ile giriş yapıldığında Google hesabınızdaki ad).</li>
            <li><strong>Kıyafet Fotoğrafları:</strong> Sanal giydirme ve video canlandırma hizmeti için yüklediğiniz ürün fotoğrafları.</li>
            <li><strong>Üretilen İçerikler:</strong> AI tarafından oluşturulan giydirme görselleri ve canlandırma videoları.</li>
            <li><strong>Ödeme Bilgileri:</strong> Kredi paketi satın alımlarında İyzico altyapısı üzerinden işlenen ödeme verileri.</li>
            <li><strong>Cihaz Bilgileri:</strong> Push bildirim tokenları (bildirim tercihinize bağlı olarak).</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>3. VERİ KULLANIM AMAÇLARI</h3>
          <p>Toplanan veriler aşağıdaki amaçlarla kullanılır:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '1rem' }}>
            <li>Kullanıcı hesabı oluşturmak ve oturum yönetimini sağlamak,</li>
            <li>Yüklenen kıyafet fotoğraflarını AI modelleri (GPT-4o, Fal.ai, Kling AI) ile analiz etmek ve sanal giydirme/video üretimi gerçekleştirmek,</li>
            <li>Kredi bakiyesi ve abonelik işlemlerini yönetmek,</li>
            <li>Video hazır olduğunda push bildirim göndermek,</li>
            <li>Müşteri desteği sağlamak ve geri bildirimleri değerlendirmek.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>4. YAPAY ZEKÂ VE GÖRSEL İŞLEME</h3>
          <p>Uygulamamız, kıyafet fotoğraflarınızı işlemek için üçüncü taraf AI servislerini (OpenAI GPT-4o, Fal.ai, Kling AI) kullanır. Bu servisler:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '1rem' }}>
            <li>Fotoğraflarınızı yalnızca işleme anında kullanır ve kalıcı olarak saklamaz,</li>
            <li>Fotoğraflarınızı model eğitimi veya başka amaçlarla kullanmaz,</li>
            <li>İşlenen görseller ve videolar Vercel Blob üzerinde güvenli şekilde depolanır.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>5. VERİ GÜVENLİĞİ VE KREDİ KARTI BİLGİLERİ</h3>
          <p>Şirketimiz, ödeme altyapısı olarak <strong>İyzico</strong> (BDDK lisanslı, PCI-DSS sertifikalı) ile çalışmaktadır. <strong>Kredi kartı bilgileriniz (kart numarası, son kullanma tarihi, CVC vb.) kesinlikle sunucularımızda saklanmaz.</strong> Tüm ödeme işlemleri İyzico&apos;nun güvenli altyapısı üzerinden gerçekleşir.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>6. VERİLERİN ÜÇÜNCÜ KİŞİLERLE PAYLAŞIMI</h3>
          <p>Kişisel verileriniz, yasal zorunluluklar haricinde üçüncü şahıslara satılmaz, kiralanmaz veya paylaşılmaz. Yalnızca hizmetin ifası için gerekli olan kurumlara (ödeme altyapısı, AI işleme servisleri) ilgili işlemin gerektirdiği ölçüde veri aktarımı yapılır.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>7. VERİ SAKLAMA SÜRESİ</h3>
          <p>Hesap bilgileriniz, hesabınızı silene kadar saklanır. Üretilen görseller ve videolar, oluşturulduktan sonra 30 gün boyunca indirilebilir durumda kalır. İşlenmemiş ham fotoğraflar, işlem tamamlandıktan sonra otomatik olarak silinir.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>8. ÇEREZLER VE OTURUM YÖNETİMİ</h3>
          <p>Uygulamamızda kullanıcı oturumlarını yönetmek için JWT (JSON Web Token) tabanlı güvenli çerezler kullanılmaktadır. Bu çerezler yalnızca oturum doğrulama amacıyla kullanılır ve kişisel mahremiyeti ihlal etmez.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>9. KAMERA VE GALERİ ERİŞİMİ</h3>
          <p>Mobil uygulamamız, kıyafet fotoğrafı çekmek veya galeriden seçmek amacıyla cihazınızın kamerasına ve fotoğraf galerisine erişim izni talep eder. Bu erişim yalnızca sizin tetiklemenizle (butona basarak) gerçekleşir ve arka planda otomatik erişim yapılmaz.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>10. BİLDİRİMLER</h3>
          <p>Uygulamamız, video üretimi tamamlandığında sizi bilgilendirmek amacıyla Firebase Cloud Messaging (FCM) aracılığıyla push bildirimleri gönderebilir. Bildirim tercihinizi cihaz ayarlarından istediğiniz zaman değiştirebilirsiniz.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>11. HAKLARINIZ</h3>
          <p>6698 sayılı KVKK Madde 11 uyarınca aşağıdaki haklara sahipsiniz:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '1rem' }}>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>İşlenmesini gerektiren sebeplerin ortadan kalkması halinde silinmesini talep etme.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>12. İLETİŞİM</h3>
          <p>Gizlilik politikası ve veri güvenliği ile ilgili sorularınız için:</p>
          <p>
            <strong>Karneyn Yazılım Hizmetleri Ltd. Şti.</strong><br/>
            E-posta: <a href="mailto:info@karneyn.com" style={{ color: '#d4a017' }}>info@karneyn.com</a><br/>
            Web: <a href="https://www.karneyn.com" style={{ color: '#d4a017' }}>www.karneyn.com</a>
          </p>

          <div style={{
            marginTop: '3rem',
            fontSize: '0.85rem',
            color: '#64748b',
            textAlign: 'center',
          }}>
            Son Güncelleme: 14 Temmuz 2026
          </div>
        </div>
      </div>
    </div>
  );
}
