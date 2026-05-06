// ═══════════════════════════════════════════════════
// CHATBOT INTENT ENGINE — Smart Query Understanding
// Parses customer input, detects intent, sentiment,
// looks up real data, generates professional responses
// ═══════════════════════════════════════════════════

import { db } from './db'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Types ──────────────────────────────────────
export interface CustomerProfile {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  createdAt: Date
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: Decimal
  createdAt: Date
  items: { productName: string; quantity: number; unitPrice: Decimal }[]
  shipments: { carrier: string | null; trackingNumber: string | null; status: string; estimatedDelivery: Date | null; deliveredAt: Date | null }[]
  payments: { method: string | null; status: string; amount: Decimal }[]
  refunds: { amount: Decimal; status: string; reason: string | null; createdAt: Date }[]
}

export interface IntentResult {
  intent: string
  confidence: number
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED'
  response: string
  metadata: Record<string, unknown>
  showOptions?: { label: string; value: string }[]
  needsEscalation?: boolean
  escalationSubject?: string
}

// ─── Intent Categories ──────────────────────────
const INTENTS = {
  GREETING: 'greeting',
  FAREWELL: 'farewell',
  THANKS: 'thanks',
  ORDER_STATUS: 'order_status',
  TRACK_ORDER: 'track_order',
  DELIVERY_TIME: 'delivery_time',
  CANCEL_ORDER: 'cancel_order',
  RETURN_ITEM: 'return_item',
  REFUND_STATUS: 'refund_status',
  PAYMENT_ISSUE: 'payment_issue',
  PAYMENT_METHOD: 'payment_method',
  ADDRESS_CHANGE: 'address_change',
  PRODUCT_QUALITY: 'product_quality',
  SIZE_ISSUE: 'size_issue',
  WRONG_ITEM: 'wrong_item',
  MISSING_ITEM: 'missing_item',
  DISCOUNT_QUERY: 'discount_query',
  ACCOUNT_HELP: 'account_help',
  DELETE_ACCOUNT: 'delete_account',
  TALK_TO_HUMAN: 'talk_to_human',
  ORDER_SELECT: 'order_select',
  SHOW_ORDERS: 'show_orders',
  GENERAL_HELP: 'general_help',
  COMPLAINT: 'complaint',
  COMPLIMENT: 'compliment',
  ABOUT_BOT: 'about_bot',
  AFFIRMATIVE: 'affirmative',
  NEGATIVE: 'negative',
  SMALL_TALK: 'small_talk',
  UNKNOWN: 'unknown',
} as const

// ─── Keyword Patterns (weighted) ────────────────
interface PatternRule {
  intent: string
  patterns: string[]
  weight: number
}

