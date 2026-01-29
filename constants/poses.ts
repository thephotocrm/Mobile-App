// Pose Gallery Data Model and Built-in Poses

export type PoseCategory =
  | "all"
  | "couples"
  | "portraits"
  | "family"
  | "wedding"
  | "maternity"
  | "newborn"
  | "boudoir"
  | "custom";

// Tag types for filtering and categorizing poses
export type PoseTag =
  // Location tags
  | "outdoor"
  | "indoor"
  | "urban"
  | "nature"
  // Mood/Vibe tags
  | "intimate"
  | "fun"
  | "elegant"
  | "candid"
  | "dramatic"
  // Technical tags
  | "close-up"
  | "full-body"
  | "detail"
  | "silhouette"
  | "movement";

export interface PoseTagInfo {
  id: PoseTag;
  label: string;
  icon: string;
  group: "location" | "mood" | "technical";
}

export const POSE_TAGS: PoseTagInfo[] = [
  // Location tags
  { id: "outdoor", label: "Outdoor", icon: "sun", group: "location" },
  { id: "indoor", label: "Indoor", icon: "home", group: "location" },
  { id: "urban", label: "Urban", icon: "map-pin", group: "location" },
  { id: "nature", label: "Nature", icon: "feather", group: "location" },
  // Mood/Vibe tags
  { id: "intimate", label: "Intimate", icon: "heart", group: "mood" },
  { id: "fun", label: "Fun", icon: "smile", group: "mood" },
  { id: "elegant", label: "Elegant", icon: "star", group: "mood" },
  { id: "candid", label: "Candid", icon: "camera", group: "mood" },
  { id: "dramatic", label: "Dramatic", icon: "zap", group: "mood" },
  // Technical tags
  { id: "close-up", label: "Close-up", icon: "zoom-in", group: "technical" },
  { id: "full-body", label: "Full Body", icon: "user", group: "technical" },
  { id: "detail", label: "Detail", icon: "aperture", group: "technical" },
  { id: "silhouette", label: "Silhouette", icon: "moon", group: "technical" },
  { id: "movement", label: "Movement", icon: "wind", group: "technical" },
];

export interface Pose {
  id: string;
  imageUrl: string;
  category: PoseCategory;
  title?: string;
  notes?: string;
  tags?: PoseTag[];
  isBuiltIn: boolean;
  isFavorite: boolean;
  createdAt: string;
}

export interface CategoryTab {
  id: PoseCategory;
  label: string;
  icon: string;
}

export const POSE_CATEGORIES: CategoryTab[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "couples", label: "Couples", icon: "heart" },
  { id: "portraits", label: "Portraits", icon: "user" },
  { id: "family", label: "Family", icon: "users" },
  { id: "wedding", label: "Wedding", icon: "gift" },
  { id: "maternity", label: "Maternity", icon: "star" },
  { id: "newborn", label: "Newborn", icon: "smile" },
  { id: "boudoir", label: "Boudoir", icon: "feather" },
];

