export type CardType =
  | 'id'
  | 'license'
  | 'membership'
  | 'credit'
  | 'transit'
  | 'health'
  | 'other'

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'QR'

export interface WalletCard {
  id: string
  type: CardType
  title: string
  issuer?: string
  holderName?: string
  cardNumber?: string
  barcodeData?: string
  barcodeFormat?: BarcodeFormat
  frontColor: string
  /** תמונת חזית הכרטיס לאחר צילום וחיתוך (data URL של JPEG) */
  imageData?: string
  /** תמונת גב הכרטיס לאחר צילום וחיתוך (data URL של JPEG) */
  imageBackData?: string
  /** שדות ייעודיים לפי סוג הכרטיס (ת.ז, רשיון וכו') */
  details: Record<string, string>
  notes?: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

/** קלט ליצירה/עדכון — ללא שדות שהמערכת מנהלת */
export type CardInput = Omit<WalletCard, 'id' | 'createdAt' | 'updatedAt'>

export interface CardTypeMeta {
  type: CardType
  label: string
  icon: string
  color: string
  /** שדות ייעודיים המוצגים בטופס עבור סוג זה */
  fields: { key: string; label: string; placeholder?: string }[]
}

export const CARD_TYPES: CardTypeMeta[] = [
  {
    type: 'id',
    label: 'תעודת זהות',
    icon: '🪪',
    color: '#595f63',
    fields: [
      { key: 'idNumber', label: 'מספר תעודת זהות', placeholder: '000000000' },
      { key: 'dateOfBirth', label: 'תאריך לידה', placeholder: 'DD/MM/YYYY' },
      { key: 'issueDate', label: 'תאריך הנפקה', placeholder: 'DD/MM/YYYY' },
      { key: 'address', label: 'כתובת' },
    ],
  },
  {
    type: 'license',
    label: 'רשיון נהיגה',
    icon: '🚗',
    color: '#695b55',
    fields: [
      { key: 'licenseNumber', label: 'מספר רשיון', placeholder: '00000000' },
      { key: 'categories', label: 'דרגות', placeholder: 'B, A' },
      { key: 'validUntil', label: 'בתוקף עד', placeholder: 'DD/MM/YYYY' },
      { key: 'issueDate', label: 'תאריך הנפקה', placeholder: 'DD/MM/YYYY' },
    ],
  },
  {
    type: 'membership',
    label: 'כרטיס מועדון',
    icon: '🎫',
    color: '#5d5e60',
    fields: [
      { key: 'membershipLevel', label: 'רמת חברות' },
      { key: 'points', label: 'נקודות' },
      { key: 'validUntil', label: 'בתוקף עד', placeholder: 'DD/MM/YYYY' },
    ],
  },
  {
    type: 'credit',
    label: 'כרטיס אשראי',
    icon: '💳',
    color: '#44474a',
    fields: [
      { key: 'expiry', label: 'תוקף', placeholder: 'MM/YY' },
      { key: 'network', label: 'רשת', placeholder: 'Visa / Mastercard' },
    ],
  },
  {
    type: 'transit',
    label: 'כרטיס תחבורה',
    icon: '🚌',
    color: '#4a5560',
    fields: [
      { key: 'balance', label: 'יתרה' },
      { key: 'validUntil', label: 'בתוקף עד', placeholder: 'DD/MM/YYYY' },
    ],
  },
  {
    type: 'health',
    label: 'כרטיס בריאות',
    icon: '🏥',
    color: '#5a6b5e',
    fields: [
      { key: 'hmo', label: 'קופת חולים' },
      { key: 'memberNumber', label: 'מספר חבר' },
    ],
  },
  {
    type: 'other',
    label: 'כרטיס אחר',
    icon: '🗂️',
    color: '#767779',
    fields: [{ key: 'info', label: 'פרטים נוספים' }],
  },
]

export function getCardTypeMeta(type: CardType): CardTypeMeta {
  return CARD_TYPES.find((t) => t.type === type) ?? CARD_TYPES[CARD_TYPES.length - 1]
}
