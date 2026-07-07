/** אימות מספר תעודת זהות ישראלית (ספרת ביקורת) */
export function isValidIsraeliId(value: string): boolean {
  const digits = (value || '').replace(/\D/g, '')
  if (digits.length === 0 || digits.length > 9) return false
  const padded = digits.padStart(9, '0')
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let num = Number(padded[i]) * ((i % 2) + 1)
    if (num > 9) num -= 9
    sum += num
  }
  return sum % 10 === 0
}

/** עיצוב מספר כרטיס לקבוצות של 4 ספרות */
export function formatCardNumber(value: string): string {
  const digits = (value || '').replace(/\D/g, '')
  return digits.replace(/(.{4})/g, '$1 ').trim()
}
