// Seed library — 6 public-domain titles, with cover styles, outlines, page text.

const TAGS = [
  { id: "t-fiction",   name: "Fiction",     color: "#A0826D" },
  { id: "t-philosophy",name: "Philosophy",  color: "#7C8E73" },
  { id: "t-essays",    name: "Essays",      color: "#9B7B89" },
  { id: "t-classics",  name: "Classics",    color: "#7B8FA0" },
  { id: "t-reread",    name: "Re-read",     color: "#C09A6B" },
  { id: "t-short",     name: "Short",       color: "#8B7B9B" },
];

// Cover palettes — solid, editorial, no skeuomorphism
const COVERS = {
  walden:     { bg: "#3F4A2D", ink: "#E8E4D6", rule: "#8FA17A", motif: "lines" },
  pride:      { bg: "#E8D8C4", ink: "#3A2A22", rule: "#A37A55", motif: "frame" },
  frankenstein:{bg: "#141416", ink: "#D5CFC2", rule: "#6B7A55", motif: "stitch" },
  meditations:{ bg: "#C9956B", ink: "#1F1815", rule: "#5C3A24", motif: "circle" },
  artofwar:   { bg: "#7A1B12", ink: "#F4E9D6", rule: "#D8B26A", motif: "block" },
  selfreliance:{bg: "#1E2A33", ink: "#E6DDC8", rule: "#C8A461", motif: "rules" },
};

