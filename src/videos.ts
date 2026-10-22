// One YouTube video per exercise, for the Bài tập tab (Iker, 2026-10-22: "không phải lúc nào tôi cũng nhớ động tác").
// Alpha picked them on 2026-10-22 from the titles and the channels (physiotherapists and trainers). The videos are in
// English; only the movement matters. If one is wrong, say which and Alpha swaps it.
// No browser things in here, so the tests can check that every exercise of the plan has a video.

export type VideoKey =
  | 'plank' | 'side' | 'deadbug' | 'birddog' | 'bridge' | 'bandbridge'
  | 'stepup' | 'split' | 'bandsquat' | 'sidewalk' | 'calf'
  | 'straightarm' | 'pushdown' | 'row' | 'poling' | 'pushup' | 'dips' | 'bentcalf';

/** id: the YouTube video id. name: the exercise as the plan calls it. by: the channel. note: what to look at. */
export interface Video { id: string; name: string; by: string; note: string }

export const VIDEOS: Record<VideoKey, Video> = {
  plank: { id: 'mwlp75MS6Rg', name: 'Plank thẳng', by: 'NASM', note: 'Xem: khuỷu tay ngay dưới vai, người thẳng một đường, không võng hông.' },
  side: { id: '44ND4bOB-T0', name: 'Plank nghiêng (Side Plank)', by: 'NASM', note: 'Xem: hông nâng cao, người thẳng một đường, làm hết một bên rồi đổi bên.' },
  deadbug: { id: 'bxn9FBrt4-A', name: 'Dead Bug', by: 'NASM', note: 'Xem: lưng dưới ép sát sàn, tay và chân đối nhau duỗi ra chậm.' },
  birddog: { id: 'ZdAHe9_HeEw', name: 'Bird Dog', by: 'NASM', note: 'Xem: lưng phẳng, tay và chân đối nhau duỗi thẳng, hông không xoay.' },
  bridge: { id: 'n6JiF2jp2Ns', name: 'Glute Bridge', by: 'Elixan Health', note: 'Xem: đẩy gót chân, siết mông, không ưỡn lưng.' },
  bandbridge: { id: '91uayvdKAQY', name: 'Glute Bridge với dây ngắn', by: 'Fitwirr', note: 'Xem: dây ngay trên gối, hai gối đẩy ra ngoài suốt bài.' },
  stepup: { id: 'URHdW9js6DM', name: 'Bước lên bậc (Step-up)', by: 'NASM', note: 'Xem: cả bàn chân trên bậc, đẩy lên bằng chân trên, chân dưới không bật.' },
  split: { id: 'VPhhE6bBzZE', name: 'Bulgarian Split Squat', by: 'Jack Hanrahan Fitness', note: 'Xem: chân sau gác lên ghế, hạ chậm, gối trước hướng theo mũi chân.' },
  bandsquat: { id: 'GiHdZ518VIE', name: 'Squat với dây dài', by: 'Horton Barbell', note: 'Xem: đứng lên dây, ngồi xuống như ngồi ghế, lưng thẳng, ngực mở.' },
  sidewalk: { id: 'M5uxEQH5BUM', name: 'Bước ngang với dây ngắn', by: 'NASM', note: 'Xem: dây trên gối, hơi khuỵu gối, bước ngang, dây luôn căng.' },
  calf: { id: 'OgVFFGsVOxk', name: 'Nhón gót một chân trên bậc thang', by: 'Mountain Ridge Physical Therapy', note: 'Xem: nửa bàn chân trên mép bậc, nhón lên cao, hạ chậm xuống thấp hơn bậc.' },
  straightarm: { id: '5gHyAq4O-sQ', name: 'Kéo dây thẳng tay', by: 'Hammer Fitness', note: 'Xem: tay thẳng, kéo dây xuống đến ngang hông, cảm nhận cơ lưng.' },
  pushdown: { id: 'qjPN6ElNqpc', name: 'Đẩy dây tay sau', by: 'Rogue Fitness', note: 'Xem: khuỷu tay ép sát sườn, chỉ cẳng tay duỗi xuống.' },
  row: { id: 'PKZW3s3G_Y0', name: 'Kéo dây về bụng', by: 'Scott Abel Coaching', note: 'Xem: kéo dây về bụng, khuỷu tay sát người, ép hai bả vai. Có cả cách ngồi vòng dây qua bàn chân.' },
  poling: { id: 'QVwwEldpTF0', name: 'Chống gậy với dây', by: 'Milwaukee Journal Sentinel', note: 'Xem: đẩy dây xuống và ra sau như chống gậy. Video đẩy hai tay cùng lúc; trong bài của bạn thì đổi tay liên tục, động tác tay giống nhau.' },
  pushup: { id: 'WDIpL0pjun0', name: 'Hít đất', by: 'NASM', note: 'Xem: người thẳng như plank, khuỷu tay chếch ra sau, không bè ra hai bên.' },
  dips: { id: 'ktSTgz8KXvo', name: 'Chống tay sau ghế (Tricep Dips)', by: 'Freedom Physical Therapy', note: 'Xem: tay chống mép ghế, hạ đến khi khuỷu tay vuông góc, lưng sát ghế.' },
  bentcalf: { id: '4i53Hkh1rdY', name: 'Nhón gót gối gập', by: 'Rehab My Patient', note: 'Xem: gối hơi gập và giữ gập suốt bài, nhón lên rồi hạ chậm.' },
};

/** The order on the tab: the core first, then the legs (session A), then the arms (session B). */
export const GROUPS: readonly { name: string; keys: readonly VideoKey[] }[] = [
  { name: 'Core', keys: ['plank', 'side', 'deadbug', 'birddog', 'bridge', 'bandbridge'] },
  { name: 'Bài ở nhà A: chân', keys: ['stepup', 'split', 'bandsquat', 'sidewalk', 'calf'] },
  { name: 'Bài ở nhà B: tay chống gậy', keys: ['straightarm', 'pushdown', 'row', 'poling', 'pushup', 'dips', 'bentcalf'] },
];
