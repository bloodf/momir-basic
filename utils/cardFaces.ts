import { Card, CardFace } from '../types';

export interface CardFaceDisplayData {
  name: string;
  printedName?: string;
  manaCost: string;
  typeLine: string;
  printedTypeLine?: string;
  oracleText?: string;
  printedText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  artCropUrl: string;
  normalImageUrl: string;
  smallImageUrl: string;
}

function isCardFace(face: Card | CardFace): face is CardFace {
  return 'image_uris' in face || 'printedText' in face;
}

export function getDisplayFace(card: Card, activeFaceIndex: number): Card | CardFace {
  return card.faces?.[activeFaceIndex] ?? card;
}

export function getCardFaceDisplayData(card: Card, activeFaceIndex: number): CardFaceDisplayData {
  const displayFace = getDisplayFace(card, activeFaceIndex);
  const isFace = isCardFace(displayFace);
  const displayFaceImages = isCardFace(displayFace) ? displayFace.image_uris : undefined;

  return {
    name: displayFace.name,
    printedName: displayFace.printedName ?? displayFace.name,
    manaCost: displayFace.manaCost ?? (isFace ? '' : card.manaCost),
    typeLine: displayFace.typeLine,
    printedTypeLine: displayFace.printedTypeLine ?? displayFace.typeLine,
    oracleText: displayFace.oracleText,
    printedText: displayFace.printedText ?? displayFace.oracleText,
    flavorText: displayFace.flavorText,
    power: displayFace.power,
    toughness: displayFace.toughness,
    artist: displayFace.artist ?? card.artist,
    artCropUrl: displayFaceImages?.art_crop ?? card.artCropUrl,
    normalImageUrl: displayFaceImages?.normal ?? card.normalImageUrl,
    smallImageUrl: displayFaceImages?.small ?? card.smallImageUrl,
  };
}