const PATTERN_RULES: PatternRule[] = [
  // Order & Delivery
  { intent: INTENTS.TRACK_ORDER, patterns: ['track', 'tracking', 'track my order', 'track order', 'where is my order', 'where is my package', 'parcel kahan', 'courier', 'shipping status', 'dispatch', 'mera order kahan', 'order kab aayega', 'order tracking'], weight: 5 },
  { intent: INTENTS.ORDER_STATUS, patterns: ['order status', 'status of order', 'order ka status', 'kya hua order', 'order update', 'what happened to my order', 'order info', 'check order', 'what is my order status', 'my order status'], weight: 5 },
  { intent: INTENTS.SHOW_ORDERS, patterns: ['show my orders', 'show me my orders', 'my orders', 'view orders', 'order list', 'all orders', 'recent orders', 'see my orders', 'mera order', 'meri orders', 'help with my order', 'help with order', 'need help with order', 'i want to need help with my orders', 'order help', 'help with my orders'], weight: 5 },
  { intent: INTENTS.DELIVERY_TIME, patterns: ['delivery time', 'when will i get', 'when will my order be delivered', 'when will my order arrive', 'estimated delivery', 'kab milega', 'kitne din', 'how long', 'delivery date', 'expected delivery', 'arriving when', 'kab aayega', 'delivery details', 'delivery info'], weight: 5 },
  { intent: INTENTS.CANCEL_ORDER, patterns: ['cancel order', 'cancel my order', 'order cancel', 'want to cancel', 'i want to cancel my order', 'i want to cancel', 'cancellation', 'cancel karo', 'cancel karna hai', 'dont want order', "don't want"], weight: 5 },
  { intent: INTENTS.ADDRESS_CHANGE, patterns: ['change address', 'wrong address', 'update address', 'address change', 'address galat', 'address update', 'shift address', 'delivery address'], weight: 4 },

  // Returns & Refunds
  { intent: INTENTS.RETURN_ITEM, patterns: ['return', 'return item', 'return product', 'i want to return', 'i want to return my order', 'wapas karna', 'exchange', 'return kaise', 'return policy', 'want to return', 'not satisfied', 'send back'], weight: 5 },
  { intent: INTENTS.REFUND_STATUS, patterns: ['refund', 'refund status', 'what is my refund status', 'refund kab', 'money back', 'paise wapas', 'refund not received', 'refund pending', 'when refund', 'waiting for refund', 'my refund'], weight: 5 },

  // Payment
  { intent: INTENTS.PAYMENT_ISSUE, patterns: ['payment failed', 'payment issue', 'i have a payment issue', 'transaction failed', 'money deducted', 'deducted but', 'payment problem', 'payment not working', 'payment nahi hua', 'double charged', 'charged twice', 'extra charged', 'money cut', 'amount deducted', 'payment stuck'], weight: 5 },
  { intent: INTENTS.PAYMENT_METHOD, patterns: ['payment method', 'how to pay', 'pay with', 'upi', 'cod', 'cash on delivery', 'card', 'net banking', 'wallet', 'payment options'], weight: 3 },

  // Product Issues
  { intent: INTENTS.WRONG_ITEM, patterns: ['wrong item', 'wrong product', 'different item', 'galat product', 'not what i ordered', 'received different', 'wrong color', 'wrong size received'], weight: 5 },
  { intent: INTENTS.MISSING_ITEM, patterns: ['missing item', 'item missing', 'not received', 'incomplete order', 'partial delivery', 'all items not received', 'product missing', 'saman nahi aaya'], weight: 5 },
  { intent: INTENTS.PRODUCT_QUALITY, patterns: ['quality', 'bad quality', 'cheap', 'defective', 'damaged', 'broken', 'torn', 'stained', 'poor quality', 'not genuine', 'fake', 'duplicate', 'nakli'], weight: 4 },
  { intent: INTENTS.SIZE_ISSUE, patterns: ['size', 'size issue', 'doesnt fit', "doesn't fit", 'too big', 'too small', 'wrong size', 'size guide', 'size chart', 'fitting', 'measurement'], weight: 4 },

  // Offers
  { intent: INTENTS.DISCOUNT_QUERY, patterns: ['discount', 'coupon', 'offer', 'promo', 'sale', 'deal', 'code', 'voucher', 'cheapest', 'best price', 'koi offer'], weight: 3 },

  // Account
  { intent: INTENTS.ACCOUNT_HELP, patterns: ['profile', 'account', 'update profile', 'change name', 'change phone', 'change email', 'settings', 'password', 'login issue'], weight: 3 },
  { intent: INTENTS.DELETE_ACCOUNT, patterns: ['delete account', 'remove account', 'close account', 'deactivate account'], weight: 5 },

  // Escalation
  { intent: INTENTS.TALK_TO_HUMAN, patterns: ['talk to human', 'real person', 'human agent', 'live agent', 'speak to someone', 'connect me', 'transfer', 'manager', 'supervisor', 'insaan se baat', 'agent se baat'], weight: 6 },

  // Conversation
  { intent: INTENTS.GREETING, patterns: ['hi', 'hello', 'hey', 'hii', 'hiii', 'helo', 'yo', 'sup', 'hola', 'namaste', 'good morning', 'good afternoon', 'good evening', 'howdy'], weight: 2 },
  { intent: INTENTS.FAREWELL, patterns: ['bye', 'goodbye', 'see you', 'take care', 'good night', 'cya', 'ttyl', 'alvida', 'later', 'peace'], weight: 2 },
  { intent: INTENTS.THANKS, patterns: ['thank', 'thanks', 'thanku', 'thank you', 'thx', 'ty', 'appreciate', 'grateful', 'shukriya', 'dhanyavaad'], weight: 2 },
  { intent: INTENTS.AFFIRMATIVE, patterns: ['yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'haan', 'ji', 'bilkul', 'alright'], weight: 1 },
  { intent: INTENTS.NEGATIVE, patterns: ['no', 'nah', 'nope', 'nahi', "that's all", "that's it", 'nothing', 'bas', 'no thanks', 'not now'], weight: 1 },
  { intent: INTENTS.COMPLAINT, patterns: ['frustrated', 'angry', 'upset', 'annoyed', 'worst', 'terrible', 'horrible', 'unacceptable', 'pathetic', 'disgusted', 'fed up', 'hate', 'scam', 'fraud', 'waste', 'bakwas', 'bekar'], weight: 4 },
  { intent: INTENTS.COMPLIMENT, patterns: ['great service', 'amazing', 'excellent', 'love it', 'well done', 'impressed', 'best', 'fantastic', 'superb', 'outstanding', 'zabardast', 'badhiya'], weight: 3 },
  { intent: INTENTS.ABOUT_BOT, patterns: ['who are you', 'are you a bot', 'are you human', 'are you real', 'your name', 'what are you', 'bot or human'], weight: 3 },
  { intent: INTENTS.SMALL_TALK, patterns: ['how are you', 'how r u', 'whats up', "what's up", 'kaise ho', 'kya haal', 'lol', 'haha', 'hehe', 'joke', 'bored'], weight: 1 },
  { intent: INTENTS.GENERAL_HELP, patterns: ['help', 'help me', 'i need help', 'assist', 'support', 'guide me', 'madad', 'problem', 'issue', 'concern'], weight: 2 },
]

// ─── Sentiment Detection ────────────────────────
const SENTIMENT_WORDS = {
  positive: ['thank', 'great', 'awesome', 'amazing', 'love', 'happy', 'excellent', 'perfect', 'wonderful', 'good', 'best', 'helpful', 'glad', 'appreciate', 'beautiful'],
  negative: ['bad', 'terrible', 'horrible', 'poor', 'wrong', 'issue', 'problem', 'broken', 'damaged', 'fake', 'never', 'worst'],
  frustrated: ['angry', 'frustrated', 'furious', 'disgusted', 'unacceptable', 'pathetic', 'hate', 'scam', 'fraud', 'waste', 'fed up', 'ridiculous', 'cheated'],
}

function detectSentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED' {
  const lower = text.toLowerCase()
  let pos = 0, neg = 0, frust = 0

  for (const w of SENTIMENT_WORDS.frustrated) { if (lower.includes(w)) frust += 2 }
  if (frust >= 2) return 'FRUSTRATED'

  for (const w of SENTIMENT_WORDS.positive) { if (lower.includes(w)) pos++ }
  for (const w of SENTIMENT_WORDS.negative) { if (lower.includes(w)) neg++ }

  if (pos > neg + 1) return 'POSITIVE'
  if (neg > pos) return 'NEGATIVE'
  return 'NEUTRAL'
}

// ─── Synonym Expansion ──────────────────────────
const SYNONYMS: Record<string, string[]> = {
  order: ['order', 'orders', 'purchase', 'parcel', 'package', 'item', 'items', 'product'],
  track: ['track', 'tracking', 'trace', 'locate', 'find', 'where', 'location', 'status'],
  cancel: ['cancel', 'cancellation', 'revoke', 'stop', 'abort', 'void'],
  return: ['return', 'exchange', 'swap', 'send back', 'give back', 'wapas'],
  refund: ['refund', 'money back', 'reimburse', 'paise wapas', 'reimbursement'],
  delivery: ['delivery', 'deliver', 'shipping', 'ship', 'arrive', 'arriving', 'dispatched', 'dispatch', 'courier'],
  help: ['help', 'assist', 'support', 'guide', 'need', 'want', 'please', 'can you', 'could you', 'i need', 'i want'],
  show: ['show', 'see', 'view', 'display', 'list', 'give me', 'pull up', 'check', 'look at', 'open'],
  problem: ['problem', 'issue', 'trouble', 'error', 'wrong', 'not working', 'broken', 'stuck', 'failed', 'concern'],
  payment: ['payment', 'pay', 'paid', 'charge', 'charged', 'transaction', 'deducted', 'debit', 'credit'],
  human: ['human', 'person', 'agent', 'real person', 'someone', 'representative', 'executive', 'manager', 'supervisor', 'staff'],
}

function expandText(text: string): string {
  let expanded = text.toLowerCase()
  // Normalize common misspellings and abbreviations
  const fixes: [RegExp, string][] = [
    [/\bpls\b/g, 'please'], [/\bu\b/g, 'you'], [/\br\b/g, 'are'],
    [/\bur\b/g, 'your'], [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'],
    [/\bcant\b/g, 'cannot'], [/\bwont\b/g, 'will not'], [/\bdont\b/g, 'do not'],
    [/\bdidnt\b/g, 'did not'], [/\bisnt\b/g, 'is not'], [/\bwasnt\b/g, 'was not'],
    [/\bhavent\b/g, 'have not'], [/\bhasnt\b/g, 'has not'],
    [/\bim\b/g, 'i am'], [/\bive\b/g, 'i have'], [/\bwhts\b/g, 'whats'],
    [/\bordr\b/g, 'order'], [/\bdelivry\b/g, 'delivery'], [/\bplz\b/g, 'please'],
    [/\bthnx\b/g, 'thanks'], [/\bthx\b/g, 'thanks'], [/\bty\b/g, 'thank you'],
    [/\brefnd\b/g, 'refund'], [/\breturn\b/g, 'return'], [/\bcancel\b/g, 'cancel'],
    [/\bwhr\b/g, 'where'], [/\bwen\b/g, 'when'], [/\bhw\b/g, 'how'],
  ]
  for (const [re, fix] of fixes) expanded = expanded.replace(re, fix)
  return expanded
}

// ─── N-gram matching for multi-word phrases ──────
function generateNGrams(words: string[], maxN: number = 4): string[] {
  const ngrams: string[] = []
  for (let n = maxN; n >= 1; n--) {
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '))
    }
  }
  return ngrams
}

// ─── Intent Detection with Learning ─────────────
async function detectIntentFromPatterns(text: string): Promise<{ intent: string; confidence: number }> {
  const expanded = expandText(text)
  const lower = expanded.trim()
  const cleaned = lower.replace(/[!?.,:;'"]+/g, '').trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  const ngrams = generateNGrams(words)

  let bestIntent: string = INTENTS.UNKNOWN
  let bestScore = 0
  let totalMatches = 0

  for (const rule of PATTERN_RULES) {
    let ruleScore = 0
    for (const pattern of rule.patterns) {
      // Exact full match (highest priority)
      if (cleaned === pattern || lower === pattern) {
        ruleScore += pattern.length * rule.weight * 3
      }
      // N-gram match (multi-word phrases)
      else if (pattern.includes(' ') && ngrams.includes(pattern)) {
        ruleScore += pattern.length * rule.weight * 2
      }
      // Substring match
      else if (lower.includes(pattern) || cleaned.includes(pattern)) {
        ruleScore += pattern.length * rule.weight
      }
      // Individual word match for single-word patterns
      else if (!pattern.includes(' ') && words.includes(pattern)) {
        ruleScore += pattern.length * rule.weight * 0.8
      }
    }
    if (ruleScore > 0) totalMatches++
    if (ruleScore > bestScore) {
      bestScore = ruleScore
      bestIntent = rule.intent
    }
  }

  // Semantic fallback: check if message is about orders using synonyms
  if (bestIntent === INTENTS.UNKNOWN || bestScore < 10) {
    const hasOrderWord = words.some(w => SYNONYMS.order.includes(w))
    const hasShowWord = words.some(w => SYNONYMS.show.includes(w))
    const hasHelpWord = words.some(w => SYNONYMS.help.includes(w))
    const hasTrackWord = words.some(w => SYNONYMS.track.includes(w))
    const hasCancelWord = words.some(w => SYNONYMS.cancel.includes(w))
    const hasReturnWord = words.some(w => SYNONYMS.return.includes(w))
    const hasRefundWord = words.some(w => SYNONYMS.refund.includes(w))
    const hasDeliveryWord = words.some(w => SYNONYMS.delivery.includes(w))
    const hasPaymentWord = words.some(w => SYNONYMS.payment.includes(w))
    const hasProblemWord = words.some(w => SYNONYMS.problem.includes(w))
    const hasHumanWord = words.some(w => SYNONYMS.human.includes(w))

    const semanticScore = 25

    if (hasHumanWord && (hasHelpWord || lower.includes('talk') || lower.includes('speak') || lower.includes('connect'))) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.TALK_TO_HUMAN }
    } else if (hasOrderWord && hasTrackWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.TRACK_ORDER }
    } else if (hasOrderWord && hasCancelWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.CANCEL_ORDER }
    } else if (hasReturnWord && (hasOrderWord || hasHelpWord)) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.RETURN_ITEM }
    } else if (hasRefundWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.REFUND_STATUS }
    } else if (hasDeliveryWord && (hasOrderWord || hasHelpWord || lower.includes('when'))) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.DELIVERY_TIME }
    } else if (hasPaymentWord && hasProblemWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.PAYMENT_ISSUE }
    } else if (hasPaymentWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.PAYMENT_METHOD }
    } else if (hasOrderWord && (hasShowWord || hasHelpWord)) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.SHOW_ORDERS }
    } else if (hasOrderWord && hasProblemWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.SHOW_ORDERS }
    } else if (hasProblemWord && hasHelpWord) {
      if (semanticScore > bestScore) { bestScore = semanticScore; bestIntent = INTENTS.GENERAL_HELP }
    }
  }

  // Check learned patterns from DB
  try {
    const learned = await db.chatPattern.findMany({
      where: {
        wasHelpful: true,
        usageCount: { gte: 2 },
      },
      orderBy: { usageCount: 'desc' },
      take: 100,
    })
    for (const lp of learned) {
      if (lower.includes(lp.pattern.toLowerCase()) || lp.pattern.toLowerCase().includes(lower)) {
        const learnedScore = lp.confidence * lp.usageCount * 3
        if (learnedScore > bestScore) {
          bestScore = learnedScore
          bestIntent = lp.intent
        }
      }
    }
  } catch { /* DB not available */ }

  const confidence = bestScore > 0 ? Math.min(bestScore / 50, 1.0) : 0
  return { intent: bestIntent, confidence }
}

