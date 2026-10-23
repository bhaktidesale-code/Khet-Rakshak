export type CropHint = 'Cotton' | 'Turmeric' | null;

export interface CropImageSample {
  filename: string;
  fileSizeBytes: number;
  cropType: null;
  cropHint: CropHint;
  imagePath: string;
  sourcePath: string;
  labelStatus: 'filename-only' | 'unclassified';
}

const sourceFolder = 'WhatsApp Unknown 2026-10-21 at 21.53.29';

const filenames = [
  'C.jpeg',
  'Cotton_1.jpeg',
  'Cotton_2.jpeg',
  'Cotton_3.jpeg',
  'Cotton_4.jpeg',
  'Cotton_5.jpeg',
  'Cotton_7.jpeg',
  'Cotton_8.jpeg',
  'Cotton_9.jpeg',
  'Cotton_10.jpeg',
  'Cotton_11.jpeg',
  'Tur.jpeg',
  'Turmeric_1.jpeg',
  'Turmeric_2.jpeg',
  'Turmeric_3.jpeg',
  'Turmeric_4.jpeg',
  'Turmeric_5.jpeg',
  'Turmeric_6.jpeg',
  'Turmeric_7.jpeg',
  'Turmeric_8.jpeg',
  'Turmeric_9.jpeg',
];

const fileSizes: Record<string, number> = {
  'C.jpeg': 156957,
  'Cotton_1.jpeg': 157224,
  'Cotton_2.jpeg': 156386,
  'Cotton_3.jpeg': 193281,
  'Cotton_4.jpeg': 211861,
  'Cotton_5.jpeg': 145297,
  'Cotton_7.jpeg': 196380,
  'Cotton_8.jpeg': 208884,
  'Cotton_9.jpeg': 193804,
  'Cotton_10.jpeg': 169339,
  'Cotton_11.jpeg': 169978,
  'Tur.jpeg': 172031,
  'Turmeric_1.jpeg': 205928,
  'Turmeric_2.jpeg': 204544,
  'Turmeric_3.jpeg': 184294,
  'Turmeric_4.jpeg': 195996,
  'Turmeric_5.jpeg': 181485,
  'Turmeric_6.jpeg': 171427,
  'Turmeric_7.jpeg': 188788,
  'Turmeric_8.jpeg': 186896,
  'Turmeric_9.jpeg': 199856,
};

function getCropHint(filename: string): CropHint {
  if (/^cotton[_\-.]/i.test(filename)) return 'Cotton';
  if (/^turmeric[_\-.]/i.test(filename)) return 'Turmeric';
  return null;
}

export const cropImageCatalog: CropImageSample[] = filenames.map((filename) => {
  const cropHint = getCropHint(filename);
  return {
    filename,
    fileSizeBytes: fileSizes[filename],
    cropType: null,
    cropHint,
    imagePath: `/crop-demo/${encodeURIComponent(filename)}`,
    sourcePath: `${sourceFolder}/${filename}`,
    labelStatus: cropHint ? 'filename-only' : 'unclassified',
  };
});
