import exifr from 'exifr';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  dateTimeOriginal?: Date | string;
  make?: string;
  model?: string;
  hasGps: boolean;
}

export async function parseExifData(file: File): Promise<ExifData> {
  try {
    const output = await exifr.parse(file, {
      gps: true,
      tiff: true,
      exif: true,
    });

    if (!output) {
      return { hasGps: false };
    }

    const latitude = output.latitude ?? output.GPSLatitude;
    const longitude = output.longitude ?? output.GPSLongitude;
    const dateTimeOriginal = output.DateTimeOriginal ?? output.CreateDate;

    return {
      latitude: typeof latitude === 'number' ? latitude : undefined,
      longitude: typeof longitude === 'number' ? longitude : undefined,
      dateTimeOriginal,
      make: output.Make,
      model: output.Model,
      hasGps: typeof latitude === 'number' && typeof longitude === 'number',
    };
  } catch (error) {
    console.warn('EXIF parsing failed or no EXIF present:', error);
    return { hasGps: false };
  }
}