// ─── Order Number Extraction ────────────────────
function extractOrderNumber(text: string): string | null {
  const match = text.match(/#?\b(\d{6,})\b/)
  return match ? match[1] : null
}

// ─── Fetch Customer Data ────────────────────────
export async function fetchCustomerOrders(customerId: string): Promise<OrderSummary[]> {
  const orders = await db.order.findMany({
    where: { userId: customerId },
    include: {
      items: {
        include: { product: { select: { name: true } } }
      },
      shipments: true,
      payments: true,
      refunds: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    createdAt: o.createdAt,
    items: o.items.map(i => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    shipments: o.shipments.map(s => ({
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      status: s.status,
      estimatedDelivery: s.estimatedDelivery,
      deliveredAt: s.deliveredAt,
    })),
    payments: o.payments.map(p => ({
      method: p.method,
      status: p.status,
      amount: p.amount,
    })),
    refunds: o.refunds.map(r => ({
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
  }))
}

// ─── Time-aware greeting ────────────────────────
function timeGreet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Status Label Map ───────────────────────────
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing',
  SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', RETURNED: 'Returned',
}
const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'Pending', PAID: 'Paid', FAILED: 'Failed', REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partially Refunded',
}

// ═══════════════════════════════════════════════════
// MAIN: Process Customer Message
// ═══════════════════════════════════════════════════

export async function processMessage(
  customerId: string,
  customerName: string,
  message: string,
  sessionContext: { selectedOrderId?: string; orders?: OrderSummary[] } = {}
): Promise<IntentResult> {
  const text = message.trim()
  const { intent, confidence } = await detectIntentFromPatterns(text)
  const sentiment = detectSentiment(text)
  const name = customerName?.split(' ')[0] || 'there'

  // Load orders if not provided
  let orders = sessionContext.orders
  if (!orders) {
    try { orders = await fetchCustomerOrders(customerId) } catch { orders = [] }
  }

  // Find selected order if any
  let selectedOrder: OrderSummary | null = null
  if (sessionContext.selectedOrderId) {
    selectedOrder = orders.find(o => o.id === sessionContext.selectedOrderId) || null
  }

  // Check if message contains an order number
  const orderNum = extractOrderNumber(text)
  if (orderNum && !selectedOrder) {
    const found = orders.find(o => o.orderNumber.includes(orderNum))
    if (found) selectedOrder = found
  }

  // Build metadata
  const metadata: Record<string, unknown> = {}
  if (selectedOrder) {
    metadata.selectedOrderId = selectedOrder.id
    metadata.selectedOrderNumber = selectedOrder.orderNumber
  }

  // ─── Route to handlers ──────────────────────
  switch (intent) {
    case INTENTS.GREETING:
      return buildGreeting(name, orders.length, sentiment, confidence, metadata)

    case INTENTS.FAREWELL:
      return buildFarewell(name, sentiment, confidence, metadata)

    case INTENTS.THANKS:
      return buildThanks(name, sentiment, confidence, metadata)

    case INTENTS.AFFIRMATIVE:
      return {
        intent, confidence, sentiment, metadata,
        response: pick([
          `Great! What would you like help with, ${name}?`,
          `Alright! Tell me what you need and I'll take care of it. 😊`,
          `Sure! Go ahead — what's on your mind?`,
          `Perfect! I'm listening, ${name}. What do you need?`,
        ]),
        showOptions: buildContextualOptions(orders, selectedOrder),
      }

    case INTENTS.NEGATIVE:
      return {
        intent, confidence, sentiment: 'POSITIVE', metadata,
        response: pick([
          `Alright, ${name}! If you ever need help, I'm just a message away. Take care! 😊`,
          `No worries! Have a great day, ${name}! 👋`,
          `Got it! Feel free to come back anytime. We're here 24/7. 😊`,
          `All good! If anything comes up later, you know where to find me, ${name}. ✨`,
        ]),
      }

    case INTENTS.COMPLAINT:
      return buildComplaintResponse(name, text, orders, selectedOrder, sentiment, confidence, metadata)

    case INTENTS.COMPLIMENT:
      return {
        intent, confidence, sentiment: 'POSITIVE', metadata,
        response: pick([
          `Thank you so much, ${name}! That really means a lot to our team! 🎉`,
          `Wow, your kind words made my day, ${name}! 😊 We'll keep striving to be better.`,
          `Thank you, ${name}! Feedback like yours motivates our entire team! 🌟`,
          `You're amazing for saying that, ${name}! We're grateful for customers like you. 💛`,
        ]),
      }

    case INTENTS.ABOUT_BOT:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `I'm your personal support assistant, ${name}! 🤖 I have access to your complete order history, payment details, tracking info, and more. I can help with almost anything — and if I can't, I'll instantly connect you with a real person from our team. Think of me as your dedicated customer care executive! 😊`,
        showOptions: [
          { label: 'Show my orders', value: 'show_orders' },
          { label: 'Talk to a real person', value: 'talk_to_human' },
        ],
      }

    case INTENTS.SMALL_TALK:
      return {
        intent, confidence, sentiment: 'POSITIVE', metadata,
        response: pick([
          `I'm doing great, ${name}! Thanks for asking. 😊 Ready to help with anything you need!`,
          `All good here! I'm always energized when someone reaches out. What can I do for you?`,
          `Couldn't be better! 🌟 Now, is there something I can help you with, ${name}?`,
        ]),
        showOptions: buildContextualOptions(orders, selectedOrder),
      }

    case INTENTS.TRACK_ORDER:
      return buildTrackingResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.ORDER_STATUS:
      return buildOrderStatusResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.DELIVERY_TIME:
      return buildDeliveryResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.CANCEL_ORDER:
      return buildCancelResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.RETURN_ITEM:
      return buildReturnResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.REFUND_STATUS:
      return buildRefundResponse(name, orders, selectedOrder, confidence, metadata)

    case INTENTS.PAYMENT_ISSUE:
      return {
        intent, confidence, sentiment, metadata,
        response: `I understand payment issues can be stressful, ${name}. 😔 If money was deducted but the order wasn't placed, rest assured — the amount will be automatically refunded to your account within 5-7 business days. If it's been longer, I'll connect you with our team right away.`,
        showOptions: [
          { label: 'It was auto-refunded!', value: 'thanks' },
          { label: 'Still waiting for refund', value: 'talk_to_human' },
          ...(selectedOrder ? [{ label: `Check Order #${selectedOrder.orderNumber}`, value: `order_${selectedOrder.id}` }] : []),
        ],
      }

    case INTENTS.PAYMENT_METHOD:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `We accept multiple payment options, ${name}! 💳\n\n• UPI (Google Pay, PhonePe, Paytm)\n• Credit / Debit Cards\n• Net Banking\n• Wallets\n• Cash on Delivery (up to ₹5,000)\n\nAll payments are 100% secure with Razorpay encryption. 🔒`,
      }

    case INTENTS.WRONG_ITEM:
    case INTENTS.MISSING_ITEM:
      return {
        intent, confidence, sentiment, metadata,
        needsEscalation: true,
        escalationSubject: intent === INTENTS.WRONG_ITEM ? 'Wrong Item Received' : 'Missing Item in Order',
        response: `I'm really sorry about this, ${name}. 😔 ${intent === INTENTS.WRONG_ITEM ? 'Receiving the wrong item' : 'Having items missing from your order'} is never acceptable and I take this very seriously. Let me connect you with our specialist team immediately — they'll get this resolved with top priority.`,
        showOptions: selectedOrder
          ? [{ label: `This is about Order #${selectedOrder.orderNumber}`, value: 'escalate' }]
          : orders.length > 0
            ? [{ label: 'Select the order', value: 'show_orders' }]
            : [{ label: 'Connect with support', value: 'escalate' }],
      }

    case INTENTS.PRODUCT_QUALITY:
      return {
        intent, confidence, sentiment, metadata,
        response: `We take product quality extremely seriously, ${name}. Every item is checked before shipping. If you've received something that doesn't meet your expectations, I sincerely apologize. You have two options:\n\n1️⃣ Return within 7 days for a full refund\n2️⃣ I can escalate to our quality team for immediate attention\n\nWhat would you prefer?`,
        showOptions: [
          { label: 'I want to return it', value: 'return_item' },
          { label: 'Talk to quality team', value: 'talk_to_human' },
        ],
      }

    case INTENTS.SIZE_ISSUE:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `Size issues are the most common concern, ${name}, and we totally get it! 📏\n\nEvery product page has a detailed size chart with measurements in cm and inches. If you've already received an item that doesn't fit, you can return it within 7 days and order the right size.\n\nWould you like help with a return?`,
        showOptions: [
          { label: 'Yes, help me return', value: 'return_item' },
          { label: 'No, just checking', value: 'thanks' },
        ],
      }

    case INTENTS.DISCOUNT_QUERY:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `Smart shopper alert! 🏷️ ${name}, here's how to get the best deals:\n\n• Check our homepage for active flash sales\n• Apply coupon codes at checkout\n• Sign up for notifications for exclusive member offers\n• Orders above ₹499 get free delivery!\n\nI can't share specific promo codes, but trust me — our homepage always has something good! 😊`,
      }

    case INTENTS.ACCOUNT_HELP:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `For account-related changes, ${name}:\n\n👤 Profile: Account → Profile → Edit (name, phone)\n📍 Addresses: Account → Addresses\n🔐 Password: Account → Settings\n📧 Email: Cannot be changed (for security)\n\nIs there something specific you need help with?`,
        showOptions: [
          { label: 'This helped!', value: 'thanks' },
          { label: 'Need more help', value: 'talk_to_human' },
        ],
      }

    case INTENTS.DELETE_ACCOUNT:
      return {
        intent, confidence, sentiment, metadata,
        needsEscalation: true,
        escalationSubject: 'Account Deletion Request',
        response: `I understand, ${name}. Account deletion is an important decision and we respect that. For security reasons, this needs to be processed by our team. Let me connect you with a senior representative who can assist you personally.`,
      }

    case INTENTS.TALK_TO_HUMAN:
      return {
        intent, confidence, sentiment, metadata,
        needsEscalation: true,
        escalationSubject: selectedOrder ? `Support Request - Order #${selectedOrder.orderNumber}` : 'Support Request',
        response: `Absolutely, ${name}! I'll connect you with our support team right away. 🤝 Please share a brief description of your issue so our agent can help you faster.`,
      }

    case INTENTS.SHOW_ORDERS:
      if (orders.length === 0) {
        return {
          intent, confidence, sentiment: 'NEUTRAL', metadata,
          response: `I don't see any orders on your account yet, ${name}. Once you place an order, I'll be able to help you track it, check status, and more! 😊`,
        }
      }
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: `Here are your recent orders, ${name}! 📦 Select one and I'll give you all the details:`,
        showOptions: orders.slice(0, 6).map(o => ({
          label: `#${o.orderNumber} — ₹${Number(o.total).toLocaleString('en-IN')} — ${STATUS_LABEL[o.status]}`,
          value: `order_${o.id}`,
        })),
      }

    case INTENTS.GENERAL_HELP:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: pick([
          `I'm here for you, ${name}! 😊 Tell me what's going on and I'll do my best to resolve it.`,
          `Of course, ${name}! I have access to your orders, payments, and account details. Just describe your issue and I'll jump right in.`,
          `I'd love to help, ${name}! What's on your mind? You can describe the issue in your own words — I'll figure it out. 😊`,
        ]),
        showOptions: buildContextualOptions(orders, selectedOrder),
      }

    case INTENTS.ORDER_SELECT:
      return {
        intent, confidence, sentiment: 'NEUTRAL', metadata,
        response: selectedOrder
          ? `I've found Order #${selectedOrder.orderNumber}! What would you like to know about it?`
          : 'Which order are you referring to? Let me pull up your recent orders.',
        showOptions: selectedOrder
          ? [
            { label: '📍 Track this order', value: 'track_order' },
            { label: '📦 Order status', value: 'order_status' },
            { label: '🚚 Delivery details', value: 'delivery_time' },
            { label: '❌ Cancel order', value: 'cancel_order' },
            { label: '↩️ Return / Refund', value: 'return_item' },
          ]
          : orders.slice(0, 5).map(o => ({
            label: `#${o.orderNumber} — ${STATUS_LABEL[o.status] || o.status}`,
            value: `order_${o.id}`,
          })),
      }

    default:
      return buildUnknownResponse(name, text, orders, selectedOrder, confidence, metadata)
  }
}

