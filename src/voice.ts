// Made by tools/make-voice.mjs. Do not edit by hand.
// Where each voice line is in voice.mp3: [start in seconds, length in seconds].
export const VOICE: Record<string, readonly [number, number]> = {
  "plank": [
    0.6,
    2.842
  ],
  "side": [
    3.892,
    3.855
  ],
  "deadbug": [
    8.197,
    3.818
  ],
  "birddog": [
    12.465,
    3.955
  ],
  "bridge": [
    16.87,
    2.867
  ],
  "bandbridge": [
    20.187,
    3.405
  ],
  "n1": [
    24.042,
    1.343
  ],
  "n2": [
    25.835,
    1.417
  ],
  "n3": [
    27.702,
    1.418
  ],
  "n4": [
    29.57,
    1.405
  ],
  "n5": [
    31.425,
    1.405
  ],
  "n6": [
    33.28,
    1.405
  ],
  "n7": [
    35.135,
    1.48
  ],
  "n8": [
    37.065,
    1.392
  ],
  "n9": [
    38.907,
    1.355
  ],
  "n10": [
    40.712,
    1.43
  ],
  "n11": [
    42.592,
    1.618
  ],
  "n12": [
    44.66,
    1.68
  ],
  "n13": [
    46.79,
    1.655
  ],
  "n14": [
    48.895,
    1.655
  ],
  "n15": [
    51,
    1.68
  ],
  "n16": [
    53.13,
    1.655
  ],
  "n17": [
    55.235,
    1.692
  ],
  "n18": [
    57.377,
    1.68
  ],
  "n19": [
    59.507,
    1.655
  ],
  "n20": [
    61.612,
    1.643
  ],
  "go": [
    63.705,
    1.592
  ],
  "ten": [
    65.747,
    1.93
  ],
  "switch": [
    68.127,
    2.593
  ],
  "done": [
    71.17,
    2.484
  ]
};

/** The text the sound was made from. The tests check it still matches VOICE_LINES in guide.ts. */
export const VOICE_TEXT: Record<string, string> = {
  "plank": "Plank thẳng, vào tư thế.",
  "side": "Plank nghiêng, bên trái trước, vào tư thế.",
  "deadbug": "Dead Bug, đổi bên mỗi lần, vào tư thế.",
  "birddog": "Bird Dog, đổi bên mỗi lần, vào tư thế.",
  "bridge": "Glute Bridge, vào tư thế.",
  "bandbridge": "Glute Bridge với dây, vào tư thế.",
  "n1": "Một.",
  "n2": "Hai.",
  "n3": "Ba.",
  "n4": "Bốn.",
  "n5": "Năm.",
  "n6": "Sáu.",
  "n7": "Bảy.",
  "n8": "Tám.",
  "n9": "Chín.",
  "n10": "Mười.",
  "n11": "Mười một.",
  "n12": "Mười hai.",
  "n13": "Mười ba.",
  "n14": "Mười bốn.",
  "n15": "Mười lăm.",
  "n16": "Mười sáu.",
  "n17": "Mười bảy.",
  "n18": "Mười tám.",
  "n19": "Mười chín.",
  "n20": "Hai mươi.",
  "go": "Bắt đầu!",
  "ten": "Còn mười giây.",
  "switch": "Đổi bên, bên phải.",
  "done": "Xong hiệp, nghỉ đi."
};
