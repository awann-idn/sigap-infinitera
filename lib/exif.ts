import exifr from 'exifr';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  dateTimeOriginal?: string;
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
      // Explicit field picks for broader Android/iOS camera compatibility
      pick: [
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'latitude',
        'longitude',
        'DateTimeOriginal',
        'CreateDate',
        'Make',
        'Model',
      ],
    });

    if (!output) {
      return { hasGps: false };
    }

    const latitude = output.latitude ?? output.GPSLatitude;
    const longitude = output.longitude ?? output.GPSLongitude;
    const rawDateTime = output.DateTimeOriginal ?? output.CreateDate;

    // Normalize DateTimeOriginal to ISO string for JSON serialization
    let dateTimeOriginal: string | undefined;
    if (rawDateTime instanceof Date) {
      dateTimeOriginal = rawDateTime.toISOString();
    } else if (typeof rawDateTime === 'string') {
      // EXIF date format is "YYYY:MM:DD HH:MM:SS" — convert to ISO
      const isoAttempt = rawDateTime.replace(
        /^(\d{4}):(\d{2}):(\d{2})/,
        '$1-$2-$3'
      );
      const parsed = new Date(isoAttempt);
      dateTimeOriginal = isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

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
