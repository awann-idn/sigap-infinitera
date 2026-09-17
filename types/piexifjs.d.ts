declare module 'piexifjs' {
  const piexif: {
    version: string;
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
    dump(exifObj: Record<string, unknown>): string;
    insert(exifStr: string, jpegData: string): string;
    remove(jpegData: string): string;
    load(jpegData: string): Record<string, unknown>;
  };

  export default piexif;
}