// Page bodies — small set per book, cycled. Lightly stylized, public-domain inspired.
const PAGES = {
  walden: [
    { kind: "chap", num: 1, head: "I.", title: "Economy",
      body: "When I wrote the following pages, or rather the bulk of them, I lived alone, in the woods, a mile from any neighbor, in a house which I had built myself, on the shore of Walden Pond, in Concord, Massachusetts, and earned my living by the labor of my hands only. I lived there two years and two months. At present I am a sojourner in civilized life again." },
    { kind: "page", body: "Most of the luxuries, and many of the so-called comforts of life, are not only not indispensable, but positive hindrances to the elevation of mankind. With respect to luxuries and comforts, the wisest have ever lived a more simple and meagre life than the poor. The ancient philosophers, Chinese, Hindoo, Persian, and Greek, were a class than which none has been poorer in outward riches, none so rich in inward." },
    { kind: "page", body: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived. I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary." },
    { kind: "page", body: "Time is but the stream I go a-fishing in. I drink at it; but while I drink I see the sandy bottom and detect how shallow it is. Its thin current slides away, but eternity remains. I would drink deeper; fish in the sky, whose bottom is pebbly with stars." },
  ],
  pride: [
    { kind: "chap", num: 1, head: "Chapter 1.",
      body: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters." },
    { kind: "page", body: "\"My dear Mr. Bennet,\" said his lady to him one day, \"have you heard that Netherfield Park is let at last?\" Mr. Bennet replied that he had not. \"But it is,\" returned she; \"for Mrs. Long has just been here, and she told me all about it.\" Mr. Bennet made no answer. \"Do not you want to know who has taken it?\" cried his wife impatiently. \"You want to tell me, and I have no objection to hearing it.\"" },
    { kind: "page", body: "Mr. Bennet was so odd a mixture of quick parts, sarcastic humour, reserve, and caprice, that the experience of three-and-twenty years had been insufficient to make his wife understand his character. Her mind was less difficult to develop. She was a woman of mean understanding, little information, and uncertain temper. When she was discontented, she fancied herself nervous." },
    { kind: "page", body: "Vanity and pride are different things, though the words are often used synonymously. A person may be proud without being vain. Pride relates more to our opinion of ourselves, vanity to what we would have others think of us." },
  ],
  frankenstein: [
    { kind: "chap", num: 1, head: "Letter I.",
      body: "To Mrs. Saville, England. — St. Petersburgh, Dec. 11th, 17—. You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday; and my first task is to assure my dear sister of my welfare, and increasing confidence in the success of my undertaking." },
    { kind: "page", body: "I am already far north of London; and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves, and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes." },
    { kind: "page", body: "It was on a dreary night of November, that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out." },
    { kind: "page", body: "Nothing is so painful to the human mind as a great and sudden change. The sun might shine, or the clouds might lour: but nothing could appear to me as it had done the day before." },
  ],
  meditations: [
    { kind: "chap", num: 1, head: "Book II.",
      body: "Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, arrogant, deceitful, envious, unsocial. All these things happen to them by reason of their ignorance of what is good and evil. But I who have seen the nature of the good, that it is beautiful, and of the bad, that it is ugly, and the nature of him who does wrong, that it is akin to me." },
    { kind: "page", body: "Do every act of thy life as if it were thy last, free from all vanity, all passionate and wilful aberration from reason, and from all hypocrisy, self-love, and discontent with the portion which has been given to thee. Thou seest how few are the things, the which if a man lays hold of, he is able to live a life which flows in quiet, and is like the existence of the gods." },
    { kind: "page", body: "Waste no more time arguing what a good man should be. Be one. The universe is change; our life is what our thoughts make it." },
    { kind: "page", body: "Confine thyself to the present. The happiness of your life depends upon the quality of your thoughts: therefore, guard accordingly, and take care that you entertain no notions unsuitable to virtue and reasonable nature." },
  ],
  artofwar: [
    { kind: "chap", num: 1, head: "I.", title: "Laying Plans",
      body: "Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations." },
    { kind: "page", body: "All warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near." },
    { kind: "page", body: "The supreme art of war is to subdue the enemy without fighting. Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities." },
    { kind: "page", body: "He will win who knows when to fight and when not to fight. He will win who knows how to handle both superior and inferior forces. He will win whose army is animated by the same spirit throughout all its ranks." },
  ],
  selfreliance: [
    { kind: "chap", num: 1, head: "I.", title: "Self-Reliance",
      body: "There is a time in every man's education when he arrives at the conviction that envy is ignorance; that imitation is suicide; that he must take himself for better, for worse, as his portion; that though the wide universe is full of good, no kernel of nourishing corn can come to him but through his toil bestowed on that plot of ground which is given to him to till." },
    { kind: "page", body: "Trust thyself: every heart vibrates to that iron string. Accept the place the divine providence has found for you, the society of your contemporaries, the connection of events. Great men have always done so, and confided themselves childlike to the genius of their age." },
    { kind: "page", body: "A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines. With consistency a great soul has simply nothing to do. He may as well concern himself with his shadow on the wall." },
    { kind: "page", body: "What I must do is all that concerns me, not what the people think. This rule, equally arduous in actual and in intellectual life, may serve for the whole distinction between greatness and meanness. It is the harder, because you will always find those who think they know what is your duty better than you know it yourself." },
  ],
};

const BOOKS = [
  {
    id: "b-walden",
    title: "Walden",
    subtitle: "Or, Life in the Woods",
    author: "Henry David Thoreau",
    coverKey: "walden",
    pageCount: 287,
    lastOpenedPage: 142,
    lastOpenedAt: "2026-05-11T19:24:00Z",
    addedAt: "2026-04-02T11:00:00Z",
    tagIds: ["t-essays", "t-philosophy", "t-classics"],
    fileSize: "1.2 MB",
    extractionStatus: "completed",
    hasOutline: true,
    pageSrc: "walden",
    outline: [
      { id: "o1", title: "Economy", page: 1, children: [
        { id: "o1a", title: "On building a house", page: 28 },
        { id: "o1b", title: "Cost of food", page: 52 },
      ]},
      { id: "o2", title: "Where I Lived, and What I Lived For", page: 79 },
      { id: "o3", title: "Reading", page: 95 },
      { id: "o4", title: "Sounds", page: 108, children: [
        { id: "o4a", title: "The whistle of the locomotive", page: 113 },
      ]},
      { id: "o5", title: "Solitude", page: 127 },
      { id: "o6", title: "Visitors", page: 138 },
      { id: "o7", title: "The Bean-Field", page: 152 },
      { id: "o8", title: "The Village", page: 167 },
      { id: "o9", title: "The Ponds", page: 175 },
      { id: "o10", title: "Higher Laws", page: 209 },
      { id: "o11", title: "Conclusion", page: 268 },
    ],
    bookmarks: [
      { id: "bm1", page: 84, label: "\"I went to the woods…\"", createdAt: "2026-04-19" },
      { id: "bm2", page: 142, label: null, createdAt: "2026-05-02" },
      { id: "bm3", page: 270, label: "Final paragraph", createdAt: "2026-05-08" },
    ],
    notes: [
      { id: "n1", page: 84, body: "The thesis paragraph — return to this when writing on intentionality.", createdAt: "2026-04-19", updatedAt: "2026-04-19" },
      { id: "n2", page: 142, body: "Compare to Annie Dillard's chapter on solitude in Pilgrim. Same posture, different temperature.", createdAt: "2026-05-02", updatedAt: "2026-05-02" },
      { id: "n3", page: 270, body: "\"If a man does not keep pace with his companions, perhaps it is because he hears a different drummer.\"", createdAt: "2026-05-08", updatedAt: "2026-05-08" },
    ],
  },
  {
    id: "b-pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    coverKey: "pride",
    pageCount: 432,
    lastOpenedPage: 88,
    lastOpenedAt: "2026-05-10T22:11:00Z",
    addedAt: "2026-03-14T08:30:00Z",
    tagIds: ["t-fiction", "t-classics", "t-reread"],
    fileSize: "2.4 MB",
    extractionStatus: "completed",
    hasOutline: true,
    pageSrc: "pride",
    outline: [
      { id: "p1", title: "Volume I", page: 1, children: [
        { id: "p1a", title: "Chapter 1", page: 1 },
        { id: "p1b", title: "Chapter 2", page: 9 },
        { id: "p1c", title: "Chapter 3", page: 16 },
      ]},
      { id: "p2", title: "Volume II", page: 142 },
      { id: "p3", title: "Volume III", page: 295 },
    ],
    bookmarks: [
      { id: "p-bm1", page: 1, label: "Opening line", createdAt: "2026-03-14" },
      { id: "p-bm2", page: 88, label: null, createdAt: "2026-05-04" },
    ],
    notes: [
      { id: "p-n1", page: 1, body: "Read this aloud — the rhythm.", createdAt: "2026-03-14", updatedAt: "2026-03-14" },
    ],
  },
  {
    id: "b-frank",
    title: "Frankenstein",
    subtitle: "The Modern Prometheus",
    author: "Mary Shelley",
    coverKey: "frankenstein",
    pageCount: 280,
    lastOpenedPage: 41,
    lastOpenedAt: "2026-05-05T01:05:00Z",
    addedAt: "2026-04-22T18:45:00Z",
    tagIds: ["t-fiction", "t-classics"],
    fileSize: "1.8 MB",
    extractionStatus: "completed",
    hasOutline: true,
    pageSrc: "frankenstein",
    outline: [
      { id: "f1", title: "Letters", page: 1 },
      { id: "f2", title: "Volume I", page: 18, children: [
        { id: "f2a", title: "Chapter 1", page: 19 },
        { id: "f2b", title: "Chapter 2", page: 27 },
        { id: "f2c", title: "Chapter 5 — The Creature", page: 56 },
      ]},
      { id: "f3", title: "Volume II", page: 95 },
      { id: "f4", title: "Volume III", page: 184 },
    ],
    bookmarks: [
      { id: "f-bm1", page: 56, label: "Animation scene", createdAt: "2026-04-29" },
    ],
    notes: [],
  },
  {
    id: "b-med",
    title: "Meditations",
    author: "Marcus Aurelius",
    coverKey: "meditations",
    pageCount: 198,
    lastOpenedPage: 22,
    lastOpenedAt: "2026-05-12T07:40:00Z",
    addedAt: "2026-01-19T09:00:00Z",
    tagIds: ["t-philosophy", "t-short", "t-reread"],
    fileSize: "780 KB",
    extractionStatus: "completed",
    hasOutline: true,
    pageSrc: "meditations",
    outline: [
      { id: "m1", title: "Book I", page: 1 },
      { id: "m2", title: "Book II", page: 18 },
      { id: "m3", title: "Book III", page: 35 },
      { id: "m4", title: "Book IV", page: 52 },
      { id: "m5", title: "Book V", page: 74 },
      { id: "m6", title: "Book VI", page: 96 },
      { id: "m7", title: "Book VII", page: 118 },
      { id: "m8", title: "Book VIII", page: 140 },
    ],
    bookmarks: [
      { id: "m-bm1", page: 22, label: "Morning passage", createdAt: "2026-05-12" },
      { id: "m-bm2", page: 96, label: null, createdAt: "2026-03-18" },
    ],
    notes: [
      { id: "m-n1", page: 22, body: "Open the day with this. Read once before checking email.", createdAt: "2026-05-12", updatedAt: "2026-05-12" },
      { id: "m-n2", page: 96, body: "Cross-reference with Hadot's commentary, ch. 4.", createdAt: "2026-03-18", updatedAt: "2026-03-18" },
    ],
  },
  {
    id: "b-aow",
    title: "The Art of War",
    author: "Sun Tzu",
    coverKey: "artofwar",
    pageCount: 124,
    lastOpenedPage: null,
    lastOpenedAt: null,
    addedAt: "2026-05-09T14:20:00Z",
    tagIds: ["t-philosophy", "t-short"],
    fileSize: "520 KB",
    extractionStatus: "completed",
    hasOutline: true,
    pageSrc: "artofwar",
    outline: [
      { id: "a1", title: "Laying Plans", page: 1 },
      { id: "a2", title: "Waging War", page: 11 },
      { id: "a3", title: "Attack by Stratagem", page: 21 },
      { id: "a4", title: "Tactical Dispositions", page: 32 },
      { id: "a5", title: "Energy", page: 42 },
    ],
    bookmarks: [],
    notes: [],
  },
  {
    id: "b-emerson",
    title: "Self-Reliance",
    subtitle: "and Other Essays",
    author: "Ralph Waldo Emerson",
    coverKey: "selfreliance",
    pageCount: 168,
    lastOpenedPage: 14,
    lastOpenedAt: "2026-05-11T08:02:00Z",
    addedAt: "2026-04-30T20:00:00Z",
    tagIds: ["t-essays", "t-philosophy"],
    fileSize: "960 KB",
    extractionStatus: "completed",
    hasOutline: false, // demonstrates outline-absent state
    pageSrc: "selfreliance",
    outline: [],
    bookmarks: [
      { id: "e-bm1", page: 14, label: "Iron string", createdAt: "2026-05-11" },
    ],
    notes: [
      { id: "e-n1", page: 14, body: "\"Trust thyself: every heart vibrates to that iron string.\"", createdAt: "2026-05-11", updatedAt: "2026-05-11" },
    ],
  },
];

// Generate a "page-like" content object for a given book + page number
function getPageContent(book, pageNum) {
  const src = PAGES[book.pageSrc] || PAGES.walden;
  const idx = (pageNum - 1) % src.length;
  return src[idx];
}

// Generate a thumbnail-strip series for upload cover-page picker (12 stand-in pages)
function genThumbStrip(bookKey, count = 12) {
  return Array.from({ length: count }, (_, i) => ({ page: i + 1 }));
}

Object.assign(window, { TAGS, BOOKS, COVERS, PAGES, getPageContent, genThumbStrip });
