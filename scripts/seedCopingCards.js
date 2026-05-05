const mongoose = require('mongoose');
require('dotenv').config();
const CopingCard = require('../models/CopingCard');

const cards = [
  {
    title: "When I feel very low",
    category: "low mood",
    whenToUse: "When everything feels pointless and heavy",
    steps: [
      "Sit or lie down in a comfortable position.",
      "Place one hand on your chest, one on your belly.",
      "Breathe in slowly for 4 counts, out for 6 counts – repeat 5 times.",
      "Name 3 things you can see, 2 you can touch, 1 you can hear.",
      "Tell yourself: 'I don’t need to fix everything right now. Just this moment.'"
    ],
    whyItHelps: "Low mood narrows your focus. This small sequence breaks the downward spiral.",
    emergencyNote: "If thoughts of harm appear, call a crisis line immediately."
  },
  {
    title: "When I cannot stop overthinking",
    category: "overthinking",
    whenToUse: "When your mind is stuck in the same loop",
    steps: [
      "Write down the thought that's repeating.",
      "Ask: 'Is this 100% true?'",
      "Ask: 'Is it helpful to keep thinking this?'",
      "Imagine the thought as a cloud passing by.",
      "Redirect to one small action: wash a dish, stretch, drink water."
    ],
    whyItHelps: "Overthinking keeps you in your head. Physical action or labelling breaks the loop."
  },
  {
    title: "When I have no energy",
    category: "no energy",
    whenToUse: "When even getting out of bed feels impossible",
    steps: [
      "Sit up slowly – stay seated for 1 minute.",
      "Put your feet on the floor.",
      "Drink a glass of water.",
      "Open a window or blinds.",
      "Do one micro‑task: make your bed or brush your teeth."
    ],
    whyItHelps: "Small momentum shifts energy. You don’t need to fix the whole day, just the next 5 minutes."
  },
  {
    title: "When I'm being too hard on myself",
    category: "self-criticism",
    whenToUse: "When your inner voice is harsh",
    steps: [
      "Notice the critical thought without judging it.",
      "Ask: 'Would I say this to a friend?'",
      "Rephrase it kindly: 'I'm doing the best I can.'",
      "Place your hand on your heart.",
      "Say to yourself: 'I am allowed to be imperfect.'"
    ],
    whyItHelps: "Self‑criticism activates shame. Switching to a kind inner voice reduces stress."
  },
  {
    title: "When I feel like isolating",
    category: "social withdrawal",
    whenToUse: "When you want to hide from everyone",
    steps: [
      "Send one short text to a safe person – even a sticker.",
      "Spend 2 minutes in shared space (e.g., living room).",
      "Listen to a podcast or audiobook.",
      "Write one sentence about how you feel."
    ],
    whyItHelps: "Isolation deepens depression. A tiny connection anchors you."
  },
  {
    title: "Sleep reset",
    category: "sleep reset",
    whenToUse: "When you can't fall asleep or keep waking up",
    steps: [
      "Get out of bed if you've been lying awake >20 min.",
      "Do something quiet (read a paper book, listen to calm music).",
      "Avoid screens.",
      "Return to bed when you feel sleepy.",
      "Remind yourself: 'Rest is still restful.'"
    ],
    whyItHelps: "Lying awake creates frustration. Getting up breaks the anxiety cycle."
  },
  {
    title: "Grounding now",
    category: "grounding",
    whenToUse: "When you feel overwhelmed or disconnected",
    steps: [
      "Name 5 things you can see.",
      "Name 4 things you can touch.",
      "Name 3 things you can hear.",
      "Name 2 things you can smell.",
      "Name 1 thing you can taste."
    ],
    whyItHelps: "Grounding pulls your brain out of the past or future and into the present."
  },
  {
    title: "Just get through the next 10 minutes",
    category: "low mood",
    whenToUse: "When the day feels too long",
    steps: [
      "Set a timer for 10 minutes.",
      "Do only one small thing (wash your face, make tea).",
      "After timer rings, decide if you can do another 10 minutes.",
      "No need to plan beyond that."
    ],
    whyItHelps: "Breaking the day into bite‑size chunks reduces overwhelm."
  },
  {
    title: "Restart my day gently",
    category: "low mood",
    whenToUse: "When the morning already feels ruined",
    steps: [
      "Acknowledge: 'The morning was hard. That's okay.'",
      "Reset by changing clothes or washing your face.",
      "Eat something small.",
      "Do one kind thing for yourself – listen to a favourite song."
    ],
    whyItHelps: "You can restart any time, not just in the morning."
  },
  {
    title: "Before I give up on today",
    category: "low mood",
    whenToUse: "When you’re tempted to cancel everything",
    steps: [
      "Cancel only the most draining task, keep one small one.",
      "Give yourself permission to do it imperfectly.",
      "Set a 5‑minute timer to start.",
      "If it's still too much, stop. You tried."
    ],
    whyItHelps: "Perfectionism feeds depression. One imperfection is better than nothing."
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await CopingCard.deleteMany({});
    await CopingCard.insertMany(cards);
    console.log(`Seeded ${cards.length} coping cards.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();