// ═══════════════════════════════════════════════════
// RESPONSE BUILDERS
// ═══════════════════════════════════════════════════

function buildGreeting(name: string, orderCount: number, sentiment: string, confidence: number, metadata: Record<string, unknown>): IntentResult {
  const greet = timeGreet()
  const responses = orderCount > 0
    ? [
      `${greet}, ${name}! 👋 Welcome back! I can see you have ${orderCount} order${orderCount > 1 ? 's' : ''} with us. How can I help you today?`,
      `Hey ${name}! 😊 So great to see you again. You're a valued customer with ${orderCount} order${orderCount > 1 ? 's' : ''}. What's on your mind?`,
      `Hi ${name}! ${greet}! 🌟 I have all your order details, payment info, and tracking data ready. Just tell me what you need!`,
      `Hello ${name}! 👋 Welcome back to support. I know everything about your account and orders — just describe what you need and I'll handle it.`,
    ]
    : [
      `${greet}, ${name}! 👋 Welcome to our support! I'm your personal assistant — here to help with anything you need.`,
      `Hey ${name}! 😊 Great to meet you! I'm here to help with orders, deliveries, payments, returns, and anything else.`,
      `Hi ${name}! Welcome! Tell me what's on your mind and I'll take care of it. 😊`,
    ]

  return {
    intent: INTENTS.GREETING, confidence, sentiment: 'POSITIVE' as const, metadata,
    response: pick(responses),
  }
}

