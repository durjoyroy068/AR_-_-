const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bengaliToEnglishMap: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function toBengaliNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  return str.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

export function toEnglishNumber(str: number | string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str.toString().replace(/[০-৯]/g, (digit) => bengaliToEnglishMap[digit] || digit);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${toBengaliNumber(mins)}:${toBengaliNumber(formattedSecs)}`;
}
