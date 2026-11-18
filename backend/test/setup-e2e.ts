import { hashSync } from 'bcryptjs';
import { E2E_ADMIN } from './e2e-credentials';

/**
 * Her e2e test dosyasından önce çalışır (jest-e2e.json -> setupFiles).
 * process.env'deki değerler .env dosyasındakilerden önceliklidir; böylece
 * testler gerçek login akışını bilinen bir test parolasıyla kullanır.
 * Güvenlik katmanı (JWT guard, Helmet, CORS, rate limit) devre dışı bırakılmaz.
 */
process.env.ADMIN_USERNAME = E2E_ADMIN.username;
// Testleri hızlandırmak için düşük bcrypt maliyeti; yalnızca test parolası içindir.
process.env.ADMIN_PASSWORD_HASH = hashSync(E2E_ADMIN.password, 4);

// Fonksiyonel test dosyaları tek IP'den (127.0.0.1) saniyeler içinde yüzlerce
// istek gönderir. Genel sınır bu yüzden yüksek tutulur; login için ayrı ve
// sabit (dakikada 5) sınır aynen geçerlidir ve auth testlerinde doğrulanır.
process.env.RATE_LIMIT_PER_MINUTE = '1000';