function buildFarewell(name: string, sentiment: string, confidence: number, metadata: Record<string, unknown>): IntentResult {
  return {
    intent: INTENTS.FAREWELL, confidence, sentiment: 'POSITIVE' as const, metadata,
    response: pick([
      `Goodbye, ${name}! 👋 It was wonderful helping you. Come back anytime — I'll be here 24/7!`,
      `Take care, ${name}! 😊 If anything comes up, I'm always just a message away. Have an amazing day!`,
      `Bye ${name}! 🌟 I hope I made things a little easier today. See you next time!`,
      `Farewell, ${name}! 👋 Wishing you a wonderful day ahead. Don't hesitate to reach out anytime!`,
    ]),
  }
}

function buildThanks(name: string, sentiment: string, confidence: number, metadata: Record<string, unknown>): IntentResult {
  return {
    intent: INTENTS.THANKS, confidence, sentiment: 'POSITIVE' as const, metadata,
    response: pick([
      `You're so welcome, ${name}! 😊 Helping you made my day. Is there anything else I can do?`,
      `My pleasure, ${name}! That's exactly what I'm here for. 🌟 Need anything else?`,
      `Thank YOU for being such a wonderful customer, ${name}! 💛 Let me know if there's anything else.`,
      `Happy to help, ${name}! 😊 Don't hesitate to come back anytime. I'm always here for you.`,
      `Anytime, ${name}! It was a joy helping you. Anything else on your mind? 😊`,
    ]),
  }
}

function buildTrackingResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (!selectedOrder && orders.length === 0) {
    return {
      intent: INTENTS.TRACK_ORDER, confidence, sentiment: 'NEUTRAL', metadata,
      response: `I'd love to help track your order, ${name}, but I don't see any orders on your account yet. If you just placed one, it might take a few minutes to show up. 😊`,
    }
  }

  if (!selectedOrder && orders.length > 0) {
    return {
      intent: INTENTS.TRACK_ORDER, confidence, sentiment: 'NEUTRAL', metadata,
      response: `I can definitely help you track your order, ${name}! Which one are you looking for? 📦`,
      showOptions: orders.slice(0, 5).map(o => ({
        label: `#${o.orderNumber} — ₹${Number(o.total).toLocaleString('en-IN')} — ${STATUS_LABEL[o.status]}`,
        value: `order_${o.id}`,
      })),
    }
  }

  const o = selectedOrder!
  const ship = o.shipments[0]
  let trackText = `📍 Here's the tracking info for Order #${o.orderNumber}:\n\n📦 Status: ${STATUS_LABEL[o.status] || o.status}`

  if (ship) {
    trackText += `\n🚚 Carrier: ${ship.carrier || 'Assigned'}`
    if (ship.trackingNumber) trackText += `\n🔢 Tracking: ${ship.trackingNumber}`
    if (ship.estimatedDelivery) {
      const est = new Date(ship.estimatedDelivery)
      const days = Math.ceil((est.getTime() - Date.now()) / 86400000)
      trackText += `\n📅 Expected: ${est.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
      if (days > 0) trackText += ` (${days} day${days > 1 ? 's' : ''} away)`
      else if (days === 0) trackText += ' (Today!)'
      else trackText += ' ⚠️ (Seems delayed)'
    }
    if (ship.deliveredAt) {
      trackText += `\n✅ Delivered: ${new Date(ship.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
    }
  } else {
    trackText += ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)
      ? `\n\nYour order hasn't shipped yet. Tracking info will appear once it's dispatched. Usually takes 1-2 business days! 😊`
      : o.status === 'DELIVERED'
        ? `\n\n✅ This order has been delivered!`
        : `\n\nNo shipping info available yet.`
  }

  return {
    intent: INTENTS.TRACK_ORDER, confidence, sentiment: 'NEUTRAL', metadata,
    response: trackText,
    showOptions: [
      { label: 'Ask something else about this order', value: `order_${o.id}` },
      ...(ship?.estimatedDelivery && new Date(ship.estimatedDelivery) < new Date()
        ? [{ label: '⚠️ Delivery is late!', value: 'talk_to_human' }]
        : []),
    ],
  }
}

function buildOrderStatusResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (!selectedOrder && orders.length > 0) {
    return {
      intent: INTENTS.ORDER_STATUS, confidence, sentiment: 'NEUTRAL', metadata,
      response: `Sure, ${name}! Which order would you like to check? 📋`,
      showOptions: orders.slice(0, 5).map(o => ({
        label: `#${o.orderNumber} — ${STATUS_LABEL[o.status]}`,
        value: `order_${o.id}`,
      })),
    }
  }
  if (!selectedOrder) {
    return { intent: INTENTS.ORDER_STATUS, confidence, sentiment: 'NEUTRAL', metadata, response: `I don't see any orders on your account yet, ${name}. 😊` }
  }

  const o = selectedOrder
  const statusMsg: Record<string, string> = {
    PENDING: `Your order was placed and is awaiting confirmation. We'll process it very soon, ${name}!`,
    CONFIRMED: 'Order confirmed! Our warehouse is preparing it for shipment. 📦',
    PROCESSING: 'Being packed and readied for dispatch. Almost there! 📦',
    SHIPPED: `Your order is on its way! ${o.shipments[0]?.carrier ? `Shipped via ${o.shipments[0].carrier}.` : ''} 🚚`,
    DELIVERED: `Great news — this order was delivered! 🎉 Hope you love your purchase, ${name}!`,
    CANCELLED: 'This order was cancelled.',
    RETURNED: 'This order has been returned and processed.',
  }
  const items = o.items.map(i => `  • ${i.productName} ×${i.quantity}`).join('\n')
  const payment = o.payments[0]

  let response = `📋 Order #${o.orderNumber}\n\n📦 Status: ${STATUS_LABEL[o.status] || o.status}\n${statusMsg[o.status] || ''}\n\n🛍️ Items:\n${items}\n\n💰 Total: ₹${Number(o.total).toLocaleString('en-IN')}`
  if (payment) {
    response += `\n💳 Payment: ${PAYMENT_LABEL[payment.status] || payment.status}${payment.method ? ` via ${payment.method}` : ''}`
  }
  if (o.refunds.length > 0) {
    response += `\n\n💸 Refunds: ${o.refunds.length} refund(s) — ₹${o.refunds.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('en-IN')}`
  }

  return {
    intent: INTENTS.ORDER_STATUS, confidence, sentiment: 'NEUTRAL', metadata,
    response,
    showOptions: [
      { label: '📍 Track this order', value: 'track_order' },
      { label: '🚚 Delivery details', value: 'delivery_time' },
      ...(o.status === 'DELIVERED' ? [{ label: '↩️ Want to return?', value: 'return_item' }] : []),
      ...(['PENDING', 'CONFIRMED'].includes(o.status) ? [{ label: '❌ Cancel this order', value: 'cancel_order' }] : []),
    ],
  }
}

function buildDeliveryResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (!selectedOrder && orders.length > 0) {
    return {
      intent: INTENTS.DELIVERY_TIME, confidence, sentiment: 'NEUTRAL', metadata,
      response: `I can check delivery details for you, ${name}! Which order? 🚚`,
      showOptions: orders.slice(0, 5).map(o => ({
        label: `#${o.orderNumber} — ${STATUS_LABEL[o.status]}`,
        value: `order_${o.id}`,
      })),
    }
  }
  if (!selectedOrder) {
    return { intent: INTENTS.DELIVERY_TIME, confidence, sentiment: 'NEUTRAL', metadata, response: `Standard delivery takes 3-7 business days, ${name}. Metro cities usually receive orders in 3-4 days. Express options are available in select cities! 🚀` }
  }

  const o = selectedOrder
  const ship = o.shipments[0]
  let text = `🚚 Delivery Details — Order #${o.orderNumber}:\n\n📦 Status: ${STATUS_LABEL[o.status]}`

  if (ship) {
    text += `\n🏢 Carrier: ${ship.carrier || 'Assigned'}`
    if (ship.trackingNumber) text += `\n📋 Tracking: ${ship.trackingNumber}`
    if (ship.estimatedDelivery) {
      const est = new Date(ship.estimatedDelivery)
      const days = Math.ceil((est.getTime() - Date.now()) / 86400000)
      text += `\n📅 Expected: ${est.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
      if (days > 0) text += ` — ${days} day${days > 1 ? 's' : ''} from now`
      else if (days === 0) text += ' — Arriving today! 🎉'
      else text += ' — ⚠️ Appears delayed'
    }
    if (ship.deliveredAt) text += `\n✅ Delivered on ${new Date(ship.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
  } else if (o.status === 'DELIVERED') {
    text += '\n\n✅ This order has already been delivered!'
  } else {
    text += '\n\nNot shipped yet. Once dispatched, delivery typically takes 3-7 business days. 📦'
  }

  return {
    intent: INTENTS.DELIVERY_TIME, confidence, sentiment: 'NEUTRAL', metadata,
    response: text,
    showOptions: [
      { label: 'More about this order', value: `order_${o.id}` },
      ...(ship?.estimatedDelivery && new Date(ship.estimatedDelivery) < new Date() ? [{ label: '⚠️ Late delivery', value: 'talk_to_human' }] : []),
    ],
  }
}

function buildCancelResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (!selectedOrder && orders.length > 0) {
    return {
      intent: INTENTS.CANCEL_ORDER, confidence, sentiment: 'NEUTRAL', metadata,
      response: `Which order would you like to cancel, ${name}?`,
      showOptions: orders.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status)).slice(0, 5).map(o => ({
        label: `#${o.orderNumber} — ₹${Number(o.total).toLocaleString('en-IN')}`,
        value: `order_${o.id}`,
      })),
    }
  }
  if (!selectedOrder) {
    return { intent: INTENTS.CANCEL_ORDER, confidence, sentiment: 'NEUTRAL', metadata, response: `I don't see any active orders to cancel, ${name}. 😊` }
  }

  const o = selectedOrder
  const cancellable = ['PENDING', 'CONFIRMED'].includes(o.status)

  return {
    intent: INTENTS.CANCEL_ORDER, confidence, sentiment: 'NEUTRAL', metadata,
    response: cancellable
      ? `Order #${o.orderNumber} is currently "${STATUS_LABEL[o.status]}" and can be cancelled, ${name}. Would you like me to connect you with our team to process the cancellation?`
      : `Order #${o.orderNumber} is "${STATUS_LABEL[o.status]}" and unfortunately can't be cancelled at this stage, ${name}. ${o.status === 'SHIPPED' ? 'You can refuse delivery or initiate a return once received.' : 'Would you like to discuss other options?'}`,
    needsEscalation: cancellable,
    escalationSubject: `Order Cancellation - #${o.orderNumber}`,
    showOptions: cancellable
      ? [{ label: 'Yes, cancel it', value: 'escalate' }, { label: "No, keep it", value: 'thanks' }]
      : [{ label: 'Return after delivery', value: 'return_item' }, { label: 'Talk to support', value: 'talk_to_human' }],
  }
}

function buildReturnResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (!selectedOrder && orders.length > 0) {
    const delivered = orders.filter(o => o.status === 'DELIVERED')
    return {
      intent: INTENTS.RETURN_ITEM, confidence, sentiment: 'NEUTRAL', metadata,
      response: `I can help with returns, ${name}! Which order? 📦`,
      showOptions: (delivered.length > 0 ? delivered : orders).slice(0, 5).map(o => ({
        label: `#${o.orderNumber} — ${STATUS_LABEL[o.status]}`,
        value: `order_${o.id}`,
      })),
    }
  }

  return {
    intent: INTENTS.RETURN_ITEM, confidence, sentiment: 'NEUTRAL', metadata,
    response: selectedOrder
      ? `For Order #${selectedOrder.orderNumber}:\n\n📋 Return Policy:\n• Returns accepted within 7 days of delivery\n• Item must be unused with original tags\n• Refund processed within 5-7 business days\n\nWould you like me to connect you with our team to start the return, ${name}?`
      : `Our return policy, ${name}:\n\n📋 7-day return window from delivery\n📋 Item must be unused with original tags\n📋 Refund in 5-7 business days to original payment method\n\nNeed to start a return?`,
    showOptions: [
      { label: 'Start return process', value: 'talk_to_human' },
      { label: 'This helped!', value: 'thanks' },
    ],
    needsEscalation: false,
  }
}

function buildRefundResponse(name: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  if (selectedOrder && selectedOrder.refunds.length > 0) {
    const refundList = selectedOrder.refunds.map(r =>
      `• ₹${Number(r.amount).toLocaleString('en-IN')} — ${r.status}${r.reason ? ` (${r.reason})` : ''} — ${new Date(r.createdAt).toLocaleDateString('en-IN')}`
    ).join('\n')

    return {
      intent: INTENTS.REFUND_STATUS, confidence, sentiment: 'NEUTRAL', metadata,
      response: `💸 Refund status for Order #${selectedOrder.orderNumber}:\n\n${refundList}\n\nRefunds typically take 5-7 business days to reflect in your account, ${name}.`,
      showOptions: [
        { label: 'Refund not received yet', value: 'talk_to_human' },
        { label: 'This helped!', value: 'thanks' },
      ],
    }
  }

  if (!selectedOrder && orders.length > 0) {
    const withRefunds = orders.filter(o => o.refunds.length > 0)
    if (withRefunds.length > 0) {
      return {
        intent: INTENTS.REFUND_STATUS, confidence, sentiment: 'NEUTRAL', metadata,
        response: `I can check refund status for you, ${name}! Which order?`,
        showOptions: withRefunds.slice(0, 5).map(o => ({
          label: `#${o.orderNumber} — ${o.refunds.length} refund(s)`,
          value: `order_${o.id}`,
        })),
      }
    }
  }

  return {
    intent: INTENTS.REFUND_STATUS, confidence, sentiment: 'NEUTRAL', metadata,
    response: `Refunds are typically processed within 5-7 business days after we receive the returned item, ${name}. The amount goes back to your original payment method. If it's been longer, I'll connect you with our team.`,
    showOptions: [
      { label: 'Check my refund', value: 'talk_to_human' },
      { label: 'This helped!', value: 'thanks' },
    ],
  }
}

