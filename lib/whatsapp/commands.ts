import { handleFoodMessage } from '@/lib/whatsapp/food';
import { handleWaterMessage, isWaterMessage } from '@/lib/whatsapp/water';

const DISCLAIMER = 'This is an approximate estimate and not medical advice.';

const WELCOME_MESSAGE =
  "Hi! I'm your nutrition assistant. Send me what you ate (e.g. \"2 idlis and sambar\"), " +
  'or try "water 250ml", "summary", or "help".';

const HELP_MESSAGE =
  'Here\'s what I can do:\n' +
  '- Log food: send a description like "2 idlis and sambar"\n' +
  '- Log water: send "water" or "water 250ml"\n' +
  '- "summary" — today\'s nutrition summary\n\n' +
  DISCLAIMER;

const NOT_LINKED_MESSAGE =
  'Your WhatsApp number isn\'t linked to a profile yet. Please add this phone number in your ' +
  'profile settings on the app to start logging food and water here.';

// userId is the resolved app user (nutrition_profiles.user_id) for this phone number,
// or null if no profile has linked this number yet.
export async function routeIncomingMessage(text: string, userId: string | null): Promise<string> {
  const normalized = text.trim().toLowerCase();

  if (normalized === 'hi' || normalized === 'hello') {
    return WELCOME_MESSAGE;
  }

  if (normalized === 'help') {
    return HELP_MESSAGE;
  }

  // Everything else (food descriptions, water, summary) requires a linked profile.
  if (!userId) {
    return NOT_LINKED_MESSAGE;
  }

  if (isWaterMessage(text)) {
    return handleWaterMessage(userId, text);
  }

  // Phase 2/3 scope: anything else is treated as a food description.
  // "summary" handling is added in a later phase.
  return handleFoodMessage(userId, text);
}
