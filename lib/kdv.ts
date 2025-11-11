/**
 * KDV hesaplayıcısı. Kullanıcı net tutar ve KDV oranı girer,
 * fonksiyon net, hesaplanan kdv ve brüt toplamı döndürür.
 */
export function calcAnlasma({ net, kdv_oran }: { net: number; kdv_oran: number }) {
  const kdv = net * kdv_oran;
  const brut = net + kdv;
  return { net, kdv, brut };
}