function buildComplaintResponse(name: string, text: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, sentiment: string, confidence: number, metadata: Record<string, unknown>): IntentResult {
  return {
    intent: INTENTS.COMPLAINT, confidence, sentiment: 'FRUSTRATED', metadata,
    response: pick([
      `I'm genuinely sorry to hear this, ${name}. 😔 Your frustration is completely understandable and I take it very seriously. I want to make this right — can you tell me exactly what happened so I can take immediate action?`,
      `${name}, I sincerely apologize for this experience. 😔 You deserve so much better. Please tell me what went wrong and I promise I'll do everything in my power to fix it — or I'll escalate to our senior team right away.`,
      `I hear you, ${name}, and I'm truly sorry. No customer should feel this way. 😔 Let me help — can you describe the specific issue? I have access to all your order and payment details and I'll get to the bottom of this.`,
    ]),
    showOptions: [
      ...(orders.length > 0 ? [{ label: 'About a specific order', value: 'show_orders' }] : []),
      { label: 'Connect me to a manager', value: 'talk_to_human' },
    ],
  }
}

function buildUnknownResponse(name: string, text: string, orders: OrderSummary[], selectedOrder: OrderSummary | null, confidence: number, metadata: Record<string, unknown>): IntentResult {
  // When an order is selected, stay in order context — don't go generic
  if (selectedOrder) {
    const o = selectedOrder
    return {
      intent: INTENTS.UNKNOWN, confidence: 0.3, sentiment: 'NEUTRAL', metadata,
      response: `I'm here to help with Order #${o.orderNumber}, ${name}! 📦\n\nCurrent status: **${STATUS_LABEL[o.status] || o.status}**\n\nWhat would you like to know? You can ask me to track it, check delivery details, start a return, or anything else about this order. Or just tell me what's on your mind!`,
      showOptions: [
        { label: '📍 Track this order', value: 'track_order' },
        { label: '📦 Full order details', value: 'order_status' },
        { label: '🚚 Delivery info', value: 'delivery_time' },
        ...(['PENDING', 'CONFIRMED'].includes(o.status) ? [{ label: '❌ Cancel this order', value: 'cancel_order' }] : []),
        ...(o.status === 'DELIVERED' ? [{ label: '↩️ Return / Refund', value: 'return_item' }] : []),
        { label: '🔄 Different order', value: 'show_orders' },
        { label: '👤 Talk to support team', value: 'talk_to_human' },
      ],
    }
  }

  // Check if the message seems like it needs human help (long text, multiple sentences, complex)
  const wordCount = text.trim().split(/\s+/).length
  const hasQuestionMark = text.includes('?')
  const isLongMessage = wordCount > 15
  const mentionsMultipleTopics = (text.match(/(and|also|plus|another|besides)/gi) || []).length > 0

  if ((isLongMessage && mentionsMultipleTopics) || (isLongMessage && hasQuestionMark)) {
    return {
      intent: INTENTS.UNKNOWN, confidence: 0, sentiment: 'NEUTRAL', metadata,
      response: `${name}, it sounds like you have a detailed concern. 🤔 I want to make sure nothing gets missed — would you like me to connect you with our support team? They can handle complex requests more thoroughly. Or if you prefer, you can break it down and I'll address each part!`,
      showOptions: [
        { label: '👤 Yes, connect me to support', value: 'talk_to_human' },
        ...(orders.length > 0 ? [{ label: '📦 Help with an order', value: 'show_orders' }] : []),
        { label: '💬 Let me rephrase', value: 'general_help' },
      ],
    }
  }

  // Smart response with contextual options
  return {
    intent: INTENTS.UNKNOWN, confidence: 0, sentiment: 'NEUTRAL', metadata,
    response: pick([
      `I want to make sure I help you correctly, ${name}. 🤔 Here's what I can do:\n\n📦 Check your orders & tracking\n🚚 Delivery details & timing\n↩️ Returns, exchanges & refunds\n💳 Payment issues\n👤 Connect you with our team\n\nJust pick an option below or describe your issue in different words!`,
      `Hmm, let me make sure I get this right, ${name}. Could you tell me more about what you need? I can help with orders, deliveries, returns, payments, and account issues. Or I can connect you to our team right away! 😊`,
      `I didn't quite catch that, ${name}, but I don't want you to feel unheard! 😊 Here are the most common things I help with — pick one or tell me more:`,
    ]),
    showOptions: buildContextualOptions(orders, selectedOrder),
  }
}

function buildContextualOptions(orders: OrderSummary[], selectedOrder: OrderSummary | null): { label: string; value: string }[] {
  if (selectedOrder) {
    return [
      { label: '📍 Track order', value: 'track_order' },
      { label: '📦 Order status', value: 'order_status' },
      { label: '🚚 Delivery details', value: 'delivery_time' },
      { label: '❌ Cancel order', value: 'cancel_order' },
      { label: '↩️ Return / Refund', value: 'return_item' },
      { label: '👤 Talk to human', value: 'talk_to_human' },
    ]
  }
  const opts: { label: string; value: string }[] = []
  if (orders.length > 0) opts.push({ label: '📦 Help with an order', value: 'show_orders' })
  opts.push(
    { label: '🚚 Shipping & Delivery', value: 'delivery_time' },
    { label: '↩️ Returns & Refunds', value: 'refund_status' },
    { label: '💳 Payment Help', value: 'payment_issue' },
    { label: '👤 Talk to support', value: 'talk_to_human' },
  )
  return opts
}

// ─── Self-Learning: Record Pattern ──────────────
export async function learnPattern(intent: string, pattern: string, response: string | null, wasHelpful: boolean) {
  try {
    const existing = await db.chatPattern.findFirst({
      where: { intent, pattern: { contains: pattern.toLowerCase().substring(0, 50) } },
    })
    if (existing) {
      await db.chatPattern.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          confidence: wasHelpful ? Math.min(existing.confidence + 0.1, 2.0) : Math.max(existing.confidence - 0.1, 0.1),
          wasHelpful: wasHelpful || existing.wasHelpful,
        },
      })
    } else {
      await db.chatPattern.create({
        data: { intent, pattern: pattern.toLowerCase().substring(0, 200), response, wasHelpful },
      })
    }
  } catch { /* Non-critical */ }
}