// Built-in poses using Pexels free stock photos
// All images are free to use without attribution (Pexels license)
export const BUILT_IN_POSES: Pose[] = [
  // Couples poses
  {
    id: "builtin-couples-1",
    imageUrl:
      "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Forehead Touch",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Have the couple gently touch foreheads while closing their eyes. This creates an intimate, tender moment that works in any setting. Ask them to take a deep breath together - it relaxes their faces naturally. Works great as a transition between more active poses. Shoot at eye level or slightly below for a flattering angle.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-2",
    imageUrl:
      "https://images.pexels.com/photos/1415131/pexels-photo-1415131.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Walking Together",
    tags: ["outdoor", "nature", "candid", "movement", "full-body"],
    notes:
      "Have the couple walk slowly toward you, looking at each other and talking naturally. Shoot in burst mode to capture genuine expressions. The movement creates authentic reactions - posed walking often looks stiff. Try from both eye-level and low angle for variety. Ask them to tell each other a funny story for natural smiles.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-3",
    imageUrl:
      "https://images.pexels.com/photos/1589216/pexels-photo-1589216.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Embrace from Behind",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "One partner wraps arms around the other from behind. The person in front can place hands on their partner's arms. Works facing the camera or looking to the side. Have them sway gently for natural movement. Great for showing height differences in a flattering way.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-4",
    imageUrl:
      "https://images.pexels.com/photos/1035877/pexels-photo-1035877.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Close Up Kiss",
    tags: ["indoor", "outdoor", "intimate", "close-up", "dramatic"],
    notes:
      "Focus tight on faces during an almost-kiss or gentle kiss. Use a wide aperture (f/1.8-2.8) to blur the background. The anticipation of an almost-kiss often photographs better than the actual kiss. Direct them to go 90% of the way and pause. Side lighting adds dimension and mood.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-5",
    imageUrl:
      "https://images.pexels.com/photos/842876/pexels-photo-842876.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Piggyback Ride",
    tags: ["outdoor", "fun", "movement", "candid", "full-body"],
    notes:
      "Fun and playful pose that shows personality. Have her jump on his back - capture the moment of impact for genuine laughter. Shoot in burst mode and let them move naturally. Works best in open spaces where they can spin or run. Great for couples who are nervous - the activity distracts them from the camera.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-6",
    imageUrl:
      "https://images.pexels.com/photos/1770310/pexels-photo-1770310.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Sunset Silhouette",
    tags: ["outdoor", "dramatic", "silhouette", "nature"],
    notes:
      "Position the couple against a bright sunset or sunrise sky. Expose for the sky to create a dark silhouette. Have them face each other, almost kissing, or walking hand-in-hand. The shapes tell the story. Works even with basic kit lenses. Scout location beforehand to know exactly where sun will be.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-7",
    imageUrl:
      "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Nose to Nose",
    tags: ["outdoor", "intimate", "close-up", "candid"],
    notes:
      "Even more intimate than forehead touch - noses gently touching with eyes closed or looking at each other. This creates a sense of private moment captured. Shoot at their eye level. Works as a natural lead-in to a kiss. The closeness reads as deep connection and trust.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-8",
    imageUrl:
      "https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Sitting on Steps",
    tags: ["outdoor", "urban", "candid", "full-body"],
    notes:
      "Steps create natural height difference and casual feel. Have them sit close, perhaps her legs draped over his, or leaning into each other. Great for candid conversation shots. The architecture provides interesting lines. Different sitting levels add visual interest to compositions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-9",
    imageUrl:
      "https://images.pexels.com/photos/1247741/pexels-photo-1247741.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Looking at Horizon",
    tags: ["outdoor", "nature", "intimate", "full-body"],
    notes:
      "Both facing away, arms around each other, looking at a view together. Shot from behind shows their connection without faces. Perfect for scenic locations - mountains, beach, sunset. Let them be in the moment. Works great as a album closing shot or establishing environmental context.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-10",
    imageUrl:
      "https://images.pexels.com/photos/2174656/pexels-photo-2174656.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Coffee Shop Date",
    tags: ["indoor", "candid", "urban", "intimate"],
    notes:
      "Capture them at a cafe table, hands wrapped around mugs, leaning in to talk. The environment provides natural context and props. Shoot through windows for added depth. Let them actually drink and chat - staged sipping looks awkward. Great for showing their everyday connection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-11",
    imageUrl:
      "https://images.pexels.com/photos/1415131/pexels-photo-1415131.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Dancing in the Street",
    tags: ["outdoor", "urban", "fun", "movement", "full-body"],
    notes:
      "Spontaneous dancing, no matter the location. Play music on your phone if needed. The lack of a 'proper' setting makes it more romantic. Wide shots show environment, tight shots capture expressions. Golden hour backlight makes even plain streets magical. Let them lead each other naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-12",
    imageUrl:
      "https://images.pexels.com/photos/1043902/pexels-photo-1043902.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Gentle Hair Touch",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "One partner gently brushing hair from the other's face or running fingers through hair. This gesture of care is universally intimate. Capture the receiver's eyes closed in contentment. Side angle shows both faces. Soft light enhances the tender mood. Let the moment breathe naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-13",
    imageUrl:
      "https://images.pexels.com/photos/1730877/pexels-photo-1730877.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Beach Walk",
    tags: ["outdoor", "nature", "candid", "movement", "full-body"],
    notes:
      "Barefoot walk along the water's edge, pants rolled up, hand in hand. The vast beach creates scale and romance. Shoot from behind for mystery, or walk ahead for their interaction. Waves add movement. Golden hour light on beach is unbeatable. Let them play with the water.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-14",
    imageUrl:
      "https://images.pexels.com/photos/1024981/pexels-photo-1024981.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Sitting Face to Face",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "Couple sits facing each other, knees touching, holding hands or one partner's hands on other's knees. Creates a private conversation feeling. Shoot from the side to see both faces. Works on benches, blankets, or any surface. The symmetry of facing each other creates visual balance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-15",
    imageUrl:
      "https://images.pexels.com/photos/984944/pexels-photo-984944.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Lifted Kiss",
    tags: ["outdoor", "fun", "movement", "dramatic"],
    notes:
      "He lifts her up (hands on waist or full lift) while she wraps arms around his neck for a kiss. Shows strength and playfulness. Make sure he's comfortable with the lift. Capture at peak height. Try variations - spinning during the lift adds energy and motion blur to dress/hair.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-16",
    imageUrl:
      "https://images.pexels.com/photos/2034373/pexels-photo-2034373.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Laying in Grass",
    tags: ["outdoor", "nature", "candid", "intimate"],
    notes:
      "Couple lying in grass or on a blanket, looking at each other or at the sky. Shoot from directly above for unique perspective, or lay down at their level. Relaxed and unstructured feeling. Check for unflattering neck angles. Flowers or tall grass add foreground interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-17",
    imageUrl:
      "https://images.pexels.com/photos/3692736/pexels-photo-3692736.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Window Light Portrait",
    tags: ["indoor", "intimate", "close-up", "dramatic"],
    notes:
      "Position couple near a large window, soft light wrapping around them. One faces the window, the other faces their partner. Creates beautiful contrast and depth. Have them touch foreheads or whisper. The limited light source creates natural drama. Best in morning or overcast days.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-18",
    imageUrl:
      "https://images.pexels.com/photos/1024986/pexels-photo-1024986.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "One Looking at Camera",
    tags: ["outdoor", "indoor", "candid", "intimate"],
    notes:
      "One partner looks at camera while the other looks at them adoringly. Creates connection with viewer while showing their dynamic. The camera-facing partner should have soft expression, not posed smile. The looking partner shows their affection. Captures both connection with viewer and between them.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-19",
    imageUrl:
      "https://images.pexels.com/photos/2774197/pexels-photo-2774197.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Hand Holding Detail",
    tags: ["outdoor", "indoor", "detail", "intimate"],
    notes:
      "Close-up of interlocked hands or fingers intertwined. Use macro or close-focusing lens. Background blur (shallow depth of field) emphasizes the connection. Can include engagement ring naturally. Hands tell a story of connection without showing faces. Works as supporting detail shot in any session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-20",
    imageUrl:
      "https://images.pexels.com/photos/888894/pexels-photo-888894.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Dip Kiss",
    tags: ["outdoor", "indoor", "dramatic", "elegant", "movement"],
    notes:
      "Classic romantic dip - he supports her back as she leans back for a kiss. Dramatic and timeless. Practice the dip first so both are comfortable. Her arm can wrap around his neck or extend gracefully. Capture at the lowest point of the dip. Works best when both are confident in the movement.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-21",
    imageUrl:
      "https://images.pexels.com/photos/2253879/pexels-photo-2253879.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Whisper in Ear",
    tags: ["outdoor", "indoor", "candid", "intimate", "close-up"],
    notes:
      "One partner whispers something to the other. Captures anticipation and genuine reaction. Tell them to actually whisper something funny or sweet. The receiver's expression is the focal point - laughter, surprise, or touched emotion. Side angle captures both faces in moment of connection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-22",
    imageUrl:
      "https://images.pexels.com/photos/1589817/pexels-photo-1589817.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Running Together",
    tags: ["outdoor", "fun", "movement", "candid", "full-body"],
    notes:
      "Couple running toward camera hand-in-hand, laughing. Conveys joy and adventure. Use fast shutter speed (1/500+) to freeze motion, or slower for intentional blur. They should actually run, not jog awkwardly. Give them a destination. Multiple takes often needed - worth it for the energy captured.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-23",
    imageUrl:
      "https://images.pexels.com/photos/4148842/pexels-photo-4148842.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Couch Cuddle",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Relaxed cuddle on a couch or bed, natural home environment. She might tuck into him, or they lay facing each other. Shows everyday intimacy. Shoot wide to show context, or tight for emotional connection. Natural window light keeps it cozy. Let them find their natural cuddle position.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-24",
    imageUrl:
      "https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Laughing Together",
    tags: ["outdoor", "indoor", "fun", "candid"],
    notes:
      "Genuine laughter captured - tell a joke, have them tickle each other, or recall funny memories. Real laughter transforms faces beautifully. Be ready with camera - laughter fades fast. Continuous shooting helps. The shared moment of joy shows their compatibility. Don't ask them to fake laugh.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-25",
    imageUrl:
      "https://images.pexels.com/photos/4553618/pexels-photo-4553618.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Kitchen Cooking",
    tags: ["indoor", "candid", "fun", "intimate"],
    notes:
      "Couple cooking together in kitchen, natural and unposed. He might wrap arms around her while she stirs, or they work side by side. Real activity creates real moments. Watch for steam, good light, clean background. The domestic scene shows their comfortable partnership. Let them actually cook something simple.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-26",
    imageUrl:
      "https://images.pexels.com/photos/1415822/pexels-photo-1415822.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Kiss on Forehead",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Tender forehead kiss while she closes her eyes. Shows protection and affection. He can hold her face gently or arms around her. Capture her peaceful expression. Side angle often works best to see both. This gesture universally reads as deep love and care. Let the moment linger.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-27",
    imageUrl:
      "https://images.pexels.com/photos/3617496/pexels-photo-3617496.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "City Streets at Night",
    tags: ["urban", "outdoor", "dramatic", "movement"],
    notes:
      "Couple walking through city at night with street lights, neon signs, or passing cars. Use the city lights as bokeh background. Slower shutter can blur light trails around sharp subjects. Creates cinematic, editorial feel. Scout locations for best light sources. Rain adds reflection magic.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-28",
    imageUrl:
      "https://images.pexels.com/photos/1024966/pexels-photo-1024966.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Back to Back",
    tags: ["outdoor", "indoor", "fun", "elegant", "full-body"],
    notes:
      "Standing back to back, either playful (arms crossed, smirking) or intimate (heads turned toward each other). Creates strong shapes and symmetry. Can link arms behind backs. Works for couples who aren't comfortable with constant close contact. Offers variety from face-to-face poses.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-29",
    imageUrl:
      "https://images.pexels.com/photos/1415576/pexels-photo-1415576.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Through the Flowers",
    tags: ["outdoor", "nature", "intimate", "candid"],
    notes:
      "Shoot through flowers or foliage in foreground to frame couple in background. Creates dreamy, layered composition. Soft focus foreground adds depth and color. Works in gardens, fields, or anywhere with plants. Couple can be any pose - the framing adds magic. Wide aperture essential for bokeh.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-30",
    imageUrl:
      "https://images.pexels.com/photos/1693038/pexels-photo-1693038.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Leaning on Fence",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Couple leaning on a fence, gate, or railing - rustic or urban. Creates relaxed casual feel. Can face each other while leaning, or both face outward. Fence lines add composition interest. Works great for countryside, ranch, or park settings. The structure gives them something to do with their bodies.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-31",
    imageUrl:
      "https://images.pexels.com/photos/2726111/pexels-photo-2726111.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Mirror Reflection",
    tags: ["indoor", "elegant", "dramatic"],
    notes:
      "Use a mirror to capture both the couple and their reflection. Creates artistic, layered composition. They can look at each other or at their reflection. Watch your own reflection placement. Hotel lobbies, vintage stores, and bathrooms offer interesting mirrors. The reflection adds visual intrigue.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-32",
    imageUrl:
      "https://images.pexels.com/photos/1036641/pexels-photo-1036641.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "On the Bed",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Couple on a bed - sitting, lying facing each other, or casual relaxed position. Intimate and comfortable setting. Watch overhead angle for double chins. Natural light from window keeps it soft. Can be playful (pillow fight) or tender (close embrace). Shows their private world.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-33",
    imageUrl:
      "https://images.pexels.com/photos/1405528/pexels-photo-1405528.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Gentle Neck Kiss",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Soft kiss on neck or shoulder while she tilts head away. Very intimate and romantic. Her expression is key - peaceful, content. His face can be partially hidden. Be mindful this is intimate - ensure couple is comfortable. Side angle captures the tenderness. Soft light complements the mood.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-34",
    imageUrl:
      "https://images.pexels.com/photos/3331480/pexels-photo-3331480.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Hand on Heart",
    tags: ["indoor", "outdoor", "intimate", "detail"],
    notes:
      "Her hand placed over his heart, his hand covering hers. Simple but symbolic gesture. Focus on the hands with faces slightly blurred, or pull back to see expressions. Shows trust and connection without needing perfect expressions. Works as a detail shot or wider emotional moment.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-35",
    imageUrl:
      "https://images.pexels.com/photos/1035856/pexels-photo-1035856.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Under an Umbrella",
    tags: ["outdoor", "urban", "intimate", "candid"],
    notes:
      "Sharing an umbrella, huddled close in rain or for sun shade. The umbrella creates natural framing and forces closeness. Can kiss underneath or just walk together. Real rain adds mood but needs fast shutter. The shared shelter is inherently romantic. Colorful umbrellas add visual interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-36",
    imageUrl:
      "https://images.pexels.com/photos/4553362/pexels-photo-4553362.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Morning Coffee in Bed",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Couple in bed with morning coffee or tea, natural light from window. Captures everyday intimate moment. Messy hair and relaxed faces are perfect - don't over-style. Shoot wide for context or tight on their faces together. The mundane morning becomes romantic. Let them actually drink and chat.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-37",
    imageUrl:
      "https://images.pexels.com/photos/7275385/pexels-photo-7275385.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Reading Together",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Couple reading together - same book or separate books, her head on his shoulder or legs in his lap. Shows comfortable companionship. Natural setting like couch or bed. They can discuss what they're reading for interaction. The quiet activity shows they enjoy just being together.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-38",
    imageUrl:
      "https://images.pexels.com/photos/1024975/pexels-photo-1024975.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Eskimo Kiss",
    tags: ["indoor", "outdoor", "intimate", "close-up", "fun"],
    notes:
      "Noses rubbing together playfully with eyes closed and smiles. Sweet and playful variation of kiss. Close-up framing emphasizes the tenderness. Both should have soft, relaxed expressions. Can lead naturally into a real kiss. Works well for couples who feel awkward about on-camera kissing.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-39",
    imageUrl:
      "https://images.pexels.com/photos/3296435/pexels-photo-3296435.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Picnic Blanket",
    tags: ["outdoor", "nature", "candid", "fun"],
    notes:
      "Couple on a picnic blanket with food, wine, or just enjoying the setting. Shows them in relaxed leisure. Can sit facing each other or lay side by side. Props like fruit, flowers, wine add visual interest. Let them actually eat and talk. The setting creates automatic romance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-40",
    imageUrl:
      "https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Feet in Frame",
    tags: ["outdoor", "indoor", "detail", "candid"],
    notes:
      "Include their feet - walking, standing on tiptoes for kiss, or dangling off edge. Adds unique perspective and tells story from unusual angle. Works for beach (bare feet), city (cool shoes), or cozy (socks at home). Shows full picture without needing faces. Fun, editorial touch.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-41",
    imageUrl:
      "https://images.pexels.com/photos/4552178/pexels-photo-4552178.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Dancing in Living Room",
    tags: ["indoor", "candid", "fun", "movement", "intimate"],
    notes:
      "Slow dancing in their living room or any indoor space. Play their song on your phone. Shows private intimate moment in their own space. Spin her occasionally for dress movement. The everyday setting makes it more meaningful. Capture both the wide room shot and close emotional moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-42",
    imageUrl:
      "https://images.pexels.com/photos/1405527/pexels-photo-1405527.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "His Jacket on Her",
    tags: ["outdoor", "candid", "intimate", "full-body"],
    notes:
      "She wears his jacket while he has arm around her. Classic chivalrous gesture. The size difference in clothing shows protection and care. Works especially well when weather is actually cool. He can pull her close into the jacket. Captures caring relationship dynamic naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-43",
    imageUrl:
      "https://images.pexels.com/photos/6147061/pexels-photo-6147061.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Getting Ready Together",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "He ties his tie while she helps or watches, or she does makeup while he watches adoringly. Behind-the-scenes feel of getting ready for something. Natural mirror interactions work well. Captures the partnership in everyday preparation. Real moment before an event builds anticipation.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-44",
    imageUrl:
      "https://images.pexels.com/photos/1024968/pexels-photo-1024968.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Face Cupping",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "One partner cups the other's face in both hands. Extremely intimate and focused. The person being held often closes eyes. Can lead into a kiss. Shows tenderness and full attention. Tight framing on faces and hands. This gesture says 'you're all I see.'",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-45",
    imageUrl:
      "https://images.pexels.com/photos/854436/pexels-photo-854436.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Bridge or Pier Walk",
    tags: ["outdoor", "urban", "nature", "full-body", "candid"],
    notes:
      "Walking on a bridge or pier, leading lines drawing eye to couple. Hold hands or arms around each other. The architecture provides strong compositional lines. Can be city bridge or ocean pier. Shoot from behind or ahead. The path symbolizes journey together. Long focal length compresses the scene.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-46",
    imageUrl:
      "https://images.pexels.com/photos/1516589/pexels-photo-1516589.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Twirling Dance Spin",
    tags: ["outdoor", "indoor", "fun", "movement", "elegant"],
    notes:
      "He spins her under his arm while she twirls. Captures movement and joy. Slower shutter can blur her dress beautifully. Continuous shooting catches peak moments. The motion shows playfulness and connection. Works anywhere with enough space. Her expression of joy is key.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-47",
    imageUrl:
      "https://images.pexels.com/photos/1820524/pexels-photo-1820524.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Car Window Shot",
    tags: ["outdoor", "urban", "candid", "fun"],
    notes:
      "Couple inside car, her feet on dashboard, or leaning out window, or shot through windshield. Creates road trip adventure feeling. Parked car with good light works best. Watch reflections on glass. Can be playful or romantic. The confined space forces intimacy. Vintage cars add character.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-48",
    imageUrl:
      "https://images.pexels.com/photos/1043472/pexels-photo-1043472.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Arms Around Waist",
    tags: ["outdoor", "indoor", "candid", "intimate", "full-body"],
    notes:
      "Classic pose - both facing camera with his arms around her waist from behind, or facing each other with arms around each other's waists. Comfortable and connecting. Her hands can rest on his arms. Slight body angle avoids flat look. Creates sense of comfortable togetherness.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-49",
    imageUrl:
      "https://images.pexels.com/photos/1231265/pexels-photo-1231265.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "City Rooftop",
    tags: ["urban", "outdoor", "dramatic", "elegant"],
    notes:
      "Couple on rooftop with city skyline behind. Creates epic scale and drama. Golden hour or blue hour light is magical with city lights. They can embrace, dance, or just take in the view together. Shows them above the everyday world. Scout safe, accessible rooftops beforehand.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-50",
    imageUrl:
      "https://images.pexels.com/photos/1386608/pexels-photo-1386608.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Hand Kiss",
    tags: ["indoor", "outdoor", "elegant", "detail", "intimate"],
    notes:
      "He kisses her hand gallantly while she watches. Classic romantic gesture. Focus on the kiss or pull back to see her reaction. Works for engagement sessions with new ring. Old-fashioned charm appeals to many. The gesture shows respect and adoration. Side angle captures both expressions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-51",
    imageUrl:
      "https://images.pexels.com/photos/2174661/pexels-photo-2174661.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Cafe Window Seat",
    tags: ["indoor", "urban", "candid", "intimate"],
    notes:
      "Couple at window table in cafe, natural light falling on them. Can be shot from inside or through window from street. The everyday setting shows authentic connection. Let them order real drinks and food. Conversation and laughter make best shots. The urban setting adds context.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-52",
    imageUrl:
      "https://images.pexels.com/photos/2191013/pexels-photo-2191013.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Stargazing Pose",
    tags: ["outdoor", "nature", "intimate", "dramatic"],
    notes:
      "Couple lying on blanket looking up at sky (real or implied). Capture from above or at ground level. Works during blue hour for visible sky. They can point at stars or just hold hands. The shared wonder creates connection. Long exposure can add star trails for drama.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-53",
    imageUrl:
      "https://images.pexels.com/photos/1046004/pexels-photo-1046004.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Slow Dance Close",
    tags: ["indoor", "outdoor", "intimate", "elegant", "movement"],
    notes:
      "Close embrace slow dance, her head on his chest or shoulder. Captures intimacy of the close hold. Can include his hand on her lower back, their clasped hands. Tight framing on their connection. Play slow music to help them feel the mood. The gentle sway shows deep comfort together.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-54",
    imageUrl:
      "https://images.pexels.com/photos/1247743/pexels-photo-1247743.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "Ocean View",
    tags: ["outdoor", "nature", "intimate", "full-body"],
    notes:
      "Couple looking out at ocean, arms around each other. Shot from behind shows them taking in the vastness together. The scale of nature contrasts with intimate closeness. Golden hour light on water adds magic. Let them stand in comfortable position. The endless view symbolizes their future together.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-couples-55",
    imageUrl:
      "https://images.pexels.com/photos/3585812/pexels-photo-3585812.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "couples",
    title: "String Lights Background",
    tags: ["outdoor", "indoor", "dramatic", "elegant", "intimate"],
    notes:
      "Couple with bokeh from string lights or fairy lights behind. Creates magical, romantic atmosphere. Wide aperture essential for creamy light blur. Works indoors or outdoor cafe settings. They can kiss, embrace, or just gaze at each other. The lights add instant romance to any pose.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Portrait poses
  {
    id: "builtin-portrait-1",
    imageUrl:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Natural Smile",
    tags: ["indoor", "close-up", "candid"],
    notes:
      "Direct eye contact with camera, natural smile. Position the main light at 45 degrees for flattering shadows. To get genuine smiles, ask them about something they love - pets, hobbies, travel. The key is engagement, not 'say cheese'. Shoot at their eye level for connection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-2",
    imageUrl:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Over the Shoulder",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Subject turns away, then looks back over shoulder toward camera. This creates depth, shows the jawline well, and adds intrigue. Have them drop the shoulder closest to camera slightly. Works great with window light from the side. The twist in the body creates a dynamic line.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-3",
    imageUrl:
      "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Hands Near Face",
    tags: ["indoor", "elegant", "close-up"],
    notes:
      "Hands gently touching face, chin, or hair. Keep fingers relaxed and separated - stiff, pressed-together fingers look unnatural. The hand should barely touch the face, not support the head. Great for drawing attention to eyes or lips. Check for veins and watch ring placement.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-4",
    imageUrl:
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Looking Away",
    tags: ["indoor", "outdoor", "candid", "dramatic"],
    notes:
      "Subject gazes off-camera with a thoughtful expression. Creates mystery and editorial mood. Direct their gaze to something specific ('look at that tree') rather than vague ('look away'). The direction of gaze leads the viewer's eye, so consider composition. Works beautifully with dramatic lighting.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-5",
    imageUrl:
      "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Chin on Hand",
    tags: ["indoor", "elegant", "close-up"],
    notes:
      "Subject rests chin gently on hand or fist. Creates thoughtful, relaxed feel. Keep hand relaxed, not clenched tight. Watch for skin bunching on chin. Great for showing off rings or manicure. The arm creates a leading line to the face. Works at desk, table, or lying down.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-6",
    imageUrl:
      "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Leaning Against Wall",
    tags: ["indoor", "urban", "candid", "full-body"],
    notes:
      "Subject leans casually against wall with one shoulder. Creates relaxed, confident pose. Can cross arms, put hands in pockets, or one hand adjusting hair. The wall gives them something to do with their body. Textured walls add visual interest. Watch for harsh shadows.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-7",
    imageUrl:
      "https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Walking Toward Camera",
    tags: ["outdoor", "urban", "movement", "candid", "full-body"],
    notes:
      "Subject walks toward you confidently. Captures natural movement and energy. Use continuous shooting to catch best stride. They can look at camera or off to side. Works great on streets, paths, or any runway-like space. The movement prevents stiff posing. Coach them on walking naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-8",
    imageUrl:
      "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Sitting on Steps",
    tags: ["outdoor", "urban", "candid", "full-body"],
    notes:
      "Subject sits on stairs or steps. The different levels create interest. Can lean forward on knees, lean back on hands, or sit asymmetrically. Steps provide leading lines in composition. Works for casual or elegant styling. Check for flattering angle on legs.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-9",
    imageUrl:
      "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Playing with Hair",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Subject runs fingers through or adjusts hair. Creates natural, candid feel. Movement in hair adds life to image. Works when hair is down. Can be looking at camera or away. The action gives them something natural to do with hands. Avoid looking like they're scratching head.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-10",
    imageUrl:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Arms Crossed Confident",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Arms crossed with confident, approachable expression. Keep shoulders back, not hunched. The pose conveys strength and self-assurance. Works for professional headshots and editorial. Slight smile softens the powerful stance. Angle body slightly for more dynamic look.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-11",
    imageUrl:
      "https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Silhouette Profile",
    tags: ["indoor", "outdoor", "dramatic", "silhouette"],
    notes:
      "Side profile against bright background, exposing for highlights. Shows jawline and features in shadow form. Works at sunset, in doorways, or against windows. Clean profile - no hair in face. The graphic simplicity creates impact. Strong expressions photograph well in silhouette.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-12",
    imageUrl:
      "https://images.pexels.com/photos/1549974/pexels-photo-1549974.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Laughing Candid",
    tags: ["indoor", "outdoor", "fun", "candid", "close-up"],
    notes:
      "Genuine laughter captured naturally. Tell a joke, share a funny story, or ask about something that makes them happy. Real laughter transforms the face beautifully. Be ready to capture - it fades fast. Multiple shots increase chances. The authenticity is what makes it special.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-13",
    imageUrl:
      "https://images.pexels.com/photos/1462980/pexels-photo-1462980.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Three-Quarter Profile",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Face turned about 45 degrees from camera. Classic portrait angle that flatters most faces. Shows both eyes while creating dimension. Nose shouldn't break the cheek line from this angle. The slight turn adds interest without losing connection. Foundation of portrait photography.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-14",
    imageUrl:
      "https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Low Angle Power Shot",
    tags: ["outdoor", "urban", "dramatic", "full-body"],
    notes:
      "Camera below eye level shooting upward. Creates powerful, confident feeling. Subject appears larger than life. Watch for unflattering nostril or chin angles. Best with dramatic sky or architecture behind. The perspective conveys strength and presence.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-15",
    imageUrl:
      "https://images.pexels.com/photos/1090387/pexels-photo-1090387.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "High Angle Soft Shot",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Camera above eye level shooting down. Creates softer, more approachable feel. Eyes appear larger, face slims naturally. Subject looks up toward lens. Works well for close-ups. The slight vulnerability in looking up creates connection. Avoid going too high which distorts.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-16",
    imageUrl:
      "https://images.pexels.com/photos/1081685/pexels-photo-1081685.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Leaning Forward Engaged",
    tags: ["indoor", "candid", "close-up"],
    notes:
      "Subject leans slightly toward camera. Creates sense of engagement and interest. Works seated or standing. The lean forward conveys openness and connection. Watch that leaning doesn't create unflattering neck position. Great for headshots and conversational feel.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-17",
    imageUrl:
      "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Window Light Natural",
    tags: ["indoor", "elegant", "dramatic", "close-up"],
    notes:
      "Subject positioned near large window, face lit by natural light. Creates beautiful quality light with soft shadows. Position for loop or Rembrandt lighting. The window can be in frame or just used as light source. Morning light is softer, afternoon can be dramatic. This is go-to portrait lighting.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-18",
    imageUrl:
      "https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Environmental Portrait",
    tags: ["outdoor", "urban", "candid", "full-body"],
    notes:
      "Subject shown in context of their environment - workplace, hobby space, meaningful location. The setting tells part of their story. Balance between subject and surroundings. They can interact with the environment naturally. These portraits reveal more about the person.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-19",
    imageUrl:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Hands in Pockets",
    tags: ["outdoor", "urban", "candid", "full-body"],
    notes:
      "Casual stance with hands in pockets. Keep thumbs out for visual interest. Creates relaxed, approachable feel. Works for jeans, suits, or casual wear. Can be standing straight or walking. The pose gives purpose to the hands naturally. Weight on one leg adds dynamic feel.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-20",
    imageUrl:
      "https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Serious Editorial",
    tags: ["indoor", "outdoor", "dramatic", "elegant", "close-up"],
    notes:
      "Strong, serious expression with intense eye contact. No smile required. Creates editorial, fashion-forward look. The intensity draws viewer in. Jaw can be slightly tensed for definition. Works with dramatic lighting. This expression takes practice to perfect.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-21",
    imageUrl:
      "https://images.pexels.com/photos/1898555/pexels-photo-1898555.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Against Colorful Wall",
    tags: ["outdoor", "urban", "fun", "full-body"],
    notes:
      "Subject against bright, colorful wall or mural. The background becomes part of the image. Colors can complement or contrast with subject's outfit. Keep pose simple - background is busy. Great for personality and lifestyle portraits. Scout colorful locations in advance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-22",
    imageUrl:
      "https://images.pexels.com/photos/1759530/pexels-photo-1759530.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Lying Down Looking Up",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Subject lies on back looking up at camera above them. Creates unique perspective. Hair fans out naturally on ground. Relaxed, dreamy expression works well. Shoot directly down for graphic effect. Can include surrounding flowers, grass, or fabric. Watch for unflattering neck angles.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-23",
    imageUrl:
      "https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Coffee or Tea Prop",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Subject holding warm beverage, looking at camera or thoughtfully away. The cup gives hands natural purpose. Steam can add atmosphere. Cozy, relatable feeling. Can be in cafe, home, or anywhere with good light. The everyday prop creates authentic connection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-24",
    imageUrl:
      "https://images.pexels.com/photos/1933873/pexels-photo-1933873.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Through Glass",
    tags: ["indoor", "urban", "dramatic"],
    notes:
      "Shoot through window glass for added layer and texture. Reflections can add visual interest or be minimized with polarizer. Creates separation between viewer and subject. Works at cafes, cars, or any glass surface. The barrier adds intrigue and storytelling element.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-25",
    imageUrl:
      "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Adjusting Clothing",
    tags: ["indoor", "outdoor", "candid"],
    notes:
      "Subject adjusts jacket, straightens collar, or fixes sleeve. Creates natural action moment. Looks candid even when posed. The movement prevents frozen stiffness. Can look at what they're adjusting or at camera. Works for fashion and professional shots.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-26",
    imageUrl:
      "https://images.pexels.com/photos/1689731/pexels-photo-1689731.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Backlit Rim Light",
    tags: ["outdoor", "dramatic", "silhouette"],
    notes:
      "Light from behind creates glowing rim around subject. Use reflector or fill flash to open shadows on face. Creates ethereal, dreamy quality. Works during golden hour or with studio backlight. Hair and edges glow beautifully. Balance between silhouette and fill.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-27",
    imageUrl:
      "https://images.pexels.com/photos/1073097/pexels-photo-1073097.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Reading or Looking Down",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Subject focused on something below eye level - book, phone, object. Captures contemplative mood. Lashes become prominent when looking down. Works for storytelling environmental shots. The absorption in activity creates natural moment. Light from above or side flatters.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-28",
    imageUrl:
      "https://images.pexels.com/photos/1642228/pexels-photo-1642228.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Framed by Environment",
    tags: ["outdoor", "nature", "elegant"],
    notes:
      "Use doorways, arches, trees, or other elements to frame subject. Creates depth and draws eye to subject. The frame can be sharp or soft depending on desired effect. Look for natural frames everywhere. This compositional technique elevates simple portraits.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-29",
    imageUrl:
      "https://images.pexels.com/photos/1468951/pexels-photo-1468951.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Stretching or Reaching",
    tags: ["outdoor", "movement", "candid", "full-body"],
    notes:
      "Subject reaches up, stretches arms, or extends body. Creates dynamic lines and energy. The extension makes body appear longer. Can be reaching toward sky, doorframe, or nothing. Movement variation of static poses. The stretch breaks rigidity.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-30",
    imageUrl:
      "https://images.pexels.com/photos/1081188/pexels-photo-1081188.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Soft Smile Slight Squint",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Gentle smile with slight squint in eyes (the Tyra 'smize'). Creates warm, genuine expression. Real smiles engage eye muscles. Practice in mirror. More subtle than full grin but more engaging than neutral. The eyes are key - they must participate in the smile.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-31",
    imageUrl:
      "https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Sitting Cross-Legged",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Subject sits cross-legged on ground. Creates relaxed, grounded feel. Can be in grass, on floor, or any level surface. Good posture without looking stiff. Hands can rest on knees or in lap. The casual position suggests comfort and approachability.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-32",
    imageUrl:
      "https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Headphone or Earbuds",
    tags: ["urban", "candid", "fun"],
    notes:
      "Subject wearing headphones, lost in music. Creates contemporary, relatable image. Can be eyes closed or looking at camera. Shows personality and style. Works for lifestyle and commercial portraits. The accessory adds story and interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-33",
    imageUrl:
      "https://images.pexels.com/photos/1197132/pexels-photo-1197132.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Close-up Texture Detail",
    tags: ["indoor", "close-up", "detail"],
    notes:
      "Extreme close-up showing skin texture, freckles, or features. Celebrates natural beauty and uniqueness. Shallow depth of field isolates specific features. Works on eyes, lips, or skin patterns. The intimacy of the close view creates impact. Makeup and skin should be well-lit.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-34",
    imageUrl:
      "https://images.pexels.com/photos/1036624/pexels-photo-1036624.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "S-Curve Pose",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Body creates S-shape curve - weight on one hip, shoulders tilted opposite. Classically feminine and flattering. Creates dynamic line through the body. Works standing or leaning. The curves add visual interest and elegance. One of the most flattering poses for women.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-35",
    imageUrl:
      "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Power Stance",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Feet shoulder-width apart, hands on hips or at sides. Confident, powerful stance. Takes up space intentionally. Works for professional and fashion. The strong posture conveys confidence. Can be softened with smile or kept intense. Great for entrepreneurial and leadership portraits.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-36",
    imageUrl:
      "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Through Foliage",
    tags: ["outdoor", "nature", "candid"],
    notes:
      "Shoot through leaves, branches, or plants to frame subject. Creates natural, organic framing. Soft foreground blur adds depth and color. Subject can be aware of camera or candid. Works in gardens, forests, or with potted plants. The natural frame adds visual interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-37",
    imageUrl:
      "https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Working at Desk",
    tags: ["indoor", "candid"],
    notes:
      "Subject at workspace, looking at screen or papers. Creates professional environmental portrait. Can glance at camera for connection shot. Shows them in their element. Natural overhead lighting often needed. The work context adds dimension to personality.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-38",
    imageUrl:
      "https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Looking Over Glasses",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Subject peers over top of glasses at camera. Creates intelligent, questioning look. Works with any style glasses. Can be playful or serious depending on expression. The eyes are key - they must engage. Adds character to portraits of glasses-wearers.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-39",
    imageUrl:
      "https://images.pexels.com/photos/1848565/pexels-photo-1848565.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Wind in Hair",
    tags: ["outdoor", "movement", "candid"],
    notes:
      "Natural wind or fan creates movement in hair. Adds life and energy to portrait. Subject can look into wind or away from it. Position for flattering direction of hair flow. The movement creates dynamic, editorial feel. Real wind is unpredictable but often magical.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-40",
    imageUrl:
      "https://images.pexels.com/photos/1580271/pexels-photo-1580271.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Hat or Accessory Focus",
    tags: ["outdoor", "indoor", "elegant", "close-up"],
    notes:
      "Subject wearing statement hat, scarf, or accessory that adds interest. Accessory becomes part of the story. Position to show accessory while still focusing on face. Adds personality and style dimension. The prop creates visual interest and conversation piece.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-41",
    imageUrl:
      "https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Chin Tilted Up",
    tags: ["indoor", "outdoor", "elegant", "dramatic", "close-up"],
    notes:
      "Subject tilts chin slightly upward for elegant elongated neck. Creates confident, refined look. Light catches along jawline beautifully. Eyes can look at camera or away. Watch for too much tilt which looks unnatural. This subtle adjustment adds sophistication.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-42",
    imageUrl:
      "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Hands Framing Face",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Both hands create frame around face without touching. Draws all attention to face. Fingers should be relaxed and positioned carefully. Can be close to face or wider frame. The hands act as compositional element. Check for awkward finger positions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-43",
    imageUrl:
      "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Caught Mid-Action",
    tags: ["outdoor", "movement", "candid", "fun"],
    notes:
      "Subject caught in middle of natural action - turning, walking, looking back. Creates dynamic candid feel. High shutter speed freezes motion sharply. The spontaneous moment feels real even if directed. Continuous shooting helps catch best moment.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-44",
    imageUrl:
      "https://images.pexels.com/photos/1181562/pexels-photo-1181562.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Seated Conversational",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Subject seated as if mid-conversation. Engaged expression, possibly gesturing with hands. Creates approachable, story-telling feel. Works for interviews, profiles, personal branding. The conversational style puts viewers at ease. Capture between directed moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-45",
    imageUrl:
      "https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Arms Overhead",
    tags: ["outdoor", "fun", "movement", "full-body"],
    notes:
      "Subject raises arms above head - stretching, celebrating, or creating shape. Creates dynamic body line and energy. Can be jumping, standing, or dancing. The extended pose shows confidence and freedom. Works for lifestyle and fitness portraits.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-46",
    imageUrl:
      "https://images.pexels.com/photos/1587014/pexels-photo-1587014.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "City Skyline Background",
    tags: ["outdoor", "urban", "dramatic", "full-body"],
    notes:
      "Subject with city skyline behind, showing scale and context. Can be rooftop, bridge, or elevated viewpoint. Subject is focal point with city as backdrop. Time of day dramatically affects mood. The urban setting adds story and interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-47",
    imageUrl:
      "https://images.pexels.com/photos/1559736/pexels-photo-1559736.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Eyes Closed Peaceful",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Subject with eyes closed, peaceful expression. Creates serene, contemplative mood. Works well with soft, even lighting. The closed eyes remove the camera-awareness. Can be smiling softly or neutral. This vulnerable moment creates connection differently.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-48",
    imageUrl:
      "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Split Lighting",
    tags: ["indoor", "dramatic", "close-up"],
    notes:
      "Light illuminates exactly half the face, other half in shadow. Creates dramatic, moody effect. Position light at 90 degrees to face. Works for artistic, editorial portraits. The strong contrast adds mystery. Check that shadow side isn't completely black.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-49",
    imageUrl:
      "https://images.pexels.com/photos/1288171/pexels-photo-1288171.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Action or Sport Pose",
    tags: ["outdoor", "movement", "fun", "full-body"],
    notes:
      "Subject in athletic pose or motion - running, jumping, sports stance. Shows energy and physicality. Fast shutter freezes motion. Works for fitness, sports, active lifestyle. The dynamic pose reveals another dimension of personality.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-50",
    imageUrl:
      "https://images.pexels.com/photos/1681007/pexels-photo-1681007.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Soft Focus Dreamy",
    tags: ["outdoor", "nature", "intimate"],
    notes:
      "Intentionally soft focus or shot through diffusion for dreamy effect. Creates romantic, ethereal mood. Can use fabric, vaseline (on filter), or soft-focus lens. Works in nature with soft light. The imperfection becomes the aesthetic. Good for fine art portraits.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-51",
    imageUrl:
      "https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Reflection Portrait",
    tags: ["indoor", "urban", "dramatic"],
    notes:
      "Capture subject and their reflection - mirror, water, glass. Creates layered visual interest. Both images should be purposeful. Can show different expressions or same view doubled. The reflection adds artistic dimension. Watch your own reflection placement.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-52",
    imageUrl:
      "https://images.pexels.com/photos/1070030/pexels-photo-1070030.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Pet Portrait With Owner",
    tags: ["indoor", "outdoor", "candid", "fun"],
    notes:
      "Subject with their beloved pet. The genuine love shows naturally. Let them interact authentically. Focus on both faces together or the reaction between them. Pets add personality and story. Be ready for unpredictable moments that become favorites.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-53",
    imageUrl:
      "https://images.pexels.com/photos/1542087/pexels-photo-1542087.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Strong Jawline Angle",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Angle face to emphasize jawline - slightly down and to side. Creates defined, editorial look. Good lighting from side helps. Works for men and women wanting strong look. The angular pose conveys confidence. Small adjustments make big difference.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-54",
    imageUrl:
      "https://images.pexels.com/photos/1447771/pexels-photo-1447771.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Golden Hour Glow",
    tags: ["outdoor", "nature", "intimate", "candid"],
    notes:
      "Subject bathed in warm golden hour light. Creates flattering, magical quality. Position with sun at angle for rim light on hair. The warm tones flatter all skin types. Time window is brief - be prepared. This light makes ordinary scenes extraordinary.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-portrait-55",
    imageUrl:
      "https://images.pexels.com/photos/1642161/pexels-photo-1642161.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "portraits",
    title: "Artistic Double Exposure",
    tags: ["indoor", "outdoor", "dramatic"],
    notes:
      "Create in-camera or post-processed double exposure effect. Combine portrait with texture, nature, or graphics. Creates artistic, conceptual portraits. Plan both elements for meaningful combination. The layering adds depth of meaning. Technical execution varies by method.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Family poses
  {
    id: "builtin-family-1",
    imageUrl:
      "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Group Embrace",
    tags: ["outdoor", "indoor", "intimate", "candid", "full-body"],
    notes:
      "Family gathered close together, arms around each other. Stagger heights by having some sit, some stand, or use steps. Everyone should be touching someone - no islands. Have them squeeze in tight, then relax slightly. Count to three and have everyone look at one person, then at camera - captures natural glances.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-2",
    imageUrl:
      "https://images.pexels.com/photos/1682497/pexels-photo-1682497.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Walking Together",
    tags: ["outdoor", "nature", "candid", "movement", "full-body"],
    notes:
      "Family walking hand-in-hand toward or away from camera. Position smallest children in the middle or swing them between parents. Shoot from behind for an artistic feel, or at an angle to see faces. Give them a destination to walk to - real purpose creates natural movement. Burst mode captures the best moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-3",
    imageUrl:
      "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Parents with Child",
    tags: ["indoor", "outdoor", "intimate", "candid", "close-up"],
    notes:
      "Parents focus on child while you capture their expressions. Have them tickle, whisper secrets, or play peek-a-boo. The interaction creates genuine emotion. Position yourself to catch the parents' adoring expressions. Works great with child in the middle, faces triangulated. Let the moment unfold naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-4",
    imageUrl:
      "https://images.pexels.com/photos/4262424/pexels-photo-4262424.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Playful Moment",
    tags: ["outdoor", "fun", "candid", "movement"],
    notes:
      "Set up a game or activity - tickle attack, group hug pile, tossing kids in the air (safely). Real play creates real joy. Give parents permission to be silly. Shoot continuously and edit later. The slightly chaotic moments often become family favorites. Focus on faces, let limbs blur with motion.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-5",
    imageUrl:
      "https://images.pexels.com/photos/1620653/pexels-photo-1620653.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Piggyback Rides",
    tags: ["outdoor", "fun", "candid", "movement", "full-body"],
    notes:
      "Kids on parents' backs - creates height variety and shows playful dynamic. Parents can face each other for interaction or all face camera. Kids' expressions of joy are priceless. Capture at peak of ride or while walking. The activity creates genuine fun.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-6",
    imageUrl:
      "https://images.pexels.com/photos/3817676/pexels-photo-3817676.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Lying in Circle",
    tags: ["outdoor", "nature", "candid", "fun"],
    notes:
      "Family lies in circle on grass, heads together in center. Shoot from directly above. Creates unique perspective showing all faces. Hair fans out naturally. Requires ladder or elevated position. Works in fall leaves, spring flowers, or beach. The birds-eye view creates impact.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-7",
    imageUrl:
      "https://images.pexels.com/photos/3807541/pexels-photo-3807541.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Cuddling on Couch",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Family piled together on couch or bed. Natural, relaxed positioning. Shows their everyday closeness. Wide angle includes context, tight focuses on connection. Let them arrange themselves comfortably. The home environment shows authentic family life.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-8",
    imageUrl:
      "https://images.pexels.com/photos/4148843/pexels-photo-4148843.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Child on Shoulders",
    tags: ["outdoor", "fun", "candid", "full-body"],
    notes:
      "Child sits on parent's shoulders for height and interaction. Parent can hold ankles, child can hold head. Shows the protective parent/trusting child dynamic. Capture from child's eye level for connection. Works walking or standing still. The elevated perspective delights children.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-9",
    imageUrl:
      "https://images.pexels.com/photos/1128317/pexels-photo-1128317.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Sitting on Blanket",
    tags: ["outdoor", "nature", "candid", "intimate"],
    notes:
      "Family arranged on blanket - park, beach, or yard. Natural, relaxed grouping. Kids can be in parents' laps or between them. The blanket defines the space. Props like picnic basket add interest. Works for varied family sizes and ages.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-10",
    imageUrl:
      "https://images.pexels.com/photos/4260325/pexels-photo-4260325.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Running Toward Camera",
    tags: ["outdoor", "fun", "movement", "candid", "full-body"],
    notes:
      "Family runs toward camera together. Captures energy and togetherness. Fast shutter speed freezes motion. Kids often ahead of parents, showing natural dynamics. Multiple attempts for best expressions. The genuine excitement creates joyful images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-11",
    imageUrl:
      "https://images.pexels.com/photos/3807639/pexels-photo-3807639.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Forehead to Forehead",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Parents and child touch foreheads together. Intimate, tender moment. Works with various age children. Eyes can be closed for peaceful feel. Shows the tight bond of family unit. Soft light complements the tender mood. Let them breathe and relax into it.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-12",
    imageUrl:
      "https://images.pexels.com/photos/3807502/pexels-photo-3807502.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Looking at Baby",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Family members gathered around baby, all looking at little one. Captures the wonder and love. Baby is focal point while adult expressions show adoration. Natural window light flatters. The shared attention on baby is universally relatable.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-13",
    imageUrl:
      "https://images.pexels.com/photos/3807736/pexels-photo-3807736.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Swinging Child",
    tags: ["outdoor", "fun", "movement", "candid"],
    notes:
      "Parents swing child between them, holding hands. Captures peak height of swing. Continuous shooting ensures good timing. Child's expression of joy is priceless. Parents lean back for momentum. The action creates genuine excitement and laughter.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-14",
    imageUrl:
      "https://images.pexels.com/photos/4473893/pexels-photo-4473893.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Kitchen Cooking",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Family cooking or baking together in kitchen. Real activity creates natural interaction. Kids on stools to be included. Capture the mess, the teamwork, the taste tests. Documentary style shows their real life. Let them actually make something.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-15",
    imageUrl:
      "https://images.pexels.com/photos/7282818/pexels-photo-7282818.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Reading Story Together",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Parent reading to children, everyone engaged in story. Natural positioning on couch, bed, or floor. Focus on faces absorbed in narrative. Shows quiet bonding time. The shared activity reveals family culture. Real books work better than screens.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-16",
    imageUrl:
      "https://images.pexels.com/photos/4260315/pexels-photo-4260315.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Toss and Catch",
    tags: ["outdoor", "fun", "movement", "candid"],
    notes:
      "Parent tossing child in air (age-appropriate height). Capture at peak height. Child's expression of excited terror and parent's joy. Fast shutter essential. Safety first - practice before shooting. The trust and fun shows family bond.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-17",
    imageUrl:
      "https://images.pexels.com/photos/3806983/pexels-photo-3806983.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Silhouette Family",
    tags: ["outdoor", "dramatic", "silhouette", "full-body"],
    notes:
      "Family silhouette against sunset or bright sky. Position for clear shapes - no overlapping. Holding hands or varied heights. Expose for sky, let subjects go dark. The graphic shapes tell family story without details. Creates iconic, timeless images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-18",
    imageUrl:
      "https://images.pexels.com/photos/4260324/pexels-photo-4260324.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Generations Portrait",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Multiple generations together - grandparents, parents, children. Arrange by height or age for visual interest. Everyone touching someone. These shots become treasured keepsakes. Take formal and candid versions. The family legacy captured together.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-19",
    imageUrl:
      "https://images.pexels.com/photos/3820380/pexels-photo-3820380.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Parent Kissing Child",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Parent kisses child's cheek, head, or hand. Shows parental love clearly. Child's expression varies - tolerant, happy, squirmy. Natural moment of affection. Side angle shows both faces. The universal gesture of parental love.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-20",
    imageUrl:
      "https://images.pexels.com/photos/3807678/pexels-photo-3807678.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Laying on Bed",
    tags: ["indoor", "candid", "intimate", "fun"],
    notes:
      "Family on bed together - tickling, talking, or cuddling. Shows their comfort together. Shoot from above or at bed level. Messy bed is fine - adds authenticity. The private family space reveals true dynamics. Let them play naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-21",
    imageUrl:
      "https://images.pexels.com/photos/4473395/pexels-photo-4473395.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Beach Play",
    tags: ["outdoor", "nature", "fun", "movement", "candid"],
    notes:
      "Family playing at the beach - splashing, building sandcastles, running from waves. Natural joy in beach setting. Wide shots show environment, close-ups capture expressions. Let them enjoy while you document. Golden hour beach light is magical.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-22",
    imageUrl:
      "https://images.pexels.com/photos/3806983/pexels-photo-3806983.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Holding Hands Close-up",
    tags: ["outdoor", "indoor", "detail", "intimate"],
    notes:
      "Close-up of family hands together - stacked, intertwined, or child hand in adult hand. Size difference is touching. Focus on hands with background blurred. Simple but powerful symbol of connection. Works as detail shot in family session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-23",
    imageUrl:
      "https://images.pexels.com/photos/3985083/pexels-photo-3985083.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Family Game Night",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Family playing board game or cards. Real activity creates genuine expressions. Capture the competition, the laughter, the concentration. Table setup shows their routine. Let them actually play while you document. Real life is interesting.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-24",
    imageUrl:
      "https://images.pexels.com/photos/1261909/pexels-photo-1261909.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Silly Faces",
    tags: ["indoor", "outdoor", "fun", "candid"],
    notes:
      "Everyone makes their silliest face at camera. Guarantees laughs and shows personality. Kids especially love this. Capture both the silly faces and the laughter after. These often become favorites despite not being 'perfect.' Shows family doesn't take themselves too seriously.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-25",
    imageUrl:
      "https://images.pexels.com/photos/4260319/pexels-photo-4260319.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Park Bench Seated",
    tags: ["outdoor", "candid", "full-body"],
    notes:
      "Family on park bench together. Natural setting provides context. Kids can be on laps, between parents, or on bench back. The bench organizes the group naturally. Works for various family sizes. Outdoor shade keeps light even.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-26",
    imageUrl:
      "https://images.pexels.com/photos/3820147/pexels-photo-3820147.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Child Between Parents",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Child sandwiched between parents in hug. Three faces close together. Shows the protected middle child position. Can be standing or lying down. Everyone should be visible. The embrace shows family security.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-27",
    imageUrl:
      "https://images.pexels.com/photos/4473898/pexels-photo-4473898.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Dancing Together",
    tags: ["indoor", "fun", "movement", "candid"],
    notes:
      "Family dancing together - living room dance party style. Play their favorite music. Capture the spinning, dipping, silly moves. Kids dancing on parent's feet. The joy of movement together. Let them be free and capture the energy.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-28",
    imageUrl:
      "https://images.pexels.com/photos/4260317/pexels-photo-4260317.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Back View Walking",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Family walking away from camera, holding hands. Artistic shot showing togetherness without seeing faces. Path or road creates leading lines. Kids often in middle. The journey together metaphor is powerful. Works at sunset for silhouette effect.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-29",
    imageUrl:
      "https://images.pexels.com/photos/4545196/pexels-photo-4545196.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Morning Routine",
    tags: ["indoor", "candid"],
    notes:
      "Documentary style capture of family morning - breakfast, getting ready, chaos. Shows their real life rhythms. Natural light through windows. The everyday moments become meaningful over time. Don't try to perfect it - authenticity is the goal.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-30",
    imageUrl:
      "https://images.pexels.com/photos/3807575/pexels-photo-3807575.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Cheek to Cheek",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Family members press cheeks together - silly, sweet, or squished. Creates fun, connected image. Works with two or more people. Eyes can look at camera or be closed. The physical closeness shows comfort together. Silly expressions add character.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-31",
    imageUrl:
      "https://images.pexels.com/photos/4260322/pexels-photo-4260322.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Stacked Pyramid",
    tags: ["outdoor", "fun", "candid", "full-body"],
    notes:
      "Family creates pyramid or stacked pose - kids on top or in front. Dad often at back/bottom as foundation. Creates playful, creative composition. Check everyone is comfortable and visible. Captures family hierarchy playfully.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-32",
    imageUrl:
      "https://images.pexels.com/photos/3820150/pexels-photo-3820150.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Whisper Secret",
    tags: ["indoor", "outdoor", "candid", "intimate"],
    notes:
      "Parent whispers to child or vice versa. Captures anticipation and reaction. The listener's expression is key. Side angle shows both faces. Creates sense of special bond and private communication. Real secrets or made-up ones both work.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-33",
    imageUrl:
      "https://images.pexels.com/photos/3807519/pexels-photo-3807519.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Looking at Landscape",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Family looking out at view - mountain, ocean, sunset. Shot from behind or side shows them sharing the moment. The landscape adds context and grandeur. Human scale against nature creates impact. The shared experience bonds them.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-34",
    imageUrl:
      "https://images.pexels.com/photos/3807564/pexels-photo-3807564.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Group Jumping",
    tags: ["outdoor", "fun", "movement", "full-body"],
    notes:
      "Everyone jumps in the air simultaneously. Captures energy and spontaneity. Fast shutter freezes mid-air. Multiple takes for everyone up at once. The coordinated effort creates shared accomplishment. Kids love this pose.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-35",
    imageUrl:
      "https://images.pexels.com/photos/4260318/pexels-photo-4260318.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Front Porch or Steps",
    tags: ["outdoor", "candid", "full-body"],
    notes:
      "Family on front porch or steps of home. Home adds meaningful context. Stagger heights using steps. The home is part of the family story. Can be posed or casual. These become treasured records of homes and eras.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-36",
    imageUrl:
      "https://images.pexels.com/photos/3820148/pexels-photo-3820148.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Tickle Fight",
    tags: ["indoor", "outdoor", "fun", "candid", "movement"],
    notes:
      "Parent tickles child while other family members join in. Chaos of laughter and squirming. Continuous shooting captures expressions. The genuine laughter can't be faked. Let the tickle battle unfold naturally. Pure joy results.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-37",
    imageUrl:
      "https://images.pexels.com/photos/4473896/pexels-photo-4473896.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Window Light Portrait",
    tags: ["indoor", "intimate", "elegant"],
    notes:
      "Family gathered near window in soft natural light. Beautiful quality light flatters everyone. Can be looking out window or at each other. The contained lighting creates mood. Works for family portraits with newborn or any age. The light does the work.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-38",
    imageUrl:
      "https://images.pexels.com/photos/3807743/pexels-photo-3807743.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Dad with Kids",
    tags: ["outdoor", "indoor", "candid", "intimate"],
    notes:
      "Father-focused shots with children only. Shows dad's role and relationships. Can be playful or tender. Without mom, different dynamic emerges. Important for documenting dad's involvement. These become especially treasured over time.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-39",
    imageUrl:
      "https://images.pexels.com/photos/3807518/pexels-photo-3807518.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Mom with Kids",
    tags: ["outdoor", "indoor", "candid", "intimate"],
    notes:
      "Mother-focused shots with children only. Shows mom's nurturing relationships. Often more naturally tender. Without dad, different dynamics show. Moms often behind camera - they need to be in photos too. Document the maternal bond specifically.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-40",
    imageUrl:
      "https://images.pexels.com/photos/4473892/pexels-photo-4473892.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Building or Crafts",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Family building something together - blocks, Legos, craft project. Real collaborative activity. Capture the teamwork and concentration. Finished product can appear too. The shared creation shows family cooperation. Let them actually build.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-41",
    imageUrl:
      "https://images.pexels.com/photos/3807677/pexels-photo-3807677.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Feet on Lap",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Casual pose with legs/feet on each other's laps. Shows comfort and familiarity. Works on couch, bed, or floor. The casual intimacy reveals real relationship. Include faces or just focus on the comfortable positioning. Authentically relaxed.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-42",
    imageUrl:
      "https://images.pexels.com/photos/3807510/pexels-photo-3807510.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Siblings Only",
    tags: ["outdoor", "indoor", "candid", "intimate"],
    notes:
      "Just the siblings together without parents. Shows their unique bond. Can be tender or playful depending on dynamic. Important to document sibling relationships specifically. These connections last lifetime. Capture their natural interactions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-43",
    imageUrl:
      "https://images.pexels.com/photos/3807504/pexels-photo-3807504.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Carrying Baby",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "Parent carrying baby or toddler. Natural position shows protection. Can be hip carry, front carry, or over shoulder. Baby's face and parent's expression both matter. The universal image of parent protecting child. Document different carrying positions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-44",
    imageUrl:
      "https://images.pexels.com/photos/4473899/pexels-photo-4473899.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Walking Away Together",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Family walks away from camera toward horizon. Artistic, story-like image. Shows them headed into future together. Path or road creates leading lines. Time of day dramatically affects mood. The symbolic journey makes powerful images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-45",
    imageUrl:
      "https://images.pexels.com/photos/1116050/pexels-photo-1116050.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Autumn Leaves Play",
    tags: ["outdoor", "nature", "fun", "candid"],
    notes:
      "Family playing in fall leaves - throwing, rolling, piling up. Seasonal joy captured. The colors add visual richness. Let them really play in leaves. Candid moments of fun. Best in afternoon light through trees.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-46",
    imageUrl:
      "https://images.pexels.com/photos/1620655/pexels-photo-1620655.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Snow Play",
    tags: ["outdoor", "fun", "candid", "movement"],
    notes:
      "Family in snow - snowball fights, making angels, building snowman. Winter joy documented. Dress warmly, shoot quickly. The white snow reflects light nicely. Bright colored clothing pops. Capture the cold-weather fun before everyone gets too cold.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-47",
    imageUrl:
      "https://images.pexels.com/photos/3807520/pexels-photo-3807520.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Children's Toys Detail",
    tags: ["indoor", "detail", "candid"],
    notes:
      "Child playing with toys, family nearby. Shows their world and interests. Can be wide context or close detail. The toys reveal current phase of childhood. These details are often overlooked but become meaningful. Document what they're into now.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-48",
    imageUrl:
      "https://images.pexels.com/photos/3807540/pexels-photo-3807540.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Outdoor Movie Night",
    tags: ["outdoor", "candid", "fun"],
    notes:
      "Family watching movie outdoors with blankets. Cozy nighttime scene. Natural lighting from screen on faces. The setup shows family tradition. Can be backyard projector or drive-in style. Document these special family rituals.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-49",
    imageUrl:
      "https://images.pexels.com/photos/4260323/pexels-photo-4260323.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Parents Together",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "Just the parents together, romantic moment. Often overlooked in family sessions. Shows their foundation of family. Kids can be in background or fully separate shot. The couple relationship matters to document. They need couple photos too.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-50",
    imageUrl:
      "https://images.pexels.com/photos/3807516/pexels-photo-3807516.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Group Huddle",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "Family in tight huddle, heads together, looking down at camera below. Creates intimacy and togetherness. Shoot from ground looking up. All faces visible in circle. The closeness shows family bond strongly. Works for any family size.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-51",
    imageUrl:
      "https://images.pexels.com/photos/3807642/pexels-photo-3807642.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Pet as Family",
    tags: ["outdoor", "indoor", "fun", "candid"],
    notes:
      "Family including their pet - dog, cat, or other beloved animal. Pets are family members. Can be chaotic but worth the effort. Treats and patience help. The pet adds personality to portraits. Shows complete family unit.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-52",
    imageUrl:
      "https://images.pexels.com/photos/3807678/pexels-photo-3807678.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Pillow Fight",
    tags: ["indoor", "fun", "candid", "movement"],
    notes:
      "Family pillow fight - pure chaos and joy. Feathers flying (optional). Continuous shooting captures the mayhem. Let it get wild. The laughter is guaranteed. Makes for unforgettable images. Give them permission to really play.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-53",
    imageUrl:
      "https://images.pexels.com/photos/4474009/pexels-photo-4474009.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Group Hug Pile",
    tags: ["indoor", "outdoor", "fun", "candid", "intimate"],
    notes:
      "Everyone piles into big group hug. The tangle of arms and smiles. Let it be messy and real. Captures the physical closeness of family love. Kids often end up on top. The embrace shows family bond powerfully.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-54",
    imageUrl:
      "https://images.pexels.com/photos/3817583/pexels-photo-3817583.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Child Leading Walk",
    tags: ["outdoor", "candid", "movement", "full-body"],
    notes:
      "Child walks ahead, leading family. Shows their growing independence. Parents following with love. The child's perspective and confidence visible. Document this phase of development. Shows family dynamic with child as leader.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-family-55",
    imageUrl:
      "https://images.pexels.com/photos/4473894/pexels-photo-4473894.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "family",
    title: "Matching Outfits Detail",
    tags: ["indoor", "outdoor", "detail", "fun"],
    notes:
      "Focus on coordinated family outfits - matching colors, patterns, or themes. Can be full view or detail of matching elements. Shows the planning and togetherness. The coordination is part of the story. Document the cute coordination effort.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Wedding poses
  {
    id: "builtin-wedding-1",
    imageUrl:
      "https://images.pexels.com/photos/1456613/pexels-photo-1456613.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "First Look",
    tags: ["outdoor", "indoor", "intimate", "dramatic", "candid"],
    notes:
      "Position groom with back to camera, bride approaches from behind. This captures his genuine reaction as he turns. Brief him beforehand - 'keep your eyes closed until she taps your shoulder.' Have a second shooter to capture her expression too. The raw emotion makes this one of the most treasured shots. Scout the location for best light beforehand.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-2",
    imageUrl:
      "https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Veil Shot",
    tags: ["outdoor", "elegant", "dramatic", "movement"],
    notes:
      "Bride holds veil edges out wide while wind (or an assistant) creates flow. Backlight strongly for ethereal drama - golden hour or flash work well. Shoot from low angle to emphasize the flowing fabric against the sky. If no wind, have assistant gently toss the veil up. Multiple attempts often needed - shoot continuously.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-3",
    imageUrl:
      "https://images.pexels.com/photos/1779414/pexels-photo-1779414.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Ring Detail",
    tags: ["indoor", "outdoor", "detail", "intimate"],
    notes:
      "Close-up of hands with rings, fingers gently intertwined. Use macro or close-focus lens at f/2.8-4 for ring sharpness with background blur. Clean rings first. Natural light from a window works beautifully. Try different hand positions - stacked, holding, bride's hand on his. Include a bit of dress or suit for context.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-4",
    imageUrl:
      "https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Dancing Together",
    tags: ["indoor", "elegant", "movement", "intimate", "candid"],
    notes:
      "First dance or romantic slow dance. Capture the swirl of the dress, their locked eyes, his hand on her back. Shoot wide to show venue, then move in for emotional close-ups. Slow shutter (1/60s) with flash can show movement while freezing faces. Position yourself to catch both faces. The dip at the end is always worth waiting for.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-5",
    imageUrl:
      "https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Walking Down Aisle",
    tags: ["indoor", "dramatic", "elegant", "movement"],
    notes:
      "Capture the bride walking down the aisle - focus on her face, the guests watching, father's expression. Position at end of aisle for approach shot. Shoot wide for context, telephoto for emotion. The anticipation in her eyes is key. Low continuous shooting mode catches the best expressions. This is a moment that can't be repeated.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-6",
    imageUrl:
      "https://images.pexels.com/photos/1730877/pexels-photo-1730877.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bridal Solo Portrait",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Bride alone in beautiful light, showing her dress and beauty. Use natural window light or golden hour. Can be looking at camera, away, or examining bouquet. Show full dress wide and close-up details. This is her moment to shine alone. Scout location for best light beforehand.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-7",
    imageUrl:
      "https://images.pexels.com/photos/1024979/pexels-photo-1024979.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Groom Solo Portrait",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Groom looking sharp in his suit. Strong, confident posture but soft expression. Adjust tie or cuffs for natural hand placement. Strong side lighting creates masculine look. Can be full body showing suit details or close head shot. His nervousness and excitement should show.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-8",
    imageUrl:
      "https://images.pexels.com/photos/1488312/pexels-photo-1488312.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Kiss at Altar",
    tags: ["indoor", "intimate", "dramatic", "candid"],
    notes:
      "The first kiss as married couple. Position beforehand to capture faces. Anticipate the moment - start shooting just before. Wide angle shows setting, telephoto isolates the moment. Guests reactions in background add context. This split-second defines the ceremony. Continuous high-speed shooting is essential.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-9",
    imageUrl:
      "https://images.pexels.com/photos/3014857/pexels-photo-3014857.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Exchange of Vows",
    tags: ["indoor", "intimate", "candid", "dramatic"],
    notes:
      "Capture their faces as they exchange vows. Tears, smiles, nervous hands. Position to see both faces if possible, or focus on listener's reaction. Available light keeps it authentic. The raw emotion is what matters. Be invisible - don't distract from the moment. Long lens helps maintain distance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-10",
    imageUrl:
      "https://images.pexels.com/photos/1573007/pexels-photo-1573007.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Ring Exchange",
    tags: ["indoor", "detail", "intimate", "candid"],
    notes:
      "Close-up of ring being placed on finger. Anticipate the moment - pre-focus on hands. Include some background blur of officiant or partner's face. The trembling hands, careful placement tell the story. Side angle shows the ring clearly. This small moment carries huge significance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-11",
    imageUrl:
      "https://images.pexels.com/photos/2253862/pexels-photo-2253862.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Walking Back Up Aisle",
    tags: ["indoor", "fun", "candid", "movement"],
    notes:
      "The jubilant walk back as newlyweds. Position at back of venue facing them. Capture the joy, raised hands, guests cheering. Wide angle shows celebration, telephoto focuses on their faces. They're finally relaxed and happy - it shows. This is pure celebration energy.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-12",
    imageUrl:
      "https://images.pexels.com/photos/1444441/pexels-photo-1444441.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bouquet Toss",
    tags: ["indoor", "fun", "candid", "movement"],
    notes:
      "Capture the throw and the catch attempt. Position to see bride from behind and eager guests in front. Wide angle captures the chaos. Fast shutter freezes the bouquet mid-air. The expressions on reaching guests are priceless. Anticipate the trajectory. Multiple shots ensure you get the catch.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-13",
    imageUrl:
      "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Forehead Touch",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Quiet moment with foreheads touching. Creates intimate portrait anywhere. Eyes closed, peaceful expressions. Works during portrait time or stolen moment during reception. Soft light flatters. This pose works when couple needs a moment to breathe and connect away from the crowd.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-14",
    imageUrl:
      "https://images.pexels.com/photos/3014853/pexels-photo-3014853.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bride Getting Ready",
    tags: ["indoor", "candid", "intimate", "detail"],
    notes:
      "Mother zipping dress, bridesmaids helping with veil, makeup artist at work. Document the preparation without interfering. Natural window light is ideal. Mix wide context shots and tight details. The nervous energy and excitement tell the story. These moments often become favorites.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-15",
    imageUrl:
      "https://images.pexels.com/photos/1464565/pexels-photo-1464565.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Groom Getting Ready",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Groomsmen helping with tie, father pinning boutonniere, nervous jokes. Capture the camaraderie and anticipation. Often more relaxed than bridal prep. Watch for genuine laughs and quiet reflective moments. These relationships matter - show them.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-16",
    imageUrl:
      "https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Dress Detail Shot",
    tags: ["indoor", "detail", "elegant"],
    notes:
      "Close-up of dress details - beading, lace, buttons, train. Use macro or close-focus lens. Soft window light or off-camera flash. The craftsmanship deserves documentation. Hang dress in good light for full shots. These details show the care in choosing the gown.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-17",
    imageUrl:
      "https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Shoes and Accessories",
    tags: ["indoor", "detail", "elegant"],
    notes:
      "Bridal shoes, jewelry, invitation, perfume bottle artfully arranged. Create a flat lay or artistic still life. Consistent lighting across items. Include meaningful personal items. These details set the tone for the story. Take time to arrange thoughtfully.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-18",
    imageUrl:
      "https://images.pexels.com/photos/1702373/pexels-photo-1702373.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bouquet Close-up",
    tags: ["outdoor", "indoor", "detail", "elegant"],
    notes:
      "The wedding bouquet in beautiful light. Show the color, texture, and artistry of the flowers. Bride can hold it, or photograph against her dress. Soft, even lighting prevents harsh shadows on petals. The bouquet is a key design element worth highlighting.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-19",
    imageUrl:
      "https://images.pexels.com/photos/2959191/pexels-photo-2959191.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Father Daughter Moment",
    tags: ["indoor", "intimate", "candid", "dramatic"],
    notes:
      "Father seeing daughter in dress, or their dance together. These are highly emotional moments. Be ready for tears. Capture his pride and her love. During the dance, get close-ups of expressions and wide shots for context. Some of the most treasured wedding images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-20",
    imageUrl:
      "https://images.pexels.com/photos/1488314/pexels-photo-1488314.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Mother Son Dance",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Groom dancing with his mother. Often emotional and tender. Capture their connection and conversation. Other guests in background add context. The height difference often creates sweet framing. Watch for genuine emotional moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-21",
    imageUrl:
      "https://images.pexels.com/photos/2253875/pexels-photo-2253875.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple Portrait with Venue",
    tags: ["outdoor", "elegant", "full-body", "dramatic"],
    notes:
      "Wide shot showing couple and the wedding venue architecture. Establishes location and scale. Couple can be small in frame with building dominant, or balanced. Golden hour light on buildings is magical. These shots become important memories of the place.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-22",
    imageUrl:
      "https://images.pexels.com/photos/1456613/pexels-photo-1456613.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Grand Exit",
    tags: ["outdoor", "fun", "movement", "dramatic"],
    notes:
      "Sparklers, bubbles, petals, or confetti as couple leaves. Fast shutter for confetti, slower for sparkler trails. Position guests in two lines for best effect. Capture their joy running through. Backlight adds drama. Coordinate timing with videographer.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-23",
    imageUrl:
      "https://images.pexels.com/photos/2788488/pexels-photo-2788488.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Cake Cutting",
    tags: ["indoor", "fun", "candid"],
    notes:
      "Traditional cake cutting moment. Position to see both faces and their hands on knife. Anticipate the feeding each other moment - often playful. Watch for genuine reactions and laughter. Flash often needed for indoor lighting. Include some cake detail shots too.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-24",
    imageUrl:
      "https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Toasts and Speeches",
    tags: ["indoor", "candid", "fun", "intimate"],
    notes:
      "Capture speakers and couple's reactions. Best man's jokes, maid of honor's tears, parents' pride. Bounce flash for natural look. Watch couple's faces during speeches - their reactions tell the story. Wide shots establish scene, close-ups capture emotion.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-25",
    imageUrl:
      "https://images.pexels.com/photos/1024984/pexels-photo-1024984.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple Embracing with Train",
    tags: ["outdoor", "elegant", "dramatic", "full-body"],
    notes:
      "Show the full dress train spread beautifully while couple embraces. Often shot from elevated position or drone. Assistant may need to arrange train. The grandeur of the dress deserves this shot. Works on grass, steps, or floors that contrast with dress color.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-26",
    imageUrl:
      "https://images.pexels.com/photos/3916019/pexels-photo-3916019.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bridal Party Group",
    tags: ["outdoor", "fun", "full-body", "candid"],
    notes:
      "Full bridal party photo - formal and fun variations. Organize by height, matching pairs, or creative arrangement. Do the formal shot first, then let them interact naturally for candid version. Moving shots (walking toward camera) add energy. Show their relationships.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-27",
    imageUrl:
      "https://images.pexels.com/photos/2959190/pexels-photo-2959190.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Groomsmen Shot",
    tags: ["outdoor", "fun", "full-body"],
    notes:
      "Groom with his groomsmen. Can be formal lineup or casual candid. Walking shots, laughing together, adjusting ties. Show their friendship. Let personality shine through - serious or silly depending on group dynamic. These friendships are part of the story.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-28",
    imageUrl:
      "https://images.pexels.com/photos/1488313/pexels-photo-1488313.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bridesmaids Shot",
    tags: ["outdoor", "indoor", "fun", "full-body"],
    notes:
      "Bride with bridesmaids. Mix formal and playful. Helping with dress, laughing together, champagne toast. Their support and friendship should be visible. Fun movement shots add variety. These women chose to celebrate with her.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-29",
    imageUrl:
      "https://images.pexels.com/photos/1456615/pexels-photo-1456615.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Sunset Portrait",
    tags: ["outdoor", "dramatic", "intimate", "silhouette"],
    notes:
      "Couple silhouette or warmly lit against sunset sky. Plan timing around golden hour. Position for best sky color behind them. Can be kiss, embrace, or walking away. The brief perfect light window requires preparation. Scout location in advance.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-30",
    imageUrl:
      "https://images.pexels.com/photos/1043902/pexels-photo-1043902.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Looking at Each Other",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Simple, powerful pose - just looking into each other's eyes. Faces close, soft expressions. Can be posed but prompt natural emotion by asking them to think about specific memories together. This connection is why they're getting married.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-31",
    imageUrl:
      "https://images.pexels.com/photos/752842/pexels-photo-752842.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Church Interior Shot",
    tags: ["indoor", "dramatic", "elegant"],
    notes:
      "Capture the ceremony venue's grandeur with couple small in frame. Architectural lines lead to couple at altar. Works before guests arrive or during posed portrait time. Show the setting they chose for their vows. Wide angle lens captures full space.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-32",
    imageUrl:
      "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Reception Entrance",
    tags: ["indoor", "fun", "movement", "candid"],
    notes:
      "Grand entrance to reception. Dancing, raised arms, guests cheering. Fast shutter captures movement. Position at end of pathway they'll walk through. DJ announcement adds energy. The relief and joy of the party starting shows in their faces.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-33",
    imageUrl:
      "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Table Settings Detail",
    tags: ["indoor", "detail", "elegant"],
    notes:
      "Beautiful table settings, centerpieces, place cards. Document the decor before guests disturb it. Consistent lighting across shots. Show the design and planning that went into these details. These shots complete the story of the day.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-34",
    imageUrl:
      "https://images.pexels.com/photos/1405528/pexels-photo-1405528.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple Dancing with Guests",
    tags: ["indoor", "fun", "candid", "movement"],
    notes:
      "Couple on dance floor surrounded by celebrating guests. The party energy captured. Wide angle shows the celebration, telephoto isolates couple's joy. Slow shutter with flash creates energy. The community celebrating them matters.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-35",
    imageUrl:
      "https://images.pexels.com/photos/1024961/pexels-photo-1024961.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Hands Close-up",
    tags: ["detail", "intimate", "close-up"],
    notes:
      "Close-up of their hands together - during ceremony, dancing, or posed. Shows rings, her bouquet, his cufflinks. Tells story without faces. Works as album detail pages. The physical connection of hands is simple but powerful.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-36",
    imageUrl:
      "https://images.pexels.com/photos/2959189/pexels-photo-2959189.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Car Departure",
    tags: ["outdoor", "fun", "candid"],
    notes:
      "Couple leaving in decorated car or vintage vehicle. Can and ribbon decorations add charm. Capture them getting in, waving from window, driving away. Include 'Just Married' signs. The departure marks the transition to their new life together.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-37",
    imageUrl:
      "https://images.pexels.com/photos/2174656/pexels-photo-2174656.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Intimate Stolen Moment",
    tags: ["outdoor", "indoor", "intimate", "candid"],
    notes:
      "Capture a quiet moment when couple thinks no one is watching. Step back with long lens. Whispered conversation, forehead touch, private laugh. These unguarded moments are often most treasured. Stay alert throughout the day for these opportunities.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-38",
    imageUrl:
      "https://images.pexels.com/photos/3038319/pexels-photo-3038319.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Garter Toss",
    tags: ["indoor", "fun", "candid"],
    notes:
      "Garter removal and toss to bachelor guests. Can be comedic or tasteful. Capture guests reaching for the garter. The expressions of participants are key. Position to see groom and catching crowd. Fast shutter freezes the catch attempt.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-39",
    imageUrl:
      "https://images.pexels.com/photos/1702378/pexels-photo-1702378.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Flower Girl/Ring Bearer",
    tags: ["indoor", "outdoor", "candid", "fun"],
    notes:
      "The little ones walking down aisle or during portraits. Their unpredictability is charming. Get at their eye level. Capture their nervousness, pride, or playfulness. These images become treasured by extended family. Be patient and ready.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-40",
    imageUrl:
      "https://images.pexels.com/photos/1024994/pexels-photo-1024994.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bride Laughing",
    tags: ["indoor", "outdoor", "candid", "close-up"],
    notes:
      "Genuine bridal laughter captured candidly. The joy of the day showing on her face. Often happens during speeches, with bridesmaids, or private moments with groom. Be ready throughout the day. This authentic emotion is priceless.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-41",
    imageUrl:
      "https://images.pexels.com/photos/3014843/pexels-photo-3014843.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple Under Veil",
    tags: ["outdoor", "intimate", "elegant", "dramatic"],
    notes:
      "Veil draped over both of them creating intimate cocoon. Shoot through the veil for dreamy effect. They can kiss, touch foreheads, or just gaze at each other. Creates sense of private world. Backlight through veil adds magic. Works outdoors or near windows.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-42",
    imageUrl:
      "https://images.pexels.com/photos/3916027/pexels-photo-3916027.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Back of Dress Detail",
    tags: ["indoor", "outdoor", "detail", "elegant"],
    notes:
      "Focus on the back of the wedding dress - buttons, lace, or open back design. Bride can look over shoulder or straight ahead. Show the craftsmanship often hidden during ceremony. Natural light emphasizes texture. These details were carefully chosen.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-43",
    imageUrl:
      "https://images.pexels.com/photos/1444443/pexels-photo-1444443.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Party Dancing Candids",
    tags: ["indoor", "fun", "candid", "movement"],
    notes:
      "Guests dancing, celebrating, having fun at reception. Capture the party energy. Slow shutter with rear-curtain flash creates motion trails. The celebration around the couple is part of the story. Move through the dance floor capturing moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-44",
    imageUrl:
      "https://images.pexels.com/photos/1415824/pexels-photo-1415824.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Kiss on Cheek",
    tags: ["outdoor", "indoor", "intimate", "close-up"],
    notes:
      "Gentle kiss on cheek while she smiles. Sweet and less intense than lip kiss. Her expression of happiness is key. Works anytime during the day. The tenderness of this gesture photographs beautifully. Side angle shows both faces.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-45",
    imageUrl:
      "https://images.pexels.com/photos/265856/pexels-photo-265856.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Walking Away Shot",
    tags: ["outdoor", "elegant", "full-body", "dramatic"],
    notes:
      "Couple walking away from camera, showing full dress from behind. Holding hands or arm in arm. Path, road, or architectural lines enhance composition. The 'into the sunset' feel symbolizes their journey ahead. Telephoto compresses the scene.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-46",
    imageUrl:
      "https://images.pexels.com/photos/2747447/pexels-photo-2747447.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple with Night Sky",
    tags: ["outdoor", "dramatic", "nature"],
    notes:
      "Couple under stars or night sky, possibly with off-camera flash. Long exposure for stars, flash freezes subjects. Requires dark location away from light pollution. Plan around moon phase. Creates magical, otherworldly images. Test settings beforehand.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-47",
    imageUrl:
      "https://images.pexels.com/photos/1024964/pexels-photo-1024964.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Holding Hands Walking",
    tags: ["outdoor", "indoor", "candid", "movement", "full-body"],
    notes:
      "Simple hand holding while walking together. Shot from behind or at angle. Shows their connection and partnership. Works anywhere - venue, grounds, streets. Natural movement looks best. The simple gesture says everything about togetherness.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-48",
    imageUrl:
      "https://images.pexels.com/photos/1050302/pexels-photo-1050302.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Window Portrait",
    tags: ["indoor", "elegant", "dramatic", "close-up"],
    notes:
      "Bride or couple by large window, dramatic natural light. The light quality shapes faces beautifully. Can be bridal solo or couple portrait. Position for Rembrandt lighting or silhouette. Window architecture can frame the shot. Best in morning or overcast for soft light.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-49",
    imageUrl:
      "https://images.pexels.com/photos/2403568/pexels-photo-2403568.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Confetti/Petal Shower",
    tags: ["outdoor", "fun", "candid", "movement"],
    notes:
      "Guests throwing petals or confetti as couple walks through. Fast shutter freezes falling pieces. Wide angle captures the celebration. The chaos of falling confetti creates joyful frame. Position guests in lines for consistent shower. Colorful confetti photographs better than white.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-50",
    imageUrl:
      "https://images.pexels.com/photos/3014852/pexels-photo-3014852.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Family Formal Portrait",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Immediate family formal group photo. Organize efficiently - have list prepared. Position by height with couple in center. Check everyone is visible and well-lit. These shots are expected and important to families. Move quickly but ensure quality.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-51",
    imageUrl:
      "https://images.pexels.com/photos/2252829/pexels-photo-2252829.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Long Veil Shot",
    tags: ["outdoor", "elegant", "dramatic", "movement"],
    notes:
      "Cathedral length veil stretched out fully. Often requires assistant or multiple people to position. Dramatic overhead or wide angle. Wind or toss creates beautiful flow. The scale of the veil creates grandeur. Worth the effort for the result.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-52",
    imageUrl:
      "https://images.pexels.com/photos/2253880/pexels-photo-2253880.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Through Doorway",
    tags: ["indoor", "elegant", "dramatic"],
    notes:
      "Shoot through doorway or arch to frame couple. Creates depth and context. The architectural element adds interest. They can kiss, embrace, or just stand together. The frame within frame technique is classically romantic. Expose for the couple, let doorway go darker.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-53",
    imageUrl:
      "https://images.pexels.com/photos/265799/pexels-photo-265799.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Signing Registry",
    tags: ["indoor", "detail", "candid"],
    notes:
      "Couple signing the marriage certificate or registry. Detail of hands and document. Include their faces reacting to the significance. This legal moment is also deeply personal. Capture the pens, their hands, the official moment.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-54",
    imageUrl:
      "https://images.pexels.com/photos/1702374/pexels-photo-1702374.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Couple Reflection",
    tags: ["outdoor", "indoor", "dramatic", "elegant"],
    notes:
      "Use water, mirrors, or shiny surfaces to capture couple and reflection. Creates artistic, editorial feel. Rain puddles, marble floors, calm water all work. The doubled image adds visual interest. Position carefully to include both actual couple and clear reflection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-wedding-55",
    imageUrl:
      "https://images.pexels.com/photos/1488317/pexels-photo-1488317.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "wedding",
    title: "Bridal Portrait with Flowers",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Bride with bouquet prominently featured. Flowers frame her face or held naturally. Show both her beauty and the floral design. Soft light flatters skin and petals. The colors of the bouquet complement her features. Classic bridal portrait style.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Maternity poses
  {
    id: "builtin-maternity-1",
    imageUrl:
      "https://images.pexels.com/photos/3662899/pexels-photo-3662899.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Hands on Belly",
    tags: ["indoor", "outdoor", "intimate", "close-up", "detail"],
    notes:
      "Both hands cradle the belly gently - one above, one below creates a nice frame. Fingers should be relaxed, not splayed. Can add partner's hands underneath or beside hers. Shoot from slightly above to elongate the neck. Soft, directional lighting emphasizes the belly curve. Ask her to look down at her belly for a tender expression.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-2",
    imageUrl:
      "https://images.pexels.com/photos/2100341/pexels-photo-2100341.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Silhouette",
    tags: ["indoor", "outdoor", "dramatic", "silhouette", "elegant"],
    notes:
      "Position her sideways in front of a bright window or backlit background. Expose for the highlights to create pure black silhouette. The belly profile should be clearly visible. Flowing fabric adds interest. She can look down, straight ahead, or tilt chin up. This works at any stage of pregnancy to show the distinct shape.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-3",
    imageUrl:
      "https://images.pexels.com/photos/3763587/pexels-photo-3763587.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Partner Connection",
    tags: ["indoor", "outdoor", "intimate", "candid"],
    notes:
      "Partner kisses the belly while she looks down lovingly. Can also do forehead to forehead with hands on belly together. The key is capturing the anticipation and bond. Direct the partner to whisper to the baby - creates genuine emotion. Side angle shows both faces and the belly curve. Soft light keeps the mood tender.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-4",
    imageUrl:
      "https://images.pexels.com/photos/3014982/pexels-photo-3014982.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Profile Side View",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Classic profile shot showing the belly curve clearly. Stand sideways with good posture - shoulders back, chin slightly up. One hand on belly, other relaxed at side. This angle emphasizes the shape beautifully. Soft side lighting defines the curve. Works at any trimester to document growth.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-5",
    imageUrl:
      "https://images.pexels.com/photos/3014983/pexels-photo-3014983.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Lying on Back",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Lying on back (if comfortable) with hands cradling belly. Shoot from above for unique perspective. Hair fans out, peaceful expression. Shows vulnerable, protected moment. Check she's comfortable - some women can't lie on back late pregnancy. Soft fabrics and window light enhance mood.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-6",
    imageUrl:
      "https://images.pexels.com/photos/3845454/pexels-photo-3845454.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Flowing Fabric",
    tags: ["outdoor", "elegant", "dramatic", "movement"],
    notes:
      "Long flowing dress or fabric catching wind or being tossed by assistant. Creates ethereal, goddess-like images. Backlight adds magic glow through fabric. The movement adds drama and visual interest. Works in fields, beaches, or anywhere with space. Multiple shots needed to capture perfect flow.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-7",
    imageUrl:
      "https://images.pexels.com/photos/3662906/pexels-photo-3662906.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Mirror Reflection",
    tags: ["indoor", "elegant", "intimate"],
    notes:
      "Mom looks at her reflection in mirror, admiring her changing body. Captures self-love and wonder moment. Can see both her and reflection. The mirror adds depth and intimacy. Full-length mirrors work best. The private moment of self-appreciation is beautiful to document.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-8",
    imageUrl:
      "https://images.pexels.com/photos/3662904/pexels-photo-3662904.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Sitting on Floor",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Seated on floor, legs to one side, hands on belly. Creates grounded, peaceful composition. Can be near window for natural light. Flowy dress or casual clothing both work. The floor sitting feels intimate and real. Comfortable for longer poses. Shows the calm before baby arrives.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-9",
    imageUrl:
      "https://images.pexels.com/photos/3662898/pexels-photo-3662898.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Nature Setting",
    tags: ["outdoor", "nature", "elegant", "full-body"],
    notes:
      "Outdoor in beautiful natural setting - field, forest, garden. Nature adds organic beauty and scale. Golden hour light is essential. Can be standing, walking, or seated. The outdoor setting suggests growth and new life. Weather dependent but worth the planning.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-10",
    imageUrl:
      "https://images.pexels.com/photos/3662905/pexels-photo-3662905.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Belly Detail Close-up",
    tags: ["indoor", "detail", "intimate"],
    notes:
      "Extreme close-up of belly only, perhaps with hands or partner's hands. Shows texture, stretch marks as beautiful details. Macro or close focus lens emphasizes details. Celebrates the physical changes. Can include belly button, linea nigra as natural details. Intimate documentation of her body.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-11",
    imageUrl:
      "https://images.pexels.com/photos/3662907/pexels-photo-3662907.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Heart Hands on Belly",
    tags: ["indoor", "outdoor", "intimate", "detail"],
    notes:
      "Hands form heart shape over belly - hers alone or combined with partner's hands. Sweet, symbolic gesture. Close-up shows the heart clearly. Can include face in wider shot. The universal symbol of love frames the baby. Works in any setting with any wardrobe.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-12",
    imageUrl:
      "https://images.pexels.com/photos/3662901/pexels-photo-3662901.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Looking Down at Belly",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Mom gazes down at her belly with soft expression. Captures the anticipation and connection to baby. Shoot slightly from side to see her profile. The downward gaze creates tender mood. Simple pose that works anywhere. Let her actually talk to baby for genuine expression.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-13",
    imageUrl:
      "https://images.pexels.com/photos/4503303/pexels-photo-4503303.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "In Nursery",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Mom in prepared nursery, looking at crib or holding baby items. Shows the nesting and preparation. Can be folding clothes, touching crib, or just looking around. The context of nursery adds meaning. Documents this anticipation phase. Soft light through nursery window.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-14",
    imageUrl:
      "https://images.pexels.com/photos/3662900/pexels-photo-3662900.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Partner Behind Embrace",
    tags: ["indoor", "outdoor", "intimate", "candid"],
    notes:
      "Partner stands behind, arms wrapped around belly together. Both hands on belly, facing same direction or toward each other. Shows united anticipation. Can kiss her cheek or neck. The protective embrace shows partnership. Works as full body or close-up on hands.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-15",
    imageUrl:
      "https://images.pexels.com/photos/6393352/pexels-photo-6393352.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Baby Shoes on Belly",
    tags: ["indoor", "detail", "intimate", "candid"],
    notes:
      "Tiny baby shoes placed on belly as prop. Shows scale and anticipation. Can be held in place by her hands or balanced carefully. The tiny shoes on belly tells story immediately. Focus on the shoes with belly as backdrop. Sweet, simple detail shot.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-16",
    imageUrl:
      "https://images.pexels.com/photos/7282413/pexels-photo-7282413.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Bathtub Milk Bath",
    tags: ["indoor", "elegant", "intimate", "dramatic"],
    notes:
      "Mom in milk bath (milk or bath bomb creates opacity). Ethereal, artistic images. Floating flowers or petals add beauty. Belly emerges from milky water. Requires planning and setup. The otherworldly look creates stunning images. Modesty maintained naturally by the milk.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-17",
    imageUrl:
      "https://images.pexels.com/photos/3763586/pexels-photo-3763586.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Wrapped in Fabric",
    tags: ["indoor", "elegant", "intimate"],
    notes:
      "Fabric draped artistically over belly and body. Creates elegant, artistic style. Emphasizes curves while providing coverage. Soft fabrics catch light beautifully. The draping takes some arrangement. Works for clients wanting more modest but still artistic images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-18",
    imageUrl:
      "https://images.pexels.com/photos/3662902/pexels-photo-3662902.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "With Older Child",
    tags: ["indoor", "outdoor", "candid", "intimate"],
    notes:
      "Older sibling kissing belly or talking to baby. Shows the family expanding. Child's curiosity and excitement is precious. Can be posed or let interaction happen naturally. These images show siblings' bond beginning. Let older child lead the interaction for genuine moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-19",
    imageUrl:
      "https://images.pexels.com/photos/4503309/pexels-photo-4503309.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Bare Belly Artistic",
    tags: ["indoor", "intimate", "elegant", "close-up"],
    notes:
      "Bare belly exposed for artistic portrait. Requires comfort and trust. Dramatic lighting emphasizes shape. Can be silhouette or lit. The unadorned belly is powerful and beautiful. Ensure she's comfortable with level of exposure. These images celebrate the pregnant form.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-20",
    imageUrl:
      "https://images.pexels.com/photos/3662908/pexels-photo-3662908.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Walking in Garden",
    tags: ["outdoor", "nature", "candid", "movement", "full-body"],
    notes:
      "Walking through garden or path, hands on belly. Movement adds life to images. Flowers and greenery create beautiful backdrop. Flowing dress catches motion. The stroll shows her comfort in her body. Multiple shots capture best natural moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-21",
    imageUrl:
      "https://images.pexels.com/photos/7282416/pexels-photo-7282416.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Resting Peaceful",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Mom resting on couch or bed, hand on belly. Captures the tiredness and peace of late pregnancy. Natural, unposed moment. Soft natural light. The rest and waiting documented. Shows the physical reality of pregnancy journey.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-22",
    imageUrl:
      "https://images.pexels.com/photos/6392988/pexels-photo-6392988.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Ultrasound Image",
    tags: ["indoor", "detail", "intimate"],
    notes:
      "Mom holding ultrasound image near belly. Connects the medical image to physical presence. Close-up on hands and ultrasound. Shows the anticipation of meeting baby. Can include partner's hands too. The visual of baby inside documented outside.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-23",
    imageUrl:
      "https://images.pexels.com/photos/4503304/pexels-photo-4503304.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Feet Up Relaxing",
    tags: ["indoor", "candid", "intimate", "detail"],
    notes:
      "Feet up showing swollen ankles or comfortable rest position. Real, relatable moment of pregnancy. Can include belly in frame. Documents the physical changes honestly. The everyday discomforts are part of the story. Comfortable and authentic.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-24",
    imageUrl:
      "https://images.pexels.com/photos/6393012/pexels-photo-6393012.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Partner's Hands on Belly",
    tags: ["indoor", "outdoor", "detail", "intimate"],
    notes:
      "Close-up of just partner's hands on her belly. Focus on the protective gesture. Can be from behind or side. Shows partnership without showing faces. The hands tell the story of shared anticipation. Simple detail shot with big meaning.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-25",
    imageUrl:
      "https://images.pexels.com/photos/3662897/pexels-photo-3662897.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Soft Bedroom Light",
    tags: ["indoor", "intimate", "elegant", "candid"],
    notes:
      "Shot in bedroom with soft morning or evening light. Intimate home setting. Can be in bed or near window. The private space shows her comfort zone. Soft, flattering light through curtains. The domestic setting feels personal and real.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-26",
    imageUrl:
      "https://images.pexels.com/photos/7282406/pexels-photo-7282406.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Belly Cast or Art",
    tags: ["indoor", "candid", "fun", "detail"],
    notes:
      "Process of creating belly cast if doing that, or belly painting session. Documents the creative activity. Shows personality and how they celebrate pregnancy. The art process becomes the subject. These activities create unique memories.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-27",
    imageUrl:
      "https://images.pexels.com/photos/4503305/pexels-photo-4503305.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Sunset Glow",
    tags: ["outdoor", "dramatic", "elegant", "silhouette"],
    notes:
      "Shot during golden hour with warm sunset light. Backlit for silhouette or rim light. The warm tones flatter pregnancy glow. Plan timing around sunset. The brief perfect light creates magic. Outdoor location with clear horizon works best.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-28",
    imageUrl:
      "https://images.pexels.com/photos/6393353/pexels-photo-6393353.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Flower Crown",
    tags: ["outdoor", "nature", "elegant", "candid"],
    notes:
      "Mom wearing flower crown for boho style. Can be real or quality fake flowers. Matches with flowy dress and outdoor setting. The crown adds whimsy and elegance. Works for clients wanting goddess-like aesthetic. Nature setting complements the look.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-29",
    imageUrl:
      "https://images.pexels.com/photos/3662909/pexels-photo-3662909.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Studio White Background",
    tags: ["indoor", "elegant", "close-up"],
    notes:
      "Clean studio shot on white seamless background. Timeless, classic look. Focus entirely on mom and belly. Professional lighting setup needed. The simplicity emphasizes her form. Works for modern, minimalist aesthetic. Can be cropped tight or show full body.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-30",
    imageUrl:
      "https://images.pexels.com/photos/4503306/pexels-photo-4503306.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Smelling Flowers",
    tags: ["outdoor", "nature", "candid", "elegant"],
    notes:
      "Mom smelling flowers in garden or holding bouquet. Connection with nature and growth. Can include belly in frame or be upper body focus. The peaceful activity creates natural pose. Flowers add color and meaning. The nurturing instinct shows.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-31",
    imageUrl:
      "https://images.pexels.com/photos/6393354/pexels-photo-6393354.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Black and White Artistic",
    tags: ["indoor", "dramatic", "elegant"],
    notes:
      "Planned for black and white conversion - high contrast, dramatic. Focuses on form without color distraction. Works with artistic draping or minimal clothing. The timeless nature of B&W suits pregnancy. Strong lighting creates impactful shadows.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-32",
    imageUrl:
      "https://images.pexels.com/photos/7282408/pexels-photo-7282408.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Couple Foreheads Together",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Couple touching foreheads, hands on belly together. Creates intimate triangle of connection. Eyes can be closed for peaceful feel. The shared moment of waiting documented. Side angle shows both profiles. Let them breathe and connect genuinely.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-33",
    imageUrl:
      "https://images.pexels.com/photos/4503307/pexels-photo-4503307.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Reading to Baby",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Mom reading book to belly - already connecting with baby through stories. Shows her beginning motherhood rituals. Can be in nursery or cozy spot. The bonding activity reveals personality. Real book with real reading for authenticity.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-34",
    imageUrl:
      "https://images.pexels.com/photos/6393355/pexels-photo-6393355.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Full Family",
    tags: ["outdoor", "indoor", "candid", "full-body"],
    notes:
      "Include older siblings and partner with pregnant mom. Shows family anticipating new member. Everyone can touch or focus on belly. The group dynamic with pending addition. Important to document family before it grows again.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-35",
    imageUrl:
      "https://images.pexels.com/photos/3662910/pexels-photo-3662910.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Lace Dress Detail",
    tags: ["indoor", "outdoor", "elegant", "detail"],
    notes:
      "Belly visible through lace dress or lace overlay. Creates texture and elegance. The pattern adds visual interest. Backlight can show lace pattern beautifully. Intimate but covered aesthetic. Popular for clients wanting tasteful sensuality.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-36",
    imageUrl:
      "https://images.pexels.com/photos/4503308/pexels-photo-4503308.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Sitting on Bed Side",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Sitting on edge of bed, hands on belly, contemplative. Shows the waiting and wondering. Window light from side creates mood. The bedroom setting is intimate and real. Can look at camera or away thoughtfully. Simple pose with emotional depth.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-37",
    imageUrl:
      "https://images.pexels.com/photos/7282409/pexels-photo-7282409.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Laughing Joy",
    tags: ["indoor", "outdoor", "candid", "fun"],
    notes:
      "Genuine laughter captured - tell joke or have partner make her laugh. Shows the happiness of pregnancy. Real joy transforms the image. Be ready to capture quickly. The authentic emotion is powerful. Not all maternity shots need to be serene.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-38",
    imageUrl:
      "https://images.pexels.com/photos/6393356/pexels-photo-6393356.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Water Setting",
    tags: ["outdoor", "nature", "dramatic", "elegant"],
    notes:
      "At beach, lake, or stream - can be standing in shallow water or at water's edge. Water adds elemental drama. The flowing nature of water complements pregnancy. Wet fabric creates interesting shapes. Plan for water safety and comfort.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-39",
    imageUrl:
      "https://images.pexels.com/photos/4503310/pexels-photo-4503310.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Partner Listening to Belly",
    tags: ["indoor", "outdoor", "intimate", "candid"],
    notes:
      "Partner's ear to belly, listening for movement. Sweet anticipatory gesture. Her expression watching him is precious. Captures their shared excitement about baby. Can be posed or waiting for real movement. The connection through the belly is touching.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-40",
    imageUrl:
      "https://images.pexels.com/photos/6393357/pexels-photo-6393357.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Jewelry Detail",
    tags: ["indoor", "detail", "elegant"],
    notes:
      "Close-up including wedding rings, meaningful jewelry with belly. Shows personal style and commitments. The details tell personal story. Can be hands on belly with rings prominent. These personal elements add meaning. Small details become significant.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-41",
    imageUrl:
      "https://images.pexels.com/photos/3662911/pexels-photo-3662911.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Arms Above Head",
    tags: ["indoor", "outdoor", "elegant", "full-body"],
    notes:
      "Arms raised above head in goddess-like pose. Elongates body and creates elegant lines. Shows confidence in pregnant form. Works with flowing dress. The open pose shows freedom and joy. Can be backlit for drama.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-42",
    imageUrl:
      "https://images.pexels.com/photos/4503311/pexels-photo-4503311.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Progressive Series",
    tags: ["indoor", "outdoor", "detail"],
    notes:
      "Same pose at different stages of pregnancy - monthly documentation. Shows the incredible growth. Same location, same pose for comparison. Creates meaningful series over time. Requires planning across pregnancy. The documented progression is powerful.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-43",
    imageUrl:
      "https://images.pexels.com/photos/7282410/pexels-photo-7282410.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "With Family Pet",
    tags: ["indoor", "outdoor", "candid", "fun"],
    notes:
      "Pet snuggling or investigating belly. Shows complete family. Pets often curious about pregnant bellies. Let natural interaction happen. Can be sweet or funny depending on pet. The family includes fur babies too.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-44",
    imageUrl:
      "https://images.pexels.com/photos/6393358/pexels-photo-6393358.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Close Eyes Serene",
    tags: ["indoor", "outdoor", "intimate", "close-up"],
    notes:
      "Eyes closed, peaceful expression, hands on belly. Meditative, centered feeling. Shows her inner focus on baby. Soft light complements the calm mood. Can be any setting. The inward moment of connection captured.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-45",
    imageUrl:
      "https://images.pexels.com/photos/3662912/pexels-photo-3662912.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Architectural Background",
    tags: ["urban", "outdoor", "elegant", "full-body"],
    notes:
      "Urban setting with interesting architecture. Modern contrast to organic pregnancy form. Clean lines complement soft curves. City environment shows her life context. Not all maternity needs nature settings. Urban moms in urban settings.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-46",
    imageUrl:
      "https://images.pexels.com/photos/4503312/pexels-photo-4503312.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Meaningful Location",
    tags: ["outdoor", "candid", "intimate"],
    notes:
      "Shot at location meaningful to family - where they met, engagement spot, family home. The context adds personal significance. Documents their story along with pregnancy. These locations become part of family history.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-47",
    imageUrl:
      "https://images.pexels.com/photos/7282411/pexels-photo-7282411.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Lifestyle Home",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Documentary style throughout home - kitchen, living room, nursery. Shows her life and space during pregnancy. Natural activities like cooking, resting, organizing. Real life documented. These everyday moments become meaningful memories.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-48",
    imageUrl:
      "https://images.pexels.com/photos/6393359/pexels-photo-6393359.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Ribbon on Belly",
    tags: ["indoor", "detail", "fun"],
    notes:
      "Belly wrapped with ribbon like a gift. Playful, cute concept. Can include bow on top. Shows baby as precious gift coming. Simple prop with big impact. Works for any style session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-49",
    imageUrl:
      "https://images.pexels.com/photos/3662913/pexels-photo-3662913.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Sheer Curtains",
    tags: ["indoor", "elegant", "intimate", "dramatic"],
    notes:
      "Standing behind or draped in sheer curtains with backlight. Creates dreamy, ethereal quality. Light through curtains is soft and flattering. The layers add depth and mystery. Position curtains for desired coverage. The filtered light is magical.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-50",
    imageUrl:
      "https://images.pexels.com/photos/4503313/pexels-photo-4503313.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Cradling from Below",
    tags: ["indoor", "outdoor", "intimate", "detail"],
    notes:
      "Hands cradling belly from underneath, emphasizing support. Shows the weight and presence of baby. Simple gesture with powerful meaning. Can be her hands alone or combined with partner's. The support gesture resonates.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-51",
    imageUrl:
      "https://images.pexels.com/photos/7282412/pexels-photo-7282412.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Closing Dress Detail",
    tags: ["indoor", "detail", "intimate", "candid"],
    notes:
      "Dress straining or not quite closing over belly. Shows the reality of growing baby. Can be tasteful and beautiful. Documents the physical changes honestly. The almost-fits tell the story of rapid growth.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-52",
    imageUrl:
      "https://images.pexels.com/photos/6393360/pexels-photo-6393360.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Couple Dancing",
    tags: ["indoor", "outdoor", "intimate", "movement", "candid"],
    notes:
      "Slow dancing together with belly between them. Shows their connection despite the belly distance. Sweet, romantic moment. The adaptation of dance shows love continues. Play their song for genuine emotion.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-53",
    imageUrl:
      "https://images.pexels.com/photos/3662914/pexels-photo-3662914.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Leaning on Tree",
    tags: ["outdoor", "nature", "candid", "full-body"],
    notes:
      "Leaning against tree in natural setting. Nature and growth theme. Tree provides support and natural framing. Comfortable position for longer shooting. The organic setting complements pregnancy. Different textures of bark and fabric.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-54",
    imageUrl:
      "https://images.pexels.com/photos/4503314/pexels-photo-4503314.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Over Shoulder Look",
    tags: ["indoor", "outdoor", "elegant", "close-up"],
    notes:
      "Looking over shoulder toward camera, belly visible from behind. Shows her beauty and curves from behind angle. Elegant, confident pose. Hair can be down or up to show neck. The over-shoulder glance adds intrigue.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-maternity-55",
    imageUrl:
      "https://images.pexels.com/photos/7282414/pexels-photo-7282414.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "maternity",
    title: "Final Days Countdown",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Near due date, showing how ready she is. Can hold chalkboard with countdown. Documents the final waiting period. The anticipation at peak. These last days before baby are precious. Shows her readiness to meet baby.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Newborn poses
  {
    id: "builtin-newborn-1",
    imageUrl:
      "https://images.pexels.com/photos/265987/pexels-photo-265987.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Curled Up",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Baby in natural fetal curl position on soft blanket or beanbag. Keep room very warm (80°F+) so baby stays comfortable and sleepy. Best in first 2 weeks while baby naturally curls. Support baby safely with a spotter nearby. Soft window light or diffused flash. Never force a position - follow baby's lead for safety.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-2",
    imageUrl:
      "https://images.pexels.com/photos/325690/pexels-photo-325690.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "In Parents Arms",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Baby cradled in parent's arms close to chest. This is the safest and most natural newborn pose. Focus on the size contrast - tiny baby, protective arms. Shoot from above to see baby's face and parent looking down. Works when baby is awake or asleep. Capture the details: parent's hands supporting head, baby's tiny fingers gripping.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-3",
    imageUrl:
      "https://images.pexels.com/photos/3875169/pexels-photo-3875169.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Tiny Details",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Macro shots of tiny hands, feet, eyelashes, lips, ears. Use a macro lens or extension tubes for sharp close-ups. Soft light prevents harsh shadows on delicate skin. Baby's hand wrapped around parent's finger shows scale beautifully. Feet are easiest when baby is feeding or sleeping. These detail shots become treasured memories of how small they once were.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-4",
    imageUrl:
      "https://images.pexels.com/photos/842948/pexels-photo-842948.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Sleeping Peacefully",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Baby in deep sleep, face relaxed and peaceful. Wait for REM sleep phase when babies are most still. Support position safely - this is key. Soft wrap or blanket provides comfort. The peaceful expression is worth waiting for. Never force sleep - work with baby's schedule. Feed baby beforehand for best results.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-5",
    imageUrl:
      "https://images.pexels.com/photos/3875149/pexels-photo-3875149.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Chin on Hands",
    tags: ["indoor", "close-up", "candid"],
    notes:
      "Baby positioned with chin resting on hands. This is an advanced pose requiring careful support - always have spotter. Creates classic newborn portrait. Baby must be in deep sleep. The pose emphasizes the tiny face. Never attempt without proper training and support. Composite technique is safer option.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-6",
    imageUrl:
      "https://images.pexels.com/photos/3875159/pexels-photo-3875159.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Wrapped Swaddle",
    tags: ["indoor", "intimate", "close-up"],
    notes:
      "Baby wrapped snugly in soft fabric swaddle. The wrapping provides security and warmth babies love. Focus on face peeking out. Various wrapping styles create different looks. Colors and textures of wraps add visual interest. Baby often settles quickly when swaddled properly.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-7",
    imageUrl:
      "https://images.pexels.com/photos/3875177/pexels-photo-3875177.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Baby with Dad",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Father holding or interacting with newborn. The size contrast is dramatic with dads. His large hands cradling tiny baby creates powerful image. Capture his expression of wonder. These father-child images are especially treasured. Let the connection happen naturally. Skin-to-skin especially powerful.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-8",
    imageUrl:
      "https://images.pexels.com/photos/3875173/pexels-photo-3875173.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Baby with Mom",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Mother gazing at or kissing newborn. The maternal connection is palpable. Capture her expression of love and exhaustion. Skin-to-skin contact is beautiful. Close-up on their faces together. These images mean everything to mothers. The natural interaction is most powerful.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-9",
    imageUrl:
      "https://images.pexels.com/photos/3875162/pexels-photo-3875162.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "In Basket",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Baby placed in decorative basket with soft lining. Classic prop that shows baby's small size. Ensure basket is sturdy and baby is supported. Soft blankets cushion the hard edges. Never leave baby unattended in prop. The rustic look is timeless and popular.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-10",
    imageUrl:
      "https://images.pexels.com/photos/3875164/pexels-photo-3875164.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Taco Pose",
    tags: ["indoor", "close-up", "candid"],
    notes:
      "Baby curled with feet tucked up, resembling a taco shape. Natural newborn position they remember from womb. Works in first 2 weeks before they stretch out. Gently guide into position, never force. Support baby's back and head safely. This curled position feels secure to baby.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-11",
    imageUrl:
      "https://images.pexels.com/photos/3875175/pexels-photo-3875175.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Feet Close-up",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Just baby's tiny feet - together, in parent's hands, or with toes spread. Macro lens shows every tiny detail. Compare to parent's hand for scale. Feet are easier to photograph than hands - less movement. These details document their incredible smallness. The wrinkly newborn feet are precious.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-12",
    imageUrl:
      "https://images.pexels.com/photos/3875157/pexels-photo-3875157.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Froggy Pose",
    tags: ["indoor", "close-up", "candid"],
    notes:
      "Baby positioned with head on hands, legs frog-like beneath. This is always a composite - never position baby without head support. Two shots merged: one supporting head, one supporting body. Requires photo editing skills. The result is adorable but safety first always.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-13",
    imageUrl:
      "https://images.pexels.com/photos/3875167/pexels-photo-3875167.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Side Lying",
    tags: ["indoor", "candid", "close-up"],
    notes:
      "Baby lying on side with hands together under cheek. Natural, safe position. Shows profile beautifully. Support behind back prevents rolling. This pose is achievable and safe. The curled side position is comfortable for newborns. Often happens naturally during sleep.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-14",
    imageUrl:
      "https://images.pexels.com/photos/3875171/pexels-photo-3875171.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Both Parents Together",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Both parents with newborn - all three together. Shows the new family unit. Can be posed or candid interactions. All looking at baby, or parents looking at each other. The triangle of connection is powerful. These become the defining family portrait of this era.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-15",
    imageUrl:
      "https://images.pexels.com/photos/3875179/pexels-photo-3875179.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Awake and Alert",
    tags: ["indoor", "candid", "close-up"],
    notes:
      "Baby awake, eyes open, looking at camera or parent. Newborn eyes wandering is normal. Capture the brief alert moments. The wide-eyed wonder is beautiful. Less common than sleeping shots but special. Short window - be ready when they're awake and calm.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-16",
    imageUrl:
      "https://images.pexels.com/photos/3875151/pexels-photo-3875151.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "With Older Sibling",
    tags: ["indoor", "candid", "intimate", "fun"],
    notes:
      "Older sibling meeting or holding new baby. Supervise carefully - support baby's head always. Capture the older child's expression - wonder, jealousy, love. Let the sibling interact naturally. These images document the expanding family. Precious for both children to see later.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-17",
    imageUrl:
      "https://images.pexels.com/photos/3875153/pexels-photo-3875153.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Hands Detail",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Close-up of baby's tiny hands - fisted, grasping finger, or open palm. Shows tiny fingernails, wrinkles, and skin texture. Parent's hand in frame shows scale. Best when baby is sleeping and hands relaxed. These details change so quickly. Macro lens recommended.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-18",
    imageUrl:
      "https://images.pexels.com/photos/3875155/pexels-photo-3875155.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Lips and Nose",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Extreme close-up of baby's perfect lips and tiny nose. Shows the delicate features. Soft light prevents harsh shadows. Often easier when baby is sleeping. The tiny features are exquisite. These detail shots complement wider portraits.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-19",
    imageUrl:
      "https://images.pexels.com/photos/3875181/pexels-photo-3875181.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "In Crib",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Baby in their own crib - lifestyle context shot. Shows their first sleeping space. Shoot from above or through crib slats. Documents the nursery they prepared. Natural, at-home feel. These images tell the story of their environment.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-20",
    imageUrl:
      "https://images.pexels.com/photos/3875183/pexels-photo-3875183.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Yawning",
    tags: ["indoor", "candid", "close-up", "fun"],
    notes:
      "Capture a big newborn yawn mid-stretch. These happen frequently - be ready. The expression is adorable. Continuous shooting helps catch the moment. Shows personality already. One of parents' favorite candid moments to capture.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-21",
    imageUrl:
      "https://images.pexels.com/photos/3875185/pexels-photo-3875185.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Baby Bottom",
    tags: ["indoor", "detail", "candid"],
    notes:
      "Shot of baby's diaper-clad or bare bottom. Classic newborn detail. Shows how tiny everything is. Tasteful and adorable. Often done when baby is belly-down sleeping. The tiny diaper or bare bottom is classic. Parents often request this shot.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-22",
    imageUrl:
      "https://images.pexels.com/photos/3875187/pexels-photo-3875187.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Stretching",
    tags: ["indoor", "candid", "movement"],
    notes:
      "Baby mid-stretch, arms up and back arched. Natural newborn behavior to capture. Shows their personality emerging. Fast shutter to catch the moment. The stretch often comes with yawn. Be ready for these spontaneous moments.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-23",
    imageUrl:
      "https://images.pexels.com/photos/3875189/pexels-photo-3875189.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Hospital Fresh 48",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "First 48 hours hospital photos - the raw new arrival. Natural light from hospital window. Includes medical details like bracelets, bed. Shows the authentic just-born experience. Emotional, real, meaningful. Documents the arrival story.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-24",
    imageUrl:
      "https://images.pexels.com/photos/3875191/pexels-photo-3875191.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Skin to Skin",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Baby on parent's bare chest, skin to skin contact. Powerful bonding image. Intimate and emotional. Both mom and dad can do this. Captures the primal connection. The warmth and closeness shows in the image. Tender and meaningful.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-25",
    imageUrl:
      "https://images.pexels.com/photos/3875193/pexels-photo-3875193.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "In Bowl or Bucket",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Baby curled in decorative bowl or bucket prop. Shows how tiny they are - they fit in household items. Ensure prop is stable and well-padded. Baby must be supported at all times. Popular prop shot with vintage feel. Safety is paramount.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-26",
    imageUrl:
      "https://images.pexels.com/photos/3875195/pexels-photo-3875195.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "With Special Item",
    tags: ["indoor", "candid", "detail"],
    notes:
      "Baby with meaningful item - heirloom blanket, gift from loved one, special toy. Tells personal story. The item adds meaning and context. Check with parents for special objects. These personalized shots become treasured. The story behind the item matters.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-27",
    imageUrl:
      "https://images.pexels.com/photos/3875197/pexels-photo-3875197.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Eyelashes Close-up",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Extreme close-up showing delicate eyelashes. Best when sleeping peacefully. Shows the perfect details parents marvel at. Requires macro capability. Soft, even light. These tiny details are exactly what parents want documented.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-28",
    imageUrl:
      "https://images.pexels.com/photos/3875199/pexels-photo-3875199.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Wrapped Like Burrito",
    tags: ["indoor", "candid", "close-up"],
    notes:
      "Tight swaddle wrap showing just the face. Creates simple, clean composition. Baby is snug and content. Various wrap colors coordinate with setup. Focus entirely on the precious face. The wrapped cocoon is universally adorable.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-29",
    imageUrl:
      "https://images.pexels.com/photos/3875201/pexels-photo-3875201.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Ears Detail",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Close-up of tiny perfect ears. Shows the delicate shell shape. Macro lens captures every detail. Baby's unique features documented. These shots complete the detail collection. Parents often surprised by how perfect they are.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-30",
    imageUrl:
      "https://images.pexels.com/photos/3875203/pexels-photo-3875203.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Back Pose",
    tags: ["indoor", "candid", "close-up"],
    notes:
      "Baby on belly, face turned to side. Natural sleeping position many babies prefer. Shows the back, tiny spine, bottom. Safe when baby is placed correctly. The vulnerable exposed back is tender image. Always supervise back sleeping.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-31",
    imageUrl:
      "https://images.pexels.com/photos/3875205/pexels-photo-3875205.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Kissing Baby",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Parent kissing baby's head, cheek, or hand. Captures the overwhelming love. Focus on parent's expression or baby's face. The natural gesture of affection. These images define the early days. Let the kisses happen naturally.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-32",
    imageUrl:
      "https://images.pexels.com/photos/3875207/pexels-photo-3875207.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "With Grandparents",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Grandparents meeting or holding new grandchild. Generational connection captured. Their expressions of joy are precious. Supervise carefully if elderly grandparents. These images mean everything to families. Multiple generations together documented.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-33",
    imageUrl:
      "https://images.pexels.com/photos/3875209/pexels-photo-3875209.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Smiling in Sleep",
    tags: ["indoor", "candid", "close-up", "fun"],
    notes:
      "Capture reflexive smiles during sleep. These happen during REM sleep. Not real smiles but adorable nonetheless. Be ready with camera - brief moments. Parents treasure these 'first smiles'. Soft light and patience required.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-34",
    imageUrl:
      "https://images.pexels.com/photos/3875211/pexels-photo-3875211.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Nursing or Bottle",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Baby feeding - nursing or bottle. Intimate bonding moment. Capture connection between parent and child. Respectful framing for nursing shots. The nourishing connection is powerful. These everyday moments become treasured memories.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-35",
    imageUrl:
      "https://images.pexels.com/photos/3875213/pexels-photo-3875213.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Hat or Bonnet",
    tags: ["indoor", "candid", "close-up", "fun"],
    notes:
      "Baby wearing cute hat, bonnet, or headband. Adds character and visual interest. Knit hats especially popular for newborns. Coordinates with wrap or blanket color. The tiny accessory emphasizes smallness. Check ears aren't folded under hat.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-36",
    imageUrl:
      "https://images.pexels.com/photos/3875215/pexels-photo-3875215.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Full Body Sleeping",
    tags: ["indoor", "candid", "full-body"],
    notes:
      "Full body shot of sleeping baby from head to toe. Shows entire form and proportions. Usually shot from above. Captures the complete package. Document how small they are in full. The entire baby visible in frame.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-37",
    imageUrl:
      "https://images.pexels.com/photos/3875217/pexels-photo-3875217.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Black and White Portrait",
    tags: ["indoor", "dramatic", "close-up"],
    notes:
      "Classic black and white newborn portrait. Timeless and elegant. Focus on shape, form, and expression without color distraction. Works especially well for sleeping portraits. The contrast emphasizes delicate features. Creates gallery-worthy art.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-38",
    imageUrl:
      "https://images.pexels.com/photos/3875219/pexels-photo-3875219.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Belly Button Detail",
    tags: ["indoor", "detail", "close-up"],
    notes:
      "Close-up of belly button area - with or without umbilical cord stump. Documents the newness. Cord stump falls off within weeks. Real, authentic newborn detail. Parents often want this documented before it's gone.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-39",
    imageUrl:
      "https://images.pexels.com/photos/3875221/pexels-photo-3875221.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "In Dad's Hands",
    tags: ["indoor", "intimate", "close-up", "detail"],
    notes:
      "Baby held in or sitting on dad's large hands. Scale comparison is dramatic. Dad's hands provide security and show tiny baby size. Classic father-child image. The contrast emphasizes how small baby is. Safe support is essential.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-40",
    imageUrl:
      "https://images.pexels.com/photos/3875223/pexels-photo-3875223.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Hair and Head",
    tags: ["indoor", "detail", "close-up", "candid"],
    notes:
      "Close-up of baby's hair (or fuzzy head). The newborn hair is precious whether full or wispy. Document the texture and patterns. Some babies have surprising hair. This detail changes quickly as they grow.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-41",
    imageUrl:
      "https://images.pexels.com/photos/3875225/pexels-photo-3875225.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Baby and Pet Introduction",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Pet meeting new baby family member - carefully supervised. Dog or cat investigating new sibling. Safety is paramount - never leave alone. The family pet's reaction is precious. Shows complete family including fur babies.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-42",
    imageUrl:
      "https://images.pexels.com/photos/3875227/pexels-photo-3875227.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Wrinkly Skin Detail",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Macro of newborn's wrinkly skin texture. Common in early days, especially on hands and feet. The delicate, peeling skin is temporary. Document this fleeting newborn characteristic. Soft light shows texture without harshness.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-43",
    imageUrl:
      "https://images.pexels.com/photos/3875229/pexels-photo-3875229.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Milk Drunk",
    tags: ["indoor", "candid", "fun", "close-up"],
    notes:
      "Post-feeding bliss - the 'milk drunk' expression. Sleepy, satisfied, sometimes smiling. Relaxed after nursing or bottle. This peaceful contentment is adorable. Be ready to capture after feedings. The satisfied baby is perfect for photos.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-44",
    imageUrl:
      "https://images.pexels.com/photos/3875231/pexels-photo-3875231.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Lifestyle at Home",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Everyday moments in their home - diaper changes, bathing, cuddling. Documentary style captures real life. Natural light, natural activities. Shows their actual environment and routines. These authentic moments become precious memories.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-45",
    imageUrl:
      "https://images.pexels.com/photos/3875233/pexels-photo-3875233.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Baby Scale Shot",
    tags: ["indoor", "detail", "candid", "fun"],
    notes:
      "Baby on scale showing birth weight or current weight. Hospital scale or vintage scale prop. Documents the tiny starting weight. The numbers tell part of the story. Safely support baby on any prop scale.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-46",
    imageUrl:
      "https://images.pexels.com/photos/3875235/pexels-photo-3875235.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Birth Announcement Setup",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Shot designed for birth announcement - includes name, date, weight. Can use letter board, blocks, or custom signs. Baby is focal point with details around. Clear, readable information for sharing. Plan layout before baby is positioned.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-47",
    imageUrl:
      "https://images.pexels.com/photos/3875237/pexels-photo-3875237.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Grimace or Frown",
    tags: ["indoor", "candid", "close-up", "fun"],
    notes:
      "Capture the funny newborn expressions - frowns, grimaces, skeptical looks. These happen frequently in first weeks. Shows personality already emerging. Parents love these character shots. Be ready for fleeting expressions.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-48",
    imageUrl:
      "https://images.pexels.com/photos/3875239/pexels-photo-3875239.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Window Gaze",
    tags: ["indoor", "candid", "intimate"],
    notes:
      "Baby (or parent holding baby) looking out window. Natural light illuminates face. Contemplative, peaceful mood. Shows the new world from baby's perspective. The window light creates beautiful quality. Let them actually look at the outside world.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-49",
    imageUrl:
      "https://images.pexels.com/photos/3875241/pexels-photo-3875241.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Wrapped in Parents Shirt",
    tags: ["indoor", "intimate", "candid"],
    notes:
      "Baby wrapped or resting on parent's shirt/clothing. Carries their scent, provides comfort. Meaningful when using significant garment. The personal clothing adds emotional layer. Simple but meaningful concept.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-50",
    imageUrl:
      "https://images.pexels.com/photos/3875243/pexels-photo-3875243.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Foot in Hand Comparison",
    tags: ["indoor", "detail", "close-up", "intimate"],
    notes:
      "Baby's foot held in parent's hand showing size comparison. The tiny foot against adult hand is striking. Classic comparison shot. Emphasizes the incredible smallness. Works with any parent - mom or dad. The scale contrast tells the story.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-51",
    imageUrl:
      "https://images.pexels.com/photos/3875245/pexels-photo-3875245.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "First Bath",
    tags: ["indoor", "candid", "fun", "intimate"],
    notes:
      "Baby's first real bath at home (not sponge bath). Capture the reaction - often surprised or content. Parent supporting carefully in water. The expressions are priceless. Document this milestone moment. Warm room prevents cold baby.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-52",
    imageUrl:
      "https://images.pexels.com/photos/3875247/pexels-photo-3875247.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Peaceful Profile",
    tags: ["indoor", "close-up", "candid"],
    notes:
      "Baby's profile while sleeping peacefully. Shows the nose, lips, chin shape. Beautiful side lighting emphasizes features. Classic portrait angle. The profile reveals their unique features. Side view often more flattering than straight-on.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-53",
    imageUrl:
      "https://images.pexels.com/photos/3875249/pexels-photo-3875249.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Ring on Toes",
    tags: ["indoor", "detail", "intimate"],
    notes:
      "Parent's wedding ring on baby's toe or finger. Shows scale dramatically - ring can fit around toes. Symbolic connection between marriage and child. Popular detail shot. Careful not to drop the ring. Simple concept, powerful meaning.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-54",
    imageUrl:
      "https://images.pexels.com/photos/3875251/pexels-photo-3875251.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Hiccups or Startles",
    tags: ["indoor", "candid", "fun"],
    notes:
      "Capture the startles, hiccups, and reflexes. The Moro reflex arms spreading is common. These fleeting newborn behaviors document early development. Be ready for these quick moments. Parents find these behaviors fascinating and endearing.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-newborn-55",
    imageUrl:
      "https://images.pexels.com/photos/3875253/pexels-photo-3875253.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "newborn",
    title: "Simple White Background",
    tags: ["indoor", "elegant", "close-up"],
    notes:
      "Baby on clean white backdrop - timeless, simple, classic. Focus entirely on the baby without distractions. Works for any newborn style. Creates gallery-worthy images. The simplicity emphasizes the subject. Versatile for various crop and framing options.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },

  // Boudoir poses
  {
    id: "builtin-boudoir-1",
    imageUrl:
      "https://images.pexels.com/photos/1386604/pexels-photo-1386604.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Over the Shoulder",
    tags: ["indoor", "elegant", "intimate", "close-up"],
    notes:
      "Subject faces away from camera, looks back over shoulder with soft, confident expression. This pose is universally flattering - the twist creates curves while the shoulder frames the face. Use soft window light or a large softbox. Keep shoulders relaxed and have her drop the one closest to camera. Eyes can look at camera or cast slightly down.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-2",
    imageUrl:
      "https://images.pexels.com/photos/1308885/pexels-photo-1308885.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Natural Light",
    tags: ["indoor", "intimate", "elegant", "candid"],
    notes:
      "Position subject at 45-degree angle to large window for soft, romantic light. Sheer curtains diffuse harsh sun beautifully. The light wraps around curves and creates gentle shadows that flatter any body type. Have her turn face toward light slightly. Morning or late afternoon provides the softest quality. A reflector on the shadow side opens up dark areas.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-3",
    imageUrl:
      "https://images.pexels.com/photos/30253433/pexels-photo-30253433.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Moody Soft Light",
    tags: ["indoor", "intimate", "elegant", "dramatic"],
    notes:
      "Create a moody, ethereal atmosphere with soft diffused light from one side. The low-key lighting emphasizes feminine curves while hiding imperfections in shadow. Ask her to close her eyes and think of something peaceful - this creates authentic relaxed expression. Use a 50mm or 85mm lens for beautiful compression and bokeh.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-4",
    imageUrl:
      "https://images.pexels.com/photos/6811015/pexels-photo-6811015.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Window Silhouette",
    tags: ["indoor", "silhouette", "dramatic", "elegant"],
    notes:
      "Subject stands facing a bright window with camera shooting toward her. This creates a beautiful silhouette that celebrates the feminine form without revealing details. Exposure for the window creates dark, mysterious subject. Works best with floor-to-ceiling windows. The backlight creates a luminous outline around her figure.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-5",
    imageUrl:
      "https://images.pexels.com/photos/30722554/pexels-photo-30722554.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Ethereal Dreamy",
    tags: ["indoor", "intimate", "elegant", "candid"],
    notes:
      "Soft, dreamy aesthetic achieved through gentle lighting and warm tones. Subject can wear flowing fabric or simple lingerie. The ethereal quality comes from slightly overexposing and using soft focus techniques. Direct her to move slowly and naturally - capturing between poses often yields the best results.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-6",
    imageUrl:
      "https://images.pexels.com/photos/11802389/pexels-photo-11802389.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Through the Window",
    tags: ["indoor", "candid", "intimate", "dramatic"],
    notes:
      "Shoot through a window pane for an artistic, voyeuristic quality. The glass adds subtle texture and reflections that create visual interest. Can shoot from inside looking out or outside looking in. Clean the window first but leave some natural imperfections for character. Window frame can provide additional compositional elements.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-7",
    imageUrl:
      "https://images.pexels.com/photos/34437072/pexels-photo-34437072.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Dramatic Shadows",
    tags: ["indoor", "dramatic", "elegant", "close-up"],
    notes:
      "Use hard light source to create bold shadows across the body and face. Venetian blinds, window frames, or gobos create striped shadow patterns. The contrast between light and shadow adds mystery and artistic flair. Position light at 45-90 degree angle for most dramatic effect. Black and white conversion often enhances this style.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-8",
    imageUrl:
      "https://images.pexels.com/photos/30260138/pexels-photo-30260138.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Blue Hour Mood",
    tags: ["indoor", "dramatic", "intimate", "candid"],
    notes:
      "Capture during blue hour (just before sunrise or after sunset) for moody, cool-toned ambiance. The natural blue light creates an intimate, contemplative mood. Subject by window receives this ethereal light naturally. Can enhance with subtle cool white balance adjustment. Works beautifully for introspective, thoughtful poses.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-9",
    imageUrl:
      "https://images.pexels.com/photos/30684790/pexels-photo-30684790.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Warm Close-up",
    tags: ["indoor", "intimate", "close-up", "elegant"],
    notes:
      "Tight framing on face and shoulders with warm, golden light. This intimate crop focuses on expression and skin texture. Use a longer lens (85-135mm) to avoid distortion. The warm tones are flattering for all skin types. Have her look slightly off-camera for a candid, unguarded feeling.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-10",
    imageUrl:
      "https://images.pexels.com/photos/29376608/pexels-photo-29376608.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Thoughtful Window Gaze",
    tags: ["indoor", "candid", "intimate", "elegant"],
    notes:
      "Subject sits or stands by window, gazing out thoughtfully. This natural pose requires minimal direction - just ask her to think about something meaningful. The window light illuminates her face while creating catchlights in the eyes. The contemplative mood feels authentic rather than posed. Works well in any outfit.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-11",
    imageUrl:
      "https://images.pexels.com/photos/12767150/pexels-photo-12767150.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Eyes Closed Serenity",
    tags: ["indoor", "intimate", "candid", "close-up"],
    notes:
      "Subject with eyes gently closed, face relaxed and serene. This pose removes self-consciousness about eye contact with the camera. The peaceful expression is universally flattering. Soft light from side or above works best. Ask her to take deep breaths to naturally relax facial muscles. Captures a private, meditative moment.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-12",
    imageUrl:
      "https://images.pexels.com/photos/2495801/pexels-photo-2495801.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Behind Sheer Curtain",
    tags: ["indoor", "elegant", "intimate", "dramatic"],
    notes:
      "Subject stands behind sheer or semi-transparent curtain. The fabric creates softness and mystery while the silhouette remains visible. Backlight from window creates glow around edges. Different curtain colors create different moods - white for pure/ethereal, red for passionate. She can interact with the fabric by holding or parting it.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-13",
    imageUrl:
      "https://images.pexels.com/photos/20600866/pexels-photo-20600866.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Backlit Silhouette",
    tags: ["indoor", "silhouette", "dramatic", "elegant"],
    notes:
      "Strong backlight creates striking silhouette of the feminine form. Expose for the highlights to render subject as pure shape. This is one of the most tasteful boudoir poses - celebrates the form without revealing details. Works best with simple poses that show clear profile. The rim light around edges adds dimension.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-14",
    imageUrl:
      "https://images.pexels.com/photos/14957819/pexels-photo-14957819.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Lace Detail",
    tags: ["indoor", "elegant", "close-up", "detail"],
    notes:
      "Close-up focusing on lace or delicate fabric details. The intricate patterns of quality lingerie deserve their own moment. Shallow depth of field blurs background while keeping texture sharp. Side light reveals the dimensionality of the fabric. These detail shots add variety to a boudoir gallery.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-15",
    imageUrl:
      "https://images.pexels.com/photos/33044409/pexels-photo-33044409.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Black and White Silhouette",
    tags: ["indoor", "silhouette", "dramatic", "elegant"],
    notes:
      "Classic black and white silhouette emphasizes pure form without distraction of color. High contrast processing enhances the graphic quality. The monochrome treatment lends timeless elegance to boudoir imagery. Focus on clean lines and beautiful curves. This style is universally flattering regardless of skin tone.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-16",
    imageUrl:
      "https://images.pexels.com/photos/34623497/pexels-photo-34623497.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Dramatic B&W Portrait",
    tags: ["indoor", "dramatic", "close-up", "elegant"],
    notes:
      "High contrast black and white portrait with bold shadows. This editorial style works well for confident clients who want striking images. Use a single hard light source for defined shadows. The intensity of the gaze combined with dramatic lighting creates powerful imagery. Convert to B&W and boost contrast in post.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-17",
    imageUrl:
      "https://images.pexels.com/photos/33026407/pexels-photo-33026407.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Fashion Silhouette",
    tags: ["indoor", "silhouette", "elegant", "dramatic"],
    notes:
      "Silhouette with fashion-forward styling and posing. Strong shapes and angular poses create editorial feel. The backlit figure becomes graphic element. Works well with interesting hairstyles or accessories that show in silhouette. Think fashion magazine rather than traditional boudoir for direction.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-18",
    imageUrl:
      "https://images.pexels.com/photos/30681567/pexels-photo-30681567.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Rim Light Profile",
    tags: ["indoor", "silhouette", "dramatic", "close-up"],
    notes:
      "Strong rim light from behind outlines the profile while face remains in shadow. This technique creates a glowing outline around the subject. Works best in profile or three-quarter view. The light traces her features beautifully. A touch of fill can reveal some detail if desired, or go full silhouette for mystery.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-19",
    imageUrl:
      "https://images.pexels.com/photos/7121393/pexels-photo-7121393.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Double Exposure Artistic",
    tags: ["indoor", "dramatic", "elegant", "movement"],
    notes:
      "Create artistic double exposure in-camera or in post-processing. Layer the subject with textures, nature elements, or abstract patterns. This artistic technique transforms boudoir into fine art. The effect can be subtle or bold depending on opacity. Works well with simple poses that have clear silhouettes.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-20",
    imageUrl:
      "https://images.pexels.com/photos/4980381/pexels-photo-4980381.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Relaxed on Bed",
    tags: ["indoor", "candid", "intimate", "fun"],
    notes:
      "Subject lying comfortably on bed in relaxed position. This lifestyle approach feels natural rather than posed. Use rumpled sheets for texture and visual interest. Shoot from above or bed level for different perspectives. The casual energy helps nervous subjects relax. Works in any comfortable attire.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-21",
    imageUrl:
      "https://images.pexels.com/photos/19705281/pexels-photo-19705281.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Morning Light in Bed",
    tags: ["indoor", "intimate", "candid", "elegant"],
    notes:
      "Capture the soft morning light streaming across the bed. This golden hour glow is incredibly flattering. Subject can be waking up, stretching, or gazing toward the light. White sheets reflect and bounce light beautifully. The warm tones create a dreamy, romantic atmosphere. Authentic morning energy is the goal.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-22",
    imageUrl:
      "https://images.pexels.com/photos/8644097/pexels-photo-8644097.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Silk and Skin",
    tags: ["indoor", "elegant", "intimate", "close-up"],
    notes:
      "Focus on the contrast between smooth skin and luxurious silk fabric. The play of light on different textures creates visual interest. Silk catches light beautifully and drapes elegantly. Close-up crops show the sensory quality of the materials. This is about texture and touch rather than explicit exposure.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-23",
    imageUrl:
      "https://images.pexels.com/photos/3000183/pexels-photo-3000183.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Red Robe Elegance",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "Subject in luxurious robe - red creates bold, passionate mood. The robe can be worn loosely for suggestion without explicit exposure. Profile view shows the drape of fabric. The pop of color against neutral background is striking. Ask her to move slowly - the fabric creates beautiful flow. Works well sitting or standing.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-24",
    imageUrl:
      "https://images.pexels.com/photos/3765043/pexels-photo-3765043.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Champagne Morning",
    tags: ["indoor", "elegant", "fun", "candid"],
    notes:
      "Subject in robe by window with champagne glass. This lifestyle moment feels celebratory and luxurious. The prop gives her something to do with her hands naturally. Window light creates beautiful glow on glass and skin. Can be posed or captured as candid sipping moment. Adds narrative element to the session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-25",
    imageUrl:
      "https://images.pexels.com/photos/3861592/pexels-photo-3861592.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Intense Eyes Close-up",
    tags: ["indoor", "close-up", "dramatic", "intimate"],
    notes:
      "Tight crop on eyes and upper face for intense, intimate portrait. The eyes communicate emotion directly to viewer. Use a longer lens to avoid distortion. Catchlights in eyes are essential - position light accordingly. This crop is about connection and personality. The restricted view creates intrigue.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-26",
    imageUrl:
      "https://images.pexels.com/photos/2661255/pexels-photo-2661255.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Beauty Portrait",
    tags: ["indoor", "elegant", "close-up", "dramatic"],
    notes:
      "Classic beauty portrait focusing on face with flattering light. This shot anchors any boudoir gallery - showing the person, not just the body. Use beauty lighting setup: butterfly or loop pattern. The close-up showcases makeup and expression. Every boudoir session should include portraits like this.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-27",
    imageUrl:
      "https://images.pexels.com/photos/8723290/pexels-photo-8723290.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Tangled in Sheets",
    tags: ["indoor", "candid", "intimate", "fun"],
    notes:
      "Subject playfully tangled in white bedsheets. The sheets provide coverage while creating interesting shapes and texture. Shoot from above to capture the scene. The tousled, imperfect arrangement feels authentic. She can peek out from under covers or have arms and legs artfully arranged. Playful energy makes this fun.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-28",
    imageUrl:
      "https://images.pexels.com/photos/30219300/pexels-photo-30219300.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Red on White",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "Bold red lingerie against white bedding creates striking color contrast. The high contrast of complementary colors draws the eye. Keep the composition clean - the color does the work. Soft window light keeps skin tones natural. The bold color choice suggests confidence and passion.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-29",
    imageUrl:
      "https://images.pexels.com/photos/8642556/pexels-photo-8642556.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Body Positive Sitting",
    tags: ["indoor", "candid", "intimate", "elegant"],
    notes:
      "Celebrate all body types with confident, comfortable posing. Focus on authentic confidence rather than hiding. Sitting on bed edge with good posture shows comfort in her own skin. Soft, even lighting is most flattering. The goal is making every client feel beautiful. Her comfort translates directly to the image.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-30",
    imageUrl:
      "https://images.pexels.com/photos/18618534/pexels-photo-18618534.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Mirror Reflection",
    tags: ["indoor", "dramatic", "elegant", "candid"],
    notes:
      "Use a mirror to capture reflection for artistic composition. Can show her face in mirror while body faces away, or shoot her reflection directly. The frame-within-frame creates visual depth. Handheld mirrors work for close-up reflections. The duality of the mirror image adds narrative interest.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-31",
    imageUrl:
      "https://images.pexels.com/photos/20846828/pexels-photo-20846828.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Vanity Mirror Gaze",
    tags: ["indoor", "elegant", "intimate", "candid"],
    notes:
      "Subject looking at herself in vanity or wall mirror. This authentic moment shows self-reflection literally and figuratively. Capture her looking at her reflection with soft expression. The mirror context feels natural for boudoir setting. Can shoot her directly or capture the scene in the mirror.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-32",
    imageUrl:
      "https://images.pexels.com/photos/633984/pexels-photo-633984.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Beautiful Back",
    tags: ["indoor", "elegant", "intimate", "close-up"],
    notes:
      "Focus on the elegant lines of her back. This universally flattering angle shows feminine curves without explicit exposure. The spine creates natural leading line. Hair can be up to show neck and shoulders, or cascading down. Side lighting emphasizes the musculature and contours. Classic, timeless boudoir imagery.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-33",
    imageUrl:
      "https://images.pexels.com/photos/6567936/pexels-photo-6567936.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Shoulder Detail",
    tags: ["indoor", "close-up", "detail", "intimate"],
    notes:
      "Intimate close-up of shoulder and collarbone area. These detail shots show the beauty in small moments. The gentle slope of shoulder to neck is elegant. Soft side light creates subtle shadows that define the form. Strap details or jewelry can add visual interest. Part of building a varied gallery.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-34",
    imageUrl:
      "https://images.pexels.com/photos/160414/pexels-photo-160414.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Off-Shoulder Elegance",
    tags: ["indoor", "elegant", "dramatic", "close-up"],
    notes:
      "Classic portrait with off-shoulder styling reveals just enough. This timeless look works with a blouse, sweater, or robe falling off one shoulder. The revealed shoulder and collarbone are inherently elegant. Strong eye contact with camera creates connection. Darker backgrounds help her stand out.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-35",
    imageUrl:
      "https://images.pexels.com/photos/235444/pexels-photo-235444.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "White Top Portrait",
    tags: ["indoor", "elegant", "candid", "close-up"],
    notes:
      "Simple white top falling off shoulders creates soft, approachable boudoir look. The white reflects light onto face, acting as fill. This casual styling works for clients nervous about lingerie. The innocence of white contrasts with the intimacy of revealed skin. Natural, effortless beauty is the goal.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-36",
    imageUrl:
      "https://images.pexels.com/photos/10055311/pexels-photo-10055311.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Hand on Shoulder",
    tags: ["indoor", "elegant", "close-up", "intimate"],
    notes:
      "Subject gently touching her own shoulder with fingertips. This self-touch creates intimacy and gives hands natural placement. The gesture suggests vulnerability and self-awareness. Soft light on the arm and shoulder emphasizes the tender moment. Eyes can be closed or looking away for introspection.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-37",
    imageUrl:
      "https://images.pexels.com/photos/3019348/pexels-photo-3019348.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Looking Back",
    tags: ["indoor", "elegant", "candid", "full-body"],
    notes:
      "Subject looking back over her shoulder toward camera. This classic pose shows her back while capturing expression. The twist through the torso creates flattering curves. She can be standing, sitting, or lying down. Catch her mid-turn for natural energy. One of the most universally flattering angles.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-38",
    imageUrl:
      "https://images.pexels.com/photos/20816715/pexels-photo-20816715.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Lying Down View",
    tags: ["indoor", "intimate", "candid", "full-body"],
    notes:
      "Subject lying face down, back visible to camera. This relaxed pose celebrates the curves of the back and creates intimate atmosphere. Can be on bed, floor, or massage-style table. Arms can frame the head or extend out. The position is comfortable which helps with natural expression.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-39",
    imageUrl:
      "https://images.pexels.com/photos/319923/pexels-photo-319923.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Relaxed Portrait",
    tags: ["indoor", "candid", "intimate", "close-up"],
    notes:
      "Lying down with face toward camera, completely relaxed. This position naturally smooths features and creates dreamy expression. Hair fans out around head like a halo. Shoot from above or at same level. The vulnerability of the position creates intimacy. Soft, even lighting is most flattering.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-40",
    imageUrl:
      "https://images.pexels.com/photos/8746275/pexels-photo-8746275.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Red Curtain Drama",
    tags: ["indoor", "dramatic", "elegant", "full-body"],
    notes:
      "Subject behind or interacting with red sheer curtain. The color creates passionate, dramatic mood. She can be partially obscured or curtain can frame her. The red fabric photographs beautifully with proper white balance. This bold choice suits confident clients wanting editorial feel.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-41",
    imageUrl:
      "https://images.pexels.com/photos/6453921/pexels-photo-6453921.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Dancing in Light",
    tags: ["indoor", "movement", "elegant", "silhouette"],
    notes:
      "Subject moving or dancing behind sheer curtains with backlight. The movement creates dynamic, ethereal images. Shoot continuously as she moves. The curtain softens and abstracts the figure. The backlight creates glowing silhouette effect. This artistic approach produces unique, gallery-worthy images.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-42",
    imageUrl:
      "https://images.pexels.com/photos/13142521/pexels-photo-13142521.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Mysterious Veil",
    tags: ["indoor", "dramatic", "elegant", "intimate"],
    notes:
      "Face partially visible through semi-transparent fabric. The obscured view creates mystery and intrigue. Only hints of features show through. This is about suggestion rather than revelation. The fabric texture adds visual interest. Works with colored or white sheers for different moods.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-43",
    imageUrl:
      "https://images.pexels.com/photos/19378333/pexels-photo-19378333.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Romantic Scenery",
    tags: ["indoor", "elegant", "dramatic", "candid"],
    notes:
      "Place subject in romantic setting with soft textures and warm light. The environment tells part of the story. Flowing fabrics, candles, flowers add romantic elements. The styled set creates cohesive, dreamy aesthetic. Every element should support the romantic mood. This is about creating a feeling, not just a pose.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-44",
    imageUrl:
      "https://images.pexels.com/photos/33420080/pexels-photo-33420080.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Red Light Moody",
    tags: ["indoor", "dramatic", "intimate", "elegant"],
    notes:
      "Use red lighting for bold, moody atmosphere. The colored light creates intense, emotional imagery. Works best in otherwise dark environment. The warmth of red is flattering for skin. This editorial approach suits clients wanting artistic, unusual images. Keep poses simple - the light does the work.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-45",
    imageUrl:
      "https://images.pexels.com/photos/30736574/pexels-photo-30736574.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Intense Gaze",
    tags: ["indoor", "dramatic", "close-up", "intimate"],
    notes:
      "Direct, confident eye contact with camera creates powerful connection. This is about confidence and owning the moment. The intensity comes from genuine self-assurance. Coach her to think confident thoughts - it shows in the eyes. Dramatic lighting enhances the mood. A signature shot for confident clients.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-46",
    imageUrl:
      "https://images.pexels.com/photos/30734121/pexels-photo-30734121.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "B&W Emotional",
    tags: ["indoor", "dramatic", "intimate", "close-up"],
    notes:
      "Black and white portrait capturing genuine emotion. The monochrome treatment emphasizes expression over everything else. Look for real moments between poses. Convert to high-contrast B&W in post for impact. These emotional shots become the most treasured images from any session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-47",
    imageUrl:
      "https://images.pexels.com/photos/808713/pexels-photo-808713.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Mirror Reflection Thoughtful",
    tags: ["indoor", "candid", "intimate", "elegant"],
    notes:
      "Capture her looking at her reflection, lost in thought. The mirror provides context and doubles the composition possibilities. The genuine introspection reads as authentic. Position to show both her and her reflection. Low light creates moody, contemplative atmosphere. The mirror becomes part of the story.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-48",
    imageUrl:
      "https://images.pexels.com/photos/2859616/pexels-photo-2859616.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Rainbow Light Play",
    tags: ["indoor", "fun", "dramatic", "close-up"],
    notes:
      "Use a prism or crystal to cast rainbow light across her face or body. This playful technique adds color and whimsy. The effect is unpredictable - embrace happy accidents. The rainbow bands create unique, artistic images. Natural sunlight through prism works best. A fun, lighthearted moment in the session.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-49",
    imageUrl:
      "https://images.pexels.com/photos/4580463/pexels-photo-4580463.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Sunlight Patterns",
    tags: ["indoor", "dramatic", "candid", "close-up"],
    notes:
      "Use window blinds or plants to cast interesting shadow patterns on skin. The light and shadow create natural body art. Morning or afternoon sun provides best angles. The patterns draw attention and add visual interest. Let shadows fall naturally where they may. Abstract and artistic approach to boudoir.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-50",
    imageUrl:
      "https://images.pexels.com/photos/7699983/pexels-photo-7699983.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Motion Blur Art",
    tags: ["indoor", "movement", "dramatic", "elegant"],
    notes:
      "Intentional motion blur creates dreamy, artistic effect. Use slow shutter speed while subject moves slowly. The blur abstracts the figure into pure movement. This experimental technique yields unique results. Not every frame will work - take many. The successful shots become fine art pieces.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-51",
    imageUrl:
      "https://images.pexels.com/photos/15921531/pexels-photo-15921531.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Seated Power Pose",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "Confident seated pose on chair with strong posture. This power stance communicates self-assurance. The chair provides structure for the pose. She can lean forward or back for different energy. Strong eye contact reinforces the confidence. This editorial style suits fashion-forward clients.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-52",
    imageUrl:
      "https://images.pexels.com/photos/4382492/pexels-photo-4382492.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Chair Pose Elegant",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "Classic boudoir pose seated on or with a chair. The chair provides interesting compositional element and support. Can sit conventionally, sideways, or backwards. The furniture gives context and anchors the image. Various chair styles create different moods - velvet for glamour, wood for rustic.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-53",
    imageUrl:
      "https://images.pexels.com/photos/22469067/pexels-photo-22469067.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Vintage Glamour",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "1920s-inspired styling with vintage glamour aesthetic. Period-appropriate lingerie, robes, or vintage slips. The old Hollywood feel is timeless and sophisticated. Use period lighting style - softer, less contrasty. Hair and makeup should support the era. This themed approach creates cohesive gallery.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-54",
    imageUrl:
      "https://images.pexels.com/photos/952212/pexels-photo-952212.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Fashion Editorial",
    tags: ["indoor", "elegant", "dramatic", "full-body"],
    notes:
      "High fashion approach to boudoir photography. Strong poses, editorial lighting, graphic composition. Think fashion magazine rather than traditional boudoir. The styling is elevated and intentional. This approach suits clients who want artistic, fashion-forward imagery over romantic softness.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "builtin-boudoir-55",
    imageUrl:
      "https://images.pexels.com/photos/6539033/pexels-photo-6539033.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "boudoir",
    title: "Backwards on Chair",
    tags: ["indoor", "candid", "intimate", "fun"],
    notes:
      "Sitting backwards on chair with chin resting on arms over the back. This casual pose feels relaxed and approachable. The chair back provides natural coverage and support. She can look at camera or away. The informality helps nervous clients relax. A great transitional pose between setups.",
    isBuiltIn: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

// Helper function to get poses by category
export function getPosesByCategory(
  poses: Pose[],
  category: PoseCategory,
): Pose[] {
  if (category === "all") {
    return poses;
  }
  return poses.filter((pose) => pose.category === category);
}

// Helper function to get category label
export function getCategoryLabel(category: PoseCategory): string {
  const found = POSE_CATEGORIES.find((c) => c.id === category);
  return found?.label || category;
}
