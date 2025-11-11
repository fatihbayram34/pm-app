import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/tr';

// Extend dayjs with UTC and timezone plugins.
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default locale and timezone.
dayjs.locale('tr');
dayjs.tz.setDefault(process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Europe/Istanbul');

/**
 * dayjs() fonksiyonunu dışa aktarır. Bu fonksiyon ile
 * tarihleri istenilen formatta ve saat diliminde üretebilirsiniz.
 */
export default dayjs;

/**
 * GG.AA.YYYY formatında tarih biçimlendirme yardımcı fonksiyonu.
 */
export function formatDateTR(date: Date | string): string {
  return dayjs(date).tz().format('DD.MM.YYYY');
}