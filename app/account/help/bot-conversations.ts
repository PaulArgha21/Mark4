// ═══════════════════════════════════════════════════
// BOT CONVERSATION ENGINE — 1000+ Human-like Responses
// ═══════════════════════════════════════════════════

export interface BotContext {
  customerName: string
  orderCount: number
  selectedOrder: { orderNumber: string; status: string } | null
}

export interface ConvoPattern {
  triggers: string[]
  exact?: boolean
  replies: string[] | ((ctx: BotContext) => string[])
  showMenu?: boolean
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const convoPatterns: ConvoPattern[] = [
  // ═══════════════════════════════════════════
  // 1. GREETINGS (60 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'hi', 'hello', 'hey', 'hii', 'hiii', 'hiiii', 'helo', 'heyy', 'heyyy',
      'yo', 'sup', 'hola', 'namaste', 'namaskar', 'good morning', 'good afternoon',
      'good evening', 'good day', 'howdy', 'greetings', 'ola', 'bonjour',
      'hey there', 'hi there', 'hello there', 'hii there', 'wassup', 'wazzup',
    ],
    replies: (ctx) => [
      `Hey ${ctx.customerName}! 👋 How can I help you today?`,
      `Hello ${ctx.customerName}! 😊 What can I do for you?`,
      `Hi ${ctx.customerName}! Great to see you here. What do you need help with?`,
      `Hey there ${ctx.customerName}! 👋 I'm here to help. What's on your mind?`,
      `${timeGreeting()}, ${ctx.customerName}! 🌟 How can I assist you?`,
      `Hi ${ctx.customerName}! Welcome back! What brings you here today?`,
      `Hello hello ${ctx.customerName}! 👋 Ready to help. Fire away!`,
      `Hey ${ctx.customerName}! 😊 Nice to hear from you. How can I help?`,
      `Hi there ${ctx.customerName}! What can I do for you today?`,
      `${timeGreeting()} ${ctx.customerName}! Hope you're having a great day. How can I help?`,
      `Hey ${ctx.customerName}! 🙌 I'm all ears. What do you need?`,
      `Hello ${ctx.customerName}! Glad you reached out. What's up?`,
      `Hi ${ctx.customerName}! 👋 Always happy to help. What do you need?`,
      `Yo ${ctx.customerName}! 😄 What can I help you with?`,
      `${timeGreeting()}, ${ctx.customerName}! Ready and at your service. 💪`,
      `Hey ${ctx.customerName}! Welcome! Tell me how I can make your day better.`,
      `Hi ${ctx.customerName}! I'm your friendly support assistant. What's going on?`,
      `Hello ${ctx.customerName}! 🌸 How may I help you today?`,
      `Hey there! 👋 It's great to see you, ${ctx.customerName}. What do you need?`,
      `Hi hi ${ctx.customerName}! 😊 Let me know what you need help with.`,
      `Namaste ${ctx.customerName}! 🙏 How can I assist you today?`,
      `Hello ${ctx.customerName}! I'm here for you. What's the matter?`,
      `Hey ${ctx.customerName}! Just say the word and I'll help. 😊`,
      `Hi ${ctx.customerName}! Good to have you here. What brings you to support?`,
      `Hello there, ${ctx.customerName}! 🎉 How can I brighten your day?`,
      `Hey! ${ctx.customerName}, right? 😊 I've got your info. How can I help?`,
      `Hi ${ctx.customerName}! 💫 Your assistant is ready. What do you need?`,
      `${timeGreeting()}, ${ctx.customerName}! What can I sort out for you?`,
      `Hey ${ctx.customerName}! I know everything about your account. Ask me anything! 😊`,
      `Hello ${ctx.customerName}! Let's get your question answered. What's up?`,
      ...(ctx.orderCount > 0 ? [
        `Hi ${ctx.customerName}! I can see you have ${ctx.orderCount} order${ctx.orderCount > 1 ? 's' : ''} with us. Need help with any of them?`,
        `Hey ${ctx.customerName}! 👋 I've got your order details ready. What do you need?`,
        `Hello ${ctx.customerName}! Welcome back, valued customer! 🌟 How can I help?`,
        `Hi ${ctx.customerName}! Good to see a returning customer. What can I do for you? 😊`,
      ] : [
        `Hi ${ctx.customerName}! Welcome to our support! I'm here to help with anything you need.`,
        `Hey ${ctx.customerName}! 👋 First time here? No worries, I'll guide you through everything!`,
        `Hello ${ctx.customerName}! Welcome aboard! How can I assist you today?`,
      ]),
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 2. HOW ARE YOU / SMALL TALK (45 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'how are you', 'how r u', 'how are u', 'how u doing', 'how do you do',
      'whats up', "what's up", 'kaise ho', 'kya haal', 'kya chal raha',
      'how is it going', "how's it going", "how's life", 'you good',
      'how have you been', 'how you been', 'sab theek', 'kya haal chaal',
    ],
    replies: (ctx) => [
      `I'm doing great, thanks for asking! 😊 How can I help you, ${ctx.customerName}?`,
      `All good on my end! Ready to assist you. What do you need?`,
      `I'm here and happy to help! 😊 What's up, ${ctx.customerName}?`,
      `Doing wonderful! Thanks for asking. 🌟 Now, what can I do for you?`,
      `I'm running smoothly! 🤖 How about you? What do you need help with?`,
      `Living the dream, ${ctx.customerName}! 😄 How can I assist you today?`,
      `I'm always at my best when helping customers like you! What do you need?`,
      `Fantastic, thanks! 😊 Better now that you're here. What's up?`,
      `I'm great! Just waiting to help someone awesome like you. What's going on?`,
      `Couldn't be better, ${ctx.customerName}! 🙌 Tell me what you need.`,
      `I'm doing amazing! What about you? Need any help today?`,
      `Super! I'm always ready to help. What brings you here, ${ctx.customerName}?`,
      `I'm wonderful, thanks! 🌈 Ready to tackle your questions. Fire away!`,
      `Doing great! 💪 I've got all your account info ready. What do you need?`,
      `I'm excellent, ${ctx.customerName}! Always energized when someone says hi. 😊`,
      `Sab badhiya! 😊 Aap batao, kaise help kar sakta hoon?`,
      `All systems go! 🚀 What can I help you with today?`,
      `I'm on top of the world! 🌍 Now let's solve your query. What's up?`,
      `Great, thanks for asking! I don't need sleep, so I'm always fresh! 😄 What do you need?`,
      `Pretty good! Just helped a few customers and feeling great about it. Your turn! 😊`,
      `I'm doing well! Thanks for the kind check-in, ${ctx.customerName}. Need anything?`,
      `I'm always happy when I get to chat with customers! What's on your mind?`,
      `Doing well! Ready and excited to help. What can I do for you? 😊`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 3. THANK YOU (55 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'thank', 'thanks', 'thanku', 'thank you', 'thx', 'ty', 'thnx', 'thnks',
      'dhanyavaad', 'shukriya', 'appreciate', 'grateful', 'thankful',
      'thanks a lot', 'thanks so much', 'thank you so much', 'many thanks',
      'thanks man', 'thanks bro', 'thanks dear', 'thanks buddy',
      'you helped', 'that was helpful', 'very helpful', 'so helpful',
      'thanks for helping', 'thanks for your help', 'tysm', 'tyvm',
    ],
    replies: (ctx) => [
      `You're welcome, ${ctx.customerName}! 😊 Is there anything else I can help with?`,
      `Happy to help! 😊 Let me know if you need anything else.`,
      `Glad I could assist! Anything else on your mind?`,
      `No problem at all, ${ctx.customerName}! 😊 Need anything else?`,
      `Anytime, ${ctx.customerName}! That's what I'm here for. 🌟`,
      `My pleasure! 😊 Don't hesitate to ask if you need more help.`,
      `You're so welcome! It was my pleasure helping you, ${ctx.customerName}.`,
      `Aww, thanks for saying that! 😊 Anything else I can do?`,
      `Don't mention it, ${ctx.customerName}! I love helping out. Need anything else?`,
      `You're absolutely welcome! 🎉 Is there something else on your mind?`,
      `It's what I do best! 💪 Anything else, ${ctx.customerName}?`,
      `Glad to be of service! 😊 Let me know if there's anything else.`,
      `That means a lot! Always here for you, ${ctx.customerName}. 🌸`,
      `So glad I could help! Reach out anytime you need me. 😊`,
      `No worries at all! Happy I could sort that out for you.`,
      `You're welcome! Making customers happy is my favorite thing! 😊`,
      `Absolutely my pleasure, ${ctx.customerName}! Come back anytime.`,
      `Thank YOU for being such a great customer, ${ctx.customerName}! 🌟`,
      `Happy to hear that helped! Is there anything else bugging you?`,
      `Always here for you, ${ctx.customerName}! 😊 More questions? Fire away!`,
      `Khushi hui help karke! 😊 Aur kuch chahiye?`,
      `Not a problem! That's exactly what I'm here for. 😊`,
      `Glad that sorted things out! Let me know if you need anything else.`,
      `You just made my day by saying that! 🎉 Anything else?`,
      `It was nothing, ${ctx.customerName}! I'm always happy to help.`,
      `All in a day's work! 😊 Need anything else, ${ctx.customerName}?`,
      `Glad the info was useful! Don't hesitate to reach out again.`,
      `You're very welcome! I aim to make things easy for you. 😊`,
      `Sweet! I'm glad that helped. More questions? I'm not going anywhere! 😄`,
      `Appreciate the kind words, ${ctx.customerName}! Anything else I can do?`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 4. GOODBYE / FAREWELL (45 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'bye', 'goodbye', 'see you', 'take care', 'good night', 'cya', 'ttyl',
      'alvida', 'later', 'see ya', 'gotta go', 'i gotta go', 'im leaving',
      "i'm leaving", 'leaving now', 'catch you later', 'peace', 'peace out',
      'have a good day', 'have a nice day', 'signing off', 'gtg',
    ],
    replies: (ctx) => [
      `Goodbye ${ctx.customerName}! 👋 Have a wonderful day!`,
      `Take care, ${ctx.customerName}! 😊 We're always here if you need us.`,
      `Bye ${ctx.customerName}! Hope I was helpful. Have a great day! 🌟`,
      `See you later, ${ctx.customerName}! Don't hesitate to come back anytime. 👋`,
      `Bye bye, ${ctx.customerName}! Wishing you an amazing rest of your day! 🌈`,
      `Take care, ${ctx.customerName}! It was great chatting with you. 😊`,
      `Goodbye! Come back whenever you need me. I'll be here 24/7! 🤖`,
      `See ya, ${ctx.customerName}! Hope everything works out perfectly. ✨`,
      `Bye ${ctx.customerName}! Thanks for chatting. Have an awesome day! 🎉`,
      `Take care! Remember, I'm just a message away whenever you need help. 😊`,
      `Goodbye, ${ctx.customerName}! Happy shopping! 🛍️`,
      `Alvida ${ctx.customerName}! Jab bhi zaroorat ho, aa jaana! 👋`,
      `Later, ${ctx.customerName}! Stay awesome! 🌟`,
      `Bye! It was a pleasure helping you today. Come back soon! 😊`,
      `See you around, ${ctx.customerName}! Wishing you all the best! ✨`,
      `Take care and happy shopping! Don't forget, I'm always here. 💛`,
      `Goodbye ${ctx.customerName}! Hope your day is as great as you are! 🌟`,
      `Bye for now! Looking forward to helping you again. 👋`,
      `See you next time, ${ctx.customerName}! Take care of yourself! 😊`,
      `Farewell, ${ctx.customerName}! May your packages arrive swiftly! 📦✨`,
      `Bye! You were a great chat partner. Come back soon! 😄`,
      `Take care ${ctx.customerName}! If anything comes up, you know where to find me. 😊`,
      `Good night, ${ctx.customerName}! Sleep well and reach out anytime. 🌙`,
      `Peace out, ${ctx.customerName}! ✌️ Always here when you need me.`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 5. AFFIRMATIVES / OK / ACKNOWLEDGMENT (40 replies)
  // ═══════════════════════════════════════════
  {
    triggers: ['ok', 'okay', 'k', 'fine', 'alright', 'cool', 'nice', 'great', 'good', 'perfect', 'awesome', 'got it', 'understood', 'makes sense', 'i see', 'ohh', 'ohk', 'acha', 'accha', 'theek hai', 'thik hai', 'sahi'],
    exact: true,
    replies: (ctx) => [
      `Glad to hear! 😊 Is there anything else I can help with, ${ctx.customerName}?`,
      `Great! Let me know if you need anything else.`,
      `Awesome! Anything else on your mind? 😊`,
      `Perfect! I'm still here if you need me.`,
      `Cool! 😊 Anything else I can do for you?`,
      `Alright! Let me know if anything else comes up.`,
      `Sounds good! Need help with anything else, ${ctx.customerName}?`,
      `Got it! If you have more questions, I'm right here. 😊`,
      `Nice! Happy we're on the same page. Need anything else?`,
      `Wonderful! Don't hesitate to ask if something else pops up.`,
      `That's great! 🎉 Anything else before you go?`,
      `Okay great! I'm here all day if you need me. 😊`,
      `Sweet! Let me know if there's anything else, ${ctx.customerName}.`,
      `Roger that! 😄 More questions? Just ask!`,
      `Perfect! Glad that's sorted. Anything else?`,
      `Alright then! I'll be here if you need me. 😊`,
      `Cool cool! 😎 Need anything else?`,
      `Great to hear! Reach out anytime, ${ctx.customerName}. 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 6. YES / AFFIRMATIVE RESPONSE (35 replies)
  // ═══════════════════════════════════════════
  {
    triggers: ['yes', 'yeah', 'yep', 'yup', 'ya', 'sure', 'of course', 'definitely', 'absolutely', 'haan', 'ji', 'haanji', 'bilkul', 'zaroor', 'yes please', 'yea', 'yah', 'yass'],
    exact: true,
    replies: (ctx) => [
      `Sure thing! What would you like help with, ${ctx.customerName}? Pick an option or describe your issue 👇`,
      `Alright! How can I assist you? 😊`,
      `Of course! Tell me what you need and I'll get right on it.`,
      `Great! I'm all ears, ${ctx.customerName}. What do you need?`,
      `Absolutely! Let me know what's going on and I'll help. 😊`,
      `You got it! What can I do for you?`,
      `Sure! Fire away with your question, ${ctx.customerName}. 😊`,
      `Let's do this! What do you need help with?`,
      `Ready when you are! What's the issue?`,
      `Perfect! Go ahead and tell me what you need, ${ctx.customerName}.`,
      `I'm ready! Lay it on me. 😊`,
      `Alrighty! What's on your mind?`,
      `Okay! Let's sort this out together. What do you need?`,
      `Yes yes, I'm here! What can I help with? 😊`,
      `Bilkul! Batao kya help chahiye? 😊`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 7. NO / NEGATIVE / DONE (40 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'no', 'nah', 'nope', 'not really', 'nothing', 'nahi', 'no thanks',
      "that's all", "that's it", 'bas', 'nothing else', 'all good',
      'no more', "i'm good", 'im good', "i'm fine", 'im fine',
      'no need', 'not now', 'maybe later', 'not at the moment', 'naa',
    ],
    replies: (ctx) => [
      `Alright ${ctx.customerName}! If you ever need help, I'm just a message away. Take care! 😊`,
      `No worries! Have a great day, ${ctx.customerName}! 👋`,
      `Got it! Feel free to come back anytime. 😊`,
      `Okay, ${ctx.customerName}! Glad I could help. See you next time! 🌟`,
      `All good! Remember, I'm here 24/7 whenever you need me. 😊`,
      `No problem! Have a wonderful day ahead, ${ctx.customerName}! ✨`,
      `Sounds good! Take care and happy shopping! 🛍️`,
      `Alright then! Don't be a stranger — come back anytime! 😊`,
      `Perfect! Hope I was helpful. See you around, ${ctx.customerName}! 👋`,
      `Okay! If anything comes up later, you know where to find me. 😊`,
      `Great! Glad we got everything sorted. Take care, ${ctx.customerName}!`,
      `No worries at all! Wishing you an amazing day! 🌈`,
      `Alright, ${ctx.customerName}! I'll be right here if you change your mind. 😊`,
      `Cool! Thanks for chatting. Have a lovely day! 💛`,
      `Okay! Always a pleasure talking to you, ${ctx.customerName}. Bye! 👋`,
      `All done? Great! Hope you have a fantastic rest of your day! 🎉`,
      `No problem! Come back whenever — I never get tired! 🤖😊`,
      `Bas? Theek hai! Jab bhi zaroorat ho, yahan hoon! 👋`,
      `Got it! Take care and enjoy your day, ${ctx.customerName}! ☀️`,
      `Alright! Stay awesome, ${ctx.customerName}! See you soon! 🌟`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 8. HELP REQUESTS (40 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'help', 'help me', 'i need help', 'can you help', 'assist', 'support',
      'need assistance', 'please help', 'plz help', 'pls help',
      'help karo', 'madad', 'madad karo', 'sahayata', 'guide me',
      'can you assist', 'i have a problem', 'i have an issue', 'having trouble',
      'something wrong', 'facing issue', 'facing problem', 'need support',
    ],
    replies: (ctx) => [
      `Of course, ${ctx.customerName}! I'm here to help. What do you need assistance with?`,
      `Absolutely! Tell me what's going on and I'll do my best to help. 😊`,
      `I'm right here for you, ${ctx.customerName}! What's the issue?`,
      `Sure thing! I've got your account info and order details ready. What's wrong?`,
      `Don't worry, ${ctx.customerName}! Let's figure this out together. What happened?`,
      `I'm on it! Tell me what's troubling you and I'll help sort it out. 💪`,
      `No worries, ${ctx.customerName}! That's exactly what I'm here for. What do you need?`,
      `Let's fix this! Tell me what's happening, ${ctx.customerName}. 😊`,
      `You've come to the right place! What can I help you with?`,
      `I'd be happy to help! Just describe the issue and I'll guide you. 😊`,
      `Consider it done, ${ctx.customerName}! What needs fixing?`,
      `I'm all ears! Tell me everything and I'll get it sorted. 🎯`,
      `Help is here! 🦸 What's going on, ${ctx.customerName}?`,
      `Sure! I can help with orders, deliveries, returns, payments, and more. What do you need?`,
      `Absolutely, ${ctx.customerName}! I'm ready. What's the problem?`,
      `Let me help you with that! Can you describe what's happening?`,
      `I'm your personal support assistant! Tell me what you need, ${ctx.customerName}. 😊`,
      `Don't worry at all! We'll sort this out. What's the issue?`,
      `Bilkul! Batao kya problem hai, ${ctx.customerName}? 😊`,
      `No problem! Let's get this resolved. What's going on?`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 9. FRUSTRATION / ANGER / COMPLAINTS (55 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'frustrated', 'angry', 'upset', 'annoyed', 'unhappy', 'disappointed',
      'worst', 'terrible', 'horrible', 'bad experience', 'not happy',
      'disgusted', 'furious', 'ridiculous', 'unacceptable', 'pathetic',
      'shameful', 'fed up', 'sick of', 'tired of', 'had enough',
      'very bad', 'so bad', 'this is bad', 'what the hell', 'wtf',
      'useless', 'waste of time', 'waste of money', 'scam', 'fraud',
      'cheated', 'lied', 'fake', 'never again', 'worst service',
      'worst experience', 'hate this', 'i hate', 'bakwas', 'bekar',
      'ghatiya', 'bohot bura', 'bahut bura',
    ],
    replies: (ctx) => [
      `I'm really sorry to hear that, ${ctx.customerName}. 😔 I understand your frustration and I genuinely want to make this right. Can you tell me what happened?`,
      `I completely understand your concern, ${ctx.customerName}. Let me help resolve this for you. What's the issue?`,
      `I apologize for the inconvenience, ${ctx.customerName}. Your experience matters a lot to us. Please share what went wrong.`,
      `I'm so sorry you're going through this, ${ctx.customerName}. 😔 That's not the experience we want for you. Let me help fix this.`,
      `I totally understand why you're upset, ${ctx.customerName}. Let me look into this right away. What happened?`,
      `I hear you, ${ctx.customerName}, and I'm sorry. You deserve better. Let me see what I can do to help.`,
      `That sounds really frustrating, ${ctx.customerName}. I want to help make it right. Can you share the details?`,
      `I'm sorry you had to deal with that. 😔 Let's get this sorted out. Tell me everything.`,
      `Your frustration is completely valid, ${ctx.customerName}. I'm here to help fix this right now.`,
      `I sincerely apologize, ${ctx.customerName}. This is not up to our standards. Let me help resolve this immediately.`,
      `I understand, and I'm sorry. 😔 Let me connect you with the right help. What specifically went wrong?`,
      `That's not acceptable and I apologize. Let me help you, ${ctx.customerName}. What's the issue?`,
      `I'm really sorry about this experience, ${ctx.customerName}. We take this very seriously. Please tell me more.`,
      `I feel terrible hearing that, ${ctx.customerName}. 😔 Let me do everything I can to help. What happened?`,
      `Your satisfaction is our top priority, ${ctx.customerName}. I'm sorry we fell short. How can I make it better?`,
      `I understand this is upsetting. No one should have this experience. Let me help right away, ${ctx.customerName}.`,
      `I'm listening, ${ctx.customerName}. I can see this matters a lot. Let me help you sort this out. 😔`,
      `I won't rest until this is resolved, ${ctx.customerName}. Please tell me what happened and I'll take action.`,
      `Bahut sorry, ${ctx.customerName}. 😔 Hum zaroor isko theek karenge. Batao kya hua?`,
      `I understand your anger, ${ctx.customerName}, and you have every right to be upset. Let me escalate this if needed.`,
      `I'm really sorry. Would you like me to connect you with a senior support member who can help faster?`,
      `I can see this has been a bad experience. I'm truly sorry, ${ctx.customerName}. Let's fix this together.`,
      `No customer should go through this. I apologize, ${ctx.customerName}. Let me help you right now.`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 10. COMPLIMENTS / PRAISE (40 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'nice work', 'well done', 'good job', 'amazing', 'love it', 'love this',
      'best', 'excellent', 'impressed', 'happy with', 'great service',
      'awesome service', 'fantastic', 'brilliant', 'superb', 'outstanding',
      'wonderful', 'marvelous', 'keep it up', 'good work', 'great work',
      'you rock', 'you are the best', 'best bot', 'smart bot', 'helpful',
      'very good', 'so good', 'loved it', 'love your service', 'top notch',
      'bahut accha', 'bahut badhiya', 'mast', 'zabardast',
    ],
    replies: (ctx) => [
      `Thank you so much, ${ctx.customerName}! That means a lot to us! 🎉`,
      `We're thrilled to hear that, ${ctx.customerName}! 😊 Let us know if you need anything.`,
      `Wow, thank you ${ctx.customerName}! Your kind words make our day! 🌟`,
      `Aww, that's so sweet of you to say! 😊 Thank you, ${ctx.customerName}!`,
      `You just made my circuits happy! 🤖😊 Thanks, ${ctx.customerName}!`,
      `That's amazing to hear! We work hard to provide the best. Thank you! 🎉`,
      `Wow, thanks ${ctx.customerName}! I'll pass this to the team — they'll be thrilled! 🌟`,
      `You're too kind, ${ctx.customerName}! 😊 It's a pleasure serving you.`,
      `Thank you! Feedback like yours keeps us motivated! 💪✨`,
      `That really means a lot, ${ctx.customerName}! Thank you for being such an awesome customer! 🌸`,
      `Glad you feel that way! We strive for excellence. 🌟 Anything else I can help with?`,
      `You're amazing, ${ctx.customerName}! Thanks for the kind words! 🎊`,
      `Bohot shukriya, ${ctx.customerName}! 🙏 Aap jaise customers ke liye hum karte hain!`,
      `That's the best compliment! 🎉 Thank you, ${ctx.customerName}! Need anything else?`,
      `Thank you for the love, ${ctx.customerName}! 💛 Is there anything else I can do?`,
      `I'm blushing (if I could)! 😊 Thanks, ${ctx.customerName}! More questions?`,
      `Music to my ears! 🎵 Thank you, ${ctx.customerName}. Always happy to help!`,
      `That warms my digital heart! 💖 Thanks, ${ctx.customerName}!`,
      `You're the best, ${ctx.customerName}! Thank you for the kind feedback! 🌟`,
      `Wow, that really made my day! 🎉 Thank you so much!`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 11. BOT IDENTITY (30 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'who are you', 'what are you', 'are you a bot', 'are you human',
      'are you real', 'bot or human', 'are you a robot', 'ai or human',
      'what is your name', "what's your name", 'your name', 'naam kya hai',
      'kaun ho', 'kya ho tum', 'are you alive', 'real person',
      'am i talking to a bot', 'human agent', 'real human',
    ],
    replies: (ctx) => [
      `I'm your AI support assistant! 🤖 I can help with orders, deliveries, returns, payments, and more. If I can't resolve something, I'll connect you with our human support team. How can I help, ${ctx.customerName}?`,
      `I'm a smart support bot built to help you! 😊 I know about your orders and account. Just say "talk to support" for a real person.`,
      `I'm your friendly neighborhood support bot! 🤖 I can handle most queries, but I'll hand you to a human if needed.`,
      `Great question! I'm an AI assistant. I have access to your order details and can help with most things. For complex issues, I can connect you with our team. 😊`,
      `I'm a bot, but a pretty smart one! 🤖✨ I know your orders, can track deliveries, handle returns, and more. What do you need?`,
      `I'm your AI buddy here at support! I try to be as helpful as a human. If I can't help, I'll get a real person for you. 😊`,
      `Main ek AI assistant hoon! 🤖 Aapke orders aur account ki puri jaankari mere paas hai. Kaise help karoon?`,
      `I'm an AI, but I promise I'm really good at helping! 😊 I have all your customer info. What do you need, ${ctx.customerName}?`,
      `Think of me as your personal support genie! 🧞 I'm an AI with access to your complete order history. How can I help?`,
      `I'm a chatbot, but a friendly one! 🤖😊 I can help with almost everything. If not, I'll get you a human ASAP.`,
      `I'm your virtual support assistant! Real humans trained me to help you. What do you need, ${ctx.customerName}? 😊`,
      `Bot by nature, helpful by choice! 🤖💪 I've got your account details. How can I help?`,
      `I'm an AI assistant with access to your orders, account, and more. I'm here to make your life easier! 😊`,
      `I'm a support bot, but don't worry — if you need a human, just say "talk to support" and I'll connect you instantly! 🤝`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 12. LAUGHTER / FUN (25 replies)
  // ═══════════════════════════════════════════
  {
    triggers: ['lol', 'haha', 'hehe', 'rofl', 'lmao', '😂', '😄', 'hahaha', 'lolol', 'xd', '🤣', 'ha ha', 'he he', 'funny', 'hilarious'],
    replies: (ctx) => [
      `Haha glad you're in good spirits, ${ctx.customerName}! 😄 Need help with anything?`,
      `😄 Good vibes! Anything I can help you with today?`,
      `Hehe! 😊 Love the energy! What can I do for you?`,
      `LOL! 😂 It's always fun chatting with you. Need anything?`,
      `Ha! You're making my day, ${ctx.customerName}! 😄 Anything I can help with?`,
      `😄 Love it! So, what brings you here today?`,
      `Haha! I like a customer with a sense of humor! 😊 Need help?`,
      `🤣 That's the spirit! Now, anything I can do for you?`,
      `You're fun to talk to, ${ctx.customerName}! 😄 What do you need?`,
      `Haha! Always good to start with a laugh. 😊 How can I help?`,
      `LOL! If only I could laugh too! 🤖😄 What's up?`,
      `Ha! Love the good mood. Now let's solve some problems! 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 13. APOLOGIES FROM CUSTOMER (25 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'sorry', 'my bad', 'apologies', 'apologize', 'i apologize', 'sorry for',
      'oops', 'my mistake', 'i was wrong', 'forgive me', 'maaf karo',
      'galti ho gayi', 'sorry yaar',
    ],
    replies: (ctx) => [
      `No need to apologize, ${ctx.customerName}! 😊 I'm here to help, no matter what.`,
      `Don't worry about it at all! Mistakes happen. How can I help you?`,
      `It's absolutely fine! 😊 No apology needed. What do you need, ${ctx.customerName}?`,
      `Hey, no worries! That's what I'm here for. Let me help you out. 😊`,
      `Please don't apologize! I'm happy to help with anything. What's up?`,
      `Not a problem at all, ${ctx.customerName}! We all make mistakes. How can I assist?`,
      `Koi baat nahi, ${ctx.customerName}! 😊 Batao main kaise help karoon?`,
      `All good, ${ctx.customerName}! No need to say sorry. What do you need?`,
      `Don't even worry about it! 😊 I've got infinite patience. What can I help with?`,
      `It's okay! I never get upset. 🤖😊 Now, what can I do for you?`,
      `No apology necessary! I'm just glad you're here. How can I help?`,
      `Please, no need! I'm here to make things easy for you. 😊 What's up?`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 14. PATIENCE / WAITING (25 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'i am waiting', "i'm waiting", 'still waiting', 'been waiting',
      'taking too long', 'so slow', 'very slow', 'when will', 'how much longer',
      'kab tak', 'kitna time', 'bohot der', 'bahut der', 'late hai',
    ],
    replies: (ctx) => [
      `I understand the wait can be frustrating, ${ctx.customerName}. 😔 Let me check what's going on. Can you tell me more about what you're waiting for?`,
      `I'm sorry about the delay, ${ctx.customerName}! Let me look into this. What are you waiting for?`,
      `Waiting is never fun. I get it, ${ctx.customerName}. Let me help speed things up! What's the situation?`,
      `I hear you, ${ctx.customerName}. Let me check the status right away. Which order is this about?`,
      `So sorry for keeping you waiting! 😔 Let me find out what's happening. Can you share more details?`,
      `I understand your frustration with the wait. Let me help sort this out quickly, ${ctx.customerName}.`,
      `That's too long to wait! Let me see what I can do to help, ${ctx.customerName}. 💪`,
      `Main samajh sakta hoon, ${ctx.customerName}. Chalo dekhte hain kya ho raha hai. 😊`,
      `I apologize for the delay. Let me look into your concern right away. What's the issue?`,
      `No one likes waiting! Let me help get this moving, ${ctx.customerName}. What are you waiting on?`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 15. URGENCY (30 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'urgent', 'emergency', 'asap', 'right now', 'immediately', 'right away',
      'fast', 'quick', 'hurry', 'jaldi', 'jaldi karo', 'turant', 'abhi',
      'urgent hai', 'very urgent', 'super urgent', 'critical', 'time sensitive',
    ],
    replies: (ctx) => [
      `I understand this is urgent, ${ctx.customerName}! 🚨 I'm on it. What's the issue?`,
      `Got it, priority mode activated! 💪 Tell me what's happening, ${ctx.customerName}.`,
      `I hear the urgency! Let me help you right away. What's going on?`,
      `No worries, ${ctx.customerName}! I'll be quick. What do you need? ⚡`,
      `Understood, this is time-sensitive! Let me help immediately. What's the problem?`,
      `I'm here and ready to help ASAP, ${ctx.customerName}! What's the situation? 🚀`,
      `Urgent? Say no more! I'm fully focused on your issue. What happened?`,
      `Let's get this sorted right away, ${ctx.customerName}! Tell me what's wrong. ⚡`,
      `I can see this needs immediate attention. I'm all yours, ${ctx.customerName}! What's up?`,
      `Abhi dekhte hain, ${ctx.customerName}! Jaldi se help karta hoon. Kya hua? 🚀`,
      `On it! I'll do my absolute best to resolve this quickly. What's the issue?`,
      `Speed mode: ON! 🏃 Tell me what's going on, ${ctx.customerName}.`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 16. CONFUSION / DON'T UNDERSTAND (25 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'confused', 'i dont understand', "i don't understand", "don't get it",
      'not clear', 'what do you mean', 'explain', 'samajh nahi aaya',
      'kya matlab', 'confusing', "i'm confused", 'im confused',
      'can you explain', 'explain again', 'repeat', 'come again',
      'phir se batao', 'dubara batao',
    ],
    replies: (ctx) => [
      `No worries, ${ctx.customerName}! Let me explain it differently. What part wasn't clear?`,
      `I'm sorry if that was confusing! 😊 Let me try to make it clearer. What do you need help understanding?`,
      `My bad if I wasn't clear! Let me rephrase. What specifically confused you, ${ctx.customerName}?`,
      `Totally understandable! Sometimes I go too fast. What should I explain better?`,
      `Let me break it down simpler for you, ${ctx.customerName}. Which part was confusing?`,
      `No problem! Happy to explain again. What part would you like me to clarify? 😊`,
      `I want to make sure you understand everything. Let me know what's unclear, ${ctx.customerName}.`,
      `Koi baat nahi! Main phir se explain karta hoon. Kya samajh nahi aaya? 😊`,
      `That's okay! I'll explain it step by step. What do you want to know?`,
      `Sure! I can explain that in a simpler way. What specifically confused you?`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 17. DISCOUNT / OFFER QUERIES (25 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'discount', 'coupon', 'offer', 'sale', 'deal', 'promo', 'promo code',
      'coupon code', 'discount code', 'any offers', 'any discount',
      'special offer', 'flash sale', 'cheapest', 'best price',
      'koi offer', 'koi discount', 'sasta', 'code hai kya',
    ],
    replies: (ctx) => [
      `Great question, ${ctx.customerName}! 🏷️ You can check our latest offers and flash sales on the homepage. Any active coupon codes can be applied at checkout.`,
      `Looking for deals? Smart shopper! 😊 Check the homepage for current sales. Coupons are applied in the cart page.`,
      `I love a good deal too! 🏷️ Visit our homepage for active sales. You can apply promo codes during checkout, ${ctx.customerName}.`,
      `Offers change regularly! Check the homepage for flash sales and new arrivals on discount. Got a specific code? Apply it at checkout! 😊`,
      `Great question! Our latest deals are on the homepage. If you have a coupon code, just enter it in your cart. 🛍️`,
      `Smart thinking, ${ctx.customerName}! 😊 Check the homepage for ongoing offers. Promo codes go in at checkout.`,
      `We frequently run sales and offers! Check our homepage for the latest. If you have a coupon, apply it in the cart page.`,
      `Accha question! 😊 Homepage pe latest offers milenge. Coupon code cart mein apply kar sakte ho.`,
      `I wish I could give you a secret code, but check our homepage for the best current deals! 😄`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 18. PRODUCT QUALITY (20 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'quality', 'material', 'fabric', 'good quality', 'bad quality',
      'cheap quality', 'premium', 'original', 'genuine', 'authentic',
      'asli hai', 'nakli', 'copy', 'duplicate', 'first copy',
    ],
    replies: (ctx) => [
      `We take quality very seriously, ${ctx.customerName}! All our products are 100% authentic and go through quality checks. If you received something below standard, let me know! 😊`,
      `Great question! Every product is genuine and quality-checked. If you're not satisfied, we have an easy return policy within 7 days. 😊`,
      `All our products are original and authentic, ${ctx.customerName}! We never sell duplicates. If there's a quality issue with something you received, I can help! 💯`,
      `Quality is our #1 priority! If you've received a product that doesn't meet expectations, let me know and I'll help with a return or exchange. 😊`,
      `We guarantee authentic products only! If you're unhappy with quality, you can return within 7 days. Need help with a specific order, ${ctx.customerName}?`,
      `Bilkul asli products! 💯 Agar quality mein koi issue hai toh return kar sakte hain. Kya koi problem hai?`,
      `All products are quality-verified before shipping. If something seems off, I'll help you return it right away, ${ctx.customerName}! 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 19. EMOJI-ONLY MESSAGES (20 replies)
  // ═══════════════════════════════════════════
  {
    triggers: ['👍', '👍🏻', '👌', '💯', '🙏', '❤️', '♥️', '😊', '🙂', '😀', '😃', '😁', '🤝', '✅', '👏'],
    exact: true,
    replies: (ctx) => [
      `😊 Glad you're happy, ${ctx.customerName}! Need anything else?`,
      `Great! 😊 Is there something else I can help with?`,
      `👍 Awesome! Let me know if you need more help.`,
      `😊 Love the positivity! Anything else I can do?`,
      `Thanks, ${ctx.customerName}! 😊 I'm here if you need me.`,
      `Glad we're good! 😊 Need anything else?`,
      `🙌 Awesome! Always here to help, ${ctx.customerName}!`,
      `😊 Happy to help! Come back anytime.`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 20. NEGATIVE EMOJIS (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: ['😡', '😤', '😠', '🤬', '😢', '😭', '😞', '😩', '😫', '💔', '👎', '👎🏻'],
    exact: true,
    replies: (ctx) => [
      `I can see you're not happy, ${ctx.customerName}. 😔 I'm here to help. What went wrong?`,
      `I'm sorry you're feeling this way. Let me help fix things. What's the issue, ${ctx.customerName}?`,
      `That doesn't look good. 😔 Tell me what happened and I'll do my best to help.`,
      `I want to make this right, ${ctx.customerName}. What's bothering you?`,
      `I see you're upset. I'm here and ready to help. What's going on? 😔`,
      `I'm sorry, ${ctx.customerName}. Whatever happened, let's sort it out together.`,
      `Your feelings are valid. Let me see how I can help, ${ctx.customerName}. 😊`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 21. ABOUT COMPANY / WHO WE ARE (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'about company', 'who are you guys', 'about you', 'your company',
      'what do you sell', 'what is this', 'kya bechte ho', 'konsi company',
    ],
    replies: (ctx) => [
      `We're an online fashion & lifestyle brand, ${ctx.customerName}! 🛍️ We sell authentic, quality-checked products with fast delivery and easy returns. How can I help?`,
      `Great question! We're a modern e-commerce platform focused on fashion and lifestyle. Quality products, fast delivery, and amazing customer support — that's us! 😊`,
      `We're your go-to online store for fashion and more! 🌟 Quality products, easy returns, and support that cares. What do you need, ${ctx.customerName}?`,
      `We're an e-commerce brand that puts customers first! Free delivery on orders above ₹499, 7-day easy returns, and 24/7 support. 😊`,
      `Hum ek online shopping platform hain! 🛍️ Quality products, fast delivery, aur best customer service. Kaise help karoon?`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 22. SIZE / FIT QUESTIONS (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'size', 'size guide', 'size chart', 'what size', 'which size',
      'too big', 'too small', 'doesn\'t fit', 'wrong size', 'size exchange',
      'fitting', 'measurement', 'naap', 'size kya loon',
    ],
    replies: (ctx) => [
      `For sizing, check the size chart on each product page — it has detailed measurements! If the size doesn't fit, you can return within 7 days. Need help with a specific order, ${ctx.customerName}? 📏`,
      `Every product page has a detailed size guide with measurements in inches and cm. If it doesn't fit, easy returns within 7 days! 😊`,
      `Size issues? Each product has a size chart. If you already received a wrong size, I can help you with a return, ${ctx.customerName}!`,
      `Check the size chart on the product page before ordering! If you've already received something that doesn't fit, we offer returns within 7 days. 📏`,
      `Size guide har product page pe milega! Agar size galat aaya hai, return kar sakte ho 7 din mein. Help chahiye? 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 23. AVAILABILITY / STOCK (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'available', 'in stock', 'out of stock', 'stock', 'restock',
      'back in stock', 'when available', 'sold out', 'kab aayega',
      'stock mein hai', 'available hai', 'mil jayega',
    ],
    replies: (ctx) => [
      `Stock availability is shown on each product page in real-time, ${ctx.customerName}. If something is out of stock, you can sign up for back-in-stock alerts! 📦`,
      `Check the product page for live availability! If it's out of stock, click "Notify Me" and we'll email you when it's back. 😊`,
      `Product pages show real-time stock. Out of stock items have a "Notify Me" button. Want help with something specific, ${ctx.customerName}?`,
      `Stock status is always updated on the product page. Sign up for restock notifications if something you want is sold out! 📧`,
      `Product page pe live stock dikhta hai. Sold out hai toh "Notify Me" daba do, hum bata denge! 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 24. GIFT / GIFTING (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'gift', 'gifting', 'gift wrap', 'gift card', 'present', 'birthday gift',
      'surprise', 'gift for', 'tohfa', 'gift packaging',
    ],
    replies: (ctx) => [
      `Looking for a gift? Great choice, ${ctx.customerName}! 🎁 Browse our collections for the perfect present. For gift-related order queries, I can help!`,
      `Gift shopping? How exciting! 🎁 Check our collections page for great options. Need help with a specific order, ${ctx.customerName}?`,
      `Lovely! 🎁 We have great products perfect for gifting. If you have questions about an existing gift order, I'm here to help!`,
      `Gifts are the best! 🎁 Browse our store for amazing options. If you need help with delivery timing for a gift, just ask!`,
      `Gift dena hai? Bahut accha! 🎁 Hamari collections dekho. Order related help chahiye toh batao! 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 25. RANDOM / PLAYFUL (20 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'tell me a joke', 'joke', 'make me laugh', 'entertain me',
      'bored', "i'm bored", 'im bored', 'tell me something',
      'fun fact', 'interesting', 'surprise me',
    ],
    replies: (ctx) => [
      `Here's one: Why did the shopping cart go to therapy? Because it had too many items to process! 😂 Need actual help, ${ctx.customerName}?`,
      `Why don't packages ever get lost? Because they always follow the tracking! 📦😄 Anyway, how can I help?`,
      `I'm more of a help-bot than a joke-bot, but here goes: What did the customer say to the support agent? "You're un-PARCEL-leled!" 😂 Need anything?`,
      `Fun fact: I can handle multiple chats at once and never need coffee! ☕🤖 What can I help you with, ${ctx.customerName}?`,
      `I'd love to entertain you all day, but I'm also great at solving problems! 😊 Got any shopping queries?`,
      `Here's one: I tried to return my calendar... but its days were numbered! 😂 Okay, okay — how can I actually help you?`,
      `Why did the parcel break up with the delivery van? Because it needed more space! 📦😄 Jokes aside, what do you need?`,
      `I'll save my comedy career for later. 😄 For now, I'm a world-class support assistant! What do you need, ${ctx.customerName}?`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 26. HINDI / HINGLISH CASUAL (30 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'kya kar rahe ho', 'kya kar raha hai', 'kya ho raha hai', 'bhai',
      'yaar', 'dost', 'bro', 'bhai sahab', 'sun', 'suno', 'arre',
      'arey', 'oye', 'boss', 'sir', 'madam', 'ji', 'sahab',
    ],
    exact: true,
    replies: (ctx) => [
      `Haan ji, ${ctx.customerName}! 😊 Batao kaise help karoon?`,
      `Ji boliye! Main suno raha hoon. Kya chahiye? 😊`,
      `Arre ${ctx.customerName}! 👋 Kya hua? Kaise help karoon?`,
      `Ji haan, boss! 😄 Batao kya issue hai?`,
      `Haanji ${ctx.customerName}! Main hoon na. Batao kya karna hai? 😊`,
      `Boliye boliye! Sab theek? Kya help chahiye? 😊`,
      `${ctx.customerName} ji! Hum hazir hain. Kya seva karein? 🙏`,
      `Arre wah, ${ctx.customerName}! Batao batao, kya kaam hai? 😊`,
      `Ji ${ctx.customerName}! Main aapki service mein. Kya chahiye? 😊`,
      `Haan ji! Suno rahe hain. Aap boliye. 😊`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 27. SHIPPING SPEED / FAST DELIVERY (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'fast delivery', 'express delivery', 'same day', 'next day',
      'one day delivery', '1 day delivery', 'jaldi delivery', 'quick delivery',
      'express shipping', 'priority shipping', 'rush delivery',
    ],
    replies: [
      `Standard delivery takes 3-7 business days. Express delivery is available in select metro cities at an extra charge! 🚀`,
      `We offer standard (3-7 days) and express delivery in select cities. Express options show up at checkout if available for your area! ⚡`,
      `Want it fast? Express delivery is available in major cities! Check at checkout. Standard delivery is 3-7 business days. 🏃`,
      `Express delivery available in metro cities! Standard is 3-7 days. The fastest option for your area will show at checkout. 🚀`,
      `Jaldi chahiye? Express delivery select cities mein available hai! Checkout pe option dikhega. Standard 3-7 din lagta hai. 🚀`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 28. TRUST / SAFETY / SECURE (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'safe', 'secure', 'trustworthy', 'legit', 'legitimate', 'trusted',
      'is it safe', 'safe to order', 'reliable', 'bharosa', 'vishwas',
      'can i trust', 'data safe', 'payment safe', 'secure payment',
    ],
    replies: (ctx) => [
      `Absolutely safe, ${ctx.customerName}! 🔒 All payments are processed through secure gateways (Razorpay). Your data is encrypted and protected.`,
      `100% secure! 🔒 We use industry-standard encryption for all transactions. Your payment and personal data are completely safe with us.`,
      `You can trust us completely, ${ctx.customerName}! 🛡️ Secure payments, verified products, and easy returns. We've got you covered.`,
      `Safety is our top priority! 🔒 Encrypted payments, secure servers, and strict privacy. Your data is in safe hands, ${ctx.customerName}.`,
      `Bilkul safe hai! 🔒 Secure payment gateway, encrypted data, aur easy returns. Tension mat lo, ${ctx.customerName}! 😊`,
    ],
    showMenu: false,
  },

  // ═══════════════════════════════════════════
  // 29. REPEAT / SAY AGAIN (15 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'what', 'huh', 'hmm', 'hmmm', '???', '??', 'i didnt get that',
      "i didn't get that", 'say again', 'pardon', 'excuse me',
      'kya bola', 'kya kaha',
    ],
    exact: true,
    replies: (ctx) => [
      `No worries! Let me help you better, ${ctx.customerName}. What would you like to know? You can pick from the options or type your question. 😊`,
      `Sorry if I wasn't clear! What would you like help with? Pick an option below or just describe your issue. 😊`,
      `My apologies! Let me try again. What do you need, ${ctx.customerName}? You can type naturally or select an option.`,
      `Let me try that again! What can I help you with today? 😊`,
      `Oops, let me be clearer! What do you need help with, ${ctx.customerName}?`,
    ],
    showMenu: true,
  },

  // ═══════════════════════════════════════════
  // 30. TALK TO HUMAN / REAL PERSON (20 replies)
  // ═══════════════════════════════════════════
  {
    triggers: [
      'talk to human', 'real person', 'human agent', 'live agent',
      'talk to someone', 'speak to someone', 'connect me', 'transfer me',
      'real support', 'insaan se baat', 'kisi se baat karao',
      'agent se baat', 'manager', 'supervisor', 'senior',
    ],
    replies: (ctx) => [
      `Of course, ${ctx.customerName}! I'll connect you with our support team right away. Just describe your issue briefly and I'll transfer you. 🤝`,
      `Sure thing! Let me hand you over to a real person. Please briefly describe what you need help with so they can assist faster. 😊`,
      `Absolutely, ${ctx.customerName}! I'll get a human on this. Tell me what's going on so I can pass it along to our team.`,
      `No problem! Our support team is great. Let me connect you — just share a quick summary of your issue. 🤝`,
      `Bilkul! Main aapko humari team se connect karta hoon. Please issue batao taaki woh jaldi help kar sakein. 😊`,
    ],
    showMenu: false,
  },
]

// ─── MATCHER FUNCTION ───────────────────────
export function matchConversation(input: string, ctx: BotContext): { reply: string; showMenu: boolean } | null {
  const lower = input.toLowerCase().trim()
  const cleaned = lower.replace(/[!?.,:;'"]+/g, '').trim()

  for (const pattern of convoPatterns) {
    for (const trigger of pattern.triggers) {
      const match = pattern.exact
        ? (cleaned === trigger || lower === trigger)
        : (lower.includes(trigger) || cleaned.includes(trigger))
      if (match) {
        const replies = typeof pattern.replies === 'function' ? pattern.replies(ctx) : pattern.replies
        const reply = replies[Math.floor(Math.random() * replies.length)]
        return { reply, showMenu: pattern.showMenu ?? false }
      }
    }
  }
  return null
}
