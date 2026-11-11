export const inCelebrationGallery = [
  { id: 'spongebob-disco', src: 'celebrations/spongebob-disco.gif', alt: 'Bob Esponja y Calamardo bailando', source: 'https://tenor.com/view/spongebob-dances-party-disco-gif-14378741' },
  { id: 'spongebob-patricio', src: 'celebrations/spongebob-patricio.gif', alt: 'Bob Esponja y Patricio de fiesta', source: 'https://tenor.com/view/bubble-party-spongebob-gif-7569786' },
  { id: 'cars-kachow', src: 'celebrations/cars-kachow.gif', alt: 'Rayo McQueen celebrando con un Ka-chow', source: 'https://tenor.com/view/ka-chow-lightning-mcqueen-cars-oh-yeah-cars-on-the-road-gif-26641273' },
  { id: 'cars-fiesta', src: 'celebrations/cars-fiesta.gif', alt: 'Rayo McQueen y Mate celebrando', source: 'https://tenor.com/view/oh-yeah-lightning-mcqueen-tow-mater-cars-on-the-road-feeling-it-gif-26678912' },
  { id: 'minions-fiesta', src: 'celebrations/minions-fiesta.gif', alt: 'Un Minion bailando en la discoteca', source: 'https://tenor.com/view/party-minions-dancing-party-time-happy-gif-15045334' },
  { id: 'jessica-rabbit', src: 'celebrations/jessica-rabbit.gif', alt: 'Jessica Rabbit bailando en un escenario', rare: true, source: 'https://tenor.com/view/jessica-rabbit-dancing-cartoons-gif-10497066' },
];

export const lastCelebrationKey = 'robin-admin-last-in-celebration';

export function getInCelebration(result, { name, portalName, lastId } = {}, random = Math.random) {
  if (result?.result !== 'created') return null;
  const previousWasRare = inCelebrationGallery.some(gif => gif.id === lastId && gif.rare);
  const rare = !previousWasRare && random() < 0.125;
  const candidates = inCelebrationGallery.filter(gif => Boolean(gif.rare) === rare && gif.id !== lastId);
  const gif = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  return { gif, name, portalName };
